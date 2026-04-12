import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-dim">Psicoterapia online</p>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-parchment md:text-4xl">
          Agende sua sessão com segurança
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-parchment/85">
          Escolha um horário disponível, pague com{" "}
          <strong className="font-semibold text-gold">PIX</strong> e receba a confirmação com convite no Google Calendar e link do Google
          Meet.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/book"
          className="inline-flex items-center justify-center rounded-md border border-gold/50 bg-gold px-5 py-2.5 text-sm font-semibold text-navy-950 shadow-sm transition hover:border-gold-hover hover:bg-gold-hover"
        >
          Ver horários disponíveis
        </Link>
        <Link
          href="/privacidade"
          className="inline-flex items-center justify-center rounded-md border border-gold/35 bg-transparent px-5 py-2.5 text-sm font-medium text-parchment transition hover:border-gold hover:bg-navy-800/60"
        >
          Política de privacidade
        </Link>
      </div>
      <p className="text-sm text-parchment/55">
        Para Instagram: coloque o link desta página na bio (por exemplo{" "}
        <code className="rounded border border-gold/25 bg-navy-800/80 px-1.5 py-0.5 font-mono text-xs text-gold">/book</code>).
      </p>
    </main>
  );
}
