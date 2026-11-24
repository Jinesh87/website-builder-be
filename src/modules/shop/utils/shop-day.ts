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
