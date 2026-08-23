import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { getMyBookingsController } from "../controllers/booking.controller";

export const bookingRoutes = Router();

bookingRoutes.get("/my-bookings", authenticate, getMyBookingsController);
