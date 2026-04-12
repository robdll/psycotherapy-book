import { NextRequest, NextResponse } from "next/server";
import { finalizeBookingAfterApprovedPayment } from "@/lib/booking-confirm";
import { verifyMercadoPagoWebhookSignature } from "@/lib/mercadopago-client";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const paymentId =
    body?.data?.id != null
      ? String(body.data.id)
      : req.nextUrl.searchParams.get("data.id") ?? req.nextUrl.searchParams.get("id");

  if (!paymentId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const signature = req.headers.get("x-signature");
  const requestId = req.headers.get("x-request-id");

  if (
    !verifyMercadoPagoWebhookSignature({
      signatureHeader: signature,
      requestId,
      dataId: paymentId,
    })
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const { getPaymentById } = await import("@/lib/mercadopago-client");
  const remote = await getPaymentById(paymentId);
  const bookingId = remote.external_reference;
  if (!bookingId) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (remote.status === "approved") {
    const res = await finalizeBookingAfterApprovedPayment({ bookingId, paymentId });
    if (!res.ok) {
      console.error("finalizeBookingAfterApprovedPayment", res);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
