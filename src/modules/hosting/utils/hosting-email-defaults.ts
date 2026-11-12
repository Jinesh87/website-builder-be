import type { HostingEmailKind } from "../../../generated/prisma/client.js";

/** URL / API label for each hosting email kind. */
export type HostingEmailKindLabel =
  | "renewal_reminder"
  | "paid"
  | "expired"
  | "suspended"
  | "autopay_stopped";

export const HOSTING_EMAIL_KIND_LABELS: HostingEmailKindLabel[] = [
  "renewal_reminder",
  "paid",
  "expired",
  "suspended",
  "autopay_stopped",
];

export const KIND_FROM_LABEL: Record<HostingEmailKindLabel, HostingEmailKind> = {
  renewal_reminder: "RENEWAL_REMINDER",
  paid: "PAID",
  expired: "EXPIRED",
  suspended: "SUSPENDED",
  autopay_stopped: "AUTOPAY_STOPPED",
};

export const LABEL_FROM_KIND: Record<HostingEmailKind, HostingEmailKindLabel> = {
  RENEWAL_REMINDER: "renewal_reminder",
  PAID: "paid",
  EXPIRED: "expired",
  SUSPENDED: "suspended",
  AUTOPAY_STOPPED: "autopay_stopped",
};

export const HOSTING_EMAIL_KIND_DISPLAY: Record<HostingEmailKindLabel, string> = {
  renewal_reminder: "Renewal reminder",
  paid: "Payment received",
  expired: "Hosting expired",
  suspended: "Site offline",
  autopay_stopped: "Autopay stopped",
};

/** Placeholders Super Admin can use in subject / heading / message. */
export const HOSTING_EMAIL_PLACEHOLDERS = [
  "{{websiteName}}",
  "{{clientName}}",
  "{{renewalDate}}",
  "{{graceEndsAt}}",
  "{{priceSuffix}}",
  "{{price}}",
  "{{renewalNote}}",
  "{{packageName}}",
  "{{period}}",
  "{{amount}}",
  "{{restoredNote}}",
  "{{reasonDetail}}",
] as const;

export type HostingEmailDefault = {
  subject: string;
  heading: string;
  /** Plain message. Separate paragraphs with a blank line. */
  message: string;
};

export const DEFAULT_HOSTING_EMAILS: Record<HostingEmailKindLabel, HostingEmailDefault> = {
  renewal_reminder: {
    subject: "{{websiteName}}: hosting renews {{renewalDate}}",
    heading: "Hosting renewal coming up",
    message:
      "Hosting for {{websiteName}} renews on {{renewalDate}}{{priceSuffix}}.\n\n{{renewalNote}}",
  },
  paid: {
    subject: "{{websiteName}}: hosting paid",
    heading: "Hosting payment received",
    message:
      "{{packageName}} for {{websiteName}} is paid for {{period}} ({{amount}}).\n\n{{restoredNote}}",
  },
  expired: {
    subject: "{{websiteName}}: hosting expired",
    heading: "Hosting expired",
    message:
      "Hosting for {{websiteName}} has expired. The site stays live until {{graceEndsAt}}.\n\nRenew it{{priceSuffix}} before then, or the site goes offline.",
  },
  suspended: {
    subject: "{{websiteName}} is offline",
    heading: "Your website is offline",
    message:
      "{{websiteName}} is offline because its hosting wasn't renewed. Your pages and content are safe.\n\nRenew hosting and the site goes live again straight away, with no changes.",
  },
  autopay_stopped: {
    subject: "{{websiteName}}: autopay stopped",
    heading: "Hosting autopay stopped",
    message: "{{reasonDetail}}",
  },
};

export function isHostingEmailKindLabel(value: string): value is HostingEmailKindLabel {
  return (HOSTING_EMAIL_KIND_LABELS as string[]).includes(value);
}

/** Replace `{{key}}` tokens. Unknown tokens are left as-is. */
export function applyHostingEmailVars(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

/** Split a filled message into email body paragraphs. */
export function hostingEmailLines(message: string): string[] {
  return message
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}
