import { google, calendar_v3 } from "googleapis";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

export function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;
  if (!clientId || !clientSecret) {
    throw new Error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl(): string {
  const oauth2 = getOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function saveTokensFromCode(code: string) {
  const oauth2 = getOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Google did not return refresh_token; revoke app access and reconnect with prompt=consent");
  }
  const expiry = tokens.expiry_date ?? Date.now() + 3600_000;
  await prisma.therapistGoogleToken.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDateMs: expiry,
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDateMs: expiry,
    },
  });
}

async function getAuthorizedClient() {
  const row = await prisma.therapistGoogleToken.findUnique({ where: { id: "default" } });
  if (!row) return null;

  let oauth2: ReturnType<typeof getOAuthClient>;
  try {
    oauth2 = getOAuthClient();
  } catch (err) {
    console.error("[google-calendar] OAuth client unavailable (check GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET):", err);
    return null;
  }

  oauth2.setCredentials({
    access_token: row.accessToken,
    refresh_token: row.refreshToken,
    expiry_date: row.expiryDateMs,
  });

  if (row.expiryDateMs < Date.now() + 60_000) {
    try {
      const { credentials } = await oauth2.refreshAccessToken();
      if (!credentials.access_token) return null;
      await prisma.therapistGoogleToken.update({
        where: { id: "default" },
        data: {
          accessToken: credentials.access_token,
          expiryDateMs: credentials.expiry_date ?? Date.now() + 3600_000,
        },
      });
      oauth2.setCredentials(credentials);
    } catch (err) {
      console.error("[google-calendar] refreshAccessToken failed (reconnect Google in admin):", err);
      return null;
    }
  }

  return oauth2;
}

export async function fetchFreeBusy(params: { timeMin: Date; timeMax: Date }): Promise<calendar_v3.Schema$FreeBusyResponse | null> {
  try {
    const auth = await getAuthorizedClient();
    if (!auth) return null;
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMin.toISOString(),
        timeMax: params.timeMax.toISOString(),
        items: [{ id: "primary" }],
      },
    });
    return res.data;
  } catch (err) {
    console.error("[google-calendar] freebusy.query failed:", err);
    return null;
  }
}

export async function createMeetEvent(params: {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  timeZone: string;
  attendeeEmail: string;
}): Promise<string> {
  const auth = await getAuthorizedClient();
  if (!auth) throw new Error("Google Calendar not connected");
  const calendar = google.calendar({ version: "v3", auth });
  const requestId = randomBytes(8).toString("hex");
  const res = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: { dateTime: params.start.toISOString(), timeZone: params.timeZone },
      end: { dateTime: params.end.toISOString(), timeZone: params.timeZone },
      attendees: [{ email: params.attendeeEmail }],
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });
  if (!res.data.id) throw new Error("Calendar API did not return event id");
  return res.data.id;
}

export async function isGoogleConnected(): Promise<boolean> {
  const row = await prisma.therapistGoogleToken.findUnique({ where: { id: "default" } });
  return Boolean(row?.refreshToken);
}
