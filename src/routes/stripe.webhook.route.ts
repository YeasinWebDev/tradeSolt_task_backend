import { Router } from "express";
import express from "express";

import { handleStripeWebhook } from "../controllers/stripeWebhook.controller";

const router = Router();

// POST /api/v1/webhooks/stripe
// Raw body is required to verify the Stripe-Signature header, so we bypass
// the global express.json() parser for this route.
router.post("/", express.raw({ type: "application/json" }), handleStripeWebhook);

export const stripeWebhookRoutes = router;