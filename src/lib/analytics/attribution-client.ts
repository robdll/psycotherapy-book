"use client";

import { ATTRIBUTION_STORAGE_KEY, SESSION_ID_STORAGE_KEY } from "@/lib/analytics/constants";

export type PersistedAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  initial_path?: string;
};

function readParams(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const params = new URLSearchParams(search);
    for (const [k, v] of params) {
      if (v) out[k] = v;
    }
  } catch {
    /* ignore */
  }
  return out;
}

function pickUtms(params: Record<string, string>): PersistedAttribution {
  const get = (k: string) => params[k] ?? params[k.toLowerCase()];
  return {
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_content: get("utm_content"),
    utm_term: get("utm_term"),
  };
}

/** Merge URL UTMs into sessionStorage (first-touch within the tab session). */
export function persistAttributionFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = readParams(window.location.search);
  const fromUrl = pickUtms(params);
  const hasAny = Object.values(fromUrl).some(Boolean);
  if (!hasAny) return;

  let existing: PersistedAttribution = {};
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (raw) existing = JSON.parse(raw) as PersistedAttribution;
  } catch {
    /* ignore */
  }

  const merged: PersistedAttribution = { ...existing };
  for (const [k, v] of Object.entries(fromUrl)) {
    if (v && !merged[k as keyof PersistedAttribution]) {
      (merged as Record<string, string>)[k] = v;
    }
  }
  if (!merged.initial_path) {
    merged.initial_path = window.location.pathname + window.location.search;
  }
  sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(merged));
}

export function getPersistedAttribution(): PersistedAttribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PersistedAttribution;
  } catch {
    return {};
  }
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      sessionStorage.setItem(SESSION_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}
