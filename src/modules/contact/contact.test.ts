import assert from "node:assert/strict";
import { test } from "node:test";
import { salesInquiryEmail } from "../email/templates/email.templates.js";
import { contactInquirySchema } from "./contact.validator.js";

test("salesInquiryEmail renders a professional executive template for bytezorasales@gmail.com", () => {
  const rendered = salesInquiryEmail({
    brand: "Bytezora",
    to: "bytezorasales@gmail.com",
    senderName: "Arjun Ramesh",
    senderEmail: "arjun@example.com",
    senderPhone: "+91 98765 43210",
    subject: "Plans and pricing",
    message: "Hello team,\nWe are looking to launch 10 websites on your platform.\nPlease share agency pricing details.",
    submittedAt: new Date("2026-10-22T12:00:00Z"),
  });

  // Verify subject
  assert.equal(rendered.subject, "[Bytezora Sales] New Inquiry: Plans and pricing from Arjun Ramesh");

  // Verify HTML contents
  assert.match(rendered.html, /bytezorasales@gmail\.com/);
  assert.match(rendered.html, /Arjun Ramesh/);
  assert.match(rendered.html, /arjun@example\.com/);
  assert.match(rendered.html, /\+91 98765 43210/);
  assert.match(rendered.html, /Plans and pricing/);
  assert.match(rendered.html, /Ground Floor, 287\/A, Ernakulam, Kerala – 682315/);
  assert.match(rendered.html, /mailto:arjun%40example\.com/);
  assert.match(rendered.html, /tel:\+91 98765 43210/);

  // Verify plain text contents
  assert.match(rendered.text, /BYTEZORA WEBBUILDER - NEW CLIENT INQUIRY/);
  assert.match(rendered.text, /bytezorasales@gmail\.com/);
  assert.match(rendered.text, /Arjun Ramesh/);
  assert.match(rendered.text, /arjun@example\.com/);
});

test("salesInquiryEmail safely escapes malicious inputs and handles optional phone", () => {
  const rendered = salesInquiryEmail({
    to: "sales@example.com",
    senderName: "Evil <script>alert(1)</script>",
    senderEmail: "hacker@test.com",
    subject: "Hack <test>",
    message: "Dangerous & <cool> message",
  });

  assert.doesNotMatch(rendered.html, /<script>/);
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.match(rendered.html, /Not provided/);
});

test("contactInquirySchema validates valid contact input", () => {
  const valid = {
    name: "John Doe",
    email: "john@example.com",
    phone: "+919995070483",
    subject: "Technical support",
    message: "This is a detailed message exceeding ten characters.",
  };
  const { error, value } = contactInquirySchema.validate(valid);
  assert.equal(error, undefined);
  assert.equal(value.name, "John Doe");
  assert.equal(value.email, "john@example.com");
  assert.equal(value.subject, "Technical support");
});

test("contactInquirySchema rejects invalid emails and short messages", () => {
  const invalid = {
    name: "John",
    email: "not-an-email",
    message: "Short",
  };
  const { error } = contactInquirySchema.validate(invalid);
  assert.notEqual(error, undefined);
});
