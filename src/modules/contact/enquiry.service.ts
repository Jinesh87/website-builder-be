import { AppError } from "../../common/errors/AppError.js";
import {
  ContactInquiryActivityKind,
  ContactInquiryStatus,
  InquiryEmailStatus,
} from "../../common/constants/contact.js";
import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { emailService } from "../email/services/email.service.js";
import { inquiryEmailFailure } from "./enquiry-email.js";
import type {
  CreateEnquiryInput,
  EnquiryActivityView,
  EnquiryCounts,
  EnquiryDetail,
  EnquiryListQuery,
  EnquiryReplyInput,
  EnquiryListResult,
  EnquiryView,
  UpdateEnquiryInput,
} from "./enquiry.types.js";

const DEFAULT_SALES_EMAIL = "support@bytezoracoders.com";

const NOT_FOUND = () => new AppError(404, "Enquiry not found", "ENQUIRY_NOT_FOUND");

const activityInclude = { actor: { select: { fullName: true } } } as const satisfies Prisma.ContactInquiryActivityInclude;

type EnquiryRow = Prisma.ContactInquiryGetPayload<Record<string, never>>;
type ActivityRow = Prisma.ContactInquiryActivityGetPayload<{ include: typeof activityInclude }>;
type EmailOutcome = { emailStatus: InquiryEmailStatus; emailError: string | null };

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toView(row: EnquiryRow): EnquiryView {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    status: row.status,
    read: row.readAt !== null,
    emailStatus: row.emailStatus,
    emailError: row.emailError,
    createdAt: row.createdAt.toISOString(),
  };
}

