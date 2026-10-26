import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { AutopayStatus, HostingStatus } from "../../../generated/prisma/client.js";
import { assertNotOnAutopay } from "../../hosting/services/hosting.service.js";
import { autopayState, ENDED_AUTOPAY, LIVE_AUTOPAY, STOPPABLE_AUTOPAY } from "./autopay.js";
import { isValidSubscriptionSignature, type RazorpaySubscription } from "./razorpay.client.js";

function subscription(status: RazorpaySubscription["status"], chargeAt: number | null): RazorpaySubscription {
  return { id: "sub_1", plan_id: "plan_1", status, charge_at: chargeAt, start_at: null, current_end: null, paid_count: 0 };
}

test("a live subscription keeps its next charge; a stopped one has none", () => {
  assert.deepEqual(autopayState(subscription("active", 1_800_000_000)), {
    status: AutopayStatus.ACTIVE,
    nextChargeAt: new Date(1_800_000_000_000),
  });
  assert.deepEqual(autopayState(subscription("halted", 1_800_000_000)), { status: AutopayStatus.HALTED, nextChargeAt: null });
  assert.deepEqual(autopayState(subscription("cancelled", null)), { status: AutopayStatus.CANCELLED, nextChargeAt: null });
});

test("every status is either stoppable, ended, or waiting for approval", () => {
  for (const status of Object.values(AutopayStatus)) {
    const groups = [STOPPABLE_AUTOPAY.has(status), ENDED_AUTOPAY.has(status), status === AutopayStatus.CREATED];
    assert.equal(groups.filter(Boolean).length, 1, status);
  }
  for (const status of LIVE_AUTOPAY) assert.ok(STOPPABLE_AUTOPAY.has(status), status);
});

test("the subscription signature signs payment id then subscription id", () => {
  const secret = "secret";
  const signature = createHmac("sha256", secret).update("pay_1|sub_1").digest("hex");
  assert.equal(isValidSubscriptionSignature(secret, "pay_1", "sub_1", signature), true);
  assert.equal(isValidSubscriptionSignature(secret, "sub_1", "pay_1", signature), false);
  assert.equal(isValidSubscriptionSignature("other", "pay_1", "sub_1", signature), false);
});

test("a plan on scheduled autopay can't also be paid by hand, unless the charge is late", () => {
  const periodEnd = new Date("2026-12-01T00:00:00Z");
  const plan = (status: HostingStatus, autopay: AutopayStatus | null) => ({
    status,
    currentPeriodEnd: periodEnd,
    autopay: autopay && { status: autopay },
  });
  assert.throws(() => assertNotOnAutopay(plan(HostingStatus.ACTIVE, AutopayStatus.ACTIVE)), { code: "AUTOPAY_ACTIVE" });
  assert.throws(() => assertNotOnAutopay(plan(HostingStatus.ACTIVE, AutopayStatus.AUTHENTICATED)), { code: "AUTOPAY_ACTIVE" });
  assert.doesNotThrow(() => assertNotOnAutopay(plan(HostingStatus.ACTIVE, AutopayStatus.PENDING)));
  assert.doesNotThrow(() => assertNotOnAutopay(plan(HostingStatus.GRACE, AutopayStatus.ACTIVE)));
  assert.doesNotThrow(() => assertNotOnAutopay(plan(HostingStatus.ACTIVE, AutopayStatus.CANCELLED)));
  assert.doesNotThrow(() => assertNotOnAutopay(plan(HostingStatus.ACTIVE, null)));
  assert.doesNotThrow(() => assertNotOnAutopay(null));
});
