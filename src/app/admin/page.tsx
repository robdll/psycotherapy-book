"use client";

import { useCallback, useEffect, useState } from "react";

const weekdayLabels: { v: number; l: string }[] = [
  { v: 0, l: "Dom" },
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
];

type Settings = {
  googleConnected: boolean;
  allowedWeekdays: number[];
  sessionMinutes: number;
  bufferMinutes: number;
  dayStartLocal: string;
  dayEndLocal: string;
  timezone: string;
  sessionPriceCents: number;
};

type Blackout = { id: string; date: string; note: string | null };

const field =
  "mt-1 w-full rounded-md border border-gold/30 bg-parchment px-2 py-1.5 text-sm text-parchment-ink focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold/50";

const card = "space-y-3 rounded-xl border border-gold/30 bg-navy-800/40 p-5 backdrop-blur-sm";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [blackouts, setBlackouts] = useState<Blackout[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [bDate, setBDate] = useState("");
  const [bNote, setBNote] = useState("");

  const load = useCallback(async () => {
    const [sRes, bRes] = await Promise.all([
      fetch("/api/admin/settings", { credentials: "include" }),
      fetch("/api/admin/blackouts", { credentials: "include" }),
    ]);
    if (sRes.status === 401 || bRes.status === 401) {
      setAuthed(false);
      return;
    }
    setAuthed(true);
    if (sRes.ok) setSettings((await sRes.json()) as Settings);
    if (bRes.ok) {
      const j = (await bRes.json()) as { blackouts: Blackout[] };
      setBlackouts(j.blackouts);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    queueMicrotask(() => {
      const p = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
      const g = p.get("google");
      if (g === "connected") setMsg("Google Calendar conectado.");
      if (g === "error") setMsg("Falha ao conectar Google. Tente novamente.");
    });
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setMsg("Senha incorreta.");
      return;
    }
    setPassword("");
    await load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setAuthed(false);
    setSettings(null);
  }

  async function saveSettings() {
    if (!settings) return;
    setMsg(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        allowedWeekdays: settings.allowedWeekdays,
        sessionMinutes: settings.sessionMinutes,
        bufferMinutes: settings.bufferMinutes,
        dayStartLocal: settings.dayStartLocal,
        dayEndLocal: settings.dayEndLocal,
        timezone: settings.timezone,
        sessionPriceCents: settings.sessionPriceCents,
      }),
    });
    setMsg(res.ok ? "Configurações salvas." : "Erro ao salvar.");
  }

  function toggleWeekday(v: number) {
    setSettings((prev) => {
      if (!prev) return prev;
      const has = prev.allowedWeekdays.includes(v);
      const next = has ? prev.allowedWeekdays.filter((x) => x !== v) : [...prev.allowedWeekdays, v].sort((a, b) => a - b);
      if (next.length === 0) return prev;
      return { ...prev, allowedWeekdays: next };
    });
  }

  async function addBlackout(e: React.FormEvent) {
    e.preventDefault();
    if (!bDate) return;
    const res = await fetch("/api/admin/blackouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ date: bDate, note: bNote || undefined }),
    });
    if (res.ok) {
      setBDate("");
      setBNote("");
      await load();
      setMsg("Dia bloqueado.");
    }
  }

  async function removeBlackout(date: string) {
    await fetch(`/api/admin/blackouts?date=${encodeURIComponent(date)}`, {
      method: "DELETE",
      credentials: "include",
    });
    await load();
  }

  if (!authed) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-16">
        <h1 className="font-display text-xl font-semibold text-parchment">Administração</h1>
        <form onSubmit={login} className="mt-6 space-y-4">
          <div>
            <label className="text-sm text-parchment/70">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
          </div>
          <button
            type="submit"
            className="rounded-md border border-gold/50 bg-gold px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-hover"
          >
            Entrar
          </button>
        </form>
        {msg && <p className="mt-4 text-sm text-amber-200">{msg}</p>}
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="mx-auto max-w-md flex-1 px-4 py-16">
        <p className="text-sm text-parchment/60">Carregando…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-10 px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-xl font-semibold text-parchment">Administração</h1>
        <button type="button" onClick={() => void logout()} className="text-sm text-gold-dim underline decoration-gold/40 hover:text-gold">
          Sair
        </button>
      </div>
      {msg && <p className="text-sm text-gold">{msg}</p>}

      <section className={card}>
        <h2 className="text-sm font-semibold text-gold-dim">Google Calendar + Meet</h2>
        <p className="text-sm text-parchment/80">
          Funciona com Gmail pessoal ou Google Workspace. Após conectar, o sistema consulta horários livres e cria eventos com Meet ao
          confirmar o PIX.
        </p>
        <p className="text-sm text-parchment">
          Estado:{" "}
          <span className={settings.googleConnected ? "font-semibold text-gold" : "font-semibold text-amber-200"}>
            {settings.googleConnected ? "Conectado" : "Não conectado"}
          </span>
        </p>
        <a
          href="/api/auth/google"
          className="inline-flex rounded-md border border-gold/45 bg-gold px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-hover"
        >
          Conectar conta Google
        </a>
      </section>

      <section className={`${card} space-y-4`}>
        <h2 className="text-sm font-semibold text-gold-dim">Disponibilidade semanal</h2>
        <div className="flex flex-wrap gap-2">
          {weekdayLabels.map(({ v, l }) => (
            <button
              key={v}
              type="button"
              onClick={() => toggleWeekday(v)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                settings.allowedWeekdays.includes(v)
                  ? "border-gold/50 bg-gold text-navy-950"
                  : "border-gold/20 bg-navy-950/50 text-parchment/85 hover:border-gold/35"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-parchment/70">
            Início (HH:mm)
            <input
              value={settings.dayStartLocal}
              onChange={(e) => setSettings({ ...settings, dayStartLocal: e.target.value })}
              className={field}
            />
          </label>
          <label className="text-xs text-parchment/70">
            Fim (HH:mm)
            <input
              value={settings.dayEndLocal}
              onChange={(e) => setSettings({ ...settings, dayEndLocal: e.target.value })}
              className={field}
            />
          </label>
          <label className="text-xs text-parchment/70">
            Duração sessão (min)
            <input
              type="number"
              value={settings.sessionMinutes}
              onChange={(e) => setSettings({ ...settings, sessionMinutes: Number(e.target.value) })}
              className={field}
            />
          </label>
          <label className="text-xs text-parchment/70">
            Intervalo entre sessões (min)
            <input
              type="number"
              value={settings.bufferMinutes}
              onChange={(e) => setSettings({ ...settings, bufferMinutes: Number(e.target.value) })}
              className={field}
            />
          </label>
          <label className="text-xs text-parchment/70 sm:col-span-2">
            Fuso (IANA)
            <input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} className={field} />
          </label>
          <label className="text-xs text-parchment/70 sm:col-span-2">
            Valor sessão (centavos BRL)
            <input
              type="number"
              value={settings.sessionPriceCents}
              onChange={(e) => setSettings({ ...settings, sessionPriceCents: Number(e.target.value) })}
              className={field}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void saveSettings()}
          className="rounded-md border border-gold/50 bg-gold px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-hover"
        >
          Salvar disponibilidade
        </button>
      </section>

      <section className={`${card} space-y-4`}>
        <h2 className="text-sm font-semibold text-gold-dim">Dias fora (folgas, feriados)</h2>
        <form onSubmit={addBlackout} className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-parchment/70">
            Data
            <input type="date" value={bDate} onChange={(e) => setBDate(e.target.value)} className={field} />
          </label>
          <label className="text-xs text-parchment/70">
            Nota (opcional)
            <input value={bNote} onChange={(e) => setBNote(e.target.value)} className={field} />
          </label>
          <button
            type="submit"
            className="rounded-md border border-gold/35 bg-navy-950/60 px-3 py-2 text-sm font-medium text-parchment hover:border-gold/50"
          >
            Bloquear
          </button>
        </form>
        <ul className="space-y-2 text-sm text-parchment/90">
          {blackouts.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-2 rounded-md border border-gold/15 bg-navy-950/30 px-2 py-1.5"
            >
              <span>
                {b.date}
                {b.note ? ` — ${b.note}` : ""}
              </span>
              <button type="button" className="text-xs text-red-300 underline" onClick={() => void removeBlackout(b.date)}>
                remover
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
