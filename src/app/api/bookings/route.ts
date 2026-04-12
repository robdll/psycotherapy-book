import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/lib/booking-status";
import { createPixPaymentForBooking } from "@/lib/mercadopago-client";
import { normalizeCpf } from "@/lib/cpf";
import { formatMercadoPagoError, mercadoPagoErrorForClient } from "@/lib/mercadopago-errors";
import { getAvailabilitySettings } from "@/lib/settings";
import { createBookingSchema } from "@/lib/validation";
import { computeOpenSlots } from "@/lib/open-slots";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { clientName, clientEmail, clientCpf, startAt: startStr, endAt: endStr } = parsed.data;
  const startAt = new Date(startStr);
  const endAt = new Date(endStr);

  const settings = await getAvailabilitySettings();
  const expectedEnd = addMinutes(startAt, settings.sessionMinutes);
  if (Math.abs(expectedEnd.getTime() - endAt.getTime()) > 60_000) {
    return NextResponse.json({ error: "slot_duration_mismatch" }, { status: 400 });
  }

  const padStart = addMinutes(startAt, -settings.bufferMinutes);
  const padEnd = addMinutes(endAt, settings.bufferMinutes);
  const open = await computeOpenSlots({ rangeStart: padStart, rangeEnd: padEnd });
  const match = open.some((s) => s.start.getTime() === startAt.getTime() && s.end.getTime() === endAt.getTime());
  if (!match) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  const blocking = await prisma.booking.findFirst({
    where: {
      status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
    },
  });
  if (blocking) {
    return NextResponse.json({ error: "slot_reserved" }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: {
      clientName,
      clientEmail,
      startAt,
      endAt,
      status: BookingStatus.PENDING_PAYMENT,
      amountCents: settings.sessionPriceCents,
    },
  });

  const description = `Sessão de psicoterapia — ${formatInTimeZone(startAt, settings.timezone, "dd/MM/yyyy HH:mm")}`;

  let pix: Awaited<ReturnType<typeof createPixPaymentForBooking>>;
  try {
    pix = await createPixPaymentForBooking({
      bookingId: booking.id,
      amountCents: booking.amountCents,
      clientEmail,
      clientName,
      clientCpf,
      description,
    });
  } catch (e1) {
    const msg1 = formatMercadoPagoError(e1);
    const cpfDigits = normalizeCpf(clientCpf);
    const retryWithoutId = /financial identity/i.test(msg1) && cpfDigits.length === 11;

    if (retryWithoutId) {
      console.warn(
        "[bookings] Mercado Pago financial identity error with CPF; retrying PIX without payer.identification",
        booking.id,
      );
      try {
        pix = await createPixPaymentForBooking({
          bookingId: booking.id,
          amountCents: booking.amountCents,
          clientEmail,
          clientName,
          clientCpf,
          description,
          omitIdentification: true,
          idempotencyKey: `${booking.id}:noid`,
        });
      } catch (e2) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED },
        });
        const msg = formatMercadoPagoError(e2);
        const clientDetails = mercadoPagoErrorForClient(e2);
        console.error("Mercado Pago create payment failed (after retry):", msg, e2);
        return NextResponse.json(
          {
            error: "payment_provider_error",
            ...(clientDetails ? { details: clientDetails } : process.env.NODE_ENV === "development" ? { details: msg } : {}),
          },
          { status: 502 },
        );
      }
    } else {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED },
      });
      const clientDetails = mercadoPagoErrorForClient(e1);
      console.error("Mercado Pago create payment failed:", msg1, e1);
      return NextResponse.json(
        {
          error: "payment_provider_error",
          ...(clientDetails ? { details: clientDetails } : process.env.NODE_ENV === "development" ? { details: msg1 } : {}),
        },
        { status: 502 },
      );
    }
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { mercadoPagoPaymentId: pix.paymentId },
  });

  return NextResponse.json({
    bookingId: booking.id,
    pix: {
      paymentId: pix.paymentId,
      qrCode: pix.qrCode,
      qrCodeBase64: pix.qrCodeBase64,
      ticketUrl: pix.ticketUrl,
    },
  });
}
