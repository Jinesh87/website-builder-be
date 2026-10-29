const SKIPPED_EMAIL_CODES = new Set(["EMAIL_NOT_CONFIGURED", "EMAIL_DISABLED", "EMAIL_KEY_UNREADABLE"]);
const EMAIL_ERROR_MAX = 300;

export type InquiryEmailFailure = {
  emailStatus: "FAILED" | "SKIPPED";
  emailError: string;
};

/** Maps a failed sales-email send onto the status stored with the enquiry. */
export function inquiryEmailFailure(error: unknown): InquiryEmailFailure {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : "";
  const message = error instanceof Error && error.message.trim() ? error.message.trim() : "Email could not be sent.";
  return {
    emailStatus: SKIPPED_EMAIL_CODES.has(code) ? "SKIPPED" : "FAILED",
    emailError: message.slice(0, EMAIL_ERROR_MAX),
  };
}
