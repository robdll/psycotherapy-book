import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google-calendar";

export async function GET() {
  try {
    const url = getGoogleAuthUrl();
    return NextResponse.redirect(url);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "google_oauth_not_configured" }, { status: 500 });
  }
}
