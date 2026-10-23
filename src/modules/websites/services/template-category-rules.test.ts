import assert from "node:assert/strict";
import { test } from "node:test";
import { SYSTEM_TEMPLATE_CATEGORIES } from "../types/template.types.js";
import { TEMPLATE_CATEGORY_NAME_MAX, templateCategorySlug } from "./template-category-rules.js";

test("templateCategorySlug makes a lowercase, URL-safe slug", () => {
  assert.equal(templateCategorySlug("Food & Drink"), "food-drink");
  assert.equal(templateCategorySlug("  Health / Beauty  "), "health-beauty");
  assert.equal(templateCategorySlug("Café"), "cafe");
});

test("templateCategorySlug treats names that differ only in case or punctuation as the same", () => {
  assert.equal(templateCategorySlug("Landing page"), templateCategorySlug("landing-PAGE!"));
});

test("templateCategorySlug is empty when the name has no letters or digits", () => {
  assert.equal(templateCategorySlug("★ ★"), "");
});

test("templateCategorySlug fits the column and never ends with a dash", () => {
  const slug = templateCategorySlug(`${"a".repeat(59)} ${"b".repeat(20)}`);
  assert.ok(slug.length <= TEMPLATE_CATEGORY_NAME_MAX);
  assert.doesNotMatch(slug, /-$/);
});

test("system categories use the slug their name produces", () => {
  for (const category of SYSTEM_TEMPLATE_CATEGORIES) {
    assert.equal(templateCategorySlug(category.name), category.slug);
  }
});
