import { NextRequest, NextResponse } from "next/server";
import { saveTokensFromCode } from "@/lib/google-calendar";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const err = req.nextUrl.searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (err || !code) {
    return NextResponse.redirect(`${base}/admin?google=error`);
  }

  try {
    await saveTokensFromCode(code);
    return NextResponse.redirect(`${base}/admin?google=connected`);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${base}/admin?google=error`);
  }
}
