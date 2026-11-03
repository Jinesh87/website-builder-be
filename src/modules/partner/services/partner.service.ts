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
  PartnerReferralStatus,
  PartnerStatus,
  Prisma,
  type Partner,
} from "../../../generated/prisma/client.js";
import { emailService } from "../../email/services/email.service.js";
import { authService } from "../../auth/services/auth.service.js";
import type {
  PartnerApplicationInput,
  PartnerDetail,
  PartnerListResponse,
  PartnerSummary,
} from "../types/partner.types.js";
import {
  formatPartnerApplicationId,
  generateApplicationId,
  generateReferralCode,
  randomAlphanumeric,
} from "../utils/partner-codes.js";

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

  return {
    id: partner.id,
    partnerNumber: partner.partnerNumber,
    applicationId: partner.applicationId,
    companyName: partner.companyName,
    contactName: partner.contactName,
    email: partner.email,
    phone: partner.phone,
    businessType: partner.businessType,
    partnershipType: partner.partnershipType,
    status: partner.status,
    referralCode: partner.referralCode,
    commissionRate: Number(partner.commissionRate),
    isCommissionActive: partner.isCommissionActive,
    totalReferrals,
    convertedReferrals,
    totalCommissionPaise,
    approvedAt: partner.approvedAt?.toISOString() ?? null,
    createdAt: partner.createdAt.toISOString(),
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
        },
      }),
      prisma.partner.count({ where }),
      prisma.partner.count({ where: { status: PartnerStatus.PENDING } }),
      prisma.partner.count({ where: { status: PartnerStatus.APPROVED } }),
      prisma.partner.count({ where: { status: PartnerStatus.REJECTED } }),
      prisma.partner.count({ where: { status: PartnerStatus.SUSPENDED } }),
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
      },
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
          select: { status: true },
        },
        commissions: {
          select: { commissionAmountPaise: true },
        },
      },
    });

    if (!partner) {
      throw new AppError(404, "Partner not found", "NOT_FOUND");
    }

    const summary = toPartnerSummary(partner);

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
      } else {
        // Create client workspace for partner so they can access the platform dashboard
        const newClient = await prisma.client.create({
          data: {
            businessName: partner.companyName,
            source: ClientSource.ADMIN_CREATED,
          },
        });

        // Create user with CLIENT role so they have full dashboard access
        const newUser = await prisma.user.create({
          data: {
            email: partner.email,
            fullName: partner.contactName,
            phone: partner.phone,
            role: UserRole.CLIENT,
            status: UserStatus.ACTIVE,
            passwordHash: await hashPassword(tempPassword),
            emailVerifiedAt: new Date(),
            clientId: newClient.id,
          },
        });
        userId = newUser.id;
        createdNewUser = true;
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
          body: `Partner approved with referral code ${referralCode} and ${params.commissionRate}% commission rate.${createdNewUser ? ` Created login account for ${partner.email}.` : ""}`,
          actorId: params.actorId || null,
          actorName: params.actorName || null,
        },
      });

      return p;
    });

    // Send approval email with login credentials and dashboard instructions
    const loginUrl = `${env.FRONTEND_URL}/login`;
    const dashboardLink = `${env.FRONTEND_URL}/partnership`;
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
        temporaryPassword: createdNewUser ? tempPassword : undefined,
      });
    } catch (err) {
      logger.error(
        { err, partnerId: id },
        "Failed to send partner approval email",
      );
    }

    return this.getAdminDetail(id);
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
      actorId?: string;
      actorName?: string;
    },
  ): Promise<PartnerDetail> {
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      throw new AppError(404, "Partner not found", "NOT_FOUND");
    }

    const data: Prisma.PartnerUpdateInput = {};
    const logParts: string[] = [];

    if (params.commissionRate !== undefined) {
      data.commissionRate = new Prisma.Decimal(params.commissionRate);
      logParts.push(`Commission rate set to ${params.commissionRate}%`);
    }

    if (params.isCommissionActive !== undefined) {
      data.isCommissionActive = params.isCommissionActive;
      logParts.push(
        `Commission eligibility set to ${params.isCommissionActive ? "ACTIVE" : "INACTIVE"}`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.partner.update({ where: { id }, data });
      await tx.partnerActivity.create({
        data: {
          partnerId: id,
          kind: PartnerActivityKind.COMMISSION_RATE_UPDATED,
          body: logParts.join(". "),
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
      },
    });

    if (!partner) {
      throw new AppError(
        404,
        "No partner application found for this account",
        "PARTNER_NOT_FOUND",
      );
    }

    // If application is still pending or not approved, return application details cleanly
    if (partner.status !== PartnerStatus.APPROVED) {
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
        },
        referrals: [],
        commissions: [],
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

    const shareUrl = `${env.FRONTEND_URL}/?ref=${encodeURIComponent(partner.referralCode || "")}`;

    return {
      partner: {
        id: partner.id,
        companyName: partner.companyName,
        contactName: partner.contactName,
        email: partner.email,
        referralCode: partner.referralCode,
        commissionRate: Number(partner.commissionRate),
        isCommissionActive: partner.isCommissionActive,
        shareUrl,
      },
      stats: {
        totalReferrals,
        registeredCustomers,
        successfulConversions,
        totalEarnedPaise,
        pendingCommissionPaise,
        approvedCommissionPaise,
        paidCommissionPaise,
      },
      referrals: partner.referrals.map((r) => ({
        id: r.id,
        customerName: r.customerName,
        // Mask customer email for privacy, e.g. j***@domain.com
        customerEmail: r.customerEmail.replace(/(^.{2})(.*)(@.*$)/, "$1***$3"),
        status: r.status,
        totalSpentPaise: Number(r.totalSpentPaise),
        registeredAt: r.registeredAt.toISOString(),
        convertedAt: r.convertedAt?.toISOString() ?? null,
      })),
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
    };
  }
}

export const partnerService = new PartnerService();
