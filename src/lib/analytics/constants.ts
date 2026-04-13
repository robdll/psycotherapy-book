export const ATTRIBUTION_STORAGE_KEY = "psb_attribution";
export const SESSION_ID_STORAGE_KEY = "psb_session_id";
export const CONSENT_STORAGE_KEY = "psb_analytics_consent";

export type AnalyticsConsent = "accepted" | "essential";

export const ANALYTICS_EVENTS = {
  ctaBookingClick: "cta_booking_click",
  bookPageView: "book_page_view",
  slotSelected: "slot_selected",
  formStarted: "form_started",
  formFieldCompleted: "form_field_completed",
  formCpfTouched: "form_cpf_touched",
  checkoutSubmit: "checkout_submit",
  pixPresented: "pix_presented",
  bookingConfirmed: "booking_confirmed",
  bookingError: "booking_error",
  bookingPixCreated: "booking_pix_created",
} as const;