function toActivityView(row: ActivityRow): EnquiryActivityView {
  return {
    id: row.id,
    kind: row.kind,
    body: row.body,
    actorName: row.actor?.fullName ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function salesInbox(): string {
  return process.env.CONTACT_SALES_EMAIL?.trim() || DEFAULT_SALES_EMAIL;
}

export class EnquiryService {
  /** Saves a contact-form message, then emails the sales inbox. The enquiry is kept even if the email fails. */
  async submit(input: CreateEnquiryInput): Promise<{ enquiry: EnquiryView; emailDispatched: boolean }> {
    const row = await prisma.contactInquiry.create({
      data: {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: emptyToNull(input.phone),
        subject: input.subject?.trim() || "General question",
        message: input.message.trim(),
      },
    });
    logger.info(
      { inquiryId: row.id, senderEmail: row.email, subject: row.subject },
      "New contact enquiry received from marketing portal",
    );

    const outcome = await this.notifySales(row, null);
    return { enquiry: toView({ ...row, ...outcome }), emailDispatched: outcome.emailStatus === InquiryEmailStatus.SENT };
  }

  async list(query: EnquiryListQuery): Promise<EnquiryListResult> {
    const search = query.search?.trim();
    const where: Prisma.ContactInquiryWhereInput = {
      status: query.status ?? { not: ContactInquiryStatus.SPAM },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { subject: { contains: search, mode: "insensitive" } },
              { message: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, rows, counts] = await Promise.all([
      prisma.contactInquiry.count({ where }),
      prisma.contactInquiry.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.counts(),
    ]);

    return { items: rows.map(toView), total, page: query.page, pageSize: query.pageSize, counts };
  }

  /** Number of enquiries nobody has picked up yet, for the sidebar badge. */
  async newCount(): Promise<number> {
    return prisma.contactInquiry.count({ where: { status: ContactInquiryStatus.NEW } });
  }

  async detail(id: string): Promise<EnquiryDetail> {
    const row = await prisma.contactInquiry.findUnique({
      where: { id },
      include: { activity: { include: activityInclude, orderBy: { createdAt: "desc" } } },
    });
    if (!row) throw NOT_FOUND();
    const { activity, ...enquiry } = row;
    return { enquiry: toView(enquiry), activity: activity.map(toActivityView) };
  }

  /** Changing the status also marks the enquiry read, unless the caller explicitly marks it unread. */
  async update(id: string, input: UpdateEnquiryInput, actorId: string): Promise<EnquiryView> {
    const existing = await this.findOrThrow(id);
    const statusChanged = input.status !== undefined && input.status !== existing.status;
    const read = input.read ?? (statusChanged ? true : undefined);

    const data: Prisma.ContactInquiryUpdateInput = {};
    if (read !== undefined) data.readAt = read ? (existing.readAt ?? new Date()) : null;
    if (statusChanged) {
      data.status = input.status;
      data.activity = { create: { kind: ContactInquiryActivityKind.STATUS_CHANGED, body: input.status, actorId } };
    }
    if (Object.keys(data).length === 0) return toView(existing);

    return toView(await prisma.contactInquiry.update({ where: { id }, data }));
  }

  async addNote(id: string, body: string, actorId: string): Promise<EnquiryActivityView> {
    await this.findOrThrow(id);
    const note = await prisma.contactInquiryActivity.create({
      data: { inquiryId: id, kind: ContactInquiryActivityKind.NOTE, body: body.trim(), actorId },
      include: activityInclude,
    });
    return toActivityView(note);
  }

  /**
   * Emails the customer from the dashboard. A New enquiry moves to In progress, because someone is now handling it.
   * Email errors (not configured, rejected) reach the admin as they are; nothing is recorded unless the email went out.
   */
  async reply(id: string, input: EnquiryReplyInput, actorId: string): Promise<EnquiryView> {
    const existing = await this.findOrThrow(id);
    const message = input.message.trim();
    await emailService.sendEnquiryReply({
      to: existing.email,
      replyTo: salesInbox(),
      subject: input.subject.trim(),
      message,
      customerName: existing.name,
      originalMessage: existing.message,
      submittedAt: existing.createdAt,
    });
    logger.info({ inquiryId: id, to: existing.email, actorId }, "Enquiry reply sent");

    const startHandling = existing.status === ContactInquiryStatus.NEW;
    const row = await prisma.contactInquiry.update({
      where: { id },
      data: {
        readAt: existing.readAt ?? new Date(),
        ...(startHandling ? { status: ContactInquiryStatus.IN_PROGRESS } : {}),
        activity: {
          create: [
            { kind: ContactInquiryActivityKind.REPLY_SENT, body: message, actorId },
            ...(startHandling
              ? [{ kind: ContactInquiryActivityKind.STATUS_CHANGED, body: ContactInquiryStatus.IN_PROGRESS, actorId }]
              : []),
          ],
        },
      },
    });
    return toView(row);
  }

  async resendEmail(id: string, actorId: string): Promise<EnquiryView> {
    const existing = await this.findOrThrow(id);
    if (existing.emailStatus === InquiryEmailStatus.SENT) {
      throw new AppError(409, "The sales email for this enquiry was already sent.", "ENQUIRY_EMAIL_ALREADY_SENT");
    }
    const outcome = await this.notifySales(existing, actorId);
    return toView({ ...existing, ...outcome });
  }

  async remove(id: string): Promise<void> {
    const { count } = await prisma.contactInquiry.deleteMany({ where: { id } });
    if (count === 0) throw NOT_FOUND();
  }

  private async counts(): Promise<EnquiryCounts> {
    const grouped = await prisma.contactInquiry.groupBy({ by: ["status"], _count: { _all: true } });
    const counts: EnquiryCounts = { ALL: 0, NEW: 0, IN_PROGRESS: 0, RESOLVED: 0, SPAM: 0 };
    for (const group of grouped) {
      counts[group.status] = group._count._all;
      if (group.status !== ContactInquiryStatus.SPAM) counts.ALL += group._count._all;
    }
    return counts;
  }

  private async findOrThrow(id: string): Promise<EnquiryRow> {
    const row = await prisma.contactInquiry.findUnique({ where: { id } });
    if (!row) throw NOT_FOUND();
    return row;
  }

  private async notifySales(row: EnquiryRow, actorId: string | null): Promise<EmailOutcome> {
    const to = salesInbox();
    let outcome: EmailOutcome;
    try {
      await emailService.sendSalesInquiry({
        to,
        senderName: row.name,
        senderEmail: row.email,
        senderPhone: row.phone ?? undefined,
        subject: row.subject,
        message: row.message,
        submittedAt: row.createdAt,
      });
      outcome = { emailStatus: InquiryEmailStatus.SENT, emailError: null };
    } catch (error) {
      outcome = inquiryEmailFailure(error);
      logger.error(
        { err: error, inquiryId: row.id, to, emailStatus: outcome.emailStatus },
        "Failed to dispatch sales enquiry email",
      );
    }
    await this.recordEmail(row.id, outcome, actorId);
    return outcome;
  }

  /** The saved enquiry is what matters; failing to record the email result must not fail the request. */
  private async recordEmail(id: string, outcome: EmailOutcome, actorId: string | null): Promise<void> {
    const sent = outcome.emailStatus === InquiryEmailStatus.SENT;
    try {
      await prisma.contactInquiry.update({
        where: { id },
        data: {
          ...outcome,
          activity: {
            create: {
              kind: sent ? ContactInquiryActivityKind.EMAIL_SENT : ContactInquiryActivityKind.EMAIL_NOT_SENT,
              body: outcome.emailError,
              actorId,
            },
          },
        },
      });
    } catch (error) {
      logger.error({ err: error, inquiryId: id, emailStatus: outcome.emailStatus }, "Could not record enquiry email result");
    }
  }
}

export const enquiryService = new EnquiryService();
