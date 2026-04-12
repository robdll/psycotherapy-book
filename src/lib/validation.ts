import { z } from "zod";

export const createBookingSchema = z.object({
  clientName: z.string().min(2).max(120),
  clientEmail: z.string().email().max(200),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
