import Stripe from "stripe";

// Lazy-initialized Stripe client so the server can still boot before
// STRIPE_SECRET_KEY has been configured (same spirit as lib/prisma.ts).
let stripeClient: Stripe | null = null;

export const getStripe = (): Stripe => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set. Add it to your .env file.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      // Keep runtime behaviour aligned with the SDK's pinned API version
      // (matches the TypeScript types shipped with stripe@22.5.0).
      apiVersion: "2026-07-29.dahlia",
      typescript: true,
      maxNetworkRetries: 2,
    });
  }

  return stripeClient;
};