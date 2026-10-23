import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPlatformTemplateSchema,
  createStudioWebsiteSchema,
  listAdminTemplatesQuerySchema,
  patchPlatformTemplateSchema,
} from "./admin-template.validator.js";

const WEBSITE_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const CATEGORY_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

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
  const { value, error } = createPlatformTemplateSchema.validate({ websiteId: WEBSITE_ID, name: "Bakery", categoryId: CATEGORY_ID });
  assert.equal(error, undefined);
  assert.equal(value.isActive, true);
  assert.ok(createPlatformTemplateSchema.validate({ websiteId: WEBSITE_ID, name: "Bakery" }).error);
  assert.ok(createPlatformTemplateSchema.validate({ websiteId: WEBSITE_ID, name: "Bakery", categoryId: "Food" }).error);
  assert.ok(createPlatformTemplateSchema.validate({ websiteId: WEBSITE_ID, name: "B", categoryId: CATEGORY_ID }).error);
});

test("the admin list filters by category id and origin", () => {
  assert.equal(listAdminTemplatesQuerySchema.validate({ categoryId: CATEGORY_ID, origin: "custom" }).error, undefined);
  assert.ok(listAdminTemplatesQuerySchema.validate({ categoryId: "Food" }).error);
  assert.ok(listAdminTemplatesQuerySchema.validate({ origin: "client" }).error);
});

test("a details patch must change something", () => {
  assert.ok(patchPlatformTemplateSchema.validate({}).error);
  assert.equal(patchPlatformTemplateSchema.validate({ isActive: false }).error, undefined);
  assert.equal(patchPlatformTemplateSchema.validate({ description: null }).error, undefined);
});
