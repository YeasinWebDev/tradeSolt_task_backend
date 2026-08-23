import { prisma } from "../lib/prisma";
import { getStripe } from "../lib/stripe";
import { AppError } from "../utils/AppError";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// ─── Stripe Connect: trader onboarding ─────────────────────────────────────────

/**
 * Ensure the trader has a Stripe Connect Express account and return an
 * Account Link the trader can open to complete Stripe onboarding.
 */
export const getTraderConnectUrlService = async (userId: string) => {
  const profile = await prisma.traderProfile.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!profile) {
    throw new AppError("Trader profile not found", 404);
  }
  if (profile.user.role !== "TRADER") {
    throw new AppError("Only traders can connect a Stripe account", 403);
  }

  let accountId = profile.stripeAccountId;

  if (!accountId) {
    const account = await getStripe().accounts.create({
      type: "express",
      country: process.env.STRIPE_ACCOUNT_COUNTRY || "US",
      email: profile.user.email,
      business_profile: {
        ...(profile.businessName ? { name: profile.businessName } : {}),
      },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    accountId = account.id;
    await prisma.traderProfile.update({
      where: { userId },
      data: { stripeAccountId: accountId },
    });
  }

  const accountLink = await getStripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${CLIENT_URL}/trader/connect/refresh`,
    return_url: `${CLIENT_URL}/trader/connect/return`,
  });

  // Sync the stored onboarding flag with the live account state.
  const account = await getStripe().accounts.retrieve(accountId);
  const onboardingComplete = Boolean(
    account.details_submitted && account.charges_enabled
  );

  if (onboardingComplete !== profile.stripeOnboardingComplete) {
    await prisma.traderProfile.update({
      where: { userId },
      data: { stripeOnboardingComplete: onboardingComplete },
    });
  }

  return {
    url: accountLink.url,
    accountId,
    onboardingComplete,
  };
};

/**
 * Read the current Stripe Connect onboarding status for a trader.
 */
export const getTraderConnectStatusService = async (userId: string) => {
  const profile = await prisma.traderProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new AppError("Trader profile not found", 404);
  }

  if (!profile.stripeAccountId) {
    return {
      connected: false,
      onboardingComplete: false,
    };
  }

  const account = await getStripe().accounts.retrieve(profile.stripeAccountId);

  const onboardingComplete = Boolean(
    account.details_submitted && account.charges_enabled
  );

  if (onboardingComplete !== profile.stripeOnboardingComplete) {
    await prisma.traderProfile.update({
      where: { userId },
      data: { stripeOnboardingComplete: onboardingComplete },
    });
  }

  return {
    connected: true,
    accountId: profile.stripeAccountId,
    onboardingComplete,
    businessName: account.business_profile?.name ?? profile.businessName ?? null,
  };
};