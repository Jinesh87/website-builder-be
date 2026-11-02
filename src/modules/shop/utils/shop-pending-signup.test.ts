import assert from "node:assert/strict";
import { test } from "node:test";
import { pendingSignupSubject } from "./shop-pending-signup.js";

test("pendingSignupSubject is stable and lowercases email", () => {
  const websiteId = "00000000-0000-4000-8000-000000000099";
  assert.equal(
    pendingSignupSubject(websiteId, "Alex@Shop.example"),
    `pending:${websiteId}:alex@shop.example`,
  );
});
