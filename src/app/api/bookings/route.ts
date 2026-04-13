import { addMinutes } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/lib/booking-status";
import { createPixPaymentForBooking, mercadoPagoPixDateOfExpirationIso } from "@/lib/mercadopago-client";
import { normalizeCpf } from "@/lib/cpf";
import { formatMercadoPagoError, mercadoPagoErrorForClient } from "@/lib/mercadopago-errors";
import { getAvailabilitySettings } from "@/lib/settings";
import { createBookingSchema } from "@/lib/validation";
import { computeOpenSlots } from "@/lib/open-slots";
import { clientIpFromHeaders } from "@/lib/analytics/request-meta";
import { emitBookingPixCreatedAnalytics } from "@/lib/analytics/booking-lifecycle";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body", details: parsed.error.flatten() }, { status: 400 });
  }

  const { clientName, clientEmail, clientCpf, analyticsSessionId, startAt: startStr, endAt: endStr } = parsed.data;
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
      ...(analyticsSessionId ? { analyticsSessionId } : {}),
      startAt,
      endAt,
      status: BookingStatus.PENDING_PAYMENT,
      amountCents: settings.sessionPriceCents,
    },
  });

  const description = `Sessão de psicoanálise — ${formatInTimeZone(startAt, settings.timezone, "dd/MM/yyyy HH:mm")}`;
  /** Doc: `2020-05-30T23:59:59.000-04:00` — `yyyy-MM-dd'T'HH:mm:ss.SSSxxx` in therapist TZ. */
  const dateOfExpiration = mercadoPagoPixDateOfExpirationIso(addMinutes(new Date(), 45), settings.timezone);

  const cancelBookingPayment = () =>
    prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.CANCELLED } });

  const payment502 = (err: unknown) => {
    const msg = formatMercadoPagoError(err);
    const clientDetails = mercadoPagoErrorForClient(err);
    console.error("Mercado Pago create payment failed:", msg, err);
    return NextResponse.json(
      {
        error: "payment_provider_error",
        ...(clientDetails ? { details: clientDetails } : process.env.NODE_ENV === "development" ? { details: msg } : {}),
      },
      { status: 502 },
    );
  };

  let pix: Awaited<ReturnType<typeof createPixPaymentForBooking>>;
  try {
    pix = await createPixPaymentForBooking({
      bookingId: booking.id,
      amountCents: booking.amountCents,
      clientEmail,
      clientName,
      clientCpf,
      description,
      dateOfExpiration,
    });
  } catch (e0) {
    const msg0 = formatMercadoPagoError(e0);
    const cpfDigits = normalizeCpf(clientCpf);

    if (/date_of_expiration|must be valid date/i.test(msg0)) {
      console.warn("[bookings] MP rejected date_of_expiration; retrying without field", booking.id, msg0);
      try {
        pix = await createPixPaymentForBooking({
          bookingId: booking.id,
          amountCents: booking.amountCents,
          clientEmail,
          clientName,
          clientCpf,
          description,
          idempotencyKey: `${booking.id}:nodate`,
        });
      } catch (e1) {
        const msg1 = formatMercadoPagoError(e1);
        if (/financial identity/i.test(msg1) && cpfDigits.length === 11) {
          try {
            pix = await createPixPaymentForBooking({
              bookingId: booking.id,
              amountCents: booking.amountCents,
              clientEmail,
              clientName,
              clientCpf,
              description,
              omitIdentification: true,
              idempotencyKey: `${booking.id}:nodate-noid`,
            });
          } catch (e2) {
            await cancelBookingPayment();
            return payment502(e2);
          }
        } else {
          await cancelBookingPayment();
          return payment502(e1);
        }
      }
    } else if (/financial identity/i.test(msg0) && cpfDigits.length === 11) {
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
          dateOfExpiration,
          omitIdentification: true,
          idempotencyKey: `${booking.id}:noid`,
        });
      } catch (e2) {
        await cancelBookingPayment();
        return payment502(e2);
      }
    } else {
      await cancelBookingPayment();
      return payment502(e0);
    }
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { mercadoPagoPaymentId: pix.paymentId },
  });

  const hdrs = req.headers;
  const ip = clientIpFromHeaders(hdrs);
  const ua = hdrs.get("user-agent");
  void emitBookingPixCreatedAnalytics({
    bookingId: booking.id,
    amountCents: booking.amountCents,
    analyticsSessionId: analyticsSessionId ?? null,
    ip,
    userAgent: ua,
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
