import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import {
  HostingCouponDiscountType,
  Prisma,
  type HostingCoupon,
} from "../../../generated/prisma/client.js";
import type {
  CreateHostingCouponInput,
  HostingCouponPreview,
  HostingCouponRedemptionView,
  HostingCouponView,
  UpdateHostingCouponInput,
} from "../types/hosting.types.js";

export type AppliedCoupon = {
  couponId: string;
  code: string;
  listAmountPaise: number;
  discountPaise: number;
  finalAmountPaise: number;
};

type Tx = Prisma.TransactionClient;

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function discountPaiseFor(listAmountPaise: number, coupon: Pick<HostingCoupon, "discountType" | "discountValue">): number {
  if (listAmountPaise <= 0) return 0;
  if (coupon.discountType === HostingCouponDiscountType.PERCENT) {
    return Math.min(listAmountPaise, Math.floor((listAmountPaise * coupon.discountValue) / 100));
  }
  return Math.min(listAmountPaise, coupon.discountValue);
}

function assertCouponUsable(coupon: HostingCoupon, clientId: string, now: Date, alreadyRedeemed: boolean): void {
  if (!coupon.active) {
    throw new AppError(400, "This coupon is no longer active.", "COUPON_INACTIVE");
  }
  if (coupon.expiresAt && coupon.expiresAt.getTime() <= now.getTime()) {
    throw new AppError(400, "This coupon has expired.", "COUPON_EXPIRED");
  }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    throw new AppError(400, "This coupon has reached its usage limit.", "COUPON_MAXED");
  }
  if (alreadyRedeemed) {
    throw new AppError(400, "Your account has already used this coupon.", "COUPON_ALREADY_USED");
  }
}

function toCouponView(coupon: HostingCoupon & { _count?: { redemptions: number } }): HostingCouponView {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    expiresAt: coupon.expiresAt?.toISOString() ?? null,
    maxUses: coupon.maxUses,
    usedCount: coupon.usedCount,
    active: coupon.active,
    createdAt: coupon.createdAt.toISOString(),
    updatedAt: coupon.updatedAt.toISOString(),
  };
}

export class HostingCouponService {
  /** Validates a code against list price for this client; does not consume a use. */
  async quote(listAmountPaise: number, code: string | undefined | null, clientId: string, now = new Date()): Promise<AppliedCoupon | null> {
    const normalized = code ? normalizeCode(code) : "";
    if (!normalized) return null;
    if (listAmountPaise < 0) {
      throw new AppError(400, "Invalid hosting price.", "INVALID_PRICE");
    }

    const coupon = await prisma.hostingCoupon.findUnique({ where: { code: normalized } });
    if (!coupon) throw new AppError(404, "Coupon not found.", "COUPON_NOT_FOUND");

    const redeemed = await prisma.hostingCouponRedemption.findUnique({
      where: { couponId_clientId: { couponId: coupon.id, clientId } },
      select: { id: true },
    });
    assertCouponUsable(coupon, clientId, now, Boolean(redeemed));

    const discountPaise = discountPaiseFor(listAmountPaise, coupon);
    return {
      couponId: coupon.id,
      code: coupon.code,
      listAmountPaise,
      discountPaise,
      finalAmountPaise: listAmountPaise - discountPaise,
    };
  }

