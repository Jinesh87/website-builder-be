import assert from "node:assert/strict";
import { test } from "node:test";
import type { ContactFormField, Section } from "../types/site-content.types.js";
import type { PublishSnapshot } from "../types/website.types.js";
import { sectionSchema } from "../validators/site-content.validator.js";
import { findContactFormFields, leadFromEntries, validateContactSubmission } from "./contact-submission.js";

const fields: ContactFormField[] = [
  { id: "name", type: "text", label: "Full Name", required: true },
  { id: "email", type: "email", label: "Email", required: true },
  { id: "phone", type: "tel", label: "Phone" },
  { id: "field_budget", type: "select", label: "Budget", options: ["10k", "50k"] },
  { id: "field_services", type: "checkboxes", label: "Services", options: ["Doors", "Boards"] },
  { id: "field_empty", type: "radio", label: "No options yet", required: true, options: [] },
  { id: "message", type: "textarea", label: "Message" },
];

const settings = { background: "default" as const, hideOnMobile: false };

function snapshotWith(section: Section): PublishSnapshot {
  return {
    schemaVersion: 1,
    theme: {} as PublishSnapshot["theme"],
    header: {} as PublishSnapshot["header"],
    footer: {} as PublishSnapshot["footer"],
    pages: [{ id: "p1", name: "Contact", slug: "/contact", pageType: "CONTACT", showInNav: true, seoTitle: null, seoDescription: null, sections: [section] }],
  } as PublishSnapshot;
}

test("collects answers in form order with their current labels", () => {
  const result = validateContactSubmission(fields, {
    name: " John ",
    email: "john@example.com",
    field_budget: "50k",
    field_services: ["Boards", "Doors", "Boards"],
    message: "Need WPC boards",
  });
  assert.equal(result.ok, true);
  assert.ok(result.ok);
  assert.deepEqual(
    result.entries.map((entry) => [entry.label, entry.value]),
    [
      ["Full Name", "John"],
      ["Email", "john@example.com"],
      ["Budget", "50k"],
      ["Services", "Boards, Doors"],
      ["Message", "Need WPC boards"],
    ],
  );
});

test("ignores keys that are not fields of the published form", () => {
  const result = validateContactSubmission(fields, { name: "A", email: "a@b.co", injected: "<script>", constructor: "x" });
  assert.ok(result.ok);
  assert.deepEqual(result.entries.map((entry) => entry.id), ["name", "email"]);
});

test("rejects missing required fields, bad emails, bad phones and unknown options", () => {
  assert.deepEqual(validateContactSubmission(fields, { email: "a@b.co" }), { ok: false, error: 'Please fill in "Full Name".' });
  assert.equal(validateContactSubmission(fields, { name: "A", email: "nope" }).ok, false);
  assert.equal(validateContactSubmission(fields, { name: "A", email: "a@b.co", phone: "call me" }).ok, false);
  assert.equal(validateContactSubmission(fields, { name: "A", email: "a@b.co", field_budget: "1M" }).ok, false);
  assert.equal(validateContactSubmission(fields, { name: "A", email: "a@b.co", field_services: ["Windows"] }).ok, false);
  assert.equal(validateContactSubmission(fields, null).ok, false);
});

test("checks dates, numbers and value length", () => {
  const extra: ContactFormField[] = [
    { id: "when", type: "date", label: "Date" },
    { id: "qty", type: "number", label: "Quantity" },
    { id: "note", type: "text", label: "Note" },
  ];
  assert.ok(validateContactSubmission(extra, { when: "2026-10-23", qty: "12" }).ok);
  assert.equal(validateContactSubmission(extra, { when: "2026-02-30" }).ok, false);
  assert.equal(validateContactSubmission(extra, { qty: "twelve" }).ok, false);
  assert.equal(validateContactSubmission(extra, { note: "x".repeat(501) }).ok, false);
});

test("maps answers onto the lead email", () => {
  const result = validateContactSubmission(fields, { name: "John\nDoe", email: "john@example.com", phone: "+91 98765 43210" });
  assert.ok(result.ok);
  const lead = leadFromEntries(result.entries);
  assert.equal(lead.senderName, "John Doe");
  assert.equal(lead.senderEmail, "john@example.com");
  assert.equal(lead.senderPhone, "+91 98765 43210");
  assert.equal(lead.fields.length, 3);
  assert.match(lead.message, /Phone: \+91 98765 43210/);
});

test("names anonymous leads and leaves reply-to empty without an email field", () => {
  const lead = leadFromEntries([{ id: "field_x", type: "tel", label: "Phone", value: "12345" }]);
  assert.equal(lead.senderName, "Website visitor");
  assert.equal(lead.senderEmail, undefined);
});

test("finds the custom fields of a published contact section only", () => {
  const section = { id: "contact-1", type: "contact", hidden: false, settings, data: { heading: "Hi", showForm: true, submitLabel: "Send", formFields: fields } } as Section;
  const snapshot = snapshotWith(section);
  assert.equal(findContactFormFields(snapshot, "contact-1")?.length, fields.length);
  assert.equal(findContactFormFields(snapshot, "missing"), null);
  const legacy = { ...section, data: { heading: "Hi", showForm: true, submitLabel: "Send" } } as Section;
  assert.equal(findContactFormFields(snapshotWith(legacy), "contact-1"), null);
  assert.equal(findContactFormFields(null, "contact-1"), null);
});

test("contact sections accept custom fields and layouts, and reject broken ones", () => {
  const base = { id: "c", type: "contact", hidden: false, settings, data: { heading: "Hi", showForm: true, submitLabel: "Send" } };
  const layout = {
    columns: [
      { id: "col-a", width: 7, boxed: true, blocks: [{ id: "b-form", type: "form" }] },
      { id: "col-b", width: 5, blocks: [{ id: "b-map", type: "map", query: "Ernakulam" }, { id: "b-mail", type: "info", kind: "email", value: "a@b.co" }] },
    ],
  };
  const valid = sectionSchema.validate({ ...base, data: { ...base.data, variant: "custom", formFields: fields, layout } });
  assert.equal(valid.error, undefined);
  assert.equal((valid.value.data as { variant: string }).variant, "custom");

  const twoForms = { columns: [{ id: "a", width: 6, blocks: [{ id: "f1", type: "form" }, { id: "f2", type: "form" }] }] };
  assert.ok(sectionSchema.validate({ ...base, data: { ...base.data, layout: twoForms } }).error);

  const duplicateIds = [fields[0], { ...fields[1], id: "name" }];
  assert.ok(sectionSchema.validate({ ...base, data: { ...base.data, formFields: duplicateIds } }).error);

  const unsafeButton = { columns: [{ id: "a", width: 6, blocks: [{ id: "btn", type: "button", label: "x", href: "javascript:alert(1)" }] }] };
  assert.ok(sectionSchema.validate({ ...base, data: { ...base.data, layout: unsafeButton } }).error);

  const badId = [{ id: "Bad Id", type: "text", label: "x" }];
  assert.ok(sectionSchema.validate({ ...base, data: { ...base.data, formFields: badId } }).error);
});
