import { z } from "zod";

export const createCheckoutSessionSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
});

export type CreateCheckoutSessionInput = z.infer<typeof createCheckoutSessionSchema>;