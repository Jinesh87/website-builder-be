import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hasUnpublishedDesign,
  platformTemplateKey,
  templateNumberFromSearch,
  templateOrigin,
  templateStatus,
} from "./admin-template-rules.js";

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

test("templateNumberFromSearch reads a template number with or without #", () => {
  assert.equal(templateNumberFromSearch("3001"), 3001);
  assert.equal(templateNumberFromSearch(" #3002 "), 3002);
  assert.equal(templateNumberFromSearch("bakery"), null);
  assert.equal(templateNumberFromSearch("30a1"), null);
  assert.equal(templateNumberFromSearch("12345678901"), null);
});

test("hasUnpublishedDesign is true only for Studio edits made after the last copy", () => {
  const copiedAt = new Date("2026-10-23T10:00:00Z");
  assert.equal(hasUnpublishedDesign(new Date("2026-10-23T10:05:00Z"), copiedAt), true);
  assert.equal(hasUnpublishedDesign(copiedAt, copiedAt), false);
  assert.equal(hasUnpublishedDesign(new Date("2026-10-23T09:00:00Z"), copiedAt), false);
  assert.equal(hasUnpublishedDesign(undefined, copiedAt), false);
  assert.equal(hasUnpublishedDesign(new Date(), null), false);
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
