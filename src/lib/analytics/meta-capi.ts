/**
 * Meta Conversions API — Purchase on confirmed booking (optional).
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */
export async function sendMetaPurchaseEvent(params: {
  bookingId: string;
  value: number;
  currency: string;
  clientIp?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const pixelId = process.env.META_PIXEL_ID?.trim();
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!pixelId || !token) return;

  const eventTime = Math.floor(Date.now() / 1000);
  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: eventTime,
        action_source: "website",
        event_id: `booking_${params.bookingId}_purchase`,
        user_data: {
          ...(params.clientIp ? { client_ip_address: params.clientIp } : {}),
          ...(params.userAgent ? { client_user_agent: params.userAgent } : {}),
        },
        custom_data: {
          currency: params.currency,
          value: params.value,
        },
      },
    ],
  };

  try {
    const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn("[meta-capi] Purchase request failed", res.status, await res.text());
    }
  } catch (e) {
    console.warn("[meta-capi] Purchase request error", e);
  }
}
