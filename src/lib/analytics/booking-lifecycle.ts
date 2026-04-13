import { coarseDeviceFromUserAgent } from "@/lib/analytics/request-meta";
import { sendMetaPurchaseEvent } from "@/lib/analytics/meta-capi";
import { captureBookingConfirmedServer, captureBookingPixCreatedServer } from "@/lib/analytics/server-posthog";

export async function emitBookingPixCreatedAnalytics(params: {
  bookingId: string;
  amountCents: number;
  analyticsSessionId: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const distinctId =
    params.analyticsSessionId && params.analyticsSessionId.length > 0
      ? params.analyticsSessionId
      : `booking_${params.bookingId}`;
  const device = coarseDeviceFromUserAgent(params.userAgent ?? null);
  await captureBookingPixCreatedServer({
    distinctId,
    bookingId: params.bookingId,
    amountCents: params.amountCents,
    ip: params.ip,
    userAgent: params.userAgent,
    device,
  });
}

export async function emitBookingConfirmedAnalytics(params: {
  bookingId: string;
  paymentId: string;
  amountCents: number;
  analyticsSessionId: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const distinctId =
    params.analyticsSessionId && params.analyticsSessionId.length > 0
      ? params.analyticsSessionId
      : `booking_${params.bookingId}`;
  const device = coarseDeviceFromUserAgent(params.userAgent ?? null);
  await captureBookingConfirmedServer({
    distinctId,
    bookingId: params.bookingId,
    paymentId: params.paymentId,
    amountCents: params.amountCents,
    ip: params.ip,
    userAgent: params.userAgent,
    device,
  });

  await sendMetaPurchaseEvent({
    bookingId: params.bookingId,
    value: params.amountCents / 100,
    currency: "BRL",
    clientIp: params.ip,
    userAgent: params.userAgent,
  });
}
