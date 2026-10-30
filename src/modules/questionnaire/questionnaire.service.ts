import { AppError } from "../../common/errors/AppError.js";
import {
  InquiryEmailStatus,
  QuestionnaireActivityKind,
  QuestionnaireStatus,
} from "../../common/constants/questionnaire.js";
import { logger } from "../../config/logger.js";
import { prisma } from "../../config/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { emailService } from "../email/services/email.service.js";
import {
  formatAnswersSummary,
  questionnaireEmailFailure,
} from "./questionnaire-email.js";
import type {
  CreateQuestionnaireInput,
  QuestionnaireActivityView,
  QuestionnaireAnswers,
  QuestionnaireCounts,
  QuestionnaireDetail,
  QuestionnaireListQuery,
  QuestionnaireListResult,
  QuestionnaireView,
  UpdateQuestionnaireInput,
} from "./questionnaire.types.js";

const DEFAULT_SALES_EMAIL = "support@bytezoracoders.com";

const NOT_FOUND = () =>
  new AppError(404, "Questionnaire not found", "QUESTIONNAIRE_NOT_FOUND");

const activityInclude = {
  actor: { select: { fullName: true } },
} as const satisfies Prisma.QuestionnaireActivityInclude;

type QuestionnaireRow = Prisma.QuestionnaireGetPayload<{
  include: {
    client: { select: { businessName: true } };
    website: { select: { name: true } };
  };
}>;

type ActivityRow = Prisma.QuestionnaireActivityGetPayload<{
  include: typeof activityInclude;
}>;

