import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { computeOpenSlots } from "@/lib/open-slots";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const rangeStart = fromParam ? new Date(fromParam) : new Date();
  const rangeEnd = toParam ? new Date(toParam) : addDays(rangeStart, 42);

  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    return NextResponse.json({ error: "invalid_date_range" }, { status: 400 });
  }

  const slots = await computeOpenSlots({ rangeStart, rangeEnd });
  return NextResponse.json({
    slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
  });
}
