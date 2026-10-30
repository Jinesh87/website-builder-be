import assert from "node:assert/strict";
import { test } from "node:test";
import { fieldAt } from "../ai/field-catalog.js";
import { sectionSchema } from "./site-content.validator.js";

const OPTIONS = { stripUnknown: true, abortEarly: false } as const;
const settings = { background: "default", hideOnMobile: false };

function cta(heading: string) {
  return { id: "cta-1", type: "cta", hidden: false, settings, data: { heading, button: { label: "Contact Us", href: "/contact" } } };
}

test("formatted words survive saving", () => {
  const heading = 'Ready to <span style="color:#dc2626;font-size:48px" data-font="lora">Transform</span> <strong>your</strong> space?';
  const { value, error } = sectionSchema.validate(cta(heading), OPTIONS);
  assert.equal(error, undefined);
  assert.equal(value.data.heading, heading);
});

test("formatting markup doesn't count towards the visible length limit", () => {
  const visible = "x".repeat(190);
  const heading = `<span style="color:#dc2626;font-weight:800;letter-spacing:0.02em">${visible}</span>`;
  assert.ok(heading.length > 200);
  const { error } = sectionSchema.validate(cta(heading), OPTIONS);
  assert.equal(error, undefined);
});

test("visible text over the limit is still rejected", () => {
  const { error } = sectionSchema.validate(cta(`<strong>${"x".repeat(201)}</strong>`), OPTIONS);
  assert.ok(error);
  const plain = sectionSchema.validate(cta("x".repeat(201)), OPTIONS);
  assert.ok(plain.error);
});

test("unsafe styles are removed on save", () => {
  const heading = '<span style="background:url(javascript:alert(1));color:#00ff00" onclick="alert(1)">Hi</span>';
  const { value, error } = sectionSchema.validate(cta(heading), OPTIONS);
  assert.equal(error, undefined);
  assert.equal(value.data.heading, '<span style="color:#00ff00">Hi</span>');
});

test("the AI still sees each field's visible length limit", () => {
  const spec = fieldAt("cta", "data.heading");
  assert.equal(spec?.kind, "text");
  assert.equal(spec && "max" in spec ? spec.max : undefined, 200);
});
