import type { BillingCycle, HostingStatus } from "../../../generated/prisma/enums.js";

export const CYCLE_MONTHS: Record<BillingCycle, number> = { QUARTERLY: 3, YEARLY: 12 };

export const DAY_MS = 24 * 60 * 60 * 1000;

/** An ACTIVE plan can be renewed only this close to its end, so nobody pays a period ahead by mistake. */
export const RENEWAL_WINDOW_DAYS = 30;

/** Billing dates follow India time (UTC+5:30, no DST): a plan from 31 Jan ends on 30 Apr there, not 1 May. */
const BILLING_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Same day and time of day `cycle` months later, clamped to the last day of shorter months. */
export function addCycle(start: Date, cycle: BillingCycle): Date {
  const local = new Date(start.getTime() + BILLING_OFFSET_MS);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + CYCLE_MONTHS[cycle]);
  const lastDay = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  local.setUTCDate(Math.min(day, lastDay));
  return new Date(local.getTime() - BILLING_OFFSET_MS);
}

export type PeriodState = { status: HostingStatus; currentPeriodEnd: Date | null };

/**
 * The period a payment made `now` buys. Renewing (early, or during grace) continues from the old end date,
 * so grace gives no free days; a first payment or one after suspension starts today.
 */
export function nextPeriod(state: PeriodState | null, cycle: BillingCycle, now: Date): { start: Date; end: Date } {
  const continues =
    state?.currentPeriodEnd != null && (state.status === "ACTIVE" || state.status === "GRACE");
  const start = continues ? state.currentPeriodEnd! : now;
  return { start, end: addCycle(start, cycle) };
}

/** When an ACTIVE plan can next be paid; null = it can be paid now. */
export function renewalOpensAt(state: PeriodState | null, now: Date): Date | null {
  if (state?.status !== "ACTIVE" || !state.currentPeriodEnd) return null;
  const opensAt = addDays(state.currentPeriodEnd, -RENEWAL_WINDOW_DAYS);
  return now >= opensAt ? null : opensAt;
}

/** The site may be (or stay) live: paid, or unpaid but still inside the grace days. */
export function isHostingLive(status: HostingStatus | null | undefined): boolean {
  return status === "ACTIVE" || status === "GRACE";
}

export type CyclePrices = { quarterlyPrice: number | null; yearlyPrice: number | null };
export type PriceSource = "WEBSITE" | "CLIENT" | "GLOBAL";
export type ResolvedPrice = { amount: number; source: PriceSource };

function priceFor(prices: CyclePrices | null, cycle: BillingCycle): number | null {
  if (!prices) return null;
  return cycle === "QUARTERLY" ? prices.quarterlyPrice : prices.yearlyPrice;
}

/** The website's own price wins, then the client's, then the platform default. */
export function resolvePrice(
  cycle: BillingCycle,
  sources: { website: CyclePrices | null; client: CyclePrices | null; global: { quarterlyPrice: number; yearlyPrice: number } },
): ResolvedPrice {
  const website = priceFor(sources.website, cycle);
  if (website !== null) return { amount: website, source: "WEBSITE" };
  const client = priceFor(sources.client, cycle);
  if (client !== null) return { amount: client, source: "CLIENT" };
  return { amount: priceFor(sources.global, cycle) ?? 0, source: "GLOBAL" };
}

/**
 * Connects credited for money collected offline. Collecting exactly the plan's rupee price (₹66.67 for
 * 200 connects at 3 per rupee) credits exactly the price, so paise rounding never leaves 0.01 connect over.
 * The rupee price uses the wallet's rounding: nearest paisa.
 */
export function offlineCredit(collectedPaise: number, price: number, connectsPerRupee: number): number {
  if (price > 0 && collectedPaise === Math.round((price * 100) / connectsPerRupee)) return price;
  return Math.round(collectedPaise * connectsPerRupee * 10) / 1000;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function formatBillingDate(date: Date): string {
  return DATE_FORMAT.format(date);
}

export function formatPeriod(start: Date, end: Date): string {
  return `${formatBillingDate(start)} – ${formatBillingDate(end)}`;
}

export const CYCLE_LABELS: Record<BillingCycle, string> = { QUARTERLY: "Quarterly", YEARLY: "Yearly" };
