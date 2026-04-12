import { getPaymentById } from "@/lib/mercadopago-client";
import { finalizeBookingAfterApprovedPayment } from "@/lib/booking-confirm";

/**
 * If MP shows the payment as approved, finalize the booking (idempotent).
 * Use from webhooks and from GET polling so the UI can catch up after sandbox / latency.
 */
export async function tryFinalizeFromMercadoPagoPaymentId(paymentId: string): Promise<
  | { ok: true }
  | { ok: false; reason: string; mpStatus?: string }
> {
  const remote = await getPaymentById(paymentId);
  const id = remote.id != null ? String(remote.id) : paymentId;
  const bookingId = remote.external_reference;
  if (!bookingId) {
    return { ok: false, reason: "no_external_reference" };
  }
  if (remote.status !== "approved") {
    return { ok: false, reason: "payment_not_approved", mpStatus: remote.status };
  }
  return finalizeBookingAfterApprovedPayment({ bookingId, paymentId: id });
}
