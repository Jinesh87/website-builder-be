import { AppError } from "../../../common/errors/AppError.js";
import {
  ClientSource,
  UserRole,
  UserStatus,
} from "../../../common/constants/roles.js";
import { hashPassword } from "../../../common/utils/hash.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import {
  CommissionStatus,
  PartnerActivityKind,
  PartnerCommissionPolicy,
  PartnerReferralStatus,
  PartnerStatus,
  PayoutMethod,
  PayoutRequestStatus,
  Prisma,
  type Partner,
} from "../../../generated/prisma/client.js";
import { emailService } from "../../email/services/email.service.js";
import { authService } from "../../auth/services/auth.service.js";
import {
  createPasswordResetToken,
  INVITE_TOKEN_TTL_SECONDS,
} from "../../auth/utils/password-reset.js";
import type {
  AdminResolvePayoutRequestInput,
  PartnerApplicationInput,
  PartnerAuditLogItem,
  PartnerAuditLogsResponse,
  PartnerDetail,
  PartnerListResponse,
  PartnerPayoutDetailsInput,
  PartnerPayoutRequestInput,
  PartnerPayoutRequestView,
  PartnerProgramConfigView,
  PartnerSummary,
  UpdatePartnerProgramConfigInput,
} from "../types/partner.types.js";
import {
  formatPartnerApplicationId,
  formatPartnerReferenceId,
  generateApplicationId,
  generateReferralCode,
  randomAlphanumeric,
} from "../utils/partner-codes.js";

