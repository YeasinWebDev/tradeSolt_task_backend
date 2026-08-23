import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import { AppError } from "../utils/AppError";
import { createCheckoutSessionSchema } from "../validators/payment.validator";
import {
  createCheckoutSessionService,
  getPaymentStatusService,
} from "../services/payment.service";

type AuthRequest = Request & { user?: { userId?: string } };

// ─── Create / reuse a Stripe Checkout Session ──────────────────────────────────

export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const { bookingId } = createCheckoutSessionSchema.parse(req.body);
    const data = await createCheckoutSessionService(userId, bookingId);

    res.status(200).json({
      success: true,
      message: "Checkout session created",
      data,
    });
  } catch (err) {
    if (err instanceof ZodError) {
      const error = new AppError("Validation failed", 422) as AppError & {
        errors: unknown[];
      };
      error.errors = err.issues.map((e) => ({
        field: e.path.map(String).join("."),
        message: e.message,
      }));
      return next(error);
    }
    next(err);
  }
};

// ─── Payment status ────────────────────────────────────────────────────────────

export const getPaymentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const { bookingId } = req.params as { bookingId: string };
    const data = await getPaymentStatusService(userId, bookingId);

    res.status(200).json({
      success: true,
      message: "Payment status retrieved",
      data,
    });
  } catch (err) {
    next(err);
  }
};