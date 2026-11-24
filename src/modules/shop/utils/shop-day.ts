import { AppError } from "../../../common/errors/AppError.js";

/** Shop days follow Indian time, whatever the server's time zone. */
const SHOP_TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

/** Today in the shop's time zone, as YYYY-MM-DD. */
export function shopToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TIME_ZONE }).format(now);
}

/** [start, end) of an IST calendar day given as YYYY-MM-DD. */
export function istDayRange(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00${IST_OFFSET}`);
  if (Number.isNaN(start.getTime())) throw new AppError(400, "Invalid date.", "VALIDATION_ERROR");
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/** Longest span a report may cover, in days (a leap year). */
export const MAX_RANGE_DAYS = 366;

/**
 * [start, end) covering the IST days `from` through `to`, both YYYY-MM-DD and inclusive.
 * `to` defaults to `from`; spans longer than {@link MAX_RANGE_DAYS} are refused.
 */
export function istRange(from: string, to = from): { start: Date; end: Date } {
  const { start } = istDayRange(from);
  const { end } = istDayRange(to);
  if (end <= start) throw new AppError(400, "The start date must be on or before the end date.", "VALIDATION_ERROR");
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
    throw new AppError(400, `Pick a range of up to ${MAX_RANGE_DAYS} days.`, "VALIDATION_ERROR");
  }
  return { start, end };
}

/** The days a report covers: `from`/`to`, else the single `date`, else `fallback` (today when omitted). */
export function reportDays(query: { date?: string; from?: string; to?: string }, fallback?: string): { from: string; to: string } | null {
  const from = query.from || query.date || fallback;
  if (!from) return null;
  return { from, to: query.to || from };
}
