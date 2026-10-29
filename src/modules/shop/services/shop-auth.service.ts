import { randomUUID } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import { DomainStatus } from "../../../common/constants/website.js";
import { UserStatus } from "../../../common/constants/roles.js";
import type { AuthTokens } from "../../../common/utils/cookies.js";
import { parseDurationMs } from "../../../common/utils/duration.js";
import { hashPassword, sha256, verifyPassword } from "../../../common/utils/hash.js";
import { signShopAccessToken, signShopRefreshToken, verifyShopRefreshToken } from "../../../common/utils/jwt.js";
import { env, isProduction } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma, type ShopCustomer } from "../../../generated/prisma/client.js";
import { emailService } from "../../email/services/email.service.js";
import { clearLoginLockout, getLoginLockStatus, recordFailedLoginAttempt } from "../../auth/utils/login-lockout.js";
import {
  checkVerificationCode,
  clearVerificationCode,
  generateVerificationCode,
  getResendCooldownSeconds,
  RESEND_COOLDOWN_SECONDS,
  storeVerificationCode,
  VERIFICATION_CODE_TTL_SECONDS,
  type VerifyCodeResult,
} from "../../auth/utils/verification-code.js";
import { consumeShopPasswordResetToken, createShopPasswordResetToken, SHOP_RESET_TOKEN_TTL_SECONDS } from "../utils/shop-password-reset.js";
import { mediaUrl } from "../../media/services/media.service.js";
import type {
  ShopAddToCartInput,
  ShopCartItemSummary,
  ShopCustomerAccountView,
  ShopAuthResult,
  ShopProfileUpdateInput,
  ShopCustomerView,
  ShopLoginInput,
  ShopSignupInput,
  ShopVerificationDispatch,
} from "../types/shop-auth.types.js";
import { shopCheckoutService } from "./shop-checkout.service.js";

const dummyPasswordHash = hashPassword(randomUUID());

const INVALID_CREDENTIALS = () => new AppError(401, "Email or password is incorrect.", "INVALID_CREDENTIALS");
const INVALID_REFRESH = () => new AppError(401, "Your session has expired. Please log in again.", "INVALID_TOKEN");
const INVALID_RESET = () => new AppError(400, "This reset link is invalid or has expired.", "INVALID_RESET_TOKEN");

function toPublicCustomer(customer: ShopCustomer): ShopCustomerView {
  return {
    id: customer.id,
    websiteId: customer.websiteId,
    email: customer.email,
    fullName: customer.fullName,
    phone: customer.phone,
    emailVerified: customer.emailVerifiedAt !== null,
    createdAt: customer.createdAt.toISOString(),
  };
}

function assertCodeAccepted(result: VerifyCodeResult): void {
  if (result === "expired") throw new AppError(400, "The code has expired. Request a new one.", "CODE_EXPIRED");
  if (result === "too_many_attempts") {
    throw new AppError(429, "Too many incorrect attempts. Request a new code.", "CODE_ATTEMPTS_EXCEEDED");
  }
  if (result === "invalid") throw new AppError(400, "The code is incorrect.", "INVALID_CODE");
}

function lockedError(lockedUntil: Date) {
  return new AppError(429, "Too many failed attempts. Try again in 15 minutes.", "LOGIN_LOCKED", {
    lockedUntil: lockedUntil.toISOString(),
  });
}

function lockoutKey(websiteId: string, customerId: string | null, email: string): string {
  return customerId ? `shop:${websiteId}:user:${customerId}` : `shop:${websiteId}:email:${email}`;
}

function siteUrl(subdomain: string, customDomain: string | null): string {
  if (customDomain) return `https://${customDomain}`;
  return `${env.API_PUBLIC_URL}/live/${subdomain}`;
}

type OpenShop = {
  id: string;
  clientId: string;
  subdomain: string;
  name: string;
  customDomain: string | null;
};

