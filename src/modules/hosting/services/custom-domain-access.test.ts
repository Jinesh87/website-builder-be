import assert from "node:assert/strict";
import test from "node:test";
import { customDomainServeAllowed } from "./custom-domain-access.js";

test("free subdomain always serves", () => {
  assert.equal(
    customDomainServeAllowed({ billingEnabled: true, isCustomDomain: false, hostingStatus: "AWAITING_PAYMENT" }),
    true,
  );
  assert.equal(
    customDomainServeAllowed({ billingEnabled: true, isCustomDomain: false, hostingStatus: null }),
    true,
  );
});

test("custom domain serves while billing is off", () => {
  assert.equal(
    customDomainServeAllowed({ billingEnabled: false, isCustomDomain: true, hostingStatus: "AWAITING_PAYMENT" }),
    true,
  );
});

test("custom domain serves when ACTIVE or GRACE", () => {
  assert.equal(
    customDomainServeAllowed({ billingEnabled: true, isCustomDomain: true, hostingStatus: "ACTIVE" }),
    true,
  );
  assert.equal(
    customDomainServeAllowed({ billingEnabled: true, isCustomDomain: true, hostingStatus: "GRACE" }),
    true,
  );
});

test("custom domain does not serve when unpaid or suspended", () => {
  assert.equal(
    customDomainServeAllowed({ billingEnabled: true, isCustomDomain: true, hostingStatus: "AWAITING_PAYMENT" }),
    false,
  );
  assert.equal(
    customDomainServeAllowed({ billingEnabled: true, isCustomDomain: true, hostingStatus: "SUSPENDED" }),
    false,
  );
  assert.equal(
    customDomainServeAllowed({ billingEnabled: true, isCustomDomain: true, hostingStatus: null }),
    false,
  );
});
