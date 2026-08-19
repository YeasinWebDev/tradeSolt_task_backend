import { z } from "zod";

export const updateTraderProfileSchema = z.object({
  businessName: z.string().trim().max(100, "Business name cannot exceed 100 characters").optional().nullable(),
  description: z.string().trim().max(1000, "Description cannot exceed 1000 characters").optional().nullable(),
});
export const createWorkAreaSchema = z.object({
  date: z.coerce.date(),
  area: z.string().trim().min(1, "Area is required").max(100, "Area cannot exceed 100 characters"),
  startTime: z.string().trim().min(1, "Start time is required").regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
  endTime: z.string().trim().min(1, "End time is required").regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)"),
});

export const updateWorkAreaSchema = createWorkAreaSchema.extend({
  workAreaId: z.string().min(1, "Work area ID is required"),
});


export type UpdateTraderProfileInput = z.infer<typeof updateTraderProfileSchema>;
export type CreateWorkAreaInput = z.infer<typeof createWorkAreaSchema>;
export type UpdateWorkAreaInput = z.infer<typeof updateWorkAreaSchema>;
