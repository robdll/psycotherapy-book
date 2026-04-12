import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-gold/30 bg-navy-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="font-display text-base font-semibold tracking-tight text-parchment">
          Agendamento
        </Link>
        <nav className="flex items-center gap-5 text-sm text-parchment/80">
          <Link href="/book" className="transition hover:text-gold">
            Reservar
          </Link>
          <Link href="/privacidade" className="transition hover:text-gold">
            Privacidade
          </Link>
        </nav>
      </div>
    </header>
  );
}
