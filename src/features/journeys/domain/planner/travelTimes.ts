import { Temporal } from '@js-temporal/polyfill';

/** Different station time zones and repeated clock hours compare as instants. */
export function scheduledSeconds(departure: string, arrival: string) {
  try {
    const seconds = (Temporal.Instant.from(arrival).epochMilliseconds - Temporal.Instant.from(departure).epochMilliseconds) / 1000;
    return seconds > 0 ? seconds : undefined;
  } catch { return undefined; }
}

export function tripDayDate(startDate: string, day: number) {
  if (!startDate || !Number.isSafeInteger(day) || day < 1) return undefined;
  try { return Temporal.PlainDate.from(startDate).add({ days: day - 1 }).toString(); }
  catch { return undefined; }
}
