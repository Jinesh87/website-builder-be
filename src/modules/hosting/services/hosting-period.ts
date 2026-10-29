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

export type PackagePricing = {
  isCustom: boolean;
  quarterlyPricePaise: number;
  yearlyPricePaise: number;
  defaultQuarterlyPaise: number;
  defaultYearlyPaise: number;
};
export type CustomPricing = { customQuarterlyPaise: number | null; customYearlyPaise: number | null };

/** The custom package's default price on a cycle; null on listed packages or when none is set. */
export function customDefaultPrice(
  cycle: BillingCycle,
  pkg: Pick<PackagePricing, "isCustom" | "defaultQuarterlyPaise" | "defaultYearlyPaise">,
): number | null {
  if (!pkg.isCustom) return null;
  const paise = cycle === "QUARTERLY" ? pkg.defaultQuarterlyPaise : pkg.defaultYearlyPaise;
  return paise > 0 ? paise : null;
}

function ownPrice(cycle: BillingCycle, website: CustomPricing | null): number | null {
  if (!website) return null;
  return cycle === "QUARTERLY" ? website.customQuarterlyPaise : website.customYearlyPaise;
}

/**
 * Paise a website pays per period on a package, or null when it can't be bought on that cycle. A listed package
 * costs its list price; the custom package costs the website's own price (0 = free), else the package's default.
 */
export function priceFor(cycle: BillingCycle, pkg: PackagePricing, website: CustomPricing | null): number | null {
  if (pkg.isCustom) return ownPrice(cycle, website) ?? customDefaultPrice(cycle, pkg);
  const listed = cycle === "QUARTERLY" ? pkg.quarterlyPricePaise : pkg.yearlyPricePaise;
  return listed > 0 ? listed : null;
}

/**
 * The custom prices a website keeps once it pays for a custom plan: its own where set, else the default as it is
 * now, with the paid cycle at what was actually charged. A later change to the default then doesn't reprice it.
 */
export function lockedCustomPrices(
  pkg: PackagePricing,
  website: CustomPricing | null,
  paid: { cycle: BillingCycle; price: number },
): CustomPricing {
  const lock = (cycle: BillingCycle) =>
    ownPrice(cycle, website) ?? (cycle === paid.cycle ? paid.price : customDefaultPrice(cycle, pkg));
  return { customQuarterlyPaise: lock("QUARTERLY"), customYearlyPaise: lock("YEARLY") };
}

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export function formatBillingDate(date: Date): string {
  return DATE_FORMAT.format(date);
}

export function formatPeriod(start: Date, end: Date): string {
  return `${formatBillingDate(start)} – ${formatBillingDate(end)}`;
}

export const CYCLE_LABELS: Record<BillingCycle, string> = { QUARTERLY: "Quarterly", YEARLY: "Yearly" };
