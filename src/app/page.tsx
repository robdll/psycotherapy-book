import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <div className="space-y-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-dim">Psicoanálise online</p>
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-parchment md:text-4xl">
          Agende sua sessão com segurança
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-parchment/85">
          Escolha um horário disponível, pague com{" "}
          <strong className="font-semibold text-gold">PIX</strong> e receba a confirmação com convite no Google Calendar e link do Google
          Meet.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link
          href="/book"
          className="inline-flex w-fit items-center justify-center rounded-md border border-gold/50 bg-gold px-5 py-2.5 text-sm font-semibold text-navy-950 shadow-sm transition hover:border-gold-hover hover:bg-gold-hover"
        >
          Ver horários disponíveis
        </Link>
        <Link
          href="/privacidade"
          className="w-fit text-xs text-parchment/50 underline decoration-gold/35 underline-offset-4 transition hover:text-parchment/75 hover:decoration-gold/55"
        >
          Política de privacidade
        </Link>
      </div>
    </main>
  );
}
