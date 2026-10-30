import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError } from "../../common/errors/AppError.js";
import {
  questionnaireAdminEmail,
  questionnaireCustomerConfirmationEmail,
} from "../email/templates/email.templates.js";
import {
  formatAnswersSummary,
  questionnaireEmailFailure,
} from "./questionnaire-email.js";
import {
  addQuestionnaireNoteSchema,
  listQuestionnairesQuerySchema,
  submitQuestionnaireSchema,
  updateQuestionnaireSchema,
} from "./questionnaire.validator.js";

const sampleAnswers = {
  businessType: "Restaurant / Café",
  pages: ["Home", "About", "Services", "Contact"],
  look: "Light",
  style: "Modern",
  palette: "Ocean",
  reach: {
    call: { enabled: true, differentContact: "+91 99999 88888" },
    whatsapp: { enabled: true, differentContact: null },
    enquiryForm: { enabled: true, differentContact: null },
  },
  features: ["Online payments", "Booking"],
  logo: "I have one",
  text: "You write it",
  photos: "Stock",
  domain: "Help me buy",
  needed: "ASAP",
};

test("submitQuestionnaireSchema validates valid questionnaire input", () => {
  const valid = {
    businessName: "Coastal Bites",
    name: "Aarav Sharma",
    phone: "+91 98765 43210",
    email: "aarav@example.com",
    answers: sampleAnswers,
    filesLink: "https://drive.google.com/drive/folders/test",
    notes: "Please include vegan options prominently.",
    ref: "google",
  };
  const { error, value } = submitQuestionnaireSchema.validate(valid);
  assert.equal(error, undefined);
  assert.equal(value.businessName, "Coastal Bites");
  assert.equal(value.email, "aarav@example.com");
  assert.equal(value.answers.businessType, "Restaurant / Café");
  assert.equal(value.answers.palette, "Ocean");
});

test("submitQuestionnaireSchema rejects invalid emails, missing required answers, and illegal enums", () => {
  const invalid = {
    businessName: "Test Cafe",
    name: "Test User",
    phone: "123",
    email: "not-an-email",
    answers: {
      ...sampleAnswers,
      businessType: "Invalid Type",
    },
  };
  const { error } = submitQuestionnaireSchema.validate(invalid);
  assert.notEqual(error, undefined);
});

test("submitQuestionnaireSchema accepts honeypot field and allows empty optional fields", () => {
  const withHoneypot = {
    businessName: "Flower Studio",
    name: "Maya Patel",
    phone: "+91 98765 43210",
    email: "maya@example.com",
    answers: sampleAnswers,
    website: "http://spam-bot.site",
  };
  const { error, value } = submitQuestionnaireSchema.validate(withHoneypot);
  assert.equal(error, undefined);
  assert.equal(value.website, "http://spam-bot.site");
});

test("formatAnswersSummary formats structured answers for team notifications", () => {
  const summary = formatAnswersSummary(sampleAnswers as any);
  assert.match(summary, /Restaurant \/ Café/);
  assert.match(summary, /Home, About, Services, Contact/);
  assert.match(summary, /Light look, Modern style, Ocean palette/);
  assert.match(summary, /Call \(\+91 99999 88888\)/);
  assert.match(summary, /Online payments, Booking/);
  assert.match(summary, /ASAP/);
});

test("questionnaireAdminEmail renders professional notification email and safely escapes inputs", () => {
  const rendered = questionnaireAdminEmail({
    brand: "Bytezora",
    to: "support@bytezoracoders.com",
    businessName: "Coastal Bites <script>alert(1)</script>",
    senderName: "Aarav Sharma",
    senderEmail: "aarav@example.com",
    senderPhone: "+91 98765 43210",
    answersSummary: formatAnswersSummary(sampleAnswers as any),
    filesLink: "https://drive.google.com/test",
    notes: "Need it ASAP",
    ref: "instagram",
  });

  assert.match(rendered.subject, /New Website Questionnaire: Coastal Bites/);
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.match(rendered.html, /Coastal Bites &lt;script&gt;/);
  assert.match(rendered.html, /aarav@example\.com/);
  assert.match(rendered.html, /Ocean/);
  assert.match(rendered.html, /https:\/\/drive\.google\.com\/test/);
  assert.match(rendered.text, /Coastal Bites/);
});

test("questionnaireCustomerConfirmationEmail renders customer friendly response", () => {
  const rendered = questionnaireCustomerConfirmationEmail({
    brand: "Bytezora",
    businessName: "Coastal Bites",
    customerName: "Aarav",
  });

  assert.match(rendered.subject, /We've received your questionnaire for Coastal Bites - Bytezora/);
  assert.match(rendered.html, /Hi Aarav,/);
  assert.match(rendered.html, /Coastal Bites/);
  assert.match(rendered.text, /Coastal Bites/);
});

test("questionnaireEmailFailure categorizes skipped vs failed correctly", () => {
  const skipped = questionnaireEmailFailure(
    new AppError(503, "Email is not configured yet", "EMAIL_NOT_CONFIGURED"),
  );
  assert.equal(skipped.emailStatus, "SKIPPED");

  const failed = questionnaireEmailFailure(new Error("SMTP timeout connection refused"));
  assert.equal(failed.emailStatus, "FAILED");
  assert.match(failed.emailError, /SMTP timeout/);
});

test("questionnaire admin schemas accept valid status transitions and reject empty updates", () => {
  assert.equal(
    listQuestionnairesQuerySchema.validate({ status: "WEBSITE_CREATED" }).error,
    undefined,
  );
  assert.notEqual(
    listQuestionnairesQuerySchema.validate({ status: "UNKNOWN_STATUS" }).error,
    undefined,
  );

  assert.equal(
    updateQuestionnaireSchema.validate({ status: "DONE" }).error,
    undefined,
  );
  assert.equal(
    updateQuestionnaireSchema.validate({ read: true }).error,
    undefined,
  );
  assert.notEqual(updateQuestionnaireSchema.validate({}).error, undefined);

  assert.equal(
    addQuestionnaireNoteSchema.validate({ body: "Reviewed brief, starting AI generation" })
      .error,
    undefined,
  );
});

