import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { isGoogleConnected } from "@/lib/google-calendar";
import { getAvailabilitySettings, parseAllowedWeekdays } from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  allowedWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional(),
  sessionMinutes: z.number().int().min(15).max(180).optional(),
  bufferMinutes: z.number().int().min(0).max(60).optional(),
  dayStartLocal: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dayEndLocal: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().min(3).max(80).optional(),
  sessionPriceCents: z.number().int().min(100).optional(),
});

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const s = await getAvailabilitySettings();
    const googleConnected = await isGoogleConnected();
    return NextResponse.json({
      googleConnected,
      allowedWeekdays: parseAllowedWeekdays(s.allowedWeekdaysJson),
      sessionMinutes: s.sessionMinutes,
      bufferMinutes: s.bufferMinutes,
      dayStartLocal: s.dayStartLocal,
      dayEndLocal: s.dayEndLocal,
      timezone: s.timezone,
      sessionPriceCents: s.sessionPriceCents,
    });
  } catch (e) {
    console.error("[api/admin/settings GET]", e);
    const showDetail =
      process.env.NODE_ENV !== "production" || process.env.ADMIN_API_DEBUG === "1";
    const detail = showDetail && e instanceof Error ? e.message : undefined;
    return NextResponse.json(
      { error: "server_error", ...(detail ? { detail } : {}) },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  await prisma.availabilitySettings.update({
    where: { id: "default" },
    data: {
      ...(data.allowedWeekdays
        ? { allowedWeekdaysJson: JSON.stringify(data.allowedWeekdays) }
        : {}),
      ...(data.sessionMinutes != null ? { sessionMinutes: data.sessionMinutes } : {}),
      ...(data.bufferMinutes != null ? { bufferMinutes: data.bufferMinutes } : {}),
      ...(data.dayStartLocal ? { dayStartLocal: data.dayStartLocal } : {}),
      ...(data.dayEndLocal ? { dayEndLocal: data.dayEndLocal } : {}),
      ...(data.timezone ? { timezone: data.timezone } : {}),
      ...(data.sessionPriceCents != null ? { sessionPriceCents: data.sessionPriceCents } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