  async previewForWebsite(
    websiteId: string,
    input: { packageId: string; cycle: "QUARTERLY" | "YEARLY"; couponCode: string },
    actor: AuthUser,
  ): Promise<HostingCouponPreview> {
    const { availablePrice, hostingService } = await import("./hosting.service.js");
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...hostingService.scopeFor(actor) },
      select: { id: true, clientId: true, hosting: { include: { package: true } } },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!actor.clientId || actor.clientId !== website.clientId) {
      throw new AppError(403, "Only the website owner can apply a coupon.", "FORBIDDEN");
    }

    const pkg = await prisma.hostingPackage.findUnique({ where: { id: input.packageId } });
    const listAmountPaise = availablePrice(pkg, input.cycle, website.hosting);
    const applied = await this.quote(listAmountPaise, input.couponCode, website.clientId);
    if (!applied) throw new AppError(400, "Enter a coupon code.", "COUPON_REQUIRED");

    return {
      code: applied.code,
      listAmountPaise: applied.listAmountPaise,
      discountPaise: applied.discountPaise,
      finalAmountPaise: applied.finalAmountPaise,
    };
  }

  /**
   * Records a successful redemption and increments usedCount atomically.
   * Safe to call once per paid order/payment; unique (couponId, clientId) blocks duplicates.
   */
  async redeemInTransaction(
    tx: Tx,
    params: {
      couponId: string;
      clientId: string;
      userId: string | null;
      websiteId: string | null;
      hostingOrderId: string | null;
      hostingPaymentId: string;
      listAmountPaise: number;
      discountPaise: number;
      finalAmountPaise: number;
      now?: Date;
    },
  ): Promise<void> {
    const now = params.now ?? new Date();
    const coupon = await tx.hostingCoupon.findUnique({ where: { id: params.couponId } });
    if (!coupon) throw new AppError(404, "Coupon not found.", "COUPON_NOT_FOUND");

    const redeemed = await tx.hostingCouponRedemption.findUnique({
      where: { couponId_clientId: { couponId: coupon.id, clientId: params.clientId } },
      select: { id: true },
    });
    assertCouponUsable(coupon, params.clientId, now, Boolean(redeemed));

    const claimed = await tx.hostingCoupon.updateMany({
      where: {
        id: coupon.id,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        ...(coupon.maxUses !== null ? { usedCount: { lt: coupon.maxUses } } : {}),
      },
      data: { usedCount: { increment: 1 } },
    });
    if (claimed.count === 0) {
      throw new AppError(400, "This coupon has reached its usage limit.", "COUPON_MAXED");
    }

    await tx.hostingCouponRedemption.create({
      data: {
        couponId: params.couponId,
        clientId: params.clientId,
        userId: params.userId,
        websiteId: params.websiteId,
        hostingOrderId: params.hostingOrderId,
        hostingPaymentId: params.hostingPaymentId,
        listAmountPaise: params.listAmountPaise,
        discountPaise: params.discountPaise,
        finalAmountPaise: params.finalAmountPaise,
      },
    });
  }

  async listCoupons(): Promise<HostingCouponView[]> {
    const rows = await prisma.hostingCoupon.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toCouponView);
  }

  async createCoupon(input: CreateHostingCouponInput, actor: AuthUser): Promise<HostingCouponView> {
    const code = normalizeCode(input.code);
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) {
      throw new AppError(400, "Use 3–40 letters, numbers, hyphens or underscores.", "INVALID_COUPON_CODE");
    }
    this.assertDiscountInput(input.discountType, input.discountValue);
    if (input.maxUses !== null && input.maxUses !== undefined && input.maxUses < 1) {
      throw new AppError(400, "Max uses must be at least 1, or leave it unlimited.", "INVALID_MAX_USES");
    }
    if (input.expiresAt) {
      const expiresAt = new Date(input.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) throw new AppError(400, "Invalid expiry date.", "INVALID_EXPIRY");
      if (expiresAt.getTime() <= Date.now()) throw new AppError(400, "Expiry must be in the future.", "INVALID_EXPIRY");
    }

    try {
      const created = await prisma.hostingCoupon.create({
        data: {
          code,
          discountType: input.discountType,
          discountValue: input.discountValue,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          maxUses: input.maxUses ?? null,
          createdById: actor.id,
        },
      });
      return toCouponView(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "That coupon code already exists.", "COUPON_CODE_TAKEN");
      }
      throw error;
    }
  }

  async updateCoupon(couponId: string, input: UpdateHostingCouponInput): Promise<HostingCouponView> {
    const existing = await prisma.hostingCoupon.findUnique({ where: { id: couponId } });
    if (!existing) throw new AppError(404, "Coupon not found.", "COUPON_NOT_FOUND");

    if (input.discountType !== undefined || input.discountValue !== undefined) {
      this.assertDiscountInput(
        input.discountType ?? existing.discountType,
        input.discountValue ?? existing.discountValue,
      );
    }
    if (input.maxUses !== undefined && input.maxUses !== null && input.maxUses < 1) {
      throw new AppError(400, "Max uses must be at least 1, or leave it unlimited.", "INVALID_MAX_USES");
    }
    if (input.maxUses !== undefined && input.maxUses !== null && input.maxUses < existing.usedCount) {
      throw new AppError(400, `Max uses can't be below the ${existing.usedCount} already used.`, "INVALID_MAX_USES");
    }

    let expiresAt: Date | null | undefined = undefined;
    if (input.expiresAt !== undefined) {
      if (input.expiresAt === null) expiresAt = null;
      else {
        const parsed = new Date(input.expiresAt);
        if (Number.isNaN(parsed.getTime())) throw new AppError(400, "Invalid expiry date.", "INVALID_EXPIRY");
        expiresAt = parsed;
      }
    }

    const updated = await prisma.hostingCoupon.update({
      where: { id: couponId },
      data: {
        ...(input.discountType !== undefined ? { discountType: input.discountType } : {}),
        ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(input.maxUses !== undefined ? { maxUses: input.maxUses } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
      },
    });
    return toCouponView(updated);
  }

  async listRedemptions(couponId: string): Promise<HostingCouponRedemptionView[]> {
    const coupon = await prisma.hostingCoupon.findUnique({ where: { id: couponId }, select: { id: true } });
    if (!coupon) throw new AppError(404, "Coupon not found.", "COUPON_NOT_FOUND");

    const rows = await prisma.hostingCouponRedemption.findMany({
      where: { couponId },
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, businessName: true } },
        user: { select: { id: true, fullName: true, email: true } },
        website: { select: { id: true, name: true, subdomain: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      listAmountPaise: row.listAmountPaise,
      discountPaise: row.discountPaise,
      finalAmountPaise: row.finalAmountPaise,
      createdAt: row.createdAt.toISOString(),
      client: row.client,
      user: row.user
        ? { id: row.user.id, fullName: row.user.fullName, email: row.user.email }
        : null,
      website: row.website
        ? { id: row.website.id, name: row.website.name, subdomain: row.website.subdomain }
        : null,
    }));
  }

  private assertDiscountInput(type: HostingCouponDiscountType, value: number): void {
    if (!Number.isInteger(value) || value < 1) {
      throw new AppError(400, "Discount value must be a positive whole number.", "INVALID_DISCOUNT");
    }
    if (type === HostingCouponDiscountType.PERCENT && value > 100) {
      throw new AppError(400, "Percent discount can't exceed 100.", "INVALID_DISCOUNT");
    }
    if (type === HostingCouponDiscountType.FIXED_PAISE && value > 1_000_000_000) {
      throw new AppError(400, "Fixed discount is too large.", "INVALID_DISCOUNT");
    }
  }
}

export const hostingCouponService = new HostingCouponService();
