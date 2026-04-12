import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieBase,
  createAdminSessionToken,
  verifyAdminPassword,
} from "@/lib/admin-session";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !verifyAdminPassword(password)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let token: string;
  try {
    token = await createAdminSessionToken();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "session_not_configured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookieBase());
  return res;
}
