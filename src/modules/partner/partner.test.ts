import test from "node:test";
import assert from "node:assert/strict";
import { generateApplicationId, generateReferralCode } from "./utils/partner-codes.js";
import {
  adminPartnerApproveSchema,
  adminPartnerCommissionUpdateSchema,
  adminPartnerProgramConfigSchema,
  partnerApplicationSchema,
} from "./validators/partner.validator.js";
import { salesPartnerApplicationNotificationEmail } from "../email/templates/email.templates.js";

test("generateApplicationId creates formatted reference ID", () => {
  const id1 = generateApplicationId(1);
  const id2 = generateApplicationId(2);
  assert.equal(id1, "PART-1");
  assert.equal(id2, "PART-2");
});

test("generateReferralCode formats alphanumeric code with seed or default prefix", () => {
  const code1 = generateReferralCode("Apex Digital");
  const code2 = generateReferralCode();
  assert.match(code1, /^APE-[A-Z0-9]{4}$/);
  assert.match(code2, /^BYZ-[A-Z0-9]{4}$/);
});

test("partnerApplicationSchema validates complete valid application", () => {
  const valid = {
    companyName: "Acme Partners",
    website: "https://acme.com",
    businessType: "Digital Agency",
    yearEstablished: "2021",
    country: "India",
    state: "Karnataka",
    city: "Bengaluru",
    businessAddress: "123 MG Road",
    contactName: "John Doe",
    designation: "Managing Director",
    email: "john@acme.com",
    phone: "+91 9876543210",
    partnershipType: "Referral Partner",
    targetCategories: ["Small businesses", "Ecommerce"],
    expectedReferrals: "6 - 15",
    marketingChannels: ["Direct Sales", "Networking"],
    reason: "We work with hundreds of retail clients who need modern websites.",
    previousExperience: true,
    acceptTerms: true,
  };

  const { error, value } = partnerApplicationSchema.validate(valid);
  assert.equal(error, undefined);
  assert.equal(value.email, "john@acme.com");
});

test("partnerApplicationSchema rejects invalid or missing fields", () => {
  const invalid = {
    companyName: "A",
    email: "not-an-email",
    acceptTerms: false,
  };

  const { error } = partnerApplicationSchema.validate(invalid);
  assert.notEqual(error, undefined);
});

test("adminPartnerProgramConfigSchema validates global commission policy", () => {
  const { error: err1, value: val1 } = adminPartnerProgramConfigSchema.validate({
    defaultCommissionPolicy: "EVERY_RENEWAL",
    defaultCommissionRate: 20,
  });
  assert.equal(err1, undefined);
  assert.equal(val1.defaultCommissionPolicy, "EVERY_RENEWAL");
  assert.equal(val1.defaultCommissionRate, 20);

  const { error: err2 } = adminPartnerProgramConfigSchema.validate({
    defaultCommissionPolicy: "INVALID_POLICY",
  });
  assert.notEqual(err2, undefined);
});

test("adminPartnerCommissionUpdateSchema validates partner policy overrides", () => {
  const { error: err1, value: val1 } = adminPartnerCommissionUpdateSchema.validate({
    commissionPolicy: "EVERY_RENEWAL",
  });
  assert.equal(err1, undefined);
  assert.equal(val1.commissionPolicy, "EVERY_RENEWAL");

  const { error: err2, value: val2 } = adminPartnerApproveSchema.validate({
    commissionRate: 15,
    commissionPolicy: "GLOBAL_DEFAULT",
  });
  assert.equal(err2, undefined);
  assert.equal(val2.commissionPolicy, "GLOBAL_DEFAULT");
});
test("salesPartnerApplicationNotificationEmail renders email correctly with partner details", () => {
  const rendered = salesPartnerApplicationNotificationEmail({
    brand: "Bytezora",
    applicationId: "PART-2026-9999",
    companyName: "Acme Agency",
    registrationNumber: "REG-12345",
    website: "https://acme.agency",
    businessType: "Digital Agency",
    yearEstablished: "2020",
    country: "India",
    state: "Kerala",
    city: "Kochi",
    businessAddress: "MG Road 404",
    contactName: "Rahul Menon",
    designation: "Founder",
    email: "rahul@acme.agency",
    phone: "+91 9988776655",
    alternatePhone: "+91 9988776654",
    partnershipType: "Referral Partner",
    targetCategories: ["E-commerce", "Startups"],
    expectedReferrals: "10-20",
    marketingChannels: ["LinkedIn", "Referrals"],
    reason: "We build digital solutions and want to refer clients.",
    previousExperience: true,
  });

  assert.equal(rendered.subject, "[Bytezora Sales] New Partner Application: Acme Agency (PART-2026-9999)");
  assert.match(rendered.html, /Acme Agency/);
  assert.match(rendered.html, /PART-2026-9999/);
  assert.match(rendered.html, /Rahul Menon/);
  assert.match(rendered.html, /rahul@acme\.agency/);
  assert.match(rendered.html, /\+91 9988776655/);
  assert.match(rendered.html, /Digital Agency/);
  assert.match(rendered.html, /Kochi, Kerala, India/);
  assert.match(rendered.text, /PART-2026-9999/);
  assert.match(rendered.text, /Rahul Menon/);
});

