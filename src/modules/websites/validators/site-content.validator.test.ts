import assert from "node:assert/strict";
import { test } from "node:test";
import { sectionSchema } from "./site-content.validator.js";

const OPTIONS = { stripUnknown: true, abortEarly: false } as const;
const settings = { background: "default", hideOnMobile: false };

const downloadButton = {
  label: "Download Brochure",
  href: "https://api.example.com/api/media/files/0f8fad5b-d9cb-469f-a165-70867728950e",
  actionType: "download",
  downloadFileName: "Brochure.pdf",
  icon: "download",
  iconPosition: "right",
  openInNewTab: true,
};

test("button icons and download settings survive saving", () => {
  const section = {
    id: "cta-1",
    type: "cta",
    hidden: false,
    settings,
    data: { heading: "Ready to Transform Your Space?", button: { label: "Contact Us", href: "/contact" }, secondaryButton: downloadButton },
  };
  const { value, error } = sectionSchema.validate(section, OPTIONS);
  assert.equal(error, undefined);
  assert.deepEqual(value.data.secondaryButton, downloadButton);
});

test("button links stay limited to safe options", () => {
  const withButton = (secondaryButton: object) => ({
    id: "cta-1",
    type: "cta",
    hidden: false,
    settings,
    data: { heading: "CTA", button: { label: "Go", href: "/contact" }, secondaryButton },
  });
  assert.ok(sectionSchema.validate(withButton({ ...downloadButton, href: "javascript:alert(1)" }), OPTIONS).error);
  assert.ok(sectionSchema.validate(withButton({ ...downloadButton, actionType: "script" }), OPTIONS).error);
  assert.ok(sectionSchema.validate(withButton({ ...downloadButton, iconImage: { url: "javascript:alert(1)", alt: "" } }), OPTIONS).error);
});

test("Do's & Don'ts cards keep their variant, checklist points and bottom button", () => {
  const section = {
    id: "cards-1",
    type: "cards",
    hidden: false,
    settings,
    data: {
      variant: "dos-donts",
      heading: "Do's & Don'ts",
      columns: 2,
      mobileColumns: 1,
      bottomCta: { label: "Download Installation Guide", href: "/resources", icon: "download", actionType: "download" },
      items: [
        { title: "Do's", icon: "check", accentColor: "#16a34a", checklist: ["Store boards flat.", { text: "Pre-drill holes.", icon: "check" }] },
        { title: "Don'ts", icon: "x", accentColor: "#ef4444", checklist: ["Avoid harsh solvents."] },
      ],
    },
  };
  const { value, error } = sectionSchema.validate(section, OPTIONS);
  assert.equal(error, undefined);
  assert.equal(value.data.variant, "dos-donts");
  assert.deepEqual(value.data.items[0].checklist, section.data.items[0].checklist);
  assert.deepEqual(value.data.items[1].checklist, section.data.items[1].checklist);
  assert.deepEqual(value.data.bottomCta, section.data.bottomCta);
});
