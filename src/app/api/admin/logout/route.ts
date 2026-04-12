import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE } from "@/lib/admin-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete({ name: ADMIN_SESSION_COOKIE, path: "/" });
  return res;
}
