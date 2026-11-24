import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { istRange, reportDays, shopToday } from "./shop-day.js";

describe("istRange", () => {
  it("covers whole IST days, both ends inclusive", () => {
    const { start, end } = istRange("2026-11-01", "2026-11-30");
    assert.equal(start.toISOString(), "2026-10-31T18:30:00.000Z");
    assert.equal(end.toISOString(), "2026-11-30T18:30:00.000Z");
  });

  it("refuses backwards and over-long ranges", () => {
    assert.throws(() => istRange("2026-11-02", "2026-11-01"), /on or before/);
    assert.doesNotThrow(() => istRange("2024-01-01", "2024-12-31"));
    assert.throws(() => istRange("2025-01-01", "2026-01-02"), /up to 366/);
  });
});

describe("reportDays", () => {
  it("prefers from/to, then the single date, then the fallback", () => {
    assert.deepEqual(reportDays({ from: "2026-11-01", to: "2026-11-07" }), { from: "2026-11-01", to: "2026-11-07" });
    assert.deepEqual(reportDays({ from: "2026-11-01" }), { from: "2026-11-01", to: "2026-11-01" });
    assert.deepEqual(reportDays({ date: "2026-11-05" }), { from: "2026-11-05", to: "2026-11-05" });
    assert.deepEqual(reportDays({}, shopToday(new Date("2026-11-24T20:00:00Z"))), { from: "2026-11-25", to: "2026-11-25" });
    assert.equal(reportDays({}), null);
  });
});
