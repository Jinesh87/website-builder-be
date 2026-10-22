import { UserRole, UserStatus } from "../../../common/constants/roles.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import type { HostingPayer, HostingPaymentMethod } from "../../../generated/prisma/enums.js";
import { emailService } from "../../email/services/email.service.js";
import { notificationService } from "../../notifications/services/notification.service.js";
import { formatConnects, formatInr } from "../../wallet/services/wallet.service.js";
import { formatBillingDate, formatPeriod } from "./hosting-period.js";

export type HostingNoticeTarget = { clientId: string; websiteId: string; websiteName: string };

export type HostingEvent =
  | {
      kind: "RENEWAL_REMINDER";
      periodEnd: Date;
      /** Paise; null when the plan has no payable price yet. */
      price: number | null;
      /** The worker will renew it from connects. */
      renewsFromConnects: boolean;
    }
  | {
      kind: "PAID";
      periodStart: Date;
      periodEnd: Date;
      packageName: string | null;
      amountPaise: number;
      connects: number | null;
      method: HostingPaymentMethod;
      paidBy: HostingPayer;
      restored: boolean;
    }
  | { kind: "EXPIRED"; graceEndsAt: Date; price: number | null }
  | { kind: "SUSPENDED" };

type Message = { title: string; body: string; heading: string; lines: string[] };

function priceText(price: number | null): string {
  return price === null ? "" : price === 0 ? " (free)" : ` (${formatInr(price)})`;
}

function paidText(event: Extract<HostingEvent, { kind: "PAID" }>): string {
  if (event.amountPaise === 0) return "free";
  return event.connects ? `${formatInr(event.amountPaise)}, paid with ${formatConnects(event.connects)}` : formatInr(event.amountPaise);
}

function howPaid(event: Extract<HostingEvent, { kind: "PAID" }>): string {
  if (event.paidBy === "SYSTEM") return "by auto-renewal from connects";
  if (event.paidBy === "ADMIN") return event.method === "WALLET" ? "from the client's connects, by the admin" : "collected by the admin";
  return event.method === "RAZORPAY" ? "online by the client" : "from the client's connects";
}

function clientMessage(event: HostingEvent, site: string): Message {
  switch (event.kind) {
    case "RENEWAL_REMINDER": {
      const due = formatBillingDate(event.periodEnd);
      const lines = [
        `Hosting for ${site} renews on ${due}${priceText(event.price)}.`,
        event.renewsFromConnects
          ? "You have enough connects, so it renews automatically."
          : `Renew it from the website's Hosting tab before ${due} to keep the site live.`,
      ];
      return { title: `${site}: hosting renews ${due}`, body: lines.join(" "), heading: "Hosting renewal coming up", lines };
    }
    case "PAID": {
      const plan = event.packageName ? `${event.packageName} hosting` : "Hosting";
      const lines = [
        `${plan} for ${site} is paid for ${formatPeriod(event.periodStart, event.periodEnd)} (${paidText(event)}).`,
        ...(event.restored ? ["The site is live again."] : []),
      ];
      return { title: `${site}: hosting paid`, body: lines.join(" "), heading: "Hosting payment received", lines };
    }
    case "EXPIRED": {
      const lines = [
        `Hosting for ${site} has expired. The site stays live until ${formatBillingDate(event.graceEndsAt)}.`,
        `Renew it${priceText(event.price)} before then, or the site goes offline.`,
      ];
      return { title: `${site}: hosting expired`, body: lines.join(" "), heading: "Hosting expired", lines };
    }
    case "SUSPENDED": {
      const lines = [
        `${site} is offline because its hosting wasn't renewed. Your pages and content are safe.`,
        "Renew hosting and the site goes live again straight away, with no changes.",
      ];
      return { title: `${site} is offline`, body: lines.join(" "), heading: "Your website is offline", lines };
    }
  }
}

function adminMessage(event: HostingEvent, site: string, clientName: string): Message {
  const who = `${site} (${clientName})`;
  switch (event.kind) {
    case "RENEWAL_REMINDER": {
      const lines = [
        `Hosting for ${who} renews on ${formatBillingDate(event.periodEnd)}${priceText(event.price)}.`,
        event.renewsFromConnects
          ? "The client has enough connects for auto-renewal."
          : "The client renews online, or you can record a payment you collected.",
      ];
      return { title: `Renewal due: ${who}`, body: lines.join(" "), heading: "Hosting renewal coming up", lines };
    }
    case "PAID": {
      const lines = [
        `Hosting for ${who} is paid for ${formatPeriod(event.periodStart, event.periodEnd)}, ${howPaid(event)} (${paidText(event)}).`,
        ...(event.restored ? ["The site is live again."] : []),
      ];
      return { title: `Hosting paid: ${who}`, body: lines.join(" "), heading: "Hosting payment received", lines };
    }
    case "EXPIRED": {
      const lines = [`Hosting for ${who} expired unpaid. It goes offline on ${formatBillingDate(event.graceEndsAt)} unless paid.`];
      return { title: `Hosting expired: ${who}`, body: lines.join(" "), heading: "Hosting expired", lines };
    }
    case "SUSPENDED": {
      const lines = [`${who} was taken offline because hosting wasn't paid.`];
      return { title: `Site offline: ${who}`, body: lines.join(" "), heading: "Website taken offline", lines };
    }
  }
}

async function recipients(clientId: string) {
  return prisma.user.findMany({
    where: {
      status: UserStatus.ACTIVE,
      email: { not: null },
      OR: [{ role: UserRole.CLIENT, clientId }, { role: UserRole.SUPER_ADMIN }],
    },
    select: { email: true, fullName: true, role: true },
  });
}

/** Emails can't be sent everywhere (not configured, admin-issued logins without email); in-app notices always are. */
export async function notifyHosting(target: HostingNoticeTarget, event: HostingEvent): Promise<void> {
  const client = await prisma.client.findUnique({ where: { id: target.clientId }, select: { businessName: true } });
  const clientName = client?.businessName ?? "Client";
  const forClient = clientMessage(event, target.websiteName);
  const forAdmin = adminMessage(event, target.websiteName, clientName);
  const path = `/websites/${target.websiteId}?tab=hosting`;
  const kind = `HOSTING_${event.kind}`;

  await Promise.all([
    notificationService.notifyClient(target.clientId, { kind, title: forClient.title, body: forClient.body, link: path }),
    notificationService.notifyAdmins({ kind, title: forAdmin.title, body: forAdmin.body, link: path, clientId: target.clientId }),
  ]);

  const users = await recipients(target.clientId);
  await Promise.all(
    users.map(async (user) => {
      const message = user.role === UserRole.SUPER_ADMIN ? forAdmin : forClient;
      try {
        await emailService.sendHostingNotice({
          to: user.email!,
          fullName: user.fullName,
          subject: message.title,
          heading: message.heading,
          lines: message.lines,
          actionLabel: "Open hosting",
          actionLink: `${env.FRONTEND_URL}${path}`,
        });
      } catch (error) {
        logger.warn({ err: error, websiteId: target.websiteId, kind }, "Hosting email not sent");
      }
    }),
  );
}

/** Notices never block billing: a failure is logged and the payment or status change stands. */
export function notifyHostingInBackground(target: HostingNoticeTarget, event: HostingEvent): void {
  void notifyHosting(target, event).catch((error: unknown) => {
    logger.error({ err: error, websiteId: target.websiteId, kind: event.kind }, "Hosting notice failed");
  });
}
