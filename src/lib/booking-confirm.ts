import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/lib/booking-status";
import { getPaymentById } from "@/lib/mercadopago-client";
import { createMeetEvent, isGoogleConnected } from "@/lib/google-calendar";
import { getAvailabilitySettings } from "@/lib/settings";
import { overlaps } from "@/lib/availability";

export async function finalizeBookingAfterApprovedPayment(params: {
  bookingId: string;
  paymentId: string;
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

  const settings = await getAvailabilitySettings();
  let calendarEventId: string | null = null;

  if (await isGoogleConnected()) {
    calendarEventId = await createMeetEvent({
      summary: `Sessão — ${booking.clientName}`,
      description: `Agendamento confirmado. Contato: ${booking.clientEmail}`,
      start: booking.startAt,
      end: booking.endAt,
      timeZone: settings.timezone,
      attendeeEmail: booking.clientEmail,
    });
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.CONFIRMED,
      mercadoPagoPaymentId: params.paymentId,
      calendarEventId,
    },
  });

  return { ok: true };
}
