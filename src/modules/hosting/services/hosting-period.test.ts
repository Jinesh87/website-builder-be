import assert from "node:assert/strict";
import { test } from "node:test";
import { addCycle, isHostingLive, nextPeriod, offlineCredit, renewalOpensAt, resolvePrice } from "./hosting-period.js";

/** A time in India (UTC+5:30), as the billing dates are read there. */
function ist(isoLocal: string): Date {
  return new Date(`${isoLocal}+05:30`);
}

test("adds a quarter and a year on the same day and time", () => {
  assert.equal(addCycle(ist("2026-01-10T10:30:00"), "QUARTERLY").getTime(), ist("2026-04-10T10:30:00").getTime());
  assert.equal(addCycle(ist("2026-01-11T09:00:00"), "QUARTERLY").getTime(), ist("2026-04-11T09:00:00").getTime());
  assert.equal(addCycle(ist("2026-02-25T18:00:00"), "YEARLY").getTime(), ist("2027-02-25T18:00:00").getTime());
});

test("clamps to the last day of shorter months, in India time", () => {
  assert.equal(addCycle(ist("2026-01-31T12:00:00"), "QUARTERLY").getTime(), ist("2026-04-30T12:00:00").getTime());
  assert.equal(addCycle(ist("2026-11-30T12:00:00"), "QUARTERLY").getTime(), ist("2027-02-28T12:00:00").getTime());
  assert.equal(addCycle(ist("2028-02-29T12:00:00"), "YEARLY").getTime(), ist("2029-02-28T12:00:00").getTime());
  // 1 Feb 01:30 in India is still 31 Jan in UTC; the India date must win.
  assert.equal(addCycle(ist("2026-02-01T01:30:00"), "QUARTERLY").getTime(), ist("2026-05-01T01:30:00").getTime());
});

test("a first payment starts today", () => {
  const now = ist("2026-01-10T10:00:00");
  const period = nextPeriod(null, "QUARTERLY", now);
  assert.equal(period.start.getTime(), now.getTime());
  assert.equal(period.end.getTime(), ist("2026-04-10T10:00:00").getTime());
  assert.equal(nextPeriod({ status: "AWAITING_PAYMENT", currentPeriodEnd: null }, "YEARLY", now).start.getTime(), now.getTime());
});

test("renewing early or in grace continues from the old end date", () => {
  const end = ist("2026-04-10T10:00:00");
  const early = nextPeriod({ status: "ACTIVE", currentPeriodEnd: end }, "QUARTERLY", ist("2026-04-08T10:00:00"));
  assert.equal(early.start.getTime(), end.getTime());
  assert.equal(early.end.getTime(), ist("2026-07-10T10:00:00").getTime());

  const grace = nextPeriod({ status: "GRACE", currentPeriodEnd: end }, "QUARTERLY", ist("2026-04-12T10:00:00"));
  assert.equal(grace.start.getTime(), end.getTime());
});

test("paying after suspension starts a fresh period today", () => {
  const now = ist("2026-04-20T15:00:00");
  const period = nextPeriod({ status: "SUSPENDED", currentPeriodEnd: ist("2026-04-10T10:00:00") }, "QUARTERLY", now);
  assert.equal(period.start.getTime(), now.getTime());
  assert.equal(period.end.getTime(), ist("2026-07-20T15:00:00").getTime());
});

test("switching cycle at renewal uses the new cycle from the old end", () => {
  const end = ist("2026-04-10T10:00:00");
  const period = nextPeriod({ status: "GRACE", currentPeriodEnd: end }, "YEARLY", ist("2026-04-11T10:00:00"));
  assert.equal(period.end.getTime(), ist("2027-04-10T10:00:00").getTime());
});

test("an active plan opens for renewal 30 days before it ends", () => {
  const state = { status: "ACTIVE" as const, currentPeriodEnd: ist("2026-04-10T10:00:00") };
  assert.equal(renewalOpensAt(state, ist("2026-03-01T10:00:00"))?.getTime(), ist("2026-03-11T10:00:00").getTime());
  assert.equal(renewalOpensAt(state, ist("2026-03-11T10:00:00")), null);
  assert.equal(renewalOpensAt({ status: "GRACE", currentPeriodEnd: state.currentPeriodEnd }, ist("2026-01-01T00:00:00")), null);
  assert.equal(renewalOpensAt(null, ist("2026-01-01T00:00:00")), null);
});

test("only paid or grace plans keep a site live", () => {
  assert.equal(isHostingLive("ACTIVE"), true);
  assert.equal(isHostingLive("GRACE"), true);
  assert.equal(isHostingLive("SUSPENDED"), false);
  assert.equal(isHostingLive("AWAITING_PAYMENT"), false);
  assert.equal(isHostingLive(null), false);
});

test("collecting exactly the plan's rupee price credits exactly the price", () => {
  assert.equal(offlineCredit(6667, 200, 3), 200);
  assert.equal(offlineCredit(3333, 100, 3), 100);
  assert.equal(offlineCredit(50000, 1500, 3), 1500);
});

test("other collected amounts convert at the connects rate", () => {
  assert.equal(offlineCredit(10000, 200, 3), 300);
  assert.equal(offlineCredit(6666, 200, 3), 199.98);
  assert.equal(offlineCredit(6667, 0, 3), 200.01);
});

test("website price beats client price beats global price, per cycle", () => {
  const global = { quarterlyPrice: 1500, yearlyPrice: 5400 };
  assert.deepEqual(resolvePrice("QUARTERLY", { website: null, client: null, global }), { amount: 1500, source: "GLOBAL" });
  assert.deepEqual(
    resolvePrice("YEARLY", { website: null, client: { quarterlyPrice: 1200, yearlyPrice: null }, global }),
    { amount: 5400, source: "GLOBAL" },
  );
  assert.deepEqual(
    resolvePrice("QUARTERLY", { website: null, client: { quarterlyPrice: 1200, yearlyPrice: null }, global }),
    { amount: 1200, source: "CLIENT" },
  );
  assert.deepEqual(
    resolvePrice("QUARTERLY", { website: { quarterlyPrice: 0, yearlyPrice: null }, client: { quarterlyPrice: 1200, yearlyPrice: null }, global }),
    { amount: 0, source: "WEBSITE" },
  );
});
