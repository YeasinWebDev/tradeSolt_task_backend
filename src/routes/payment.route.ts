import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import {
  createCheckoutSession,
  getPaymentStatus,
} from "../controllers/payment.controller";

const router = Router();

// Create / reuse a Stripe Checkout Session for a booking
router.post("/checkout", authenticate, createCheckoutSession);

// Payment status for a booking (customer or assigned trader)
router.get("/:bookingId", authenticate, getPaymentStatus);

export const paymentModuleRoutes = router;