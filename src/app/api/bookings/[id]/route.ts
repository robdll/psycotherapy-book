import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/lib/booking-status";
import { tryFinalizeFromMercadoPagoPaymentId } from "@/lib/booking-mp-sync";

/**
 * Public read + sync: if PIX was approved in MP, finalize booking (same as webhook).
 * Used by /book polling so the UI can show confirmation without a push channel.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id || id.length > 40) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  let booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (booking.status === BookingStatus.PENDING_PAYMENT && booking.mercadoPagoPaymentId) {
    await tryFinalizeFromMercadoPagoPaymentId(booking.mercadoPagoPaymentId);
    booking = await prisma.booking.findUniqueOrThrow({ where: { id } });
  }

  return NextResponse.json({
    id: booking.id,
    status: booking.status,
    startAt: booking.startAt.toISOString(),
    endAt: booking.endAt.toISOString(),
    calendarEventId: booking.calendarEventId,
  });
}
