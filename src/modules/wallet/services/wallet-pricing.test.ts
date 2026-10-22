import assert from "node:assert/strict";
import { test } from "node:test";
import { connectsForPaise, MAX_PURCHASE_CONNECTS, priceInPaise } from "./wallet.service.js";

test("a rupee price in connects is rounded up, so it never falls short", () => {
  assert.equal(connectsForPaise(210_000), 6_300);
  assert.equal(connectsForPaise(700_000), 21_000);
  assert.equal(connectsForPaise(3_333), 100);
  assert.equal(connectsForPaise(1), 1);
  assert.equal(connectsForPaise(0), 0);
});

test("converting connects to paise and back keeps the price", () => {
  for (let connects = 1; connects <= MAX_PURCHASE_CONNECTS; connects++) {
    if (connectsForPaise(priceInPaise(connects)) !== connects) assert.fail(`${connects} connects don't round-trip`);
  }
});
