"use client";

import Link from "next/link";
import { ANALYTICS_EVENTS } from "@/lib/analytics/constants";
import { useAnalytics } from "@/components/AnalyticsProvider";

export function HomeBookingCta() {
  const { capture } = useAnalytics();

  return (
    <Link
      href="/book"
      onClick={() => capture(ANALYTICS_EVENTS.ctaBookingClick)}
      className="inline-flex w-fit items-center justify-center rounded-md border border-gold/50 bg-gold px-5 py-2.5 text-sm font-semibold text-navy-950 shadow-sm transition hover:border-gold-hover hover:bg-gold-hover"
    >
      Ver horários disponíveis
    </Link>
  );
}
