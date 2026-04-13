"use client";

import { addDays } from "date-fns";
import Image from "next/image";
import { useAnalytics } from "@/components/AnalyticsProvider";
import { ANALYTICS_EVENTS } from "@/lib/analytics/constants";
import { getOrCreateSessionId } from "@/lib/analytics/attribution-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Slot = { start: string; end: string };

const fmt = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
});

export default function BookPage() {
  const { capture } = useAnalytics();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [pix, setPix] = useState<{
    paymentId: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
  } | null>(null);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const formStartedName = useRef(false);
  const formStartedEmail = useRef(false);
  const cpfTouchedReported = useRef(false);
  const confirmedClientReported = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = new Date();
      const to = addDays(from, 42);
      const res = await fetch(
        `/api/availability?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
      );
      if (!res.ok) throw new Error("Falha ao carregar horários");
      const data = (await res.json()) as { slots: Slot[] };
      setSlots(data.slots);
    } catch {
      const msg = "Não foi possível carregar os horários. Tente novamente.";
      setError(msg);
      capture(ANALYTICS_EVENTS.bookingError, { error_code: "availability_load_failed" });
    } finally {
      setLoading(false);
    }
  }, [capture]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (loading) return;
    capture(ANALYTICS_EVENTS.bookPageView, { slot_count: slots.length });
  }, [loading, slots.length, capture]);

  useEffect(() => {
    if (!bookingId || paymentConfirmed) return;
    const tick = async () => {
      try {
        const r = await fetch(`/api/bookings/${bookingId}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { status: string };
        if (j.status === "CONFIRMED") setPaymentConfirmed(true);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), 2500);
    return () => clearInterval(id);
  }, [bookingId, paymentConfirmed]);

  useEffect(() => {
    if (!paymentConfirmed || confirmedClientReported.current || !bookingId) return;
    confirmedClientReported.current = true;
    capture(ANALYTICS_EVENTS.bookingConfirmed, { booking_id: bookingId });
  }, [paymentConfirmed, bookingId, capture]);

  const pickSlot = useCallback(
    (s: Slot) => {
      setSelected(s);
      capture(ANALYTICS_EVENTS.slotSelected, { slot_start: s.start });
    },
    [capture],
  );

  const slotLabel = useMemo(() => {
    if (!selected) return "";
    return fmt.format(new Date(selected.start));
  }, [selected]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const cpfDigits = cpf.replace(/\D/g, "");
    capture(ANALYTICS_EVENTS.checkoutSubmit, { has_cpf: cpfDigits.length === 11 });
    setSubmitting(true);
    setError(null);
    try {
      const sessionId = getOrCreateSessionId();
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: name.trim(),
          clientEmail: email.trim(),
          clientCpf: cpf,
          startAt: selected.start,
          endAt: selected.end,
          ...(sessionId ? { analyticsSessionId: sessionId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "invalid_body" && data.details && typeof data.details === "object") {
          const flat = data.details as { fieldErrors?: Record<string, string[]> };
          const cpfErr = flat.fieldErrors?.clientCpf?.[0];
          setError(cpfErr ?? "Confira os dados do formulário e tente de novo.");
          capture(ANALYTICS_EVENTS.bookingError, { error_code: "invalid_body", http_status: res.status });
        } else if (data.error === "slot_unavailable" || data.error === "slot_reserved") {
          setError("Esse horário acabou de ser reservado. Escolha outro.");
          capture(ANALYTICS_EVENTS.bookingError, {
            error_code: data.error === "slot_unavailable" ? "slot_unavailable" : "slot_reserved",
            http_status: res.status,
          });
        } else if (data.error === "payment_provider_error" && typeof data.details === "string") {
          setError(`Pagamento: ${data.details}`);
          capture(ANALYTICS_EVENTS.bookingError, { error_code: "payment_provider_error", http_status: res.status });
        } else {
          setError("Não foi possível criar o pagamento. Verifique os dados ou tente mais tarde.");
          capture(ANALYTICS_EVENTS.bookingError, {
            error_code: typeof data.error === "string" ? data.error : "booking_unknown",
            http_status: res.status,
          });
        }
        await load();
        return;
      }
      const bid = typeof data.bookingId === "string" ? data.bookingId : null;
      capture(ANALYTICS_EVENTS.pixPresented, { booking_id: bid });
      setBookingId(bid);
      setPix(data.pix);
    } catch {
      setError("Erro de rede. Tente novamente.");
      capture(ANALYTICS_EVENTS.bookingError, { error_code: "network_error" });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-gold/30 bg-parchment px-3 py-2 text-sm text-parchment-ink placeholder:text-parchment-ink/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 pb-28">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-parchment">Reservar sessão</h1>
      <p className="mt-2 max-w-xl text-sm text-parchment/75">
        O horário só é confirmado após o pagamento PIX ser aprovado. Você receberá o convite por e-mail com o Google Meet.
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-900/60 bg-red-950/50 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!pix ? (
        <form onSubmit={onSubmit} className="mt-8 space-y-8">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gold-dim">1. Seus dados</h2>
            <div>
              <label className="block text-xs font-medium text-parchment/70">Nome completo</label>
              <input
                required
                value={name}
                onChange={(e) => {
                  const v = e.target.value;
                  setName(v);
                  if (v.length > 0 && !formStartedName.current) {
                    formStartedName.current = true;
                    capture(ANALYTICS_EVENTS.formStarted, { field: "name" });
                  }
                }}
                onBlur={() => {
                  if (name.trim()) capture(ANALYTICS_EVENTS.formFieldCompleted, { field: "name" });
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-parchment/70">E-mail (para o convite)</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => {
                  const v = e.target.value;
                  setEmail(v);
                  if (v.length > 0 && !formStartedEmail.current) {
                    formStartedEmail.current = true;
                    capture(ANALYTICS_EVENTS.formStarted, { field: "email" });
                  }
                }}
                onBlur={() => {
                  if (email.trim()) capture(ANALYTICS_EVENTS.formFieldCompleted, { field: "email" });
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-parchment/70">CPF (opcional)</label>
              <input
                inputMode="numeric"
                autoComplete="off"
                value={cpf}
                onChange={(e) => {
                  const v = e.target.value;
                  setCpf(v);
                  if (v.length > 0 && !cpfTouchedReported.current) {
                    cpfTouchedReported.current = true;
                    capture(ANALYTICS_EVENTS.formCpfTouched);
                  }
                }}
                className={inputClass}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gold-dim">2. Horário</h2>
            {loading ? (
              <p className="mt-2 text-sm text-parchment/60">Carregando…</p>
            ) : slots.length === 0 ? (
              <p className="mt-2 text-sm text-parchment/60">Nenhum horário livre neste período.</p>
            ) : (
              <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gold/30 bg-navy-800/50 p-2">
                {slots.map((s) => {
                  const active = selected?.start === s.start;
                  return (
                    <li key={s.start}>
                      <button
                        type="button"
                        onClick={() => pickSlot(s)}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                          active
                            ? "border border-gold/50 bg-gold text-navy-950"
                            : "text-parchment/90 hover:bg-navy-800"
                        }`}
                      >
                        {fmt.format(new Date(s.start))}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <button
            type="submit"
            disabled={!selected || submitting}
            className="rounded-md border border-gold/50 bg-gold px-5 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-gold-hover disabled:opacity-45"
          >
            {submitting ? "Gerando PIX…" : "Gerar pagamento PIX"}
          </button>
        </form>
      ) : paymentConfirmed ? (
        <div className="mt-8 space-y-4 rounded-xl border border-gold/40 bg-parchment p-6 text-parchment-ink shadow-lg shadow-black/20">
          <h2 className="font-display text-lg font-semibold text-teal-900">Reserva confirmada</h2>
          <p className="text-sm text-parchment-ink/90">
            Horário: <span className="font-semibold">{slotLabel}</span>
          </p>
          <p className="text-sm text-parchment-ink/90">
            O pagamento foi reconhecido. Se o Google Calendar estiver conectado em /admin, o convite com Google Meet foi
            enviado para <span className="font-medium">{email}</span>.
          </p>
          <button
            type="button"
            onClick={() => {
              setPix(null);
              setBookingId(null);
              setPaymentConfirmed(false);
              confirmedClientReported.current = false;
              formStartedName.current = false;
              formStartedEmail.current = false;
              cpfTouchedReported.current = false;
              setSelected(null);
              void load();
            }}
            className="rounded-md border border-gold/50 bg-gold px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-hover"
          >
            Nova reserva
          </button>
        </div>
      ) : (
        <div className="mt-8 space-y-4 rounded-xl border border-gold/35 bg-parchment p-6 text-parchment-ink shadow-lg shadow-black/20">
          <h2 className="font-display text-lg font-semibold">Pague com PIX para confirmar</h2>
          <p className="text-sm text-parchment-ink/80">
            Horário: <span className="font-semibold text-parchment-ink">{slotLabel}</span>
          </p>
          <p className="rounded-md border border-gold/25 bg-white/80 px-3 py-2 text-xs text-parchment-ink/80">
            Esta página verifica automaticamente o pagamento a cada poucos segundos. Você pode fechar e voltar depois com o
            mesmo link só se anotar o ID do pagamento no Mercado Pago.
          </p>
          {pix.qrCodeBase64 && (
            <Image
              src={`data:image/png;base64,${pix.qrCodeBase64}`}
              alt="QR Code PIX"
              width={220}
              height={220}
              unoptimized
              className="mx-auto rounded-lg border border-gold/25"
            />
          )}
          {pix.qrCode && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-parchment-ink/60">Copia e cola</p>
              <textarea
                readOnly
                rows={3}
                value={pix.qrCode}
                className="mt-1 w-full rounded-md border border-gold/30 bg-white p-2 font-mono text-xs text-parchment-ink"
              />
            </div>
          )}
          {pix.ticketUrl && (
            <a
              href={pix.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-semibold text-gold-dim underline decoration-gold/50 hover:text-parchment-ink"
            >
              Abrir comprovante no Mercado Pago
            </a>
          )}
          <p className="text-xs text-parchment-ink/65">
            Após a aprovação do pagamento, o convite do Google Calendar será enviado para {email}. ID do pagamento:{" "}
            <code className="rounded border border-gold/25 bg-white px-1 font-mono text-[11px]">{pix.paymentId}</code>
          </p>
        </div>
      )}
    </main>
  );
}
