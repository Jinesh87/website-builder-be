import assert from "node:assert/strict";
import { test } from "node:test";
import { DAY_MS } from "./hosting-period.js";
import { normalizeReminderDays, reminderAfterOffset, reminderBeforeOffset } from "./hosting-reminders.js";

const now = new Date("2026-11-23T10:00:00Z");
const at = (days: number) => new Date(now.getTime() + days * DAY_MS);

test("normalizeReminderDays sorts, dedupes and drops non-positive entries", () => {
  assert.deepEqual(normalizeReminderDays([7, 3, 7, 0, -1, 1]), [1, 3, 7]);
});

test("reminderBeforeOffset picks the closest entry the period is inside", () => {
  assert.equal(reminderBeforeOffset([7, 3, 1], at(10), now), null);
  assert.equal(reminderBeforeOffset([7, 3, 1], at(6.5), now), 7);
  assert.equal(reminderBeforeOffset([7, 3, 1], at(2), now), 3);
  assert.equal(reminderBeforeOffset([7, 3, 1], at(0.5), now), 1);
  assert.equal(reminderBeforeOffset([7, 3, 1], at(-0.1), now), null);
  assert.equal(reminderBeforeOffset([], at(1), now), null);
});

test("reminderAfterOffset picks the latest entry reached within the catch-up window", () => {
  assert.equal(reminderAfterOffset([1, 5], at(-0.5), now), null);
  assert.equal(reminderAfterOffset([1, 5], at(-1.5), now), 1);
  assert.equal(reminderAfterOffset([1, 5], at(-4), now), null);
  assert.equal(reminderAfterOffset([1, 5], at(-5.2), now), 5);
  assert.equal(reminderAfterOffset([1, 5], at(-30), now), null);
});
