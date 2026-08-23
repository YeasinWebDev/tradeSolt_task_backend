import { Request, Response, NextFunction } from "express";

import { AppError } from "../utils/AppError";
import { handleStripeWebhookEvent } from "../services/payment.service";

/**
 * Stripe webhook endpoint.
 * Route-level `express.raw()` gives us the raw body (Buffer) so the
 * `stripe-signature` can be verified before the payload is trusted.
 */
export const handleStripeWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature || Array.isArray(signature)) {
      throw new AppError("Missing Stripe signature header", 400);
    }

    await handleStripeWebhookEvent(req.body as Buffer, signature);

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};