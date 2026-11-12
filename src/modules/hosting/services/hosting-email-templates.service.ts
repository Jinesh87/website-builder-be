import { randomUUID } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import { prisma } from "../../../config/prisma.js";
import {
  applyHostingEmailVars,
  DEFAULT_HOSTING_EMAILS,
  HOSTING_EMAIL_KIND_DISPLAY,
  HOSTING_EMAIL_KIND_LABELS,
  HOSTING_EMAIL_PLACEHOLDERS,
  hostingEmailLines,
  isHostingEmailKindLabel,
  KIND_FROM_LABEL,
  LABEL_FROM_KIND,
  type HostingEmailKindLabel,
} from "../utils/hosting-email-defaults.js";
import type { HostingEvent } from "../types/hosting-events.js";
import { formatBillingDate, formatPeriod } from "./hosting-period.js";
import { formatConnects, formatInr } from "../../wallet/services/wallet.service.js";

export type HostingEmailTemplateView = {
  kind: HostingEmailKindLabel;
  kindLabel: string;
  enabled: boolean;
  subject: string;
  heading: string;
  message: string;
  isDefault: boolean;
  updatedAt: string | null;
};

export type HostingEmailTemplateInput = {
  enabled: boolean;
  subject: string;
  heading: string;
  message: string;
};

export type ResolvedHostingEmail = {
  subject: string;
  heading: string;
  body: string;
  lines: string[];
  /** When false, skip sending the email (in-app notice still uses the copy). */
  emailEnabled: boolean;
};

const AUTOPAY_STOPPED_DETAIL: Record<
  Extract<HostingEvent, { kind: "AUTOPAY_STOPPED" }>["reason"],
  (site: string) => string
> = {
  PAYMENT_FAILED: (site) =>
    `Razorpay couldn't take the hosting payment for ${site}, so autopay has stopped.\n\nRenew from the website's Hosting tab, or turn autopay on again with another card or UPI ID.`,
  STOPPED: (site) =>
    `Autopay for ${site} was cancelled, so hosting won't renew by itself.\n\nTurn it on again from the website's Hosting tab whenever you like.`,
  PLAN_CHANGED: (site) =>
    `Autopay for ${site} was turned off because its hosting plan or price changed.\n\nTurn it on again from the website's Hosting tab to approve the new amount.`,
};

function priceSuffix(price: number | null): string {
  return price === null ? "" : price === 0 ? " (free)" : ` (${formatInr(price)})`;
}

function priceLabel(price: number | null): string {
  return price === null ? "" : price === 0 ? "Free" : formatInr(price);
}

function renewsNote(
  renewsBy: Extract<HostingEvent, { kind: "RENEWAL_REMINDER" }>["renewsBy"],
  due: string,
): string {
  if (renewsBy === "AUTOPAY") return "Autopay will charge your card or UPI on that day.";
  if (renewsBy === "CONNECTS") return "You have enough connects, so it renews automatically.";
  return `Renew it from the website's Hosting tab before ${due} to keep the site live.`;
}

function paidAmount(event: Extract<HostingEvent, { kind: "PAID" }>): string {
  if (event.amountPaise === 0) return "free";
  return event.connects
    ? `${formatInr(event.amountPaise)}, paid with ${formatConnects(event.connects)}`
    : formatInr(event.amountPaise);
}

function eventVars(event: HostingEvent, websiteName: string, clientName: string): Record<string, string> {
  const base = { websiteName, clientName };
  switch (event.kind) {
    case "RENEWAL_REMINDER": {
      const renewalDate = formatBillingDate(event.periodEnd);
      return {
        ...base,
        renewalDate,
        graceEndsAt: "",
        priceSuffix: priceSuffix(event.price),
        price: priceLabel(event.price),
        renewalNote: renewsNote(event.renewsBy, renewalDate),
        packageName: "",
        period: "",
        amount: "",
        restoredNote: "",
        reasonDetail: "",
      };
    }
    case "PAID":
      return {
        ...base,
        renewalDate: "",
        graceEndsAt: "",
        priceSuffix: "",
        price: "",
        renewalNote: "",
        packageName: event.packageName ? `${event.packageName} hosting` : "Hosting",
        period: formatPeriod(event.periodStart, event.periodEnd),
        amount: paidAmount(event),
        restoredNote: event.restored ? "The site is live again." : "",
        reasonDetail: "",
      };
    case "EXPIRED":
      return {
        ...base,
        renewalDate: "",
        graceEndsAt: formatBillingDate(event.graceEndsAt),
        priceSuffix: priceSuffix(event.price),
        price: priceLabel(event.price),
        renewalNote: "",
        packageName: "",
        period: "",
        amount: "",
        restoredNote: "",
        reasonDetail: "",
      };
    case "SUSPENDED":
      return {
        ...base,
        renewalDate: "",
        graceEndsAt: "",
        priceSuffix: "",
        price: "",
        renewalNote: "",
        packageName: "",
        period: "",
        amount: "",
        restoredNote: "",
        reasonDetail: "",
      };
    case "AUTOPAY_STOPPED":
      return {
        ...base,
        renewalDate: "",
        graceEndsAt: "",
        priceSuffix: "",
        price: "",
        renewalNote: "",
        packageName: "",
        period: "",
        amount: "",
        restoredNote: "",
        reasonDetail: AUTOPAY_STOPPED_DETAIL[event.reason](websiteName),
      };
  }
}

function collapseBlankParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .join("\n\n");
}

export class HostingEmailTemplatesService {
  placeholders() {
    return [...HOSTING_EMAIL_PLACEHOLDERS];
  }

  async list(): Promise<HostingEmailTemplateView[]> {
    const rows = await prisma.hostingEmailTemplate.findMany();
    const byKind = new Map(rows.map((row) => [row.kind, row]));
    return HOSTING_EMAIL_KIND_LABELS.map((label) => {
      const defaults = DEFAULT_HOSTING_EMAILS[label];
      const row = byKind.get(KIND_FROM_LABEL[label]);
      if (!row) {
        return {
          kind: label,
          kindLabel: HOSTING_EMAIL_KIND_DISPLAY[label],
          enabled: true,
          subject: defaults.subject,
          heading: defaults.heading,
          message: defaults.message,
          isDefault: true,
          updatedAt: null,
        };
      }
      return {
        kind: label,
        kindLabel: HOSTING_EMAIL_KIND_DISPLAY[label],
        enabled: row.enabled,
        subject: row.subject,
        heading: row.heading,
        message: row.message,
        isDefault: false,
        updatedAt: row.updatedAt.toISOString(),
      };
    });
  }

  async upsert(kindLabel: string, input: HostingEmailTemplateInput): Promise<HostingEmailTemplateView> {
    if (!isHostingEmailKindLabel(kindLabel)) {
      throw new AppError(400, "Unknown hosting email kind.", "INVALID_KIND");
    }
    const kind = KIND_FROM_LABEL[kindLabel];
    const subject = input.subject.trim().replace(/[\r\n]+/g, " ");
    const heading = input.heading.trim().replace(/[\r\n]+/g, " ");
    const message = input.message.trim();
    if (!subject) throw new AppError(400, "Enter an email subject.", "SUBJECT_REQUIRED");
    if (!heading) throw new AppError(400, "Enter a title.", "HEADING_REQUIRED");
    if (!message) throw new AppError(400, "Enter a message.", "MESSAGE_REQUIRED");

    const row = await prisma.hostingEmailTemplate.upsert({
      where: { kind },
      create: {
        id: randomUUID(),
        kind,
        enabled: input.enabled,
        subject,
        heading,
        message,
      },
      update: {
        enabled: input.enabled,
        subject,
        heading,
        message,
      },
    });

    return {
      kind: kindLabel,
      kindLabel: HOSTING_EMAIL_KIND_DISPLAY[kindLabel],
      enabled: row.enabled,
      subject: row.subject,
      heading: row.heading,
      message: row.message,
      isDefault: false,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async reset(kindLabel: string): Promise<HostingEmailTemplateView> {
    if (!isHostingEmailKindLabel(kindLabel)) {
      throw new AppError(400, "Unknown hosting email kind.", "INVALID_KIND");
    }
    await prisma.hostingEmailTemplate.deleteMany({ where: { kind: KIND_FROM_LABEL[kindLabel] } });
    const defaults = DEFAULT_HOSTING_EMAILS[kindLabel];
    return {
      kind: kindLabel,
      kindLabel: HOSTING_EMAIL_KIND_DISPLAY[kindLabel],
      enabled: true,
      subject: defaults.subject,
      heading: defaults.heading,
      message: defaults.message,
      isDefault: true,
      updatedAt: null,
    };
  }

  /** Resolve client-facing copy for a hosting event (DB override or code defaults). */
  async resolveClientEmail(
    event: HostingEvent,
    websiteName: string,
    clientName: string,
  ): Promise<ResolvedHostingEmail> {
    const label = LABEL_FROM_KIND[event.kind];
    const defaults = DEFAULT_HOSTING_EMAILS[label];
    const stored = await prisma.hostingEmailTemplate.findUnique({ where: { kind: event.kind } });
    const subjectTpl = stored?.subject ?? defaults.subject;
    const headingTpl = stored?.heading ?? defaults.heading;
    const messageTpl = stored?.message ?? defaults.message;
    const vars = eventVars(event, websiteName, clientName);
    const subject = applyHostingEmailVars(subjectTpl, vars).replace(/[\r\n]+/g, " ").trim();
    const heading = applyHostingEmailVars(headingTpl, vars).trim();
    const message = collapseBlankParagraphs(applyHostingEmailVars(messageTpl, vars).trim());
    const lines = hostingEmailLines(message);
    return {
      subject: subject || defaults.subject,
      heading: heading || defaults.heading,
      body: lines.join(" "),
      lines: lines.length > 0 ? lines : hostingEmailLines(defaults.message),
      emailEnabled: stored ? stored.enabled : true,
    };
  }
}

export const hostingEmailTemplatesService = new HostingEmailTemplatesService();
