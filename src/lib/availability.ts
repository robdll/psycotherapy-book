import { addDays, addMinutes, isBefore } from "date-fns";
import { formatInTimeZone, toDate } from "date-fns-tz";
import type { Weekday } from "@/lib/settings";

export type Slot = { start: Date; end: Date };

/** ISO weekday (Mon=1 … Sun=7) to JavaScript weekday (Sun=0 … Sat=6) */
function isoWeekdayToJs(iso: number): Weekday {
  if (iso === 7) return 0;
  return iso as Weekday;
}

function addOneCalendarDay(ymd: string, tz: string): string {
  const d = toDate(`${ymd}T12:00:00`, { timeZone: tz });
  return formatInTimeZone(addDays(d, 1), tz, "yyyy-MM-dd");
}

/**
 * Candidate slots from weekly rules and blackouts (no Google / DB overlap yet).
 */
export function generateCandidateSlots(params: {
  rangeStart: Date;
  rangeEnd: Date;
  timezone: string;
  allowedWeekdays: Weekday[];
  sessionMinutes: number;
  bufferMinutes: number;
  dayStartLocal: string;
  dayEndLocal: string;
  blackoutYmd: Set<string>;
}): Slot[] {
  const {
    rangeStart,
    rangeEnd,
    timezone,
    allowedWeekdays,
    sessionMinutes,
    bufferMinutes,
    dayStartLocal,
    dayEndLocal,
    blackoutYmd,
  } = params;

  const step = sessionMinutes + bufferMinutes;
  const slots: Slot[] = [];

  let ymd = formatInTimeZone(rangeStart, timezone, "yyyy-MM-dd");
  const ymdEnd = formatInTimeZone(rangeEnd, timezone, "yyyy-MM-dd");

  while (ymd <= ymdEnd) {
    if (!blackoutYmd.has(ymd)) {
      const probe = toDate(`${ymd}T12:00:00`, { timeZone: timezone });
      const isoWd = Number(formatInTimeZone(probe, timezone, "i"));
      const wd = isoWeekdayToJs(isoWd);

      if (allowedWeekdays.includes(wd)) {
        const dayStart = toDate(`${ymd}T${dayStartLocal}:00`, { timeZone: timezone });
        const dayEnd = toDate(`${ymd}T${dayEndLocal}:00`, { timeZone: timezone });
        let t = dayStart;
        while (isBefore(addMinutes(t, sessionMinutes), dayEnd) || addMinutes(t, sessionMinutes).getTime() === dayEnd.getTime()) {
          const slotEnd = addMinutes(t, sessionMinutes);
          if (slotEnd <= dayEnd && !isBefore(slotEnd, rangeStart) && !isBefore(rangeEnd, t)) {
            slots.push({ start: t, end: slotEnd });
          }
          t = addMinutes(t, step);
        }
      }
    }
    if (ymd === ymdEnd) break;
    ymd = addOneCalendarDay(ymd, timezone);
  }

  return slots;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}
