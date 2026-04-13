import { PostHog } from "posthog-node";
import { ANALYTICS_EVENTS } from "@/lib/analytics/constants";
import { coarseDeviceFromUserAgent } from "@/lib/analytics/request-meta";

let posthogSingleton: PostHog | null = null;

function getPostHogServer(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!posthogSingleton) {
    posthogSingleton = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogSingleton;
}

export type CoarseDevice = ReturnType<typeof coarseDeviceFromUserAgent>;

export async function captureServerPosthog(params: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  ip?: string | null;
  insertId?: string;
}): Promise<void> {
  const client = getPostHogServer();
  if (!client) return;
  try {
    client.capture({
      distinctId: params.distinctId,
      event: params.event,
      properties: {
        ...params.properties,
        ...(params.insertId ? { $insert_id: params.insertId } : {}),
        ...(params.ip ? { $ip: params.ip } : {}),
      },
    });
    await client.flush();
  } catch (err) {
    console.warn("[posthog-server] capture failed", err);
  }
}

export async function captureBookingPixCreatedServer(params: {
  distinctId: string;
  bookingId: string;
  amountCents: number;
  ip?: string | null;
  userAgent?: string | null;
  device?: CoarseDevice;
}): Promise<void> {
  await captureServerPosthog({
    distinctId: params.distinctId,
    event: ANALYTICS_EVENTS.bookingPixCreated,
    ip: params.ip,
    insertId: `booking_pix:${params.bookingId}`,
    properties: {
      booking_id: params.bookingId,
      amount_cents: params.amountCents,
      ...params.device,
    },
  });
}

export async function captureBookingConfirmedServer(params: {
  distinctId: string;
  bookingId: string;
  paymentId: string;
  amountCents: number;
  ip?: string | null;
  userAgent?: string | null;
  device?: CoarseDevice;
}): Promise<void> {
  await captureServerPosthog({
    distinctId: params.distinctId,
    event: ANALYTICS_EVENTS.bookingConfirmed,
    ip: params.ip,
    insertId: `booking_confirmed:${params.bookingId}`,
    properties: {
      booking_id: params.bookingId,
      payment_id: params.paymentId,
      amount_cents: params.amountCents,
      ...params.device,
    },
  });
}
