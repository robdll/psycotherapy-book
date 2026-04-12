import { Prisma } from "@prisma/client";

/** Safe fields to expose in JSON when Prisma (or similar) fails — no secrets, no connection strings. */
export function prismaPublicErrorFields(error: unknown): Record<string, string> {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return { cause: "prisma_request", prisma_code: error.code };
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return { cause: "prisma_init", prisma_code: error.errorCode ?? "unknown" };
  }
  if (error instanceof Prisma.PrismaClientValidationError) {
    return { cause: "prisma_validation" };
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return { cause: "prisma_unknown" };
  }
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return { cause: "prisma_engine" };
  }
  if (error instanceof Error) {
    return { cause: error.name };
  }
  return { cause: "unknown" };
}
