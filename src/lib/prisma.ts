import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Atlas + Prisma require a database name in the path (`/dbname` before `?`).
 * Atlas “Connect → Drivers” often gives `...mongodb.net/?appName=...` → AtlasError: empty database name not allowed.
 */
function assertMongoDatabaseInUrl(url: string | undefined) {
  const u = url?.trim();
  if (!u) return;
  const at = u.indexOf("@");
  if (at === -1) return;
  const q = u.indexOf("?", at);
  const authorityAndPath = q === -1 ? u.slice(at) : u.slice(at, q);
  const slash = authorityAndPath.indexOf("/");
  if (slash === -1 || slash >= authorityAndPath.length - 1) {
    throw new Error(
      "DATABASE_URL must include the database name after the host, e.g. ...mongodb.net/psicology_booking?retryWrites=... Fix this in Vercel env (Atlas UI often omits /dbname before ?).",
    );
  }
  const db = authorityAndPath.slice(slash + 1).trim();
  if (!db) {
    throw new Error(
      "DATABASE_URL has an empty database name. Use ...mongodb.net/psicology_booking?... not ...mongodb.net/?...",
    );
  }
}

assertMongoDatabaseInUrl(process.env.DATABASE_URL);

/** Single instance per serverless isolate (Vercel); avoids connection churn and “too many connections”. */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