function formatAuditDate(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

async function getNextPartnerSequence(tx: Prisma.TransactionClient): Promise<number> {
  try {
    const res = await tx.$queryRaw<{ nextval: string | number | bigint }[]>`SELECT nextval('"partners_partnerNumber_seq"') AS nextval`;
    if (res?.[0]?.nextval !== undefined) {
      return Number(res[0].nextval);
    }
  } catch {
    // Fallback for non-Postgres / unit test mocks
  }
  const latest = await tx.partner.findFirst({
    orderBy: { partnerNumber: "desc" },
    select: { partnerNumber: true },
  });
  return (latest?.partnerNumber ?? 0) + 1;
}

function toPartnerSummary(
  partner: Partner & {
    referrals?: { status: PartnerReferralStatus }[];
    commissions?: { commissionAmountPaise: number }[];
    _count?: { referrals: number; commissions: number };
    activities?: { kind: PartnerActivityKind; body: string; createdAt: Date }[];
  },
): PartnerSummary {
  const totalReferrals =
    partner._count?.referrals ?? partner.referrals?.length ?? 0;
  const convertedReferrals =
    partner.referrals?.filter(
      (r) => r.status === PartnerReferralStatus.CONVERTED,
    ).length ?? 0;
  const totalCommissionPaise =
    partner.commissions?.reduce((sum, c) => sum + c.commissionAmountPaise, 0) ??
    0;

  let lastCommissionChange: string | undefined;
  if (partner.activities && partner.activities.length > 0) {
    const act = partner.activities[0];
    const dateStr = formatAuditDate(act.createdAt);
    lastCommissionChange = `${dateStr} · ${act.body}`;
  } else if (partner.approvedAt) {
    const dateStr = formatAuditDate(partner.approvedAt);
    lastCommissionChange = `${dateStr} · Set to ${Number(partner.commissionRate)}%`;
  }

  return {
    id: partner.id,
    partnerNumber: partner.partnerNumber,
    applicationId: partner.applicationId,
    companyName: partner.companyName,
    city: partner.city,
    state: partner.state,
    country: partner.country,
    contactName: partner.contactName,
    email: partner.email,
    phone: partner.phone,
    businessType: partner.businessType,
    partnershipType: partner.partnershipType,
    status: partner.status,
    referralCode: partner.referralCode,
    commissionRate: Number(partner.commissionRate),
    isCommissionActive: partner.isCommissionActive,
    commissionPolicy: partner.commissionPolicy,
    totalReferrals,
    convertedReferrals,
    totalCommissionPaise,
    approvedAt: partner.approvedAt?.toISOString() ?? null,
    createdAt: partner.createdAt.toISOString(),
    lastCommissionChange,
  };
}

export class PartnerService {
  /**
   * Public submission of a partner application.
   * Validates duplicate email and sends confirmation email.
   */
  async apply(
    input: PartnerApplicationInput,
  ): Promise<{ applicationId: string; message: string }> {
    const email = input.email.trim().toLowerCase();

    // Check for existing application with same email
    const existing = await prisma.partner.findFirst({
      where: { email },
      select: { id: true, applicationId: true, status: true },
    });

    if (existing) {
      if (existing.status === PartnerStatus.PENDING) {
        throw new AppError(
          409,
          `An application with this email is already pending review (ID: ${existing.applicationId}).`,
          "APPLICATION_EXISTS",
        );
      }
      if (existing.status === PartnerStatus.APPROVED) {
        throw new AppError(
          409,
          "An approved partner account already exists for this email address. Please log in.",
          "PARTNER_ALREADY_APPROVED",
        );
      }
      throw new AppError(
        409,
        "An application with this email already exists in our system.",
        "EMAIL_EXISTS",
      );
    }

    const partner = await prisma.$transaction(async (tx) => {
      const partnerNumber = await getNextPartnerSequence(tx);
      const applicationId = formatPartnerApplicationId(partnerNumber);

      const p = await tx.partner.create({
        data: {
          partnerNumber,
          applicationId,
          companyName: input.companyName.trim(),
          registrationNumber: input.registrationNumber?.trim() || null,
          website: input.website?.trim() || null,
          businessType: input.businessType,
          yearEstablished: input.yearEstablished.trim(),
          country: input.country.trim(),
          state: input.state.trim(),
          city: input.city.trim(),
          businessAddress: input.businessAddress.trim(),

          contactName: input.contactName.trim(),
          designation: input.designation.trim(),
          email,
          phone: input.phone.trim(),
          alternatePhone: input.alternatePhone?.trim() || null,

          partnershipType: input.partnershipType,
          targetCategories: input.targetCategories,
          expectedReferrals: input.expectedReferrals,
          marketingChannels: input.marketingChannels,
          reason: input.reason.trim(),
          previousExperience: input.previousExperience,
          status: PartnerStatus.PENDING,
          commissionRate: new Prisma.Decimal(15.0),
        },
      });

      await tx.partnerActivity.create({
        data: {
          partnerId: p.id,
          kind: PartnerActivityKind.APPLIED,
          body: `Partner application submitted with Reference ID ${applicationId}.`,
        },
      });

      return p;
    });

    const applicationId = partner.applicationId;

    // Send confirmation email
    try {
      await emailService.sendPartnerApplicationConfirmation({
        to: email,
        contactName: input.contactName.trim(),
        companyName: input.companyName.trim(),
        applicationId,
      });
    } catch (err) {
      logger.error(
        { err, applicationId, email },
        "Failed to send partner application confirmation email",
      );
    }

    // Send notification email to Bytezora Sales
    try {
      const salesInbox = await emailService.getPartnerSalesEmail();
      await emailService.sendPartnerApplicationSalesNotification({
        to: salesInbox,
        applicationId,
        companyName: input.companyName.trim(),
        registrationNumber: input.registrationNumber?.trim() || null,
        website: input.website?.trim() || null,
        businessType: input.businessType,
        yearEstablished: input.yearEstablished.trim(),
        country: input.country.trim(),
        state: input.state.trim(),
        city: input.city.trim(),
        businessAddress: input.businessAddress.trim(),
        contactName: input.contactName.trim(),
        designation: input.designation.trim(),
        email,
        phone: input.phone.trim(),
        alternatePhone: input.alternatePhone?.trim() || null,
        partnershipType: input.partnershipType,
        targetCategories: input.targetCategories,
        expectedReferrals: input.expectedReferrals,
        marketingChannels: input.marketingChannels,
        reason: input.reason.trim(),
        previousExperience: input.previousExperience,
      });
    } catch (err) {
      logger.error(
        { err, applicationId, email },
        "Failed to send partner application sales notification email",
      );
    }

    logger.info(
      { partnerId: partner.id, applicationId, email },
      "Partner application created",
    );

    return {
      applicationId,
      message:
        "Application submitted successfully. We have sent a confirmation email.",
    };
  }

  /**
   * Admin: List applications with search, status filtering and pagination.
   */
  async listAdmin(query: {
    search?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PartnerListResponse> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.PartnerWhereInput = {};

    if (query.status && query.status !== "ALL") {
      where.status = query.status as PartnerStatus;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      let partnerNumberSearch: number | null = null;
      const match = q.match(/^PART-?(\d+)$/i) || q.match(/^(\d+)$/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          partnerNumberSearch = parsed;
        }
      }

      where.OR = [
        ...(partnerNumberSearch !== null ? [{ partnerNumber: partnerNumberSearch }] : []),
        { companyName: { contains: q, mode: "insensitive" } },
        { contactName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { applicationId: { contains: q, mode: "insensitive" } },
        { referralCode: { contains: q, mode: "insensitive" } },
      ];
    }

    const [
      items,
      total,
      countPending,
      countApproved,
      countRejected,
      countSuspended,
      countCommissions,
      countAuditLogs,
    ] = await Promise.all([
      prisma.partner.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          _count: {
            select: {
              referrals: true,
              commissions: true,
            },
          },
          referrals: {
            select: { status: true },
          },
          commissions: {
            select: { commissionAmountPaise: true },
          },
          activities: {
            where: {
              kind: {
                in: [
                  PartnerActivityKind.COMMISSION_RATE_UPDATED,
                  PartnerActivityKind.COMMISSION_ELIGIBILITY_TOGGLED,
                  PartnerActivityKind.STATUS_CHANGED,
                ],
              },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.partner.count({ where }),
      prisma.partner.count({ where: { status: PartnerStatus.PENDING } }),
      prisma.partner.count({ where: { status: PartnerStatus.APPROVED } }),
      prisma.partner.count({ where: { status: PartnerStatus.REJECTED } }),
      prisma.partner.count({ where: { status: PartnerStatus.SUSPENDED } }),
      prisma.partner.count({
        where: {
          status: { in: [PartnerStatus.APPROVED, PartnerStatus.SUSPENDED] },
        },
      }),
      prisma.partnerActivity.count(),
    ]);

    const totalAll =
      countPending + countApproved + countRejected + countSuspended;

    return {
      items: items.map(toPartnerSummary),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      counts: {
        ALL: totalAll,
        PENDING: countPending,
        APPROVED: countApproved,
        REJECTED: countRejected,
        SUSPENDED: countSuspended,
        COMMISSIONS: countCommissions,
        AUDIT_LOGS: countAuditLogs,
      },
    };
  }

  /**
   * Admin: List partner activities / audit logs across all partners.
   */
  async listAuditLogs(query: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<PartnerAuditLogsResponse> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.PartnerActivityWhereInput = {};
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { body: { contains: q, mode: "insensitive" } },
        { actorName: { contains: q, mode: "insensitive" } },
        { partner: { companyName: { contains: q, mode: "insensitive" } } },
        { partner: { applicationId: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.partnerActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          partner: {
            select: {
              id: true,
              partnerNumber: true,
              applicationId: true,
              companyName: true,
              referralCode: true,
              commissionRate: true,
              status: true,
            },
          },
        },
      }),
      prisma.partnerActivity.count({ where }),
    ]);

    return {
      items: items.map((a) => {
        const ref = formatPartnerReferenceId(a.partner.partnerNumber, a.partner.applicationId);
        const comp = a.partner.companyName;

        let actionLabel = "Activity recorded";
        let actionVariant: "orange" | "slate" | "blue" | "emerald" | "rose" = "slate";
        let details = `${ref} · ${comp}`;

        if (a.kind === PartnerActivityKind.APPLIED) {
          actionLabel = "Application received";
          actionVariant = "orange";
          details = `${ref} · ${comp}`;
        } else if (
          a.kind === PartnerActivityKind.COMMISSION_RATE_UPDATED ||
          a.kind === PartnerActivityKind.COMMISSION_ELIGIBILITY_TOGGLED
        ) {
          if (a.body.includes("re-enabled") || a.body.includes("enabled") || a.body.includes("ACTIVE")) {
            actionLabel = "Commission eligibility enabled";
            actionVariant = "blue";
          } else if (a.body.includes("disabled") || a.body.includes("paused") || a.body.includes("INACTIVE")) {
            actionLabel = "Commission eligibility paused";
            actionVariant = "blue";
          } else {
            const cleanRate = a.body.replace(/^Commission rate set to /i, "").trim();
            actionLabel = `Commission changed ${cleanRate}`;
            actionVariant = "blue";
          }
          details = `${ref} · ${comp}`;
        } else if (a.kind === PartnerActivityKind.STATUS_CHANGED) {
          if (a.body.toLowerCase().includes("approved")) {
            actionLabel = `Approved - code ${a.partner.referralCode || "ACTIVE"} - ${Number(a.partner.commissionRate)}%`;
            actionVariant = "emerald";
            details = `${ref} · ${comp}`;
          } else if (a.body.toLowerCase().includes("suspended")) {
            actionLabel = "Partner suspended";
            actionVariant = "slate";
            const reasonPart = a.body.replace(/^Partner suspended\.?\s*(Reason:)?/i, "").trim();
            details = reasonPart ? `${ref} · ${comp} · ${reasonPart}` : `${ref} · ${comp}`;
          } else if (a.body.toLowerCase().includes("rejected")) {
            actionLabel = "Application rejected";
            actionVariant = "rose";
            const reasonPart = a.body.replace(/^Partner application rejected\.?\s*(Reason:)?/i, "").trim();
            details = reasonPart ? `${ref} · ${comp} · ${reasonPart}` : `${ref} · ${comp}`;
          } else if (a.body.toLowerCase().includes("reactivated")) {
            actionLabel = "Partner reactivated";
            actionVariant = "emerald";
            details = `${ref} · ${comp}`;
          }
        } else if (a.kind === PartnerActivityKind.NOTE) {
          actionLabel = "Note logged";
          actionVariant = "slate";
          details = `${ref} · ${comp} · ${a.body}`;
        }

        return {
          id: a.id,
          createdAt: a.createdAt.toISOString(),
          kind: a.kind,
          body: a.body,
          actorName: a.actorName || "System",
          partnerId: a.partner.id,
          reference: ref,
          companyName: comp,
          actionBadge: {
            label: actionLabel,
            variant: actionVariant,
          },
          details,
        };
      }),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  /**
   * Admin: Get complete application details including activities, stats and history.
   */
  async getAdminDetail(id: string): Promise<PartnerDetail> {
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
        },
        referrals: {
          include: {
            commissions: {
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { registeredAt: "desc" },
        },
        commissions: {
          include: {
            referral: {
              select: { customerName: true, customerEmail: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        payoutRequests: {
          orderBy: { requestedAt: "desc" },
          take: 50,
        },
      },
    });

    if (!partner) {
      throw new AppError(404, "Partner not found", "NOT_FOUND");
    }

    const summary = toPartnerSummary(partner);

    const totalEarnedPaise = partner.commissions.reduce((s, c) => s + c.commissionAmountPaise, 0);
    const approvedCommissionPaise = partner.commissions
      .filter((c) => c.status === CommissionStatus.APPROVED)
      .reduce((s, c) => s + c.commissionAmountPaise, 0);
    const paidCommissionPaise = partner.commissions
      .filter((c) => c.status === CommissionStatus.PAID)
      .reduce((s, c) => s + c.commissionAmountPaise, 0);
    const pendingPayoutRequestsPaise = partner.payoutRequests
      .filter((pr) => pr.status === PayoutRequestStatus.PENDING)
      .reduce((s, pr) => s + pr.amountPaise, 0);
    const availableForWithdrawalPaise = Math.max(0, approvedCommissionPaise - pendingPayoutRequestsPaise);

    const bankDetails = {
      accountHolderName: partner.accountHolderName ?? "",
      bankAccountNumber: partner.bankAccountNumber ?? "",
      ifscCode: partner.ifscCode ?? "",
      upiId: partner.upiId ?? "",
      panNumber: partner.panNumber ?? "",
    };

    const referrals = partner.referrals.map((r) => {
      const latestComm = r.commissions?.[0];
      return {
        id: r.id,
        customerName: r.customerName,
        customerEmail: r.customerEmail,
        status: r.status,
        planName: r.status === PartnerReferralStatus.CONVERTED || Number(r.totalSpentPaise) > 0 ? "Standard" : "—",
        totalSpentPaise: Number(r.totalSpentPaise),
        paymentAmountPaise: latestComm ? latestComm.orderAmountPaise : (Number(r.totalSpentPaise) > 0 ? Number(r.totalSpentPaise) : null),
        commissionAmountPaise: latestComm ? latestComm.commissionAmountPaise : null,
        registeredAt: r.registeredAt.toISOString(),
        convertedAt: r.convertedAt?.toISOString() ?? null,
      };
    });

    const commissions = partner.commissions.map((c) => ({
      id: c.id,
      orderAmountPaise: c.orderAmountPaise,
      commissionRate: Number(c.commissionRate),
      commissionAmountPaise: c.commissionAmountPaise,
      status: c.status,
      customerName: c.referral.customerName,
      createdAt: c.createdAt.toISOString(),
      paidAt: c.paidAt?.toISOString() ?? null,
    }));

    const payoutRequests = partner.payoutRequests.map((pr) => ({
      id: pr.id,
      requestNumber: pr.requestNumber,
      formattedId: `PO-2026-${String(pr.requestNumber).padStart(4, "0")}`,
      partnerId: pr.partnerId,
      partnerName: partner.companyName,
      partnerContact: partner.contactName,
      partnerEmail: partner.email,
      partnerPhone: partner.phone,
      partnerReferralCode: partner.referralCode,
      amountPaise: pr.amountPaise,
      status: pr.status,
      requestedAt: pr.requestedAt.toISOString(),
      processedAt: pr.processedAt?.toISOString() ?? null,
      payoutMethod: pr.payoutMethod,
      accountHolderName: pr.accountHolderName,
      bankAccountNumber: pr.bankAccountNumber,
      ifscCode: pr.ifscCode,
      upiId: pr.upiId,
      transactionReference: pr.transactionReference,
      invoiceNumber: pr.invoiceNumber,
      adminNotes: pr.adminNotes,
      rejectionReason: pr.rejectionReason,
      actorName: pr.actorName,
    }));

    return {
      ...summary,
      registrationNumber: partner.registrationNumber,
      website: partner.website,
      yearEstablished: partner.yearEstablished,
      country: partner.country,
      state: partner.state,
      city: partner.city,
      businessAddress: partner.businessAddress,
      designation: partner.designation,
      alternatePhone: partner.alternatePhone,
      targetCategories: (partner.targetCategories as string[]) || [],
      expectedReferrals: partner.expectedReferrals,
      marketingChannels: (partner.marketingChannels as string[]) || [],
      reason: partner.reason,
      previousExperience: partner.previousExperience,
      rejectionReason: partner.rejectionReason,
      suspensionReason: partner.suspensionReason,
      approvedBy: partner.approvedBy,
      rejectedAt: partner.rejectedAt?.toISOString() ?? null,
      suspendedAt: partner.suspendedAt?.toISOString() ?? null,
      userId: partner.userId,
      accountHolderName: partner.accountHolderName ?? null,
      bankAccountNumber: partner.bankAccountNumber ?? null,
      ifscCode: partner.ifscCode ?? null,
      upiId: partner.upiId ?? null,
      panNumber: partner.panNumber ?? null,
      bankDetails,
      stats: {
        totalReferrals: partner.referrals.length,
        convertedReferrals: partner.referrals.filter((r) => r.status === PartnerReferralStatus.CONVERTED).length,
        totalEarnedPaise,
        approvedCommissionPaise,
        paidCommissionPaise,
        pendingPayoutRequestsPaise,
        availableForWithdrawalPaise,
      },
      referrals,
      commissions,
      payoutRequests,
      activities: partner.activities.map((a) => ({
        id: a.id,
        kind: a.kind,
        body: a.body,
        actorName: a.actorName,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Admin: Approve partner application.
   * - Sets commission percentage
   * - Generates unique referral code
   * - Creates/links User account with PARTNER role
   * - Sends approval email with dashboard link & code
   */
  async approve(
    id: string,
    params: {
      commissionRate: number;
      commissionPolicy?: PartnerCommissionPolicy;
      customReferralCode?: string;
      temporaryPassword?: string;
      actorId?: string;
      actorName?: string;
    },
  ): Promise<PartnerDetail> {
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new AppError(404, "Partner not found", "NOT_FOUND");
    }

    let referralCode = params.customReferralCode?.trim().toUpperCase();
    if (!referralCode) {
      referralCode = generateReferralCode(partner.companyName);
      // Ensure referral code is globally unique
      while (await prisma.partner.findUnique({ where: { referralCode } })) {
        referralCode = generateReferralCode(partner.companyName);
      }
    } else {
      const codeExists = await prisma.partner.findUnique({
        where: { referralCode },
      });
      if (codeExists && codeExists.id !== partner.id) {
        throw new AppError(
          409,
          `Referral code "${referralCode}" is already in use`,
          "CODE_EXISTS",
        );
      }
    }

    // Link or create user account for partner
    const tempPassword =
      params.temporaryPassword?.trim() || `Partner@${randomAlphanumeric(6)}`;
    let userId = partner.userId;
    let createdNewUser = false;

    if (!userId) {
      const existingUser = await prisma.user.findUnique({
        where: { email: partner.email },
      });
      if (existingUser) {
        userId = existingUser.id;
        if (
          existingUser.role !== UserRole.SUPER_ADMIN &&
          existingUser.role !== UserRole.PARTNER
        ) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { role: UserRole.PARTNER },
          });
        }
      } else {
        // Create user with PARTNER role (separate partner login & dashboard)
        const newUser = await prisma.user.create({
          data: {
            email: partner.email,
            fullName: partner.contactName,
            phone: partner.phone,
            role: UserRole.PARTNER,
            status: UserStatus.PENDING_VERIFICATION,
            passwordHash: await hashPassword(tempPassword),
            emailVerifiedAt: null,
            clientId: null,
          },
        });
        userId = newUser.id;
        createdNewUser = true;
      }
    } else {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (
        existingUser &&
        existingUser.role !== UserRole.SUPER_ADMIN &&
        existingUser.role !== UserRole.PARTNER
      ) {
        await prisma.user.update({
          where: { id: userId },
          data: { role: UserRole.PARTNER },
        });
      }
    }

    // Generate single-use password set token so partner can set password and activate account
    let inviteToken: string | null = null;
    let inviteLink: string | undefined = undefined;
    if (userId) {
      try {
        inviteToken = await createPasswordResetToken(
          userId,
          INVITE_TOKEN_TTL_SECONDS,
        );
        inviteLink = `${env.FRONTEND_URL}/partner/set-password?token=${encodeURIComponent(inviteToken)}`;
      } catch (tokenErr) {
        logger.warn(
          { tokenErr, userId },
          "Could not generate password set token for approved partner",
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.partner.update({
        where: { id },
        data: {
          status: PartnerStatus.APPROVED,
          referralCode,
          commissionRate: new Prisma.Decimal(params.commissionRate),
          isCommissionActive: true,
          commissionPolicy: params.commissionPolicy ?? PartnerCommissionPolicy.GLOBAL_DEFAULT,
          userId,
          approvedAt: new Date(),
          approvedBy: params.actorName || "Admin",
          rejectionReason: null,
          suspensionReason: null,
        },
      });

      await tx.partnerActivity.create({
        data: {
          partnerId: id,
          kind: PartnerActivityKind.STATUS_CHANGED,
          body: `Partner approved with referral code ${referralCode}, ${params.commissionRate}% commission rate, and policy: ${params.commissionPolicy ?? "GLOBAL_DEFAULT"}.${createdNewUser ? ` Created partner login account for ${partner.email}.` : ""}`,
          actorId: params.actorId || null,
          actorName: params.actorName || null,
        },
      });

      return p;
    });

    // Send approval email with login credentials and set-password invite link
    const loginUrl = `${env.FRONTEND_URL}/partner/login`;
    const dashboardLink = `${env.FRONTEND_URL}/partner/dashboard`;
    try {
      await emailService.sendPartnerApproval({
        to: partner.email,
        contactName: partner.contactName,
        companyName: partner.companyName,
        referralCode,
        commissionRate: params.commissionRate,
        dashboardLink,
        loginEmail: partner.email,
        loginUrl,
        inviteLink,
        temporaryPassword: createdNewUser ? tempPassword : undefined,
      });
    } catch (err) {
      logger.error(
        { err, partnerId: id },
        "Failed to send partner approval email",
      );
    }

    const detail = await this.getAdminDetail(id);
    return {
      ...detail,
      inviteLink,
    };
  }

  /**
   * Admin: Reject application with reason.
   */
  async reject(
    id: string,
    params: { reason: string; actorId?: string; actorName?: string },
  ): Promise<PartnerDetail> {
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new AppError(404, "Partner not found", "NOT_FOUND");
    }

    await prisma.$transaction(async (tx) => {
      await tx.partner.update({
        where: { id },
        data: {
          status: PartnerStatus.REJECTED,
          rejectionReason: params.reason.trim(),
          rejectedAt: new Date(),
        },
      });

      await tx.partnerActivity.create({
        data: {
          partnerId: id,
          kind: PartnerActivityKind.STATUS_CHANGED,
          body: `Application rejected. Reason: ${params.reason.trim()}`,
          actorId: params.actorId || null,
          actorName: params.actorName || null,
        },
      });
    });

    // Send rejection email
    try {
      await emailService.sendPartnerRejection({
        to: partner.email,
        contactName: partner.contactName,
        companyName: partner.companyName,
        reason: params.reason.trim(),
      });
    } catch (err) {
      logger.error(
        { err, partnerId: id },
        "Failed to send partner rejection email",
      );
    }

    return this.getAdminDetail(id);
  }

  /**
   * Admin: Suspend approved partner.
   */
  async suspend(
    id: string,
    params: { reason: string; actorId?: string; actorName?: string },
  ): Promise<PartnerDetail> {
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new AppError(404, "Partner not found", "NOT_FOUND");
    }

    await prisma.$transaction(async (tx) => {
      await tx.partner.update({
        where: { id },
        data: {
          status: PartnerStatus.SUSPENDED,
          suspensionReason: params.reason.trim(),
          suspendedAt: new Date(),
        },
      });

      await tx.partnerActivity.create({
        data: {
          partnerId: id,
          kind: PartnerActivityKind.STATUS_CHANGED,
          body: `Partner suspended. Reason: ${params.reason.trim()}`,
          actorId: params.actorId || null,
          actorName: params.actorName || null,
        },
      });
    });

    try {
      await emailService.sendPartnerSuspension({
        to: partner.email,
        contactName: partner.contactName,
        companyName: partner.companyName,
        reason: params.reason.trim(),
      });
    } catch (err) {
      logger.error(
        { err, partnerId: id },
        "Failed to send partner suspension email",
      );
    }

    return this.getAdminDetail(id);
  }

  /**
   * Admin: Reactivate a suspended partner.
   */
  async reactivate(
    id: string,
    params: { actorId?: string; actorName?: string },
  ): Promise<PartnerDetail> {
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new AppError(404, "Partner not found", "NOT_FOUND");
    }

    await prisma.$transaction(async (tx) => {
      await tx.partner.update({
        where: { id },
        data: {
          status: PartnerStatus.APPROVED,
          suspensionReason: null,
          suspendedAt: null,
        },
      });

      await tx.partnerActivity.create({
        data: {
          partnerId: id,
          kind: PartnerActivityKind.STATUS_CHANGED,
          body: `Partner reactivated to Active status.`,
          actorId: params.actorId || null,
          actorName: params.actorName || null,
        },
      });
    });

    return this.getAdminDetail(id);
  }

  /**
   * Admin: Update commission rate and/or eligibility.
   */
  async updateCommission(
    id: string,
    params: {
      commissionRate?: number;
      isCommissionActive?: boolean;
      commissionPolicy?: PartnerCommissionPolicy;
      actorId?: string;
      actorName?: string;
    },
  ): Promise<PartnerDetail> {
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new AppError(404, "Partner not found", "NOT_FOUND");
    }

    const data: Prisma.PartnerUpdateInput = {};
    const currentRate = Number(partner.commissionRate);
    let rateChanged = false;
    let eligibilityChanged = false;
    let policyChanged = false;

    if (params.commissionRate !== undefined && params.commissionRate !== currentRate) {
      data.commissionRate = new Prisma.Decimal(params.commissionRate);
      rateChanged = true;
    }

    if (params.isCommissionActive !== undefined && params.isCommissionActive !== partner.isCommissionActive) {
      data.isCommissionActive = params.isCommissionActive;
      eligibilityChanged = true;
    }

    if (params.commissionPolicy !== undefined && params.commissionPolicy !== partner.commissionPolicy) {
      data.commissionPolicy = params.commissionPolicy;
      policyChanged = true;
    }

    let activityKind: PartnerActivityKind = PartnerActivityKind.COMMISSION_RATE_UPDATED;
    let activityBody = "";

    if (policyChanged) {
      activityKind = PartnerActivityKind.COMMISSION_POLICY_UPDATED;
      activityBody = `Commission policy updated from ${partner.commissionPolicy} to ${params.commissionPolicy}${rateChanged ? ` (${currentRate}% → ${params.commissionRate}%)` : ""}`;
    } else if (rateChanged && eligibilityChanged) {
      activityBody = `${currentRate}% → ${params.commissionRate}% (${params.isCommissionActive ? "eligibility re-enabled" : "eligibility disabled"})`;
    } else if (rateChanged) {
      activityBody = `${currentRate}% → ${params.commissionRate}%`;
    } else if (eligibilityChanged) {
      activityKind = PartnerActivityKind.COMMISSION_ELIGIBILITY_TOGGLED;
      activityBody = params.isCommissionActive
        ? `${currentRate}% → ${currentRate}% (eligibility re-enabled)`
        : `${currentRate}% → ${currentRate}% (eligibility disabled)`;
    } else if (params.commissionRate !== undefined) {
      activityBody = `Set to ${params.commissionRate}%`;
    } else {
      activityBody = `Commission settings verified`;
    }

    await prisma.$transaction(async (tx) => {
      await tx.partner.update({ where: { id }, data });
      await tx.partnerActivity.create({
        data: {
          partnerId: id,
          kind: activityKind,
          body: activityBody,
          actorId: params.actorId || null,
          actorName: params.actorName || null,
        },
      });
    });

    return this.getAdminDetail(id);
  }

  /**
   * Attribution during customer registration:
   * Associates the customer with the partner referral code if valid and partner is active.
   */
  async attributeReferralOnSignup(params: {
    referralCode?: string | null;
    userId: string;
    clientId: string;
    customerName: string;
    customerEmail: string;
  }) {
    if (!params.referralCode?.trim()) return null;

    const code = params.referralCode.trim().toUpperCase();
    const partner = await prisma.partner.findUnique({
      where: { referralCode: code },
    });

    // Only approved partners can receive new referrals
    if (!partner || partner.status !== PartnerStatus.APPROVED) {
      logger.info(
        { code },
        "Referral code not found or partner not active for signup attribution",
      );
      return null;
    }

    // Do not self-refer
    if (partner.email.toLowerCase() === params.customerEmail.toLowerCase()) {
      logger.info(
        { code, email: params.customerEmail },
        "Self-referral ignored",
      );
      return null;
    }

    try {
      const referral = await prisma.partnerReferral.upsert({
        where: {
          partnerId_customerEmail: {
            partnerId: partner.id,
            customerEmail: params.customerEmail.toLowerCase(),
          },
        },
        create: {
          partnerId: partner.id,
          referralCode: code,
          userId: params.userId,
          clientId: params.clientId,
          customerName: params.customerName,
          customerEmail: params.customerEmail.toLowerCase(),
          status: PartnerReferralStatus.REGISTERED,
        },
        update: {
          userId: params.userId,
          clientId: params.clientId,
        },
      });

      await prisma.partnerActivity.create({
        data: {
          partnerId: partner.id,
          kind: "NOTE",
          body: `New customer registered via referral: ${params.customerName} (${params.customerEmail})`,
        },
      });

      return referral;
    } catch (err) {
      logger.error(
        { err, code, email: params.customerEmail },
        "Error saving referral attribution",
      );
      return null;
    }
  }

  /**
   * Partner Dashboard: Get metrics, stats, referrals, and commissions for the partner.
   */
  async getPartnerDashboard(userIdOrPartnerId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userIdOrPartnerId },
      select: { email: true },
    });

    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { id: userIdOrPartnerId },
          { userId: userIdOrPartnerId },
          ...(user?.email
            ? [{ email: { equals: user.email, mode: "insensitive" as const } }]
            : []),
        ],
      },
      include: {
        referrals: {
          orderBy: { registeredAt: "desc" },
          take: 50,
          select: {
            id: true,
            customerName: true,
            customerEmail: true,
            status: true,
            registeredAt: true,
            convertedAt: true,
            totalSpentPaise: true,
            commissions: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                id: true,
                status: true,
                orderAmountPaise: true,
                commissionAmountPaise: true,
                source: true,
              },
            },
          },
        },
        commissions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            referral: {
              select: { customerName: true },
            },
          },
        },
        payoutRequests: {
          orderBy: { requestedAt: "desc" },
          take: 50,
        },
      },
    });

    if (!partner) {
      throw new AppError(
        404,
        "No partner application found for this account",
        "PARTNER_NOT_FOUND",
      );
    }

    // If application is still pending or rejected, return application details cleanly
    if (
      partner.status !== PartnerStatus.APPROVED &&
      partner.status !== PartnerStatus.SUSPENDED
    ) {
      return {
        partner: {
          id: partner.id,
          applicationId: partner.applicationId,
          companyName: partner.companyName,
          contactName: partner.contactName,
          email: partner.email,
          phone: partner.phone,
          businessType: partner.businessType,
          partnershipType: partner.partnershipType,
          status: partner.status,
          suspensionReason: partner.suspensionReason,
          referralCode: partner.referralCode,
          commissionRate: Number(partner.commissionRate),
          isCommissionActive: partner.isCommissionActive,
          shareUrl: "",
          createdAt: partner.createdAt.toISOString(),
        },
        stats: {
          totalReferrals: 0,
          registeredCustomers: 0,
          successfulConversions: 0,
          totalEarnedPaise: 0,
          pendingCommissionPaise: 0,
          approvedCommissionPaise: 0,
          paidCommissionPaise: 0,
          pendingPayoutRequestsPaise: 0,
          availableForWithdrawalPaise: 0,
          hasPayoutMethod: false,
        },
        bankDetails: {
          accountHolderName: partner.accountHolderName ?? "",
          bankAccountNumber: partner.bankAccountNumber ?? "",
          ifscCode: partner.ifscCode ?? "",
          upiId: partner.upiId ?? "",
          panNumber: partner.panNumber ?? "",
        },
        referrals: [],
        commissions: [],
        payoutRequests: [],
      };
    }

    const totalReferrals = partner.referrals.length;
    const registeredCustomers = partner.referrals.filter(
      (r) => r.status === PartnerReferralStatus.REGISTERED,
    ).length;
    const successfulConversions = partner.referrals.filter(
      (r) => r.status === PartnerReferralStatus.CONVERTED,
    ).length;

    let totalEarnedPaise = 0;
    let pendingCommissionPaise = 0;
    let approvedCommissionPaise = 0;
    let paidCommissionPaise = 0;

    for (const c of partner.commissions) {
      totalEarnedPaise += c.commissionAmountPaise;
      if (c.status === CommissionStatus.PENDING)
        pendingCommissionPaise += c.commissionAmountPaise;
      if (c.status === CommissionStatus.APPROVED)
        approvedCommissionPaise += c.commissionAmountPaise;
      if (c.status === CommissionStatus.PAID)
        paidCommissionPaise += c.commissionAmountPaise;
    }

    const pendingPayoutRequestsPaise = (partner.payoutRequests || [])
      .filter((pr) => pr.status === PayoutRequestStatus.PENDING)
      .reduce((sum, pr) => sum + pr.amountPaise, 0);

    const availableForWithdrawalPaise = Math.max(
      0,
      approvedCommissionPaise - pendingPayoutRequestsPaise,
    );

    const shareUrl = `${env.FRONTEND_URL}/?ref=${encodeURIComponent(partner.referralCode || "")}`;

    let effectiveCommissionPolicy = partner.commissionPolicy;
    if (effectiveCommissionPolicy === PartnerCommissionPolicy.GLOBAL_DEFAULT) {
      const globalCfg = await prisma.partnerProgramConfig.findUnique({ where: { id: "default" } });
      effectiveCommissionPolicy = globalCfg?.defaultCommissionPolicy ?? PartnerCommissionPolicy.FIRST_PAYMENT;
    }

    return {
      partner: {
        id: partner.id,
        applicationId: partner.applicationId,
        companyName: partner.companyName,
        contactName: partner.contactName,
        designation: partner.designation,
        email: partner.email,
        phone: partner.phone,
        alternatePhone: partner.alternatePhone,
        partnershipType: partner.partnershipType,
        status: partner.status,
        suspensionReason: partner.suspensionReason,
        referralCode: partner.referralCode,
        commissionRate: Number(partner.commissionRate),
        isCommissionActive: partner.isCommissionActive,
        commissionPolicy: partner.commissionPolicy,
        effectiveCommissionPolicy,
        shareUrl,
        createdAt: partner.createdAt.toISOString(),
      },
      stats: {
        totalReferrals,
        registeredCustomers,
        successfulConversions,
        totalEarnedPaise,
        pendingCommissionPaise,
        approvedCommissionPaise,
        paidCommissionPaise,
        pendingPayoutRequestsPaise,
        availableForWithdrawalPaise,
        hasPayoutMethod: Boolean(
          partner.upiId || (partner.bankAccountNumber && partner.ifscCode),
        ),
      },
      bankDetails: {
        accountHolderName: partner.accountHolderName ?? "",
        bankAccountNumber: partner.bankAccountNumber ?? "",
        ifscCode: partner.ifscCode ?? "",
        upiId: partner.upiId ?? "",
        panNumber: partner.panNumber ?? "",
      },
      referrals: partner.referrals.map((r) => {
        const latestComm = r.commissions?.[0];
        let commissionStatus: "PENDING" | "APPROVED" | "PAID" | "NO_PAYMENT" = "NO_PAYMENT";
        if (latestComm) {
          if (latestComm.status === CommissionStatus.PENDING) commissionStatus = "PENDING";
          else if (latestComm.status === CommissionStatus.APPROVED) commissionStatus = "APPROVED";
          else if (latestComm.status === CommissionStatus.PAID) commissionStatus = "PAID";
        }
        return {
          id: r.id,
          customerName: r.customerName,
          customerEmail: r.customerEmail.replace(/(^.{2})(.*)(@.*$)/, "$1***$3"),
          status: r.status,
          planName: r.status === PartnerReferralStatus.CONVERTED || Number(r.totalSpentPaise) > 0 ? "Business" : "—",
          source: "Referral link",
          totalSpentPaise: Number(r.totalSpentPaise),
          paymentAmountPaise: latestComm ? latestComm.orderAmountPaise : (Number(r.totalSpentPaise) > 0 ? Number(r.totalSpentPaise) : null),
          commissionAmountPaise: latestComm ? latestComm.commissionAmountPaise : null,
          commissionStatus,
          registeredAt: r.registeredAt.toISOString(),
          convertedAt: r.convertedAt?.toISOString() ?? null,
        };
      }),
      commissions: partner.commissions.map((c) => ({
        id: c.id,
        source: c.source,
        orderAmountPaise: c.orderAmountPaise,
        commissionRate: Number(c.commissionRate),
        commissionAmountPaise: c.commissionAmountPaise,
        status: c.status,
        customerName: c.referral.customerName,
        paidAt: c.paidAt?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      payoutRequests: (partner.payoutRequests || []).map((pr) => ({
        id: pr.id,
        requestNumber: pr.requestNumber,
        formattedId: `PO-2026-${String(pr.requestNumber).padStart(4, "0")}`,
        partnerId: pr.partnerId,
        amountPaise: pr.amountPaise,
        status: pr.status,
        requestedAt: pr.requestedAt.toISOString(),
        processedAt: pr.processedAt?.toISOString() ?? null,
        payoutMethod: pr.payoutMethod,
        accountHolderName: pr.accountHolderName,
        bankAccountNumber: pr.bankAccountNumber,
        ifscCode: pr.ifscCode,
        upiId: pr.upiId,
        transactionReference: pr.transactionReference,
        invoiceNumber: pr.invoiceNumber,
        adminNotes: pr.adminNotes,
        rejectionReason: pr.rejectionReason,
        actorName: pr.actorName,
      })),
    };
  }

  /**
   * Partner: Save or update bank / UPI payout details
   */
  async updatePartnerPayoutDetails(
    userIdOrPartnerId: string,
    input: PartnerPayoutDetailsInput,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userIdOrPartnerId },
      select: { id: true, email: true },
    });

    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { id: userIdOrPartnerId },
          { userId: userIdOrPartnerId },
          ...(user?.email
            ? [{ email: { equals: user.email, mode: "insensitive" as const } }]
            : []),
        ],
      },
    });

    if (!partner) {
      throw new AppError(404, "Partner not found", "PARTNER_NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.partner.update({
        where: { id: partner.id },
        data: {
          accountHolderName: input.accountHolderName?.trim() || null,
          bankAccountNumber: input.bankAccountNumber?.trim() || null,
          ifscCode: input.ifscCode?.trim().toUpperCase() || null,
          upiId: input.upiId?.trim() || null,
          panNumber: input.panNumber?.trim().toUpperCase() || null,
        },
      });

      await tx.partnerActivity.create({
        data: {
          partnerId: partner.id,
          kind: PartnerActivityKind.BANK_DETAILS_UPDATED,
          body: `Bank & payout details updated${row.upiId ? ` (UPI: ${row.upiId})` : ""}${
            row.bankAccountNumber ? ` (Bank: ****${row.bankAccountNumber.slice(-4)})` : ""
          }.`,
        },
      });

      return row;
    });

    return {
      accountHolderName: updated.accountHolderName,
      bankAccountNumber: updated.bankAccountNumber,
      ifscCode: updated.ifscCode,
      upiId: updated.upiId,
      panNumber: updated.panNumber,
    };
  }

  /**
   * Partner: Request a commission withdrawal (Full or custom amount)
   */
  async requestPayout(
    userIdOrPartnerId: string,
    input: PartnerPayoutRequestInput,
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userIdOrPartnerId },
      select: { id: true, email: true },
    });

    const partner = await prisma.partner.findFirst({
      where: {
        OR: [
          { id: userIdOrPartnerId },
          { userId: userIdOrPartnerId },
          ...(user?.email
            ? [{ email: { equals: user.email, mode: "insensitive" as const } }]
            : []),
        ],
      },
      include: {
        commissions: {
          where: { status: CommissionStatus.APPROVED },
          select: { commissionAmountPaise: true },
        },
        payoutRequests: {
          where: { status: PayoutRequestStatus.PENDING },
          select: { amountPaise: true },
        },
      },
    });

    if (!partner) {
      throw new AppError(404, "Partner not found", "PARTNER_NOT_FOUND");
    }

    if (partner.status !== PartnerStatus.APPROVED) {
      throw new AppError(400, "Partner account must be active to request payout", "PARTNER_NOT_ACTIVE");
    }

    const hasUpi = Boolean(partner.upiId?.trim());
    const hasBank = Boolean(partner.bankAccountNumber?.trim() && partner.ifscCode?.trim());
    if (!hasUpi && !hasBank) {
      throw new AppError(
        400,
        "Please provide your Bank Account or UPI ID in your Profile before requesting a payout",
        "PAYOUT_DETAILS_REQUIRED",
      );
    }

    const preferredMethod: PayoutMethod = input.payoutMethod === "UPI" && hasUpi
      ? PayoutMethod.UPI
      : hasBank
        ? PayoutMethod.BANK_TRANSFER
        : PayoutMethod.UPI;

    const approvedTotal = partner.commissions.reduce((s, c) => s + c.commissionAmountPaise, 0);
    const pendingRequestsTotal = partner.payoutRequests.reduce((s, pr) => s + pr.amountPaise, 0);
    const availablePaise = Math.max(0, approvedTotal - pendingRequestsTotal);

    if (input.amountPaise <= 0) {
      throw new AppError(400, "Withdrawal amount must be greater than zero", "INVALID_AMOUNT");
    }

    if (input.amountPaise > availablePaise) {
      throw new AppError(
        400,
        `Withdrawal amount (₹${(input.amountPaise / 100).toFixed(2)}) exceeds available approved balance (₹${(availablePaise / 100).toFixed(2)})`,
        "INSUFFICIENT_BALANCE",
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.partnerPayoutRequest.create({
        data: {
          partnerId: partner.id,
          amountPaise: input.amountPaise,
          payoutMethod: preferredMethod,
          accountHolderName: partner.accountHolderName,
          bankAccountNumber: partner.bankAccountNumber,
          ifscCode: partner.ifscCode,
          upiId: partner.upiId,
          status: PayoutRequestStatus.PENDING,
        },
      });

      await tx.partnerActivity.create({
        data: {
          partnerId: partner.id,
          kind: PartnerActivityKind.PAYOUT_REQUESTED,
          body: `Payout request submitted: ₹${(input.amountPaise / 100).toFixed(2)} via ${preferredMethod === PayoutMethod.UPI ? "UPI" : "Bank Transfer"} (Req #PO-2026-${String(row.requestNumber).padStart(4, "0")}).`,
        },
      });

      return row;
    });

    return {
      id: created.id,
      requestNumber: created.requestNumber,
      formattedId: `PO-2026-${String(created.requestNumber).padStart(4, "0")}`,
      amountPaise: created.amountPaise,
      status: created.status,
      requestedAt: created.requestedAt.toISOString(),
      payoutMethod: created.payoutMethod,
    };
  }

  /**
   * Admin: List all payout requests with status filter & pagination
   */
  async adminListPayoutRequests(query: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Prisma.PartnerPayoutRequestWhereInput = {};

    if (query.status && query.status !== "ALL") {
      where.status = query.status as PayoutRequestStatus;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { partner: { companyName: { contains: q, mode: "insensitive" } } },
        { partner: { contactName: { contains: q, mode: "insensitive" } } },
        { partner: { email: { contains: q, mode: "insensitive" } } },
        { transactionReference: { contains: q, mode: "insensitive" } },
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { upiId: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.partnerPayoutRequest.findMany({
        where,
        orderBy: { requestedAt: "desc" },
        skip,
        take: pageSize,
        include: {
          partner: {
            select: {
              id: true,
              companyName: true,
              contactName: true,
              email: true,
              phone: true,
              referralCode: true,
            },
          },
        },
      }),
      prisma.partnerPayoutRequest.count({ where }),
      prisma.partnerPayoutRequest.count({ where: { status: PayoutRequestStatus.PENDING } }),
      prisma.partnerPayoutRequest.count({ where: { status: PayoutRequestStatus.APPROVED } }),
      prisma.partnerPayoutRequest.count({ where: { status: PayoutRequestStatus.REJECTED } }),
    ]);

    return {
      items: items.map((pr) => ({
        id: pr.id,
        requestNumber: pr.requestNumber,
        formattedId: `PO-2026-${String(pr.requestNumber).padStart(4, "0")}`,
        partnerId: pr.partnerId,
        partnerName: pr.partner.companyName,
        partnerContact: pr.partner.contactName,
        partnerEmail: pr.partner.email,
        partnerPhone: pr.partner.phone,
        partnerReferralCode: pr.partner.referralCode,
        amountPaise: pr.amountPaise,
        status: pr.status,
        requestedAt: pr.requestedAt.toISOString(),
        processedAt: pr.processedAt?.toISOString() ?? null,
        payoutMethod: pr.payoutMethod,
        accountHolderName: pr.accountHolderName,
        bankAccountNumber: pr.bankAccountNumber,
        ifscCode: pr.ifscCode,
        upiId: pr.upiId,
        transactionReference: pr.transactionReference,
        invoiceNumber: pr.invoiceNumber,
        adminNotes: pr.adminNotes,
        rejectionReason: pr.rejectionReason,
        actorName: pr.actorName,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      counts: {
        ALL: pendingCount + approvedCount + rejectedCount,
        PENDING: pendingCount,
        APPROVED: approvedCount,
        REJECTED: rejectedCount,
      },
    };
  }

  /**
   * Admin: Approve or Reject a payout request
   */
  async adminResolvePayoutRequest(
    requestId: string,
    input: AdminResolvePayoutRequestInput,
    actor?: { id: string; name: string },
  ) {
    const existing = await prisma.partnerPayoutRequest.findUnique({
      where: { id: requestId },
      include: { partner: true },
    });

    if (!existing) {
      throw new AppError(404, "Payout request not found", "NOT_FOUND");
    }

    if (existing.status !== PayoutRequestStatus.PENDING) {
      throw new AppError(400, `Payout request is already ${existing.status}`, "ALREADY_RESOLVED");
    }

    const resolved = await prisma.$transaction(async (tx) => {
      const now = new Date();

      if (input.status === "REJECTED") {
        const row = await tx.partnerPayoutRequest.update({
          where: { id: requestId },
          data: {
            status: PayoutRequestStatus.REJECTED,
            processedAt: now,
            rejectionReason: input.rejectionReason?.trim() || "Rejected by admin",
            actorId: actor?.id || null,
            actorName: actor?.name || "Admin",
          },
        });

        await tx.partnerActivity.create({
          data: {
            partnerId: existing.partnerId,
            kind: PartnerActivityKind.PAYOUT_REJECTED,
            body: `Payout request #PO-2026-${String(existing.requestNumber).padStart(4, "0")} (₹${(existing.amountPaise / 100).toFixed(2)}) was rejected. Reason: ${input.rejectionReason || "None"}.`,
            actorId: actor?.id || null,
            actorName: actor?.name || "Admin",
          },
        });

        return row;
      }

      // APPROVED flow
      const invoiceNumber = input.invoiceNumber?.trim() || `INV-PO-2026-${String(existing.requestNumber).padStart(4, "0")}`;
      const transactionReference = input.transactionReference?.trim() || "MANUAL_BANK_TRANSFER";
      const payoutMethod = (input.payoutMethod as PayoutMethod) || existing.payoutMethod;

      const row = await tx.partnerPayoutRequest.update({
        where: { id: requestId },
        data: {
          status: PayoutRequestStatus.APPROVED,
          processedAt: now,
          payoutMethod,
          transactionReference,
          invoiceNumber,
          adminNotes: input.adminNotes?.trim() || null,
          actorId: actor?.id || null,
          actorName: actor?.name || "Admin",
        },
      });

      // Mark oldest approved commissions up to amountPaise as PAID
      const approvedCommissions = await tx.partnerCommission.findMany({
        where: {
          partnerId: existing.partnerId,
          status: CommissionStatus.APPROVED,
        },
        orderBy: { createdAt: "asc" },
      });

      let remainingToMark = existing.amountPaise;
      for (const comm of approvedCommissions) {
        if (remainingToMark <= 0) break;
        await tx.partnerCommission.update({
          where: { id: comm.id },
          data: {
            status: CommissionStatus.PAID,
            paidAt: now,
            paymentReference: transactionReference,
          },
        });
        remainingToMark -= comm.commissionAmountPaise;
      }

      await tx.partnerActivity.create({
        data: {
          partnerId: existing.partnerId,
          kind: PartnerActivityKind.PAYOUT_APPROVED,
          body: `Payout approved & settled: ₹${(existing.amountPaise / 100).toFixed(2)} via ${payoutMethod === PayoutMethod.UPI ? "UPI" : "Bank Transfer"} (Ref: ${transactionReference}, Invoice: ${invoiceNumber}).`,
          actorId: actor?.id || null,
          actorName: actor?.name || "Admin",
        },
      });

      return row;
    });

    return {
      id: resolved.id,
      requestNumber: resolved.requestNumber,
      formattedId: `PO-2026-${String(resolved.requestNumber).padStart(4, "0")}`,
      amountPaise: resolved.amountPaise,
      status: resolved.status,
      processedAt: resolved.processedAt?.toISOString() ?? null,
      transactionReference: resolved.transactionReference,
      invoiceNumber: resolved.invoiceNumber,
    };
  }

  /**
   * Super Admin: Get global partner program configuration (default commission rate and policy)
   */
  async getProgramConfig(): Promise<PartnerProgramConfigView> {
    let config = await prisma.partnerProgramConfig.findUnique({
      where: { id: "default" },
    });
    if (!config) {
      config = await prisma.partnerProgramConfig.create({
        data: {
          id: "default",
          defaultCommissionRate: new Prisma.Decimal(15.0),
          defaultCommissionPolicy: PartnerCommissionPolicy.FIRST_PAYMENT,
        },
      });
    }
    return {
      defaultCommissionRate: Number(config.defaultCommissionRate),
      defaultCommissionPolicy: config.defaultCommissionPolicy,
      updatedAt: config.updatedAt.toISOString(),
    };
  }

  /**
   * Super Admin: Update global partner program configuration
   */
  async updateProgramConfig(
    input: UpdatePartnerProgramConfigInput,
  ): Promise<PartnerProgramConfigView> {
    const data: Prisma.PartnerProgramConfigUpdateInput = {};
    if (input.defaultCommissionRate !== undefined) {
      data.defaultCommissionRate = new Prisma.Decimal(input.defaultCommissionRate);
    }
    if (input.defaultCommissionPolicy !== undefined) {
      data.defaultCommissionPolicy = input.defaultCommissionPolicy;
    }

    const config = await prisma.partnerProgramConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        defaultCommissionRate: new Prisma.Decimal(input.defaultCommissionRate ?? 15.0),
        defaultCommissionPolicy:
          input.defaultCommissionPolicy ?? PartnerCommissionPolicy.FIRST_PAYMENT,
      },
      update: data,
    });

    return {
      defaultCommissionRate: Number(config.defaultCommissionRate),
      defaultCommissionPolicy: config.defaultCommissionPolicy,
      updatedAt: config.updatedAt.toISOString(),
    };
  }
}

export const partnerService = new PartnerService();
