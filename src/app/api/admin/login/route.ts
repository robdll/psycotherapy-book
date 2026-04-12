import { NextResponse } from "next/server";
import { setAdminSessionCookie, verifyAdminPassword } from "@/lib/admin-session";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !verifyAdminPassword(password)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await setAdminSessionCookie();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "session_not_configured" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
