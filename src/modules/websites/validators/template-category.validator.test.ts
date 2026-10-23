import assert from "node:assert/strict";
import { test } from "node:test";
import { deleteTemplateCategoryQuerySchema, templateCategoryInputSchema } from "./template-category.validator.js";

test("a category name is trimmed and needs a letter or number", () => {
  const { value, error } = templateCategoryInputSchema.validate({ name: "  Food & Drink  " });
  assert.equal(error, undefined);
  assert.equal(value.name, "Food & Drink");
  assert.ok(templateCategoryInputSchema.validate({ name: "A" }).error);
  assert.ok(templateCategoryInputSchema.validate({ name: "--" }).error);
  assert.ok(templateCategoryInputSchema.validate({ name: "x".repeat(61) }).error);
  assert.ok(templateCategoryInputSchema.validate({}).error);
});

test("moving templates on delete needs a category id", () => {
  assert.equal(deleteTemplateCategoryQuerySchema.validate({}).error, undefined);
  assert.equal(deleteTemplateCategoryQuerySchema.validate({ moveTo: "0f8fad5b-d9cb-469f-a165-70867728950e" }).error, undefined);
  assert.ok(deleteTemplateCategoryQuerySchema.validate({ moveTo: "business" }).error);
});
