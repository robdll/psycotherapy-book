import { prisma } from "@/lib/prisma";
import { BookingStatus } from "@/lib/booking-status";
import { fetchFreeBusy } from "@/lib/google-calendar";
import { generateCandidateSlots, overlaps, type Slot } from "@/lib/availability";
import { getAvailabilitySettings, parseAllowedWeekdays } from "@/lib/settings";

export async function computeOpenSlots(params: { rangeStart: Date; rangeEnd: Date }): Promise<Slot[]> {
  const settings = await getAvailabilitySettings();
  const blackouts = await prisma.blackoutDate.findMany();
  const blackoutYmd = new Set(blackouts.map((b) => b.date));

  const allowedWeekdays = parseAllowedWeekdays(settings.allowedWeekdaysJson);

  const candidates = generateCandidateSlots({
    rangeStart: params.rangeStart,
    rangeEnd: params.rangeEnd,
    timezone: settings.timezone,
    allowedWeekdays,
    sessionMinutes: settings.sessionMinutes,
    bufferMinutes: settings.bufferMinutes,
    dayStartLocal: settings.dayStartLocal,
    dayEndLocal: settings.dayEndLocal,
    blackoutYmd,
  });

  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED] },
      endAt: { gt: params.rangeStart },
      startAt: { lt: params.rangeEnd },
    },
  });

  const busyFromDb = (slot: Slot) =>
    bookings.some((b) => overlaps(slot.start, slot.end, b.startAt, b.endAt));

  const freeBusy = await fetchFreeBusy({
    timeMin: params.rangeStart,
    timeMax: params.rangeEnd,
  });

  const busyFromGoogle = (slot: Slot) => {
    const cal = freeBusy?.calendars?.primary;
    const busy = cal?.busy ?? [];
    return busy.some((b) => {
      if (!b.start || !b.end) return false;
      return overlaps(slot.start, slot.end, new Date(b.start), new Date(b.end));
    });
  };

  return candidates.filter((s) => !busyFromDb(s) && !busyFromGoogle(s));
}
