import type { QuestionnaireAnswers } from "./questionnaire.types.js";

const SKIPPED_EMAIL_CODES = new Set(["EMAIL_NOT_CONFIGURED", "EMAIL_DISABLED", "EMAIL_KEY_UNREADABLE"]);
const EMAIL_ERROR_MAX = 300;

export type QuestionnaireEmailFailure = {
  emailStatus: "FAILED" | "SKIPPED";
  emailError: string;
};

/** Maps a failed notification send onto the status stored with the questionnaire. */
export function questionnaireEmailFailure(error: unknown): QuestionnaireEmailFailure {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "";
  const message = error instanceof Error && error.message.trim() ? error.message.trim() : "Email could not be sent.";
  return {
    emailStatus: SKIPPED_EMAIL_CODES.has(code) ? "SKIPPED" : "FAILED",
    emailError: message.slice(0, EMAIL_ERROR_MAX),
  };
}

export function formatAnswersSummary(answers: QuestionnaireAnswers): string {
  const parts: string[] = [];
  parts.push(`Business type: ${answers.businessType}`);
  parts.push(`Pages: ${answers.pages.join(", ")}`);
  parts.push(`Look & feel: ${answers.look} look, ${answers.style} style, ${answers.palette} palette`);

  const reachParts: string[] = [];
  if (answers.reach?.call?.enabled) {
    reachParts.push(`Call${answers.reach.call.differentContact ? ` (${answers.reach.call.differentContact})` : ""}`);
  }
  if (answers.reach?.whatsapp?.enabled) {
    reachParts.push(`WhatsApp${answers.reach.whatsapp.differentContact ? ` (${answers.reach.whatsapp.differentContact})` : ""}`);
  }
  if (answers.reach?.enquiryForm?.enabled) {
    reachParts.push(`Enquiry form${answers.reach.enquiryForm.differentContact ? ` (${answers.reach.enquiryForm.differentContact})` : ""}`);
  }
  if (answers.reach?.mapLocation?.enabled) {
    reachParts.push("Map location (enabled)");
  }
  if (reachParts.length > 0) {
    parts.push(`Customer contact methods: ${reachParts.join(", ")}`);
  }
  if (answers.reach?.socialLinks && answers.reach.socialLinks.length > 0) {
    parts.push(`Social links: ${answers.reach.socialLinks.join(", ")}`);
  }

  if (answers.features && answers.features.length > 0) {
    parts.push(`Features: ${answers.features.join(", ")}`);
  }
  parts.push(`Logo: ${answers.logo}`);
  parts.push(`Copy/Text: ${answers.text}`);
  parts.push(`Photos: ${answers.photos}`);
  parts.push(`Domain: ${answers.domain}`);
  parts.push(`Timeline / Needed: ${answers.needed}`);

  return parts.join("\n");
}

