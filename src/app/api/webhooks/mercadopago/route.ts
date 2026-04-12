import { NextRequest, NextResponse } from "next/server";
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

  const { tryFinalizeFromMercadoPagoPaymentId } = await import("@/lib/booking-mp-sync");
  const res = await tryFinalizeFromMercadoPagoPaymentId(paymentId);
  if (!res.ok && res.reason !== "payment_not_approved") {
    console.error("[webhook] finalize issue", paymentId, res);
  } else if (!res.ok && res.reason === "payment_not_approved") {
    console.info("[webhook] payment not approved yet; will retry on next notification or client poll", paymentId, res.mpStatus);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
