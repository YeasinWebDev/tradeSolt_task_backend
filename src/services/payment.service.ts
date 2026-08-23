import Stripe from "stripe";

import { prisma } from "../lib/prisma";
import { getStripe } from "../lib/stripe";
import { AppError } from "../utils/AppError";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const CURRENCY = process.env.STRIPE_CURRENCY || "bdt";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getPaymentIntentId = (session: Stripe.Checkout.Session): string | null => {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
};

// ─── Checkout ──────────────────────────────────────────────────────────────────

/**
 * Create (or reuse) a Stripe Checkout Session for a pending booking.
 *
 * - Only the customer who owns the booking may pay for it.
 * - If the assigned trader has completed Stripe onboarding, the amount is split:
 *   the platform keeps `platformFee` (application fee), the trader receives
 *   the job `price`.
 */
export const createCheckoutSessionService = async (userId: string, bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      trader: true,
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }
  if (booking.customerId !== userId) {
    throw new AppError("You are not authorized to pay for this booking", 403);
  }
  if (booking.status !== "PENDING_PAYMENT") {
    throw new AppError("Booking is not pending payment", 400);
  }

  // Reuse a still-active Checkout Session when one already exists.
  const existingPayment = await prisma.payment.findUnique({
    where: { bookingId: booking.id },
  });
  if (existingPayment?.stripeCheckoutSessionId) {
    try {
      const existingSession = await getStripe().checkout.sessions.retrieve(
        existingPayment.stripeCheckoutSessionId
      );
      if (!existingSession.payment_intent && existingSession.status !== "expired" && existingSession.url) {
        return { url: existingSession.url, sessionId: existingSession.id, reused: true };
      }
    } catch {
      // Session lookup failed (e.g. account switched) — fall through to a fresh session.
    }
  }

  const totalAmount = booking.price + booking.platformFee ;

  // Split the payment with the trader only after they have onboarded.
  const traderCanReceiveFunds = Boolean(
    booking.trader.stripeAccountId && booking.trader.stripeOnboardingComplete
  );

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: booking.customer.email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: CURRENCY,
          unit_amount: totalAmount * 100,
          product_data: {
            name: booking.serviceName || "Trade Service Booking",
            ...(booking.customerAddress ? { description: booking.customerAddress } : {}),
          },
        },
      },
    ],
    metadata: { bookingId: booking.id },
    ...(traderCanReceiveFunds
      ? {
          payment_intent_data: {
            transfer_data: {
              destination: booking.trader.stripeAccountId as string,
            },
            application_fee_amount: booking.platformFee,
          },
        }
      : {}),
    success_url: `${CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${CLIENT_URL}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
  });

  await prisma.payment.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      stripeCheckoutSessionId: session.id,
      amount: totalAmount,
      platformFee: booking.platformFee,
      status: "PENDING",
    },
    update: {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: null,
      amount: totalAmount,
      platformFee: booking.platformFee,
      status: "PENDING",
    },
  });

  if (!session.url) {
    throw new AppError("Stripe did not return a checkout URL", 500);
  }

  return { url: session.url, sessionId: session.id, reused: false };
};

// ─── Webhooks ──────────────────────────────────────────────────────────────────

/**
 * Process a verified Stripe webhook event.
 *
 * - checkout.session.completed -> Payment SUCCEEDED + Booking CONFIRMED
 * - checkout.session.expired   -> Payment FAILED (booking stays pending)
 * - account.updated            -> sync trader onboarding status
 */
export const handleStripeWebhookEvent = async (
  payload: Buffer | string,
  signature: string
): Promise<void> => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new AppError("STRIPE_WEBHOOK_SECRET environment variable is not set", 500);
  }

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    throw new AppError(
      `Stripe webhook signature verification failed: ${(err as Error).message}`,
      400
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) {
        console.warn("[Stripe Webhook] Checkout session has no bookingId metadata", session.id);
        break;
      }

      const paymentIntentId = getPaymentIntentId(session);
      await prisma.$transaction([
        prisma.payment.upsert({
          where: { bookingId },
          create: {
            bookingId,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            amount: session.amount_total ?? 0,
            platformFee: 0,
            status: "SUCCEEDED",
          },
          update: {
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntentId,
            status: "SUCCEEDED",
          },
        }),
        prisma.booking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED" },
        }),
      ]);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      if (!bookingId) break;

      await prisma.payment.updateMany({
        where: { bookingId },
        data: { status: "FAILED" },
      });
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      const profile = await prisma.traderProfile.findFirst({
        where: { stripeAccountId: account.id },
      });
      if (profile) {
        const onboardingComplete = Boolean(
          account.details_submitted && account.charges_enabled
        );
        await prisma.traderProfile.update({
          where: { id: profile.id },
          data: { stripeOnboardingComplete: onboardingComplete },
        });
      }
      break;
    }

    default:
      console.log(`[Stripe Webhook] Unhandled event type: ${event.type} (${event.id})`);
  }
};

// ─── Payment status ────────────────────────────────────────────────────────────

/**
 * Payment + booking status for a booking.
 * Only the customer who owns the booking or the assigned trader may view it.
 */
export const getPaymentStatusService = async (userId: string, bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      customerId: true,
      traderId: true,
      status: true,
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404);
  }

  const traderProfile = await prisma.traderProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const isCustomer = booking.customerId === userId;
  const isAssignedTrader = traderProfile !== null && booking.traderId === traderProfile.id;

  if (!isCustomer && !isAssignedTrader) {
    throw new AppError("You are not authorized to view this payment", 403);
  }

  const payment = await prisma.payment.findUnique({ where: { bookingId } });

  return { booking, payment };
};