import { MercadoPagoConfig, Payment } from "mercadopago";
import { createHmac, timingSafeEqual } from "crypto";

function getPaymentClient() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN");
  return new Payment(new MercadoPagoConfig({ accessToken: token }));
}

export type PixPaymentResult = {
  paymentId: string;
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
};

export async function createPixPaymentForBooking(params: {
  bookingId: string;
  amountCents: number;
  clientEmail: string;
  clientName: string;
  description: string;
  /** ISO datetime when PIX offer expires (Mercado Pago format) */
  dateOfExpiration?: string;
}): Promise<PixPaymentResult> {
  const payment = getPaymentClient();
  const amount = Math.round(params.amountCents) / 100;
  const [firstName, ...rest] = params.clientName.trim().split(/\s+/);
  const lastName = rest.join(" ") || firstName;

  const res = await payment.create({
    body: {
      transaction_amount: amount,
      description: params.description,
      payment_method_id: "pix",
      external_reference: params.bookingId,
      payer: {
        email: params.clientEmail,
        first_name: firstName.slice(0, 50),
        last_name: lastName.slice(0, 50),
      },
      ...(params.dateOfExpiration
        ? { date_of_expiration: params.dateOfExpiration }
        : {}),
    },
  });

  const id = res.id != null ? String(res.id) : "";
  if (!id) throw new Error("Mercado Pago did not return payment id");

  const tx = res.point_of_interaction?.transaction_data;
  return {
    paymentId: id,
    qrCode: tx?.qr_code,
    qrCodeBase64: tx?.qr_code_base64,
    ticketUrl: tx?.ticket_url,
  };
}

export async function getPaymentById(paymentId: string) {
  const payment = getPaymentClient();
  return payment.get({ id: paymentId });
}

/**
 * Validates `x-signature` from Mercado Pago webhooks when MERCADOPAGO_WEBHOOK_SECRET is set.
 * @see https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoWebhookSignature(params: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string;
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true;

  const raw = params.signatureHeader;
  if (!raw || !params.requestId) return false;

  const parts = raw.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const idPart = params.dataId.toLowerCase();
  const manifest = `id:${idPart};request-id:${params.requestId};ts:${ts};`;
  const hmac = createHmac("sha256", secret).update(manifest).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hmac, "utf8"), Buffer.from(v1, "utf8"));
  } catch {
    return false;
  }
}
