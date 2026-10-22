import assert from "node:assert/strict";
import { test } from "node:test";
import { platformTemplateKey, templateOrigin, templateStatus } from "./admin-template-rules.js";

const KEY_PATTERN = /^[a-z0-9-]+$/;

test("platformTemplateKey makes a readable, URL-safe, prefixed key", () => {
  const key = platformTemplateKey("Dental Clinic · Modern!");
  assert.match(key, /^admin-dental-clinic-modern-[0-9a-f]{6}$/);
  assert.match(key, KEY_PATTERN);
});

test("platformTemplateKey stays within the column limit and never ends a slug with a dash", () => {
  const key = platformTemplateKey(`${"a".repeat(59)} ${"b".repeat(50)}`);
  assert.ok(key.length <= 80, `${key.length} > 80`);
  assert.match(key, KEY_PATTERN);
  assert.doesNotMatch(key, /--/);
});

test("platformTemplateKey falls back when the name has no usable characters", () => {
  assert.match(platformTemplateKey("★★★"), /^admin-template-[0-9a-f]{6}$/);
});

test("platformTemplateKey gives different keys for the same name", () => {
  const keys = new Set(Array.from({ length: 50 }, () => platformTemplateKey("Bakery")));
  assert.equal(keys.size, 50);
});

test("templateOrigin separates admin templates from seeded ones", () => {
  assert.equal(templateOrigin({ key: "admin-bakery-1a2b3c" }), "ADMIN");
  assert.equal(templateOrigin({ key: "accounting-firm-classic" }), "BUILT_IN");
});

test("templateStatus puts archived before the active flag", () => {
  assert.equal(templateStatus({ archivedAt: null, isActive: true }), "LIVE");
  assert.equal(templateStatus({ archivedAt: null, isActive: false }), "HIDDEN");
  assert.equal(templateStatus({ archivedAt: new Date(), isActive: true }), "ARCHIVED");
});
