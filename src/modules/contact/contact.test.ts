import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "../../common/errors/AppError.js";
import { enquiryReplyEmail, salesInquiryEmail } from "../email/templates/email.templates.js";
import { inquiryEmailFailure } from "./enquiry-email.js";
import {
  addEnquiryNoteSchema,
  contactInquirySchema,
  listEnquiriesQuerySchema,
  updateEnquirySchema,
} from "./contact.validator.js";

test("salesInquiryEmail renders a professional executive template for support@bytezoracoders.com", () => {
  const rendered = salesInquiryEmail({
    brand: "Bytezora",
    to: "support@bytezoracoders.com",
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
  assert.match(rendered.html, /support@bytezoracoders\.com/);
  assert.match(rendered.html, /Arjun Ramesh/);
  assert.match(rendered.html, /arjun@example\.com/);
  assert.match(rendered.html, /\+91 98765 43210/);
  assert.match(rendered.html, /Plans and pricing/);
  assert.match(rendered.html, /Ground Floor, 287\/A, Ernakulam, Kerala – 682315/);
  assert.match(rendered.html, /mailto:arjun%40example\.com/);
  assert.match(rendered.html, /tel:\+91 98765 43210/);

  // Verify plain text contents
  assert.match(rendered.text, /BYTEZORA WEBBUILDER - NEW CLIENT INQUIRY/);
  assert.match(rendered.text, /support@bytezoracoders\.com/);
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

test("inquiryEmailFailure marks unconfigured mail as skipped and send errors as failed", () => {
  const skipped = inquiryEmailFailure(new AppError(503, "Email is not configured yet", "EMAIL_NOT_CONFIGURED"));
  assert.equal(skipped.emailStatus, "SKIPPED");
  assert.equal(skipped.emailError, "Email is not configured yet");

  const failed = inquiryEmailFailure(new AppError(502, "Email could not be sent: rejected", "EMAIL_SEND_FAILED"));
  assert.equal(failed.emailStatus, "FAILED");
  assert.match(failed.emailError, /rejected/);

  const unknown = inquiryEmailFailure(new Error("  "));
  assert.equal(unknown.emailStatus, "FAILED");
  assert.equal(unknown.emailError, "Email could not be sent.");
});

test("enquiryReplyEmail sends the admin's reply with the original message quoted and escaped", () => {
  const rendered = enquiryReplyEmail({
    brand: "Bytezora",
    subject: "Re: Plans and pricing\r\n",
    message: "Hi Priya,\nAgency pricing is attached.",
    customerName: "Priya <b>Nair</b>",
    originalMessage: "Need pricing for <10> sites",
    submittedAt: new Date("2026-10-29T09:30:00Z"),
  });

  assert.equal(rendered.subject, "Re: Plans and pricing");
  assert.match(rendered.html, /Hi Priya,<br\/>Agency pricing is attached\./);
  assert.match(rendered.html, /Need pricing for &lt;10&gt; sites/);
  assert.doesNotMatch(rendered.html, /<b>Nair<\/b>/);
  assert.match(rendered.text, /> Need pricing for <10> sites/);
});

test("enquiry admin schemas accept the workflow statuses and reject empty updates", () => {
  assert.equal(listEnquiriesQuerySchema.validate({ status: "IN_PROGRESS" }).error, undefined);
  assert.notEqual(listEnquiriesQuerySchema.validate({ status: "ARCHIVED" }).error, undefined);

  assert.equal(updateEnquirySchema.validate({ status: "RESOLVED" }).error, undefined);
  assert.equal(updateEnquirySchema.validate({ read: false }).error, undefined);
  assert.notEqual(updateEnquirySchema.validate({}).error, undefined);

  assert.equal(addEnquiryNoteSchema.validate({ body: "  Called, follow up Monday  " }).value.body, "Called, follow up Monday");
  assert.notEqual(addEnquiryNoteSchema.validate({ body: "   " }).error, undefined);
});
