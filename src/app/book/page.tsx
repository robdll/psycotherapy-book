"use client";

import { addDays } from "date-fns";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pix, setPix] = useState<{
    paymentId: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
  } | null>(null);

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
      setError("Não foi possível carregar os horários. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const slotLabel = useMemo(() => {
    if (!selected) return "";
    return fmt.format(new Date(selected.start));
  }, [selected]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: name.trim(),
          clientEmail: email.trim(),
          startAt: selected.start,
          endAt: selected.end,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          data.error === "slot_unavailable" || data.error === "slot_reserved"
            ? "Esse horário acabou de ser reservado. Escolha outro."
            : "Não foi possível criar o pagamento. Verifique os dados ou tente mais tarde.",
        );
        await load();
        return;
      }
      setPix(data.pix);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-gold/30 bg-parchment px-3 py-2 text-sm text-parchment-ink placeholder:text-parchment-ink/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
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
          <section>
            <h2 className="text-sm font-semibold text-gold-dim">1. Horário</h2>
            {loading ? (
              <p className="mt-2 text-sm text-parchment/60">Carregando…</p>
            ) : slots.length === 0 ? (
              <p className="mt-2 text-sm text-parchment/60">Nenhum horário livre neste período.</p>
            ) : (
              <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-lg border border-gold/30 bg-navy-800/50 p-2">
                {slots.map((s) => {
                  const active = selected?.start === s.start;
                  return (
                    <li key={s.start}>
                      <button
                        type="button"
                        onClick={() => setSelected(s)}
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

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gold-dim">2. Seus dados</h2>
            <div>
              <label className="block text-xs font-medium text-parchment/70">Nome completo</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs font-medium text-parchment/70">E-mail (para o convite)</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
            </div>
          </section>

          <button
            type="submit"
            disabled={!selected || submitting}
            className="rounded-md border border-gold/50 bg-gold px-5 py-2.5 text-sm font-semibold text-navy-950 transition hover:bg-gold-hover disabled:opacity-45"
          >
            {submitting ? "Gerando PIX…" : "Gerar pagamento PIX"}
          </button>
        </form>
      ) : (
        <div className="mt-8 space-y-4 rounded-xl border border-gold/35 bg-parchment p-6 text-parchment-ink shadow-lg shadow-black/20">
          <h2 className="font-display text-lg font-semibold">Pague com PIX para confirmar</h2>
          <p className="text-sm text-parchment-ink/80">
            Horário: <span className="font-semibold text-parchment-ink">{slotLabel}</span>
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
