"use client";

import { useAnalytics } from "@/components/AnalyticsProvider";

export function AnalyticsConsentBanner() {
  const { consent, preferenceReady, acceptAnalytics, essentialOnly } = useAnalytics();

  if (!preferenceReady || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookies e medição de audiência"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gold/30 bg-navy-950/95 px-4 py-3 text-sm text-parchment shadow-lg backdrop-blur-md md:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-parchment/90">
          Usamos cookies e ferramentas de medição (por exemplo PostHog e, se configurado, Meta Pixel) apenas com a sua
          escolha, para entender como o site é usado e melhorar o agendamento. Dados sensíveis do formulário não são
          enviados a essas ferramentas. Detalhes na{" "}
          <a href="/privacidade" className="font-medium text-gold underline decoration-gold/50 underline-offset-2">
            política de privacidade
          </a>
          .
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={essentialOnly}
            className="rounded-md border border-gold/40 px-3 py-2 text-xs font-semibold text-parchment/90 transition hover:bg-navy-800"
          >
            Apenas essenciais
          </button>
          <button
            type="button"
            onClick={acceptAnalytics}
            className="rounded-md border border-gold/50 bg-gold px-3 py-2 text-xs font-semibold text-navy-950 transition hover:bg-gold-hover"
          >
            Aceitar medição
          </button>
        </div>
      </div>
    </div>
  );
}
