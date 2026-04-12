import { z } from "zod";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";

export const createBookingSchema = z.object({
  clientName: z.string().min(2).max(120),
  clientEmail: z.string().email().max(200),
  clientCpf: z
    .string()
    .transform((s) => normalizeCpf(s))
    .refine((d) => d.length === 11, "CPF deve ter 11 dígitos")
    .refine(isValidCpf, "CPF inválido"),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
