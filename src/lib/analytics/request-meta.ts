/** First client IP from common reverse-proxy headers (Vercel, nginx, etc.). */
export function clientIpFromHeaders(headers: Headers): string | null {
  const vercel = headers.get("x-vercel-forwarded-for");
  if (vercel) {
    const first = vercel.split(",")[0]?.trim();
    if (first) return first;
  }
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real?.trim()) return real.trim();
  return null;
}

/** Coarse device buckets for analytics (no raw UA in dashboards if you prefer filtering in PostHog). */
export function coarseDeviceFromUserAgent(userAgent: string | null): { device_type?: string; os_family?: string } {
  if (!userAgent) return {};
  const ua = userAgent.toLowerCase();
  let device_type: string | undefined;
  if (/mobile|android|iphone|ipod|webos|blackberry/i.test(userAgent)) device_type = "mobile";
  else if (/tablet|ipad/i.test(userAgent)) device_type = "tablet";
  else device_type = "desktop";

  let os_family: string | undefined;
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ios")) os_family = "ios";
  else if (ua.includes("android")) os_family = "android";
  else if (ua.includes("windows")) os_family = "windows";
  else if (ua.includes("mac os")) os_family = "macos";
  else if (ua.includes("linux")) os_family = "linux";

  return { device_type, os_family };
}
