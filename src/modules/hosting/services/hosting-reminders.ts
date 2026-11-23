import { DAY_MS } from "./hosting-period.js";

/** An overdue reminder missed by more than this (worker down, entry added late) is skipped, not sent late. */
export const OVERDUE_CATCH_UP_DAYS = 2;

/** Sorted, unique, positive day counts. */
export function normalizeReminderDays(days: number[]): number[] {
  return [...new Set(days.filter((day) => Number.isInteger(day) && day > 0))].sort((a, b) => a - b);
}

/**
 * The "days before" entry due now: the closest one the period is already inside. Entries passed over (a plan
 * bought 2 days before expiry with entries 7 and 3) are skipped, so the client gets one email, not several.
 */
export function reminderBeforeOffset(daysBefore: number[], periodEnd: Date, now: Date): number | null {
  const remaining = periodEnd.getTime() - now.getTime();
  if (remaining <= 0) return null;
  const due = daysBefore.filter((day) => day > 0 && remaining <= day * DAY_MS);
  return due.length ? Math.min(...due) : null;
}

/** The "days after" entry due now: the latest one reached, if it was reached recently. */
export function reminderAfterOffset(daysAfter: number[], periodEnd: Date, now: Date): number | null {
  const elapsed = now.getTime() - periodEnd.getTime();
  const due = daysAfter.filter((day) => day > 0 && elapsed >= day * DAY_MS && elapsed < (day + OVERDUE_CATCH_UP_DAYS) * DAY_MS);
  return due.length ? Math.max(...due) : null;
}
