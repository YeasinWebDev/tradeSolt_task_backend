import { prisma } from "../lib/prisma";
import { checkTraderAvailability } from "./scheduling.service";
import { parseBookingIntentWithAI, ParsedBookingIntent } from "./ai.service";
import { createCheckoutSessionService } from "./payment.service";

// Simple Normalized Message Input used by BOTH Web Chat and WhatsApp
export type MessageInput = {
  channel: "WEB" | "WHATSAPP";
  senderId: string; // Customer ID or Phone Number
  message: string;
  timestamp: Date;
};

/**
 * SHARED BOOKING SERVICE
 * ----------------------
 * One central function used by both Web Chat and WhatsApp.
 * 1. Uses AI Parser to convert natural language to structured JSON.
 * 2. Checks trader availability with 30-min travel buffer.
 * 3. Creates pending booking in Prisma.
 */
export const processBookingRequest = async (input: MessageInput) => {
  const { channel, senderId, message } = input;

  // 1. Use AI to convert natural language into structured booking info
  const parsedAI: ParsedBookingIntent = await parseBookingIntentWithAI(message);

  if (parsedAI.intent !== "BOOKING_REQUEST") {
    return {
      success: false,
      replyText: parsedAI.clarificationPrompt || "How can I help you with your booking today?",
    };
  }

  const serviceName = parsedAI.service;
  const location = parsedAI.location;

  // Build Date and Time objects from AI output (e.g., date: "2026-08-22", time: "15:00")
  const dateStr = parsedAI.date || new Date().toISOString().split("T")[0];
  const timeStr = parsedAI.time || "15:00";

  const [hours, minutes] = timeStr.split(":").map(Number);
  const bookingDate = new Date(dateStr);

  const startTime = new Date(bookingDate);
  startTime.setUTCHours(hours, minutes, 0, 0);

  const endTime = new Date(startTime);
  endTime.setUTCHours(hours + 1, minutes, 0, 0); // 1-hour job duration

  // 2. Check Availability via Scheduling Service
  const availability = await checkTraderAvailability({
    date: bookingDate,
    startTime,
    location,
  });

  if (!serviceName || !location) {
    return {
      success: false,
      replyText: `Sorry can u write in details about the service and the location with the time and date so that I can provide u the best service ?`,
    };
  }

  if (!availability.available || !availability.traderId) {
    return {
      success: false,
      replyText: availability.reason || `Sorry! No ${serviceName} is available in ${location} at ${timeStr} on ${dateStr}. ${availability.reason || "Please try another slot."}`,
    };
  }

  // 3. Find or ensure customer exists
  let customerId = senderId;
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ id: senderId }, { phone: senderId }] },
  });

  if (existingUser) {
    customerId = existingUser.id;
  } else {
    const fallbackCustomer = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
    if (fallbackCustomer) customerId = fallbackCustomer.id;
  }

  // 4. Create Pending Booking in Prisma Database
  const booking = await prisma.booking.create({
    data: {
      customerId,
      traderId: availability.traderId,
      serviceName,
      customerAddress: location,
      date: bookingDate,
      startTime,
      endTime,
      status: "PENDING_PAYMENT",
      channel,
      price: 5000, // $50.00
      platformFee: 500, // $5.00
    },
  });

  // 5. Generate a Stripe Checkout payment link for the new booking.
  //    Gracefully degrades: if Stripe isn't configured (no STRIPE_SECRET_KEY)
  //    or the sender isn't a real registered customer, the booking is still
  //    created and the caller simply receives no payment link.
  let paymentLink: string | null = null;
  try {
    const checkout = await createCheckoutSessionService(customerId, booking.id);
    paymentLink = checkout.url;
  } catch (err) {
    console.error("[Booking] Failed to create payment link:", err);
  }

  return {
    success: true,
    bookingId: booking.id,
    paymentLink, // Stripe Checkout URL — the customer pays here to confirm
    parsedData: parsedAI, // Returns structured AI output { intent, service, date, time, location }
    replyText: `Great news! I have reserved a ${serviceName} slot in ${location} on ${dateStr} at ${timeStr} via ${channel}. Booking ID: ${booking.id}.${
      paymentLink ? ` Please complete payment using this link to confirm` : " Payment link is being prepared — our team will contact you shortly."
    }`,
  };
};


export const getMyBookingsService = async (customerId: string) => {
  return await prisma.booking.findMany({
    where: { customerId },
    include: {
      trader: {
        select: {
          user: {
            select: {
              name: true,
            },
          },
        },
      },
      payment:true,
    },
  });
};