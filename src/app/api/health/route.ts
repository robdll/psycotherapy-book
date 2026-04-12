import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prismaPublicErrorFields } from "@/lib/prisma-public-error";

export const dynamic = "force-dynamic";

/**
 * Public liveness + Mongo connectivity (no auth). Use after deploy:
 * GET /api/health — if database is "down", fix DATABASE_URL / Atlas Network Access for Vercel.
 */
export async function GET() {
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    return NextResponse.json({ ok: true, database: "up" });
  } catch (e) {
    console.error("[api/health]", e);
    return NextResponse.json(
      { ok: false, database: "down", ...prismaPublicErrorFields(e) },
      { status: 503 },
    );
  }
}
