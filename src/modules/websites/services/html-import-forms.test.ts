import assert from "node:assert/strict";
import { test } from "node:test";
import { findContactFormFields, leadFromEntries, validateContactSubmission } from "./contact-submission.js";
import { importedFormFields, prepareImportedForms } from "./html-import-forms.js";
import type { PublishSnapshot } from "../types/website.types.js";

const FORM = `<section><form id="f" novalidate action="https://evil.example" method="post">
  <label for="n">Your name *</label><input id="n" name="Name">
  <label>Phone number <input type="tel" name="phone" required></label>
  <label for="s">I'm looking for</label><select id="s"><option value="">Choose…</option><option>Plywood</option><option>Furniture</option></select>
  <textarea placeholder="Message"></textarea><button type="submit">Send enquiry</button></form></section>`;

test("imported forms are marked, named and get a spam trap", () => {
  const html = prepareImportedForms(FORM);
  assert.match(html, /<form[^>]*data-wb-imported-form=""[^>]*data-wb-form-index="0"/);
  assert.doesNotMatch(html, /evil\.example|method=/);
  assert.match(html, /name="name"/, "names are normalised to field ids");
  assert.match(html, /<select id="s" name="i_m_looking_for"/, "unnamed controls get a name from their label");
  assert.match(html, /<textarea placeholder="Message" name="message"/);
  assert.match(html, /name="_wb_hp"/);
  assert.equal(prepareImportedForms(html), html, "idempotent across saves");
});

test("submissions are validated against the published imported form", () => {
  const html = prepareImportedForms(FORM);
  assert.deepEqual(importedFormFields(html, 0), [
    { id: "name", type: "text", label: "Your name", required: true },
    { id: "phone", type: "tel", label: "Phone number", required: true },
    { id: "i_m_looking_for", type: "select", label: "I'm looking for", options: ["Plywood", "Furniture"] },
    { id: "message", type: "textarea", label: "Message" },
  ]);

  const snapshot = {
    header: { imported: { html: prepareImportedForms(`<header><form><input type="email" name="email" required></form></header>`) } },
    footer: {},
    pages: [{ sections: [{ id: "block-1", type: "imported_html", data: { html } }] }],
  } as unknown as PublishSnapshot;

  const fields = findContactFormFields(snapshot, "block-1", 0)!;
  assert.equal(fields.length, 4);
  assert.equal(findContactFormFields(snapshot, "block-1", 3), null);
  assert.equal(findContactFormFields(snapshot, "site-header", 0)?.[0]?.type, "email");

  assert.deepEqual(validateContactSubmission(fields, { name: "Asha" }), { ok: false, error: 'Please fill in "Phone number".' });
  assert.equal(validateContactSubmission(fields, { name: "Asha", phone: "98765 43210", i_m_looking_for: "Cars" }).ok, false);
  const ok = validateContactSubmission(fields, { name: "Asha", phone: "98765 43210", i_m_looking_for: "Plywood", message: "10 sheets", extra: "ignored" });
  assert.equal(ok.ok, true);
  const lead = leadFromEntries(ok.ok ? ok.entries : []);
  assert.equal(lead.senderName, "Asha");
  assert.equal(lead.senderPhone, "98765 43210");
  assert.match(lead.message, /I'm looking for: Plywood/);
  assert.doesNotMatch(lead.message, /ignored/);
});

test("forms without any required field still need a name and a way to reply", () => {
  const html = prepareImportedForms(`<form><label>Your name <input name="name"></label><label>Phone <input type="tel" name="phone"></label>
    <select name="need"><option>Plywood</option><option>Furniture</option></select><textarea name="message"></textarea></form>`);
  const fields = importedFormFields(html, 0)!;
  assert.deepEqual(fields.filter((f) => f.required).map((f) => f.id), ["name", "phone"]);
  // A select always has a value; on its own it is not an enquiry.
  assert.deepEqual(validateContactSubmission(fields, { need: "Plywood" }), { ok: false, error: 'Please fill in "Your name".' });
});
