import { prisma } from "@/lib/prisma";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export async function getAvailabilitySettings() {
  const row = await prisma.availabilitySettings.findUnique({
    where: { id: "default" },
  });
  if (row) return row;
  return prisma.availabilitySettings.create({
    data: { id: "default" },
  });
}

export function parseAllowedWeekdays(json: string): Weekday[] {
  try {
    const arr = JSON.parse(json) as unknown;
    if (!Array.isArray(arr)) return [2, 4];
    return arr.filter((n): n is Weekday => typeof n === "number" && n >= 0 && n <= 6);
  } catch {
    return [2, 4];
  }
}
