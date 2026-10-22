import { AppError } from "../../../common/errors/AppError.js";
import { DomainStatus } from "../../../common/constants/website.js";
import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { prisma } from "../../../config/prisma.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { scopeFor } from "../../websites/services/website.service.js";
import { checkRazorpayKeys, isValidWebhookSignature } from "../../wallet/services/razorpay.client.js";

export type ShopPaymentConfigView = {
  configured: boolean;
  mode: "test" | "live" | null;
  razorpayKeyId: string | null;
  razorpayKeySecretMasked: string | null;
  webhookConfigured: boolean;
  /** Platform address to paste into the client's Razorpay webhook settings. */
  webhookUrl: string;
  /** Public site address to give Razorpay when they verify the business website. */
  siteUrl: string;
  updatedAt: string | null;
};

export type UpdateShopPaymentInput = {
  razorpayKeyId: string;
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
};

function mask(secret: string): string {
  return `••••••••${secret.slice(-4)}`;
}

function modeOf(keyId: string | null | undefined): ShopPaymentConfigView["mode"] {
  if (!keyId) return null;
  return keyId.startsWith("rzp_live_") ? "live" : "test";
}

function webhookUrl(websiteId: string): string {
  return `${env.API_PUBLIC_URL}/api/shop/razorpay/webhook/${websiteId}`;
}

function siteUrl(subdomain: string, customDomain: string | null): string {
  return `https://${customDomain ?? `${subdomain}.${env.PUBLIC_SITE_DOMAIN}`}`;
}

export class ShopPaymentService {
  private async openWebsite(websiteId: string, actor: AuthUser) {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...scopeFor(actor) },
      select: {
        id: true,
        clientId: true,
        subdomain: true,
        client: { select: { shopFeatureEnabled: true } },
        domains: { where: { status: DomainStatus.ACTIVE }, orderBy: { isPrimary: "desc" }, select: { hostname: true }, take: 1 },
        shopPayment: true,
      },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!website.client.shopFeatureEnabled) {
      throw new AppError(403, "Shop isn't available for this company yet.", "SHOP_NOT_ALLOWED");
    }
    return website;
  }

  async getConfig(websiteId: string, actor: AuthUser): Promise<ShopPaymentConfigView> {
    const website = await this.openWebsite(websiteId, actor);
    return this.toView(website);
  }

  async updateConfig(websiteId: string, input: UpdateShopPaymentInput, actor: AuthUser): Promise<ShopPaymentConfigView> {
    const website = await this.openWebsite(websiteId, actor);
    const existing = website.shopPayment;
    const keyId = input.razorpayKeyId.trim();
    const newSecret = input.razorpayKeySecret?.trim();
    const newWebhookSecret = input.razorpayWebhookSecret?.trim();
    const keySecret = newSecret || (existing?.razorpayKeySecretCipher ? decryptSecret(existing.razorpayKeySecretCipher) : null);
    if (!keySecret) {
      throw new AppError(400, "Enter the Razorpay key secret.", "VALIDATION_ERROR", [
        { message: "Key secret is required", path: ["razorpayKeySecret"] },
      ]);
    }
    if (keyId !== existing?.razorpayKeyId || newSecret) {
      try {
        await checkRazorpayKeys({ keyId, keySecret });
      } catch (error) {
        if (error instanceof AppError && error.code === "PAYMENT_GATEWAY_AUTH") {
          throw new AppError(400, "Razorpay rejected these keys. Check the key ID and secret.", "RAZORPAY_KEYS_REJECTED");
        }
        throw error;
      }
    }

    const saved = await prisma.shopPaymentConfig.upsert({
      where: { websiteId },
      create: {
        websiteId,
        clientId: website.clientId,
        razorpayKeyId: keyId,
        razorpayKeySecretCipher: encryptSecret(keySecret),
        ...(newWebhookSecret ? { razorpayWebhookSecretCipher: encryptSecret(newWebhookSecret) } : {}),
      },
      update: {
        razorpayKeyId: keyId,
        ...(newSecret ? { razorpayKeySecretCipher: encryptSecret(newSecret) } : {}),
        ...(newWebhookSecret ? { razorpayWebhookSecretCipher: encryptSecret(newWebhookSecret) } : {}),
      },
    });
    return this.toView({ ...website, shopPayment: saved });
  }

  async revealSecrets(
    websiteId: string,
    actor: AuthUser,
  ): Promise<{ razorpayKeySecret: string | null; razorpayWebhookSecret: string | null }> {
    const website = await this.openWebsite(websiteId, actor);
    logger.warn({ userId: actor.id, websiteId }, "Shop Razorpay secrets revealed");
    return {
      razorpayKeySecret: website.shopPayment?.razorpayKeySecretCipher
        ? decryptSecret(website.shopPayment.razorpayKeySecretCipher)
        : null,
      razorpayWebhookSecret: website.shopPayment?.razorpayWebhookSecretCipher
        ? decryptSecret(website.shopPayment.razorpayWebhookSecretCipher)
        : null,
    };
  }

  /** Razorpay calls this on the platform domain. A valid signature is acknowledged; checkout is not built yet. */
  async handleWebhook(websiteId: string, rawBody: Buffer, signature: string | undefined): Promise<void> {
    const config = await prisma.shopPaymentConfig.findUnique({
      where: { websiteId },
      select: { razorpayWebhookSecretCipher: true },
    });
    const secret = config?.razorpayWebhookSecretCipher ? decryptSecret(config.razorpayWebhookSecretCipher) : null;
    if (!signature || !secret || !isValidWebhookSignature(secret, rawBody, signature)) {
      throw new AppError(400, "Invalid Razorpay signature", "WEBHOOK_SIGNATURE_INVALID");
    }
    logger.info({ websiteId }, "Shop Razorpay webhook accepted");
  }

  private toView(website: {
    id: string;
    subdomain: string;
    domains: { hostname: string }[];
    shopPayment: {
      razorpayKeyId: string | null;
      razorpayKeySecretCipher: string | null;
      razorpayWebhookSecretCipher: string | null;
      updatedAt: Date;
    } | null;
  }): ShopPaymentConfigView {
    const config = website.shopPayment;
    const keySecret = config?.razorpayKeySecretCipher ? decryptSecret(config.razorpayKeySecretCipher) : null;
    const webhookSecret = config?.razorpayWebhookSecretCipher ? decryptSecret(config.razorpayWebhookSecretCipher) : null;
    return {
      configured: Boolean(config?.razorpayKeyId && keySecret),
      mode: modeOf(config?.razorpayKeyId),
      razorpayKeyId: config?.razorpayKeyId ?? null,
      razorpayKeySecretMasked: keySecret ? mask(keySecret) : null,
      webhookConfigured: Boolean(webhookSecret),
      webhookUrl: webhookUrl(website.id),
      siteUrl: siteUrl(website.subdomain, website.domains[0]?.hostname ?? null),
      updatedAt: config?.updatedAt.toISOString() ?? null,
    };
  }
}

export const shopPaymentService = new ShopPaymentService();
