# Analytics event spec

Stack: **PostHog** (client funnels + optional replay; server for checkout/confirm) and optional **Meta Pixel** (browser) + **Meta Conversions API** (server `Purchase` on confirmed booking). **CPF and other sensitive fields are never sent** to PostHog or Meta.

## Attribution (client)

- First-page load of a visit reads `utm_*` from the URL and stores JSON in `sessionStorage` under `psb_attribution`.
- `psb_session_id`: random UUID per tab session, reused for all events.

## Client events (PostHog; after cookie consent)

| Event | When | Properties |
|-------|------|------------|
| `cta_booking_click` | User clicks “Ver horários disponíveis” on home | — |
| `book_page_view` | `/book` mounts | `slot_count` (number, after load completes) |
| `slot_selected` | User picks a slot | `slot_start` (ISO string) |
| `form_started` | First character in nome or e-mail | `field` (`name` \| `email`) |
| `form_field_completed` | Blur on name or email after non-empty | `field` (`name` \| `email`) — **no field values** |
| `form_cpf_touched` | First input in CPF field | — |
| `checkout_submit` | Submit “Gerar pagamento PIX” | `has_cpf` (boolean) |
| `pix_presented` | PIX payload returned from API | `booking_id` |
| `booking_confirmed` | Poll detects `CONFIRMED` | `booking_id` |
| `booking_error` | User-visible error after API/booking failure | `error_code` (string), optional `http_status` |

Super-properties (set once per session after capture): `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `initial_path`.

## Server events (PostHog)

| Event | When | `distinct_id` | Properties |
|-------|------|-----------------|------------|
| `booking_pix_created` | `POST /api/bookings` succeeded (PIX created) | `analyticsSessionId` or `bookingId` | `booking_id`, `amount_cents`, `$ip` (if available), coarse `device` from UA, **no** email/name |
| `booking_confirmed` | `finalizeBookingAfterApprovedPayment` completed (calendar OK) | same | `booking_id`, `payment_id`, `amount_cents`, `$ip`, `device` |

Deduplication: `booking_confirmed` uses `$insert_id` = `booking_confirmed:${bookingId}`.

## Meta (optional)

- Browser: `PageView` on load (after consent); `Purchase` optional duplicate of server with same `event_id` if you extend the client.
- Server CAPI: `Purchase` when booking is newly confirmed, `event_id` = `booking_${bookingId}_purchase`, `value` / `currency` from booking.

## Environment variables

See [.env.example](../.env.example).
