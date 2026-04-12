export const BookingStatus = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export type BookingStatusValue = (typeof BookingStatus)[keyof typeof BookingStatus];
