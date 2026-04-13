"use client";

import Script from "next/script";
import posthog from "posthog-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CONSENT_STORAGE_KEY, type AnalyticsConsent } from "@/lib/analytics/constants";
import { getOrCreateSessionId, getPersistedAttribution, persistAttributionFromUrl } from "@/lib/analytics/attribution-client";

type AnalyticsContextValue = {
  capture: (event: string, props?: Record<string, unknown>) => void;
  consent: AnalyticsConsent | null;
  /** True after reading localStorage (avoids consent banner flash on SSR). */
  preferenceReady: boolean;
  acceptAnalytics: () => void;
  essentialOnly: () => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue>({
  capture: () => {},
  consent: null,
  preferenceReady: false,
  acceptAnalytics: () => {},
  essentialOnly: () => {},
});

export function useAnalytics() {
  return useContext(AnalyticsContext);
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<AnalyticsConsent | null>(null);
  const [preferenceReady, setPreferenceReady] = useState(false);
  const phInitRef = useRef(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored === "accepted" || stored === "essential") {
        setConsent(stored);
      } else {
        setConsent(null);
      }
      persistAttributionFromUrl();
      getOrCreateSessionId();
      setPreferenceReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!preferenceReady || consent !== "accepted") return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || phInitRef.current) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      persistence: "localStorage",
      autocapture: false,
      capture_pageview: false,
    });
    phInitRef.current = true;
    const utm = getPersistedAttribution();
    const sid = getOrCreateSessionId();
    posthog.register({ ...utm, analytics_session_id: sid });
  }, [consent, preferenceReady]);

  const capture = useCallback(
    (event: string, props?: Record<string, unknown>) => {
      if (consent !== "accepted") return;
      try {
        posthog.capture(event, props);
      } catch {
        /* ignore */
      }
    },
    [consent],
  );

  const acceptAnalytics = useCallback(() => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
    setConsent("accepted");
  }, []);

  const essentialOnly = useCallback(() => {
    localStorage.setItem(CONSENT_STORAGE_KEY, "essential");
    setConsent("essential");
  }, []);

  const value = useMemo(
    () => ({ capture, consent, preferenceReady, acceptAnalytics, essentialOnly }),
    [capture, consent, preferenceReady, acceptAnalytics, essentialOnly],
  );

  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <AnalyticsContext.Provider value={value}>
      {consent === "accepted" && pixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
            n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${pixelId}');
            fbq('track','PageView');
          `}
        </Script>
      ) : null}
      {children}
    </AnalyticsContext.Provider>
  );
}
