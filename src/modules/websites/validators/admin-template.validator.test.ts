import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPlatformTemplateSchema,
  createStudioWebsiteSchema,
  patchPlatformTemplateSchema,
} from "./admin-template.validator.js";

const WEBSITE_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

test("a Studio website needs the source that matches startFrom", () => {
  assert.equal(createStudioWebsiteSchema.validate({ name: "Bakery", startFrom: "blank" }).error, undefined);
  assert.equal(
    createStudioWebsiteSchema.validate({ name: "Bakery", startFrom: "template", templateKey: "bakery-warm" }).error,
    undefined,
  );
  assert.equal(
    createStudioWebsiteSchema.validate({ name: "Bakery", startFrom: "website", websiteId: WEBSITE_ID }).error,
    undefined,
  );
  assert.ok(createStudioWebsiteSchema.validate({ name: "Bakery", startFrom: "template" }).error);
  assert.ok(createStudioWebsiteSchema.validate({ name: "Bakery", startFrom: "website" }).error);
  assert.ok(createStudioWebsiteSchema.validate({ name: "Bakery", startFrom: "blank", websiteId: WEBSITE_ID }).error);
});

test("new templates need a gallery category and default to live", () => {
  const { value, error } = createPlatformTemplateSchema.validate({ websiteId: WEBSITE_ID, name: "Bakery", category: "Food" });
  assert.equal(error, undefined);
  assert.equal(value.isActive, true);
  assert.ok(createPlatformTemplateSchema.validate({ websiteId: WEBSITE_ID, name: "Bakery", category: "My templates" }).error);
  assert.ok(createPlatformTemplateSchema.validate({ websiteId: WEBSITE_ID, name: "B", category: "Food" }).error);
});

test("a details patch must change something", () => {
  assert.ok(patchPlatformTemplateSchema.validate({}).error);
  assert.equal(patchPlatformTemplateSchema.validate({ isActive: false }).error, undefined);
  assert.equal(patchPlatformTemplateSchema.validate({ description: null }).error, undefined);
});
