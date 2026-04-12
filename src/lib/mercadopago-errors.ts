/** Best-effort message from Mercado Pago SDK / API errors for logs. */
export function formatMercadoPagoError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const o = err as Record<string, unknown>;
    if (Array.isArray(o.cause)) {
      const parts = o.cause
        .map((c) => {
          if (c && typeof c === "object" && "description" in c) return String((c as { description: unknown }).description);
          return String(c);
        })
        .filter(Boolean);
      if (parts.length) return parts.join("; ");
    }
    if (typeof o.message === "string" && o.message.trim() && o.message !== "null") return o.message;
    try {
      return JSON.stringify(o).slice(0, 500);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

/**
 * Message safe to return to the browser for payment failures (no env / credential hints).
 */
export function mercadoPagoErrorForClient(err: unknown): string | undefined {
  const raw = formatMercadoPagoError(err);
  if (/MERCADOPAGO_ACCESS_TOKEN|access[_\s]?token|Missing MERCADOPAGO|Bearer\s/i.test(raw)) return undefined;
  if (raw.length > 400) return `${raw.slice(0, 400)}…`;
  return raw;
}
