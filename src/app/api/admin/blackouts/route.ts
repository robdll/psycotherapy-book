import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().max(200).optional(),
});

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const rows = await prisma.blackoutDate.findMany({ orderBy: { date: "asc" } });
    return NextResponse.json({ blackouts: rows });
  } catch (e) {
    console.error("[api/admin/blackouts GET]", e);
    const showDetail =
      process.env.NODE_ENV !== "production" || process.env.ADMIN_API_DEBUG === "1";
    const detail = showDetail && e instanceof Error ? e.message : undefined;
    return NextResponse.json(
      { error: "server_error", ...(detail ? { detail } : {}) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = addSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const row = await prisma.blackoutDate.upsert({
    where: { date: parsed.data.date },
    create: { date: parsed.data.date, note: parsed.data.note },
    update: { note: parsed.data.note ?? null },
  });
  return NextResponse.json({ blackout: row });
}

export async function DELETE(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }
  await prisma.blackoutDate.deleteMany({ where: { date } });
  return NextResponse.json({ ok: true });
}