export class ShopAuthService {
  private async openShop(websiteId: string): Promise<OpenShop> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        clientId: true,
        subdomain: true,
        name: true,
        shopEnabled: true,
        client: { select: { shopFeatureEnabled: true } },
        domains: {
          where: { status: DomainStatus.ACTIVE },
          orderBy: { isPrimary: "desc" },
          select: { hostname: true },
          take: 1,
        },
      },
    });
    if (!website?.shopEnabled || !website.client.shopFeatureEnabled) {
      throw new AppError(404, "Shop is not available on this website.", "SHOP_DISABLED");
    }
    return {
      id: website.id,
      clientId: website.clientId,
      subdomain: website.subdomain,
      name: website.name,
      customDomain: website.domains[0]?.hostname ?? null,
    };
  }

  async signup(websiteId: string, input: ShopSignupInput): Promise<ShopVerificationDispatch> {
    const website = await this.openShop(websiteId);
    const email = input.email.toLowerCase();
    const existing = await prisma.shopCustomer.findUnique({
      where: { websiteId_email: { websiteId, email } },
      select: { id: true },
    });
    if (existing) throw new AppError(409, "An account with this email already exists.", "EMAIL_TAKEN");

    let customer: ShopCustomer;
    try {
      customer = await prisma.shopCustomer.create({
        data: {
          websiteId,
          clientId: website.clientId,
          email,
          passwordHash: await hashPassword(input.password),
          fullName: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          status: UserStatus.PENDING_VERIFICATION,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "An account with this email already exists.", "EMAIL_TAKEN");
      }
      throw error;
    }

    logger.info({ websiteId, customerId: customer.id }, "Shop customer signed up");
    return this.dispatchVerificationCode(customer);
  }

  async resendVerification(websiteId: string, rawEmail: string): Promise<ShopVerificationDispatch> {
    await this.openShop(websiteId);
    const email = rawEmail.toLowerCase();
    const customer = await prisma.shopCustomer.findUnique({
      where: { websiteId_email: { websiteId, email } },
    });
    if (!customer || customer.status !== UserStatus.PENDING_VERIFICATION) {
      return { email, emailSent: true, resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS };
    }
    const cooldown = await getResendCooldownSeconds(customer.id, "shop-signup");
    if (cooldown > 0) {
      throw new AppError(429, `Please wait ${cooldown}s before requesting another code.`, "RESEND_COOLDOWN", {
        retryAfterSeconds: cooldown,
      });
    }
    return this.dispatchVerificationCode(customer);
  }

  async verifyEmail(websiteId: string, rawEmail: string, code: string): Promise<ShopAuthResult> {
    await this.openShop(websiteId);
    const email = rawEmail.toLowerCase();
    const customer = await prisma.shopCustomer.findUnique({
      where: { websiteId_email: { websiteId, email } },
    });
    if (!customer) throw new AppError(400, "The code is incorrect.", "INVALID_CODE");
    if (customer.status !== UserStatus.PENDING_VERIFICATION) {
      throw new AppError(409, "This email is already verified. Please log in.", "ALREADY_VERIFIED");
    }
    assertCodeAccepted(await checkVerificationCode(customer.id, code, "shop-signup"));
    const verified = await prisma.shopCustomer.update({
      where: { id: customer.id },
      data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date(), lastSignedInAt: new Date() },
    });
    logger.info({ websiteId, customerId: customer.id }, "Shop customer email verified");
    return this.createSession(verified, true);
  }

  async login(websiteId: string, input: ShopLoginInput): Promise<ShopAuthResult> {
    await this.openShop(websiteId);
    const email = input.email.trim().toLowerCase();
    const customer = await prisma.shopCustomer.findUnique({
      where: { websiteId_email: { websiteId, email } },
    });
    const lockKey = lockoutKey(websiteId, customer?.id ?? null, email);
    const lock = await getLoginLockStatus(lockKey);
    if (lock.locked) throw lockedError(lock.lockedUntil);

    const passwordOk = await verifyPassword(input.password, customer?.passwordHash ?? (await dummyPasswordHash));
    if (!customer || !passwordOk) {
      const afterFail = await recordFailedLoginAttempt(lockKey);
      if (afterFail.locked) throw lockedError(afterFail.lockedUntil);
      throw INVALID_CREDENTIALS();
    }
    if (customer.status === UserStatus.SUSPENDED) {
      throw new AppError(403, "Your account is suspended. Contact the store.", "ACCOUNT_SUSPENDED");
    }
    if (customer.status === UserStatus.PENDING_VERIFICATION) {
      throw new AppError(403, "Please verify your email first.", "EMAIL_NOT_VERIFIED", { email: customer.email });
    }

    await clearLoginLockout(lockKey);
    const updated = await prisma.shopCustomer.update({
      where: { id: customer.id },
      data: { lastSignedInAt: new Date() },
    });
    return this.createSession(updated, Boolean(input.remember));
  }

  async refresh(websiteId: string, rawRefreshToken: string): Promise<ShopAuthResult> {
    let payload;
    try {
      payload = verifyShopRefreshToken(rawRefreshToken);
    } catch {
      throw INVALID_REFRESH();
    }
    if (payload.websiteId !== websiteId) throw INVALID_REFRESH();

    const stored = await prisma.shopCustomerRefreshToken.findUnique({ where: { id: payload.tokenId } });
    if (!stored || stored.tokenHash !== sha256(rawRefreshToken) || stored.customerId !== payload.sub) {
      throw INVALID_REFRESH();
    }
    if (stored.revokedAt) {
      await this.revokeAllSessions(stored.customerId);
      throw INVALID_REFRESH();
    }
    if (stored.expiresAt < new Date()) throw INVALID_REFRESH();

    const customer = await prisma.shopCustomer.findUnique({ where: { id: stored.customerId } });
    if (!customer || customer.websiteId !== websiteId || customer.status !== UserStatus.ACTIVE) {
      await this.revokeAllSessions(stored.customerId);
      throw new AppError(403, "Your account is not active.", "ACCOUNT_INACTIVE");
    }

    await prisma.shopCustomerRefreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return this.createSession(customer, payload.remember);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    try {
      const payload = verifyShopRefreshToken(rawRefreshToken);
      await prisma.shopCustomerRefreshToken.updateMany({
        where: { id: payload.tokenId, tokenHash: sha256(rawRefreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // nothing to revoke
    }
  }

  async me(websiteId: string, customerId: string): Promise<ShopCustomerView> {
    const customer = await prisma.shopCustomer.findFirst({
      where: { id: customerId, websiteId, status: UserStatus.ACTIVE },
    });
    if (!customer) throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    return toPublicCustomer(customer);
  }

  async account(websiteId: string, customerId: string): Promise<ShopCustomerAccountView> {
    const customer = await this.me(websiteId, customerId);
    return {
      customer,
      orders: await shopCheckoutService.listCustomerOrders(websiteId, customerId),
      cartItems: await this.listCart(websiteId, customerId),
    };
  }

  async listCart(websiteId: string, customerId: string): Promise<ShopCartItemSummary[]> {
    await this.me(websiteId, customerId);
    const rows = await prisma.shopCartItem.findMany({
      where: { websiteId, customerId },
      orderBy: { updatedAt: "desc" },
      include: {
        product: { select: { id: true, name: true, images: true } },
        variant: { select: { id: true, name: true, pricePaise: true, quantity: true, images: true } },
      },
    });
    return rows.map((row) => toCartItemSummary(row));
  }

  /** Adds a variant to the shopper's cart, or bumps quantity when that line already exists. */
  async addToCart(websiteId: string, customerId: string, input: ShopAddToCartInput): Promise<ShopCartItemSummary[]> {
    const customer = await prisma.shopCustomer.findFirst({
      where: { id: customerId, websiteId, status: UserStatus.ACTIVE },
      select: { id: true, clientId: true },
    });
    if (!customer) throw new AppError(401, "Authentication required", "UNAUTHORIZED");

    const quantity = Math.max(1, Math.min(99, Math.floor(input.quantity ?? 1)));
    const variant = await prisma.productVariant.findFirst({
      where: { id: input.variantId, product: { websiteId } },
      select: {
        id: true,
        name: true,
        pricePaise: true,
        quantity: true,
        productId: true,
        product: { select: { id: true, name: true } },
      },
    });
    if (!variant) throw new AppError(404, "That product is no longer available.", "VARIANT_NOT_FOUND");
    if (variant.quantity <= 0) throw new AppError(400, "This item is out of stock.", "OUT_OF_STOCK");

    const existing = await prisma.shopCartItem.findUnique({
      where: { customerId_variantId: { customerId: customer.id, variantId: variant.id } },
      select: { id: true, quantity: true },
    });
    const nextQty = Math.min(99, (existing?.quantity ?? 0) + quantity);
    if (nextQty > variant.quantity) {
      throw new AppError(400, `Only ${variant.quantity} left in stock.`, "INSUFFICIENT_STOCK");
    }

    if (existing) {
      await prisma.shopCartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
    } else {
      await prisma.shopCartItem.create({
        data: {
          websiteId,
          clientId: customer.clientId,
          customerId: customer.id,
          productId: variant.productId,
          variantId: variant.id,
          quantity,
        },
      });
    }
    return this.listCart(websiteId, customerId);
  }

  async updateCartItem(websiteId: string, customerId: string, itemId: string, quantity: number): Promise<ShopCartItemSummary[]> {
    await this.me(websiteId, customerId);
    const qty = Math.max(1, Math.min(99, Math.floor(quantity)));
    const item = await prisma.shopCartItem.findFirst({
      where: { id: itemId, websiteId, customerId },
      include: { variant: { select: { quantity: true } } },
    });
    if (!item) throw new AppError(404, "That cart item was not found.", "CART_ITEM_NOT_FOUND");
    if (qty > item.variant.quantity) {
      throw new AppError(400, `Only ${item.variant.quantity} left in stock.`, "INSUFFICIENT_STOCK");
    }
    await prisma.shopCartItem.update({ where: { id: item.id }, data: { quantity: qty } });
    return this.listCart(websiteId, customerId);
  }

  async removeCartItem(websiteId: string, customerId: string, itemId: string): Promise<ShopCartItemSummary[]> {
    await this.me(websiteId, customerId);
    const item = await prisma.shopCartItem.findFirst({
      where: { id: itemId, websiteId, customerId },
      select: { id: true },
    });
    if (!item) throw new AppError(404, "That cart item was not found.", "CART_ITEM_NOT_FOUND");
    await prisma.shopCartItem.delete({ where: { id: item.id } });
    return this.listCart(websiteId, customerId);
  }

  async updateProfile(websiteId: string, customerId: string, input: ShopProfileUpdateInput): Promise<ShopCustomerView> {
    const existing = await prisma.shopCustomer.findFirst({
      where: { id: customerId, websiteId, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    if (!existing) throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    const fullName = input.fullName?.trim();
    const phone = input.phone?.trim();
    const updated = await prisma.shopCustomer.update({
      where: { id: existing.id },
      data: {
        ...(fullName ? { fullName } : {}),
        ...(input.phone !== undefined ? { phone: phone || null } : {}),
      },
    });
    return toPublicCustomer(updated);
  }

  /** A signed-in shopper picks a new password after proving the current one. Other sessions are signed out. */
  async changePassword(websiteId: string, customerId: string, currentPassword: string, newPassword: string): Promise<void> {
    const customer = await prisma.shopCustomer.findFirst({
      where: { id: customerId, websiteId, status: UserStatus.ACTIVE },
      select: { id: true, passwordHash: true },
    });
    if (!customer) throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    if (!(await verifyPassword(currentPassword, customer.passwordHash))) {
      throw new AppError(400, "Your current password is incorrect.", "INVALID_CREDENTIALS");
    }
    const passwordHash = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.shopCustomer.update({ where: { id: customer.id }, data: { passwordHash } }),
      prisma.shopCustomerRefreshToken.updateMany({ where: { customerId: customer.id, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
  }

  async requestPasswordReset(websiteId: string, rawEmail: string): Promise<void> {
    const website = await this.openShop(websiteId);
    const email = rawEmail.toLowerCase();
    const customer = await prisma.shopCustomer.findUnique({
      where: { websiteId_email: { websiteId, email } },
    });
    if (!customer || (customer.status !== UserStatus.ACTIVE && customer.status !== UserStatus.PENDING_VERIFICATION)) {
      return;
    }

    const token = await createShopPasswordResetToken(customer.id);
    const base = siteUrl(website.subdomain, website.customDomain);
    const resetLink = `${base}/login?reset=${encodeURIComponent(token)}`;
    try {
      await emailService.sendPasswordReset({
        to: email,
        fullName: customer.fullName,
        resetLink,
        expiresInMinutes: Math.round(SHOP_RESET_TOKEN_TTL_SECONDS / 60),
      });
    } catch (error) {
      logger.error({ err: error, websiteId, customerId: customer.id }, "Shop password reset email failed");
      if (!isProduction) {
        logger.warn({ resetLink }, "Shop password reset link (development fallback)");
      }
    }
  }

  async resetPassword(websiteId: string, token: string, newPassword: string): Promise<ShopAuthResult> {
    await this.openShop(websiteId);
    const customerId = await consumeShopPasswordResetToken(token);
    if (!customerId) throw INVALID_RESET();

    const existing = await prisma.shopCustomer.findFirst({ where: { id: customerId, websiteId } });
    if (!existing || existing.status === UserStatus.SUSPENDED) throw INVALID_RESET();

    const customer = await prisma.shopCustomer.update({
      where: { id: existing.id },
      data: {
        passwordHash: await hashPassword(newPassword),
        status: UserStatus.ACTIVE,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        lastSignedInAt: new Date(),
      },
    });
    await this.revokeAllSessions(customer.id);
    await clearLoginLockout(lockoutKey(websiteId, customer.id, customer.email));
    logger.info({ websiteId, customerId: customer.id }, "Shop customer password reset");
    return this.createSession(customer, false);
  }

  private async dispatchVerificationCode(customer: ShopCustomer): Promise<ShopVerificationDispatch> {
    const code = generateVerificationCode();
    await storeVerificationCode(customer.id, code, "shop-signup");
    try {
      await emailService.sendVerificationCode({
        to: customer.email,
        fullName: customer.fullName,
        code,
        expiresInMinutes: Math.round(VERIFICATION_CODE_TTL_SECONDS / 60),
      });
    } catch (error) {
      logger.error({ err: error, customerId: customer.id }, "Shop verification email failed");
      if (!isProduction) {
        logger.info({ code, email: customer.email }, "Shop verification code (dev fallback)");
      }
    }
    return {
      email: customer.email,
      emailSent: true,
      resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
    };
  }

  private async createSession(customer: ShopCustomer, remember: boolean): Promise<ShopAuthResult> {
    const tokens = await this.issueTokens(customer, remember);
    return { customer: toPublicCustomer(customer), tokens, remember };
  }

  private async issueTokens(customer: ShopCustomer, remember: boolean): Promise<AuthTokens> {
    const tokenId = randomUUID();
    const refreshToken = signShopRefreshToken({
      sub: customer.id,
      websiteId: customer.websiteId,
      tokenId,
      remember,
    });
    const accessToken = signShopAccessToken({
      sub: customer.id,
      websiteId: customer.websiteId,
      email: customer.email,
    });
    await prisma.shopCustomerRefreshToken.create({
      data: {
        id: tokenId,
        customerId: customer.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN)),
      },
    });
    return { accessToken, refreshToken };
  }

  private async revokeAllSessions(customerId: string): Promise<void> {
    await prisma.shopCustomerRefreshToken.updateMany({
      where: { customerId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

type CartRow = {
  id: string;
  quantity: number;
  productId: string;
  product: { id: string; name: string; images: Prisma.JsonValue };
  variant: { id: string; name: string; pricePaise: number; quantity: number; images: Prisma.JsonValue };
};

function firstImageUrl(images: Prisma.JsonValue): string | undefined {
  if (!Array.isArray(images) || images.length === 0) return undefined;
  const first = images[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return undefined;
  const mediaId = (first as { mediaId?: unknown }).mediaId;
  return typeof mediaId === "string" && mediaId ? mediaUrl(mediaId) : undefined;
}

function toCartItemSummary(row: CartRow): ShopCartItemSummary {
  return {
    id: row.id,
    productId: row.productId,
    variantId: row.variant.id,
    productName: row.product.name,
    variantName: row.variant.name,
    quantity: row.quantity,
    pricePaise: row.variant.pricePaise,
    imageUrl: firstImageUrl(row.variant.images) ?? firstImageUrl(row.product.images),
  };
}

export const shopAuthService = new ShopAuthService();
