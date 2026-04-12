import { z } from "zod";
import { isValidCpf, normalizeCpf } from "@/lib/cpf";

export const createBookingSchema = z.object({
  clientName: z.string().min(2).max(120),
  clientEmail: z.string().email().max(200),
  clientCpf: z.preprocess(
    (v) => (v === undefined || v === null ? "" : String(v)),
    z
      .string()
      .transform((s) => normalizeCpf(s))
      .refine((d) => d.length === 0 || d.length === 11, "CPF deve ter 11 dígitos ou ficar em branco")
      .refine((d) => d.length === 0 || isValidCpf(d), "CPF inválido"),
  ),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
});
