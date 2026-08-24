import "dotenv/config";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { errorHandler, notFound } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.route";
import { TraderRoutes } from "./routes/trader.route";
import { chatModuleRoutes } from "./routes/chat.routes";
import { whatsappModuleRoutes } from "./modules/whatsapp/whatsapp.routes";
import { paymentModuleRoutes } from "./routes/payment.route";
import { stripeWebhookRoutes } from "./routes/stripe.webhook.route";
import { bookingRoutes } from "./routes/booking.route";

const app: Application = express();

// ─── Security & Utility Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  })
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Stripe webhooks need the RAW request body to verify the Stripe-Signature
// header — register before the global JSON body parser.
app.use("/api/v1/webhooks/stripe", stripeWebhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/trader", TraderRoutes);

// Modular Chat & WhatsApp Routes
app.use("/api/v1/chat", chatModuleRoutes);
app.use("/api/v1/webhooks/whatsapp", whatsappModuleRoutes);
app.use("/api/webhooks/whatsapp", whatsappModuleRoutes);

// Stripe Payments
app.use("/api/v1/payments", paymentModuleRoutes);

// Booking routes
app.use("/api/v1/bookings", bookingRoutes);

// ─── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