type EmailOutcome = {
  emailStatus: InquiryEmailStatus;
  emailError: string | null;
};

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function toView(row: QuestionnaireRow): QuestionnaireView {
  return {
    id: row.id,
    businessName: row.businessName,
    name: row.name,
    phone: row.phone,
    email: row.email,
    answers: row.answers as unknown as QuestionnaireAnswers,
    filesLink: row.filesLink,
    notes: row.notes,
    ref: row.ref,
    clientId: row.clientId,
    clientBusinessName: row.client?.businessName ?? null,
    websiteId: row.websiteId,
    websiteName: row.website?.name ?? null,
    status: row.status,
    read: row.readAt !== null,
    emailStatus: row.emailStatus,
    emailError: row.emailError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toActivityView(row: ActivityRow): QuestionnaireActivityView {
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

export class QuestionnaireService {
  /**
   * Saves a questionnaire submission, then notifies both the admin sales inbox
   * and sends a confirmation email to the customer.
   * If honeypot is triggered, returns immediately without saving.
   */
  async submit(
    input: CreateQuestionnaireInput,
    authenticatedClientId: string | null,
  ): Promise<{ questionnaire?: QuestionnaireView; emailDispatched: boolean }> {
    // Honeypot check: return success without saving
    if (input.website && input.website.trim().length > 0) {
      logger.warn(
        { honeypot: input.website, email: input.email },
        "Honeypot field triggered in questionnaire submission; ignoring",
      );
      return { emailDispatched: false };
    }

    const row = await prisma.questionnaire.create({
      data: {
        businessName: input.businessName.trim(),
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: input.email.trim().toLowerCase(),
        answers: input.answers as unknown as Prisma.InputJsonValue,
        filesLink: emptyToNull(input.filesLink),
        notes: emptyToNull(input.notes),
        ref: emptyToNull(input.ref),
        clientId: authenticatedClientId || emptyToNull(input.clientId) || null,
        status: QuestionnaireStatus.NEW,
        emailStatus: InquiryEmailStatus.PENDING,
      },
      include: {
        client: { select: { businessName: true } },
        website: { select: { name: true } },
      },
    });

    logger.info(
      { questionnaireId: row.id, businessName: row.businessName, email: row.email },
      "New questionnaire submitted",
    );

    const outcome = await this.notifyTeamAndCustomer(row, null);
    return {
      questionnaire: toView({ ...row, ...outcome }),
      emailDispatched: outcome.emailStatus === InquiryEmailStatus.SENT,
    };
  }

  async list(query: QuestionnaireListQuery): Promise<QuestionnaireListResult> {
    const search = query.search?.trim();
    const where: Prisma.QuestionnaireWhereInput = {
      status: query.status ?? { not: QuestionnaireStatus.SPAM },
      ...(search
        ? {
            OR: [
              { businessName: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
              { notes: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, rows, counts] = await Promise.all([
      prisma.questionnaire.count({ where }),
      prisma.questionnaire.findMany({
        where,
        include: {
          client: { select: { businessName: true } },
          website: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.counts(),
    ]);

    return {
      items: rows.map(toView),
      total,
      page: query.page,
      pageSize: query.pageSize,
      counts,
    };
  }

  async newCount(): Promise<number> {
    return prisma.questionnaire.count({
      where: { status: QuestionnaireStatus.NEW },
    });
  }

  async detail(id: string, markRead = true): Promise<QuestionnaireDetail> {
    const row = await prisma.questionnaire.findUnique({
      where: { id },
      include: {
        client: { select: { businessName: true } },
        website: { select: { name: true } },
        activity: { include: activityInclude, orderBy: { createdAt: "desc" } },
      },
    });
    if (!row) throw NOT_FOUND();

    if (markRead && row.readAt === null) {
      await prisma.questionnaire.update({
        where: { id },
        data: { readAt: new Date() },
      });
      row.readAt = new Date();
    }

    const { activity, ...q } = row;
    return {
      questionnaire: toView(q as QuestionnaireRow),
      activity: activity.map(toActivityView),
    };
  }

  async update(
    id: string,
    input: UpdateQuestionnaireInput,
    actorId: string,
  ): Promise<QuestionnaireView> {
    const existing = await this.findOrThrow(id);
    const statusChanged = input.status !== undefined && input.status !== existing.status;
    const read = input.read ?? (statusChanged ? true : undefined);

    const data: Prisma.QuestionnaireUpdateInput = {};
    if (read !== undefined) data.readAt = read ? (existing.readAt ?? new Date()) : null;
    if (statusChanged && input.status) {
      data.status = input.status;
      data.activity = {
        create: {
          kind: QuestionnaireActivityKind.STATUS_CHANGED,
          body: input.status,
          actorId,
        },
      };
    }
    if (input.clientId !== undefined) {
      data.client = input.clientId ? { connect: { id: input.clientId } } : { disconnect: true };
    }
    if (input.websiteId !== undefined) {
      data.website = input.websiteId ? { connect: { id: input.websiteId } } : { disconnect: true };
    }

    if (Object.keys(data).length === 0) return toView(existing);

    const updated = await prisma.questionnaire.update({
      where: { id },
      data,
      include: {
        client: { select: { businessName: true } },
        website: { select: { name: true } },
      },
    });

    return toView(updated);
  }

  async addNote(id: string, body: string, actorId: string): Promise<QuestionnaireActivityView> {
    await this.findOrThrow(id);
    const note = await prisma.questionnaireActivity.create({
      data: {
        questionnaireId: id,
        kind: QuestionnaireActivityKind.NOTE,
        body: body.trim(),
        actorId,
      },
      include: activityInclude,
    });
    return toActivityView(note);
  }

  async resendEmail(id: string, actorId: string): Promise<QuestionnaireView> {
    const existing = await this.findOrThrow(id);
    const outcome = await this.notifyTeamAndCustomer(existing, actorId);
    return toView({ ...existing, ...outcome });
  }

  async remove(id: string): Promise<void> {
    const { count } = await prisma.questionnaire.deleteMany({ where: { id } });
    if (count === 0) throw NOT_FOUND();
  }

  async listMine(clientId: string): Promise<QuestionnaireView[]> {
    const rows = await prisma.questionnaire.findMany({
      where: { clientId },
      include: {
        client: { select: { businessName: true } },
        website: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toView);
  }

  private async counts(): Promise<QuestionnaireCounts> {
    const grouped = await prisma.questionnaire.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const counts: QuestionnaireCounts = {
      ALL: 0,
      NEW: 0,
      IN_PROGRESS: 0,
      WEBSITE_CREATED: 0,
      DONE: 0,
      SPAM: 0,
    };
    for (const group of grouped) {
      counts[group.status] = group._count._all;
      if (group.status !== QuestionnaireStatus.SPAM) {
        counts.ALL += group._count._all;
      }
    }
    return counts;
  }

  private async findOrThrow(id: string): Promise<QuestionnaireRow> {
    const row = await prisma.questionnaire.findUnique({
      where: { id },
      include: {
        client: { select: { businessName: true } },
        website: { select: { name: true } },
      },
    });
    if (!row) throw NOT_FOUND();
    return row;
  }

  private async notifyTeamAndCustomer(
    row: QuestionnaireRow,
    actorId: string | null,
  ): Promise<EmailOutcome> {
    const to = salesInbox();
    const answers = row.answers as unknown as QuestionnaireAnswers;
    const answersSummary = formatAnswersSummary(answers);
    let outcome: EmailOutcome;

    try {
      await Promise.all([
        emailService.sendQuestionnaireAdminNotification({
          to,
          businessName: row.businessName,
          senderName: row.name,
          senderEmail: row.email,
          senderPhone: row.phone,
          answersSummary,
          filesLink: row.filesLink,
          notes: row.notes,
          ref: row.ref,
          submittedAt: row.createdAt,
        }),
        emailService.sendQuestionnaireCustomerConfirmation({
          to: row.email,
          businessName: row.businessName,
          customerName: row.name,
        }),
      ]);
      outcome = { emailStatus: InquiryEmailStatus.SENT, emailError: null };
    } catch (error) {
      outcome = questionnaireEmailFailure(error);
      logger.error(
        { err: error, questionnaireId: row.id, to, emailStatus: outcome.emailStatus },
        "Failed to dispatch questionnaire emails",
      );
    }

    await this.recordEmail(row.id, outcome, actorId);
    return outcome;
  }

  private async recordEmail(
    id: string,
    outcome: EmailOutcome,
    actorId: string | null,
  ): Promise<void> {
    const sent = outcome.emailStatus === InquiryEmailStatus.SENT;
    try {
      await prisma.questionnaire.update({
        where: { id },
        data: {
          ...outcome,
          activity: {
            create: {
              kind: sent
                ? QuestionnaireActivityKind.EMAIL_SENT
                : QuestionnaireActivityKind.EMAIL_NOT_SENT,
              body: outcome.emailError,
              actorId,
            },
          },
        },
      });
    } catch (error) {
      logger.error(
        { err: error, questionnaireId: id, emailStatus: outcome.emailStatus },
        "Could not record questionnaire email result",
      );
    }
  }
}

export const questionnaireService = new QuestionnaireService();

