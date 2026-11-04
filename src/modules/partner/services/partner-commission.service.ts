import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import {
  CommissionSource,
  CommissionStatus,
  PartnerCommissionPolicy,
  PartnerReferralStatus,
  PartnerStatus,
  type PartnerCommission,
} from "../../../generated/prisma/client.js";

export type RecordPaymentCommissionInput = {
  clientId?: string | null;
  userId?: string | null;
  paymentOrderId?: string | null;
  hostingOrderId?: string | null;
  shopOrderId?: string | null;
  amountPaise: number;
  source: CommissionSource;
};

export class PartnerCommissionService {
  /**
   * Automatically calculates and records partner commission when a referred customer completes a payment.
   * Prevents duplicate commission for the same payment order.
   */
  async recordCommissionFromPayment(
    input: RecordPaymentCommissionInput,
  ): Promise<PartnerCommission | null> {
    if (!input.amountPaise || input.amountPaise <= 0) {
      return null;
    }

    try {
      // Find the referral attribution for this client or user
      const referral = await prisma.partnerReferral.findFirst({
        where: {
          OR: [
            ...(input.clientId ? [{ clientId: input.clientId }] : []),
            ...(input.userId ? [{ userId: input.userId }] : []),
          ],
        },
        include: {
          partner: true,
        },
      });

      if (!referral) {
        return null;
      }

      const partner = referral.partner;

      // Only approved and commission-eligible partners receive commissions
      if (partner.status !== PartnerStatus.APPROVED || !partner.isCommissionActive) {
        logger.info(
          { partnerId: partner.id, status: partner.status, isCommissionActive: partner.isCommissionActive },
          "Skipping commission for inactive or non-approved partner",
        );
        return null;
      }

      // Resolve effective commission policy:
      // Can be explicitly configured on the partner (FIRST_PAYMENT or EVERY_RENEWAL),
      // or inherit the global platform default (GLOBAL_DEFAULT).
      let effectivePolicy = partner.commissionPolicy;
      if (effectivePolicy === PartnerCommissionPolicy.GLOBAL_DEFAULT) {
        const globalConfig = await prisma.partnerProgramConfig.findUnique({
          where: { id: "default" },
        });
        effectivePolicy = globalConfig?.defaultCommissionPolicy ?? PartnerCommissionPolicy.FIRST_PAYMENT;
      }

      // If policy is FIRST_PAYMENT (one-time on first payment only):
      if (effectivePolicy === PartnerCommissionPolicy.FIRST_PAYMENT) {
        const existingForReferral = await prisma.partnerCommission.findFirst({
          where: { referralId: referral.id },
        });
        if (existingForReferral) {
          logger.info(
            { referralId: referral.id, partnerId: partner.id, existingCommissionId: existingForReferral.id },
            "First-payment-only commission policy is active for this partner/referral. Skipping subsequent payment/renewal.",
          );
          return existingForReferral;
        }
      }

      // Check if commission already recorded for this order (prevent duplicate commissions)
      if (input.paymentOrderId) {
        const existing = await prisma.partnerCommission.findUnique({
          where: { paymentOrderId: input.paymentOrderId },
        });
        if (existing) return existing;
      }
      if (input.hostingOrderId) {
        const existing = await prisma.partnerCommission.findUnique({
          where: { hostingOrderId: input.hostingOrderId },
        });
        if (existing) return existing;
      }
      if (input.shopOrderId) {
        const existing = await prisma.partnerCommission.findUnique({
          where: { shopOrderId: input.shopOrderId },
        });
        if (existing) return existing;
      }

      const commissionRate = Number(partner.commissionRate);
      const commissionAmountPaise = Math.round((input.amountPaise * commissionRate) / 100);

      const commission = await prisma.$transaction(async (tx) => {
        const row = await tx.partnerCommission.create({
          data: {
            partnerId: partner.id,
            referralId: referral.id,
            source: input.source,
            paymentOrderId: input.paymentOrderId || null,
            hostingOrderId: input.hostingOrderId || null,
            shopOrderId: input.shopOrderId || null,
            orderAmountPaise: input.amountPaise,
            commissionRate: partner.commissionRate,
            commissionAmountPaise,
            status: CommissionStatus.APPROVED,
          },
        });

        await tx.partnerReferral.update({
          where: { id: referral.id },
          data: {
            status: PartnerReferralStatus.CONVERTED,
            convertedAt: referral.convertedAt ?? new Date(),
            totalSpentPaise: { increment: BigInt(input.amountPaise) },
          },
        });

        await tx.partnerActivity.create({
          data: {
            partnerId: partner.id,
            kind: "NOTE",
            body: `Commission earned: ₹${(commissionAmountPaise / 100).toFixed(2)} (${commissionRate}%, Policy: ${effectivePolicy === PartnerCommissionPolicy.EVERY_RENEWAL ? "Renewal / Recurring" : "First Payment"}) from customer ${referral.customerName} on ${input.source}.`,
          },
        });

        return row;
      });

      logger.info(
        {
          partnerId: partner.id,
          referralId: referral.id,
          commissionId: commission.id,
          commissionAmountPaise,
        },
        "Recorded partner commission",
      );

      return commission;
    } catch (error) {
      logger.error({ err: error, input }, "Error recording partner commission");
      return null;
    }
  }

  async listPartnerCommissions(partnerId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.partnerCommission.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          referral: {
            select: {
              customerName: true,
              customerEmail: true,
            },
          },
        },
      }),
      prisma.partnerCommission.count({ where: { partnerId } }),
    ]);

    return {
      items: items.map((c) => ({
        id: c.id,
        source: c.source,
        orderAmountPaise: c.orderAmountPaise,
        commissionRate: Number(c.commissionRate),
        commissionAmountPaise: c.commissionAmountPaise,
        currency: c.currency,
        status: c.status,
        customerName: c.referral.customerName,
        paidAt: c.paidAt?.toISOString() ?? null,
        paymentReference: c.paymentReference,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async updateCommissionStatus(
    commissionId: string,
    input: {
      status: CommissionStatus;
      paymentReference?: string | null;
      notes?: string | null;
      actorId?: string;
      actorName?: string;
    },
  ) {
    const existing = await prisma.partnerCommission.findUnique({
      where: { id: commissionId },
      include: { partner: true },
    });
    if (!existing) {
      throw new AppError(404, "Commission record not found", "NOT_FOUND");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.partnerCommission.update({
        where: { id: commissionId },
        data: {
          status: input.status,
          paymentReference: input.paymentReference ?? existing.paymentReference,
          notes: input.notes ?? existing.notes,
          paidAt: input.status === CommissionStatus.PAID ? new Date() : existing.paidAt,
        },
      });

      await tx.partnerActivity.create({
        data: {
          partnerId: existing.partnerId,
          kind: "STATUS_CHANGED",
          body: `Commission #${commissionId.slice(0, 8)} status changed to ${input.status}${
            input.paymentReference ? ` (Ref: ${input.paymentReference})` : ""
          }`,
          actorId: input.actorId || null,
          actorName: input.actorName || null,
        },
      });

      return row;
    });

    return updated;
  }
}

export const partnerCommissionService = new PartnerCommissionService();

