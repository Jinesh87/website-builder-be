import assert from "node:assert/strict";
import { test } from "node:test";
import { sectionSchema } from "../validators/site-content.validator.js";
import type { SectionEnvelope } from "./ai-ops.js";
import { repairSection } from "./repair-section.js";

function featuresSection(items: Record<string, unknown>[], data: Record<string, unknown> = {}): SectionEnvelope {
  return {
    id: "8a3c2a52-3f3e-4a8e-9c2e-1d0f3c6b9a11",
    type: "features",
    hidden: false,
    settings: { background: "default", hideOnMobile: false },
    data: { heading: "Why us", columns: 3, mobileColumns: 1, items, ...data },
  };
}

test("repairSection keeps a valid section unchanged", () => {
  const section = featuresSection([{ title: "Fast", description: "Quick setup", iconColor: "blue" }]);
  const repaired = repairSection(section, "test");
  assert.ok(repaired);
  assert.equal((repaired.data.items as { iconColor?: string }[])[0]!.iconColor, "blue");
});

test("repairSection drops an unknown icon colour so the section saves", () => {
  const section = featuresSection([
    { title: "Fast", description: "Quick setup", iconColor: "teal" },
    { title: "Safe", description: "Secure by default", iconColor: "green" },
  ]);
  assert.ok(sectionSchema.validate(section).error, "the raw AI section must be invalid");

  const repaired = repairSection(section, "test");
  assert.ok(repaired);
  assert.equal(sectionSchema.validate(repaired).error, undefined);
  const items = repaired.data.items as { title: string; iconColor?: string }[];
  assert.equal(items.length, 2);
  assert.equal(items[0]!.iconColor, undefined);
  assert.equal(items[1]!.iconColor, "green");
});

test("repairSection removes list items that miss a required field", () => {
  const section = featuresSection([
    { description: "No title here", iconColor: "rainbow" },
    { title: "Kept", description: "Has a title" },
  ]);
  const repaired = repairSection(section, "test");
  assert.ok(repaired);
  const items = repaired.data.items as { title: string }[];
  assert.deepEqual(
    items.map((item) => item.title),
    ["Kept"],
  );
});

test("repairSection gives up when a required top-level field is missing", () => {
  const section = featuresSection([{ title: "Fast", description: "Quick setup" }]);
  delete section.data.heading;
  assert.equal(repairSection(section, "test"), null);
});

test("repairSection does not mutate its input", () => {
  const section = featuresSection([{ title: "Fast", description: "Quick setup", iconColor: "teal" }]);
  const before = structuredClone(section);
  repairSection(section, "test");
  assert.deepEqual(section, before);
});
