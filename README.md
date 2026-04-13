# Psychotherapy booking (PIX + Google Calendar + Meet)

**Path B** from the product plan: a custom site with confirmation after **PIX** payment (Mercado Pago), availability rules (weekdays + blackouts), and **Google Calendar** integration (free/busy checks, event creation with **Google Meet** and e-mail invites).

## Requirements

- Node.js 20+
- **MongoDB** — local via Docker (included) or [MongoDB Atlas](https://www.mongodb.com/atlas) in production
- **Mercado Pago** account (production or test access token)
- **Google Cloud** project with OAuth and **Google Calendar API** enabled

## Quick setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set `DATABASE_URL` in `.env`:

   - **Local (Docker):** after `docker compose up -d`, use the URL in `.env.example` (includes `replicaSet=rs0` — **Prisma requires MongoDB as a replica set**). Host port **27018** avoids clashes with another service on **27017**.
   - **Atlas:** paste your cluster connection string (Drivers mode), including user, password, and database name.

3. Also set: `NEXT_PUBLIC_APP_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`, Google and Mercado Pago credentials (see `.env.example`).

4. Install dependencies and sync the schema to MongoDB:

   ```bash
   npm install
   npm run docker:up
   npm run db:push
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

6. Open `/admin`, sign in, configure availability, add blackouts, and **Connect Google account** (first time should return a `refresh_token` with `prompt=consent`).

7. In Mercado Pago, register webhook URL(s) for payment notifications — see **Production vs local** below.

### Production domain vs local development

Use **`https://cintyaflores.com`** (or consistently **`https://www.cintyaflores.com`**) in production. Pick **one** canonical host and use it for DNS, SSL, `NEXT_PUBLIC_APP_URL`, Google OAuth redirect, and Mercado Pago webhooks.

| Concern | Local (`npm run dev`) | Production (`cintyaflores.com`) |
|--------|------------------------|----------------------------------|
| **`NEXT_PUBLIC_APP_URL`** | `http://localhost:3000` | `https://cintyaflores.com` |
| **Google OAuth redirect** | Add `http://localhost:3000/api/auth/google/callback` **and** your production URL under the same Web client in Google Cloud. | Same client, production redirect must match the URL you deploy. |
| **Mercado Pago webhooks** | MP cannot reach `localhost`. Options: (a) register a **tunnel URL** (e.g. [ngrok](https://ngrok.com/), Cloudflare Tunnel) pointing to `localhost:3000` and add `https://YOUR-TUNNEL.ngrok-free.app/api/webhooks/mercadopago` in the MP dashboard; or (b) test webhooks only on the **deployed** staging/production site. | `https://cintyaflores.com/api/webhooks/mercadopago` |
| **Env files** | `.env.local` with test MP token + local URL is typical. | Hosting provider env vars with **production** MP credentials and production URL. |

You can still **create PIX and pay** locally if the access token works; only the **automatic confirmation** (webhook → confirm booking) needs a URL Mercado Pago can call.

### Useful commands

| Command | Description |
|--------|-------------|
| `npm run docker:up` | Start MongoDB (replica set) + one-shot `rs.initiate` helper |
| `npm run docker:down` | Stop containers |
| `npm run db:push` | Apply `schema.prisma` to MongoDB (dev / prototyping) |

## Google Calendar and Meet

- **Personal Gmail or Google Workspace:** the API creates events with Meet on the `primary` calendar when the account supports Meet.
- Scope: `https://www.googleapis.com/auth/calendar`.
- Google Cloud: **Web** OAuth client, redirect URI: `{NEXT_PUBLIC_APP_URL}/api/auth/google/callback`.
- **Where to find `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`:** in [Google Cloud Console](https://console.cloud.google.com/) go to **APIs & Services** → **Credentials**. Under **OAuth 2.0 Client IDs**, open your **Web application** client (create it via **Create credentials** if needed). The **Client ID** and **Client secret** are shown on that page. Enable **Google Calendar API** for the project and complete the **OAuth consent screen** first.

## Payment flow

1. Client picks a slot on `/book` → `POST /api/bookings` creates a `PENDING_PAYMENT` booking and a PIX charge.
2. MP webhook → payment `approved` → booking `CONFIRMED` and Calendar event with Meet.
3. Rare edge case after payment: booking may become `CANCELLED` (manual handling / refunds are outside this minimal scope).

## Instagram and Meta campaigns

Use your **canonical** site URL (same host as `NEXT_PUBLIC_APP_URL`) and add **UTM parameters** so traffic is identifiable in analytics and spreadsheets. Meta may also add `fbclid` automatically on ad clicks.

**Bio or organic post (example — replace host and campaign name):**

- Landing: `{NEXT_PUBLIC_APP_URL}/?utm_source=instagram&utm_medium=social&utm_campaign=agenda_2026`
- Straight to booking: `{NEXT_PUBLIC_APP_URL}/book?utm_source=instagram&utm_medium=social&utm_campaign=agenda_2026`

**Paid ads (example):**

- `{NEXT_PUBLIC_APP_URL}/?utm_source=instagram&utm_medium=paid_social&utm_campaign=meta_agenda_abril&utm_content=feed_carrossel`

Optional short links (bit.ly, etc.) should **forward** these query parameters unchanged.

See **Analytics** below for funnel tracking (PostHog / Meta) and env vars.

## Analytics

Optional **PostHog** (funnels, session replay) and **Meta Pixel + Conversions API** (ads measurement). Events are documented in [docs/analytics-events.md](docs/analytics-events.md). Non-essential scripts load only after the user accepts cookies on the banner (see `/privacidade`).

Set in `.env` (see `.env.example`):

- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project API key (client + server).
- `NEXT_PUBLIC_POSTHOG_HOST` — defaults to `https://us.i.posthog.com` (EU: `https://eu.i.posthog.com`).
- `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` — optional Meta Pixel (browser) and server Purchase events on confirmed bookings.

## Privacy

Copy is at `/privacidade` (Brazilian LGPD + CFP advertising note). Customize the data controller and contact details.

## Visual design

Theme inspired by the practice’s feed (navy, parchment, gold/ochre), with **Playfair Display** (headings) and **Source Sans 3** (body text).
