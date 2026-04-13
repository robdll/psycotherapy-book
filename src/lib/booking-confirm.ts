import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/lib/booking-status";
import { getPaymentById } from "@/lib/mercadopago-client";
import { createMeetEvent, isGoogleConnected } from "@/lib/google-calendar";
import { getAvailabilitySettings } from "@/lib/settings";
import { overlaps } from "@/lib/availability";
import { emitBookingConfirmedAnalytics } from "@/lib/analytics/booking-lifecycle";

export async function finalizeBookingAfterApprovedPayment(params: {
  bookingId: string;
  paymentId: string;
  requestContext?: { clientIp: string | null; userAgent: string | null };
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const booking = await prisma.booking.findUnique({ where: { id: params.bookingId } });
  if (!booking) return { ok: false, reason: "booking_not_found" };
  if (booking.status === BookingStatus.CONFIRMED) return { ok: true };
  if (booking.status !== BookingStatus.PENDING_PAYMENT) {
    return { ok: false, reason: "invalid_status" };
  }

  if (booking.mercadoPagoPaymentId && booking.mercadoPagoPaymentId !== params.paymentId) {
    return { ok: false, reason: "payment_mismatch" };
  }

  const remote = await getPaymentById(params.paymentId);
  if (remote.status !== "approved") {
    return { ok: false, reason: "payment_not_approved" };
  }

  const extRef = remote.external_reference;
  if (extRef && extRef !== booking.id) {
    return { ok: false, reason: "external_reference_mismatch" };
  }

  const others = await prisma.booking.findMany({
    where: {
      id: { not: booking.id },
      status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_PAYMENT] },
    },
  });

  for (const o of others) {
    if (overlaps(booking.startAt, booking.endAt, o.startAt, o.endAt)) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED },
      });
      return { ok: false, reason: "slot_conflict" };
    }
  }

  const mpIdBeforeClaim = booking.mercadoPagoPaymentId;
  const claimed = await prisma.booking.updateMany({
    where: { id: params.bookingId, status: BookingStatus.PENDING_PAYMENT },
    data: {
      status: BookingStatus.CONFIRMED,
      mercadoPagoPaymentId: params.paymentId,
    },
  });
  const newlyConfirmed = claimed.count > 0;

  if (claimed.count === 0) {
    const again = await prisma.booking.findUnique({ where: { id: params.bookingId } });
    if (!again) return { ok: false, reason: "booking_not_found" };
    if (again.status === BookingStatus.CONFIRMED) {
      const samePayment =
        !again.mercadoPagoPaymentId || again.mercadoPagoPaymentId === params.paymentId;
      return samePayment ? { ok: true } : { ok: false, reason: "payment_mismatch" };
    }
    return { ok: false, reason: "claim_failed" };
  }

  const settings = await getAvailabilitySettings();

  if (await isGoogleConnected()) {
    try {
      const calendarEventId = await createMeetEvent({
        summary: `Sessão — ${booking.clientName}`,
        description: `Agendamento confirmado. Contato: ${booking.clientEmail}`,
        start: booking.startAt,
        end: booking.endAt,
        timeZone: settings.timezone,
        attendeeEmail: booking.clientEmail,
      });
      await prisma.booking.update({
        where: { id: booking.id },
        data: { calendarEventId },
      });
    } catch (err) {
      console.error("[booking-confirm] Google Calendar create failed; reverting booking for retry", err);
      await prisma.booking.updateMany({
        where: { id: params.bookingId, status: BookingStatus.CONFIRMED },
        data: {
          status: BookingStatus.PENDING_PAYMENT,
          mercadoPagoPaymentId: mpIdBeforeClaim,
        },
      });
      throw err;
    }
  }

  if (newlyConfirmed) {
    const row = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { analyticsSessionId: true, amountCents: true },
    });
    await emitBookingConfirmedAnalytics({
      bookingId: booking.id,
      paymentId: params.paymentId,
      amountCents: row?.amountCents ?? booking.amountCents,
      analyticsSessionId: row?.analyticsSessionId ?? null,
      ip: params.requestContext?.clientIp,
      userAgent: params.requestContext?.userAgent,
    });
  }

  return { ok: true };
}
