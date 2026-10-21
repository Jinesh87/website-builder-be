import { UserRole, UserStatus } from "../../../common/constants/roles.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import type { HostingPayer } from "../../../generated/prisma/enums.js";
import { emailService } from "../../email/services/email.service.js";
import { notificationService } from "../../notifications/services/notification.service.js";
import { formatConnects } from "../../wallet/services/wallet.service.js";
import { formatBillingDate, formatPeriod } from "./hosting-period.js";

export type HostingNoticeTarget = { clientId: string; websiteId: string; websiteName: string };

export type HostingEvent =
  | { kind: "RENEWAL_REMINDER"; periodEnd: Date; price: number; balance: number; autoRenew: boolean }
  | { kind: "PAID"; periodStart: Date; periodEnd: Date; amount: number; paidBy: HostingPayer; restored: boolean }
  | { kind: "EXPIRED"; graceEndsAt: Date; price: number }
  | { kind: "SUSPENDED" };

type Message = { title: string; body: string; heading: string; lines: string[] };

const PAYER_LABELS: Record<HostingPayer, string> = {
  CLIENT: "from the client's connects",
  ADMIN: "collected by the admin",
  SYSTEM: "by auto-renewal from connects",
};

function clientMessage(event: HostingEvent, site: string): Message {
  switch (event.kind) {
    case "RENEWAL_REMINDER": {
      const due = formatBillingDate(event.periodEnd);
      const short = event.balance < event.price;
      const lines = [
        `Hosting for ${site} renews on ${due} for ${formatConnects(event.price)}.`,
        short
          ? `Your balance is ${formatConnects(event.balance)}. Add connects before ${due} to keep the site live.`
          : event.autoRenew
            ? "You have enough connects; it renews automatically."
            : "Auto-renew is off, so renew it from the website's Hosting tab.",
      ];
      return { title: `${site}: hosting renews ${due}`, body: lines.join(" "), heading: "Hosting renewal coming up", lines };
    }
    case "PAID": {
      const lines = [
        `Hosting for ${site} is paid for ${formatPeriod(event.periodStart, event.periodEnd)} (${formatConnects(event.amount)}).`,
        ...(event.restored ? ["The site is live again."] : []),
      ];
      return { title: `${site}: hosting paid`, body: lines.join(" "), heading: "Hosting payment received", lines };
    }
    case "EXPIRED": {
      const lines = [
        `Hosting for ${site} has expired. The site stays live until ${formatBillingDate(event.graceEndsAt)}.`,
        `Add connects and renew (${formatConnects(event.price)}) before then, or the site goes offline.`,
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
      const short = event.balance < event.price;
      const lines = [
        `Hosting for ${who} renews on ${formatBillingDate(event.periodEnd)} for ${formatConnects(event.price)}.`,
        short
          ? `The client's balance is ${formatConnects(event.balance)}; collect the payment or ask them to add connects.`
          : "The client has enough connects for auto-renewal.",
      ];
      return { title: `Renewal due: ${who}`, body: lines.join(" "), heading: "Hosting renewal coming up", lines };
    }
    case "PAID": {
      const lines = [
        `Hosting for ${who} is paid for ${formatPeriod(event.periodStart, event.periodEnd)}, ${PAYER_LABELS[event.paidBy]} (${formatConnects(event.amount)}).`,
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
