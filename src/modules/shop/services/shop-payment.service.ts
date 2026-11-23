import { AppError } from "../../../common/errors/AppError.js";
import { DomainStatus } from "../../../common/constants/website.js";
import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { prisma } from "../../../config/prisma.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { scopeFor } from "../../websites/services/website.service.js";
import { checkRazorpayKeys, isValidWebhookSignature } from "../../wallet/services/razorpay.client.js";
import { razorpayPartnerSettingsService } from "../../wallet/services/razorpay-partner-settings.service.js";
import type { RazorpayWebhookEvent } from "../../wallet/services/wallet.service.js";
import { logWebhookEvent, recordPaymentLog } from "../utils/shop-payment-log.js";
import { shopCheckoutService } from "./shop-checkout.service.js";

export type ShopRazorpayConnectionView = {
  accountId: string | null;
  mode: "test" | "live";
  connectedAt: string | null;
};

export type ShopPaymentConfigView = {
  /** The shop can take payments: connected through Razorpay, or its own API keys are saved. */
  configured: boolean;
  /** The platform's Razorpay partner app is set up, so "Connect with Razorpay" can be offered. */
  connectAvailable: boolean;
  /** Set while connected through Razorpay; this account is used instead of the API keys below. */
  connection: ShopRazorpayConnectionView | null;
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
  if (customDomain) return `https://${customDomain}`;
  return `${env.API_PUBLIC_URL}/live/${subdomain}`;
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
    return this.toView(website, await razorpayPartnerSettingsService.isConfigured());
  }

  async updateConfig(websiteId: string, input: UpdateShopPaymentInput, actor: AuthUser): Promise<ShopPaymentConfigView> {
    const website = await this.openWebsite(websiteId, actor);
    const existing = website.shopPayment;
    if (existing?.oauthAccessTokenCipher) {
      throw new AppError(
        409,
        "This shop is connected with Razorpay. Disconnect it first to use API keys instead.",
        "RAZORPAY_CONNECTED",
      );
    }
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
    return this.toView({ ...website, shopPayment: saved }, await razorpayPartnerSettingsService.isConfigured());
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

  /** Razorpay calls this on the platform domain. Marks matching shop orders paid (or failed). */
  async handleWebhook(websiteId: string, rawBody: Buffer, signature: string | undefined): Promise<void> {
    const config = await prisma.shopPaymentConfig.findUnique({
      where: { websiteId },
      select: { razorpayWebhookSecretCipher: true, oauthAccessTokenCipher: true },
    });
    const secret = config?.razorpayWebhookSecretCipher ? decryptSecret(config.razorpayWebhookSecretCipher) : null;
    // A shop that switched to "Connect with Razorpay" may still have its old webhook on Razorpay. Its events now
    // arrive on the partner webhook, so acknowledge (without trusting or applying) to stop Razorpay retrying.
    if (!secret && config?.oauthAccessTokenCipher) {
      logger.info({ websiteId }, "Old shop webhook ignored: the shop is connected through the partner app");
      return;
    }
    if (!signature || !secret || !isValidWebhookSignature(secret, rawBody, signature)) {
      await recordPaymentLog({
        websiteId,
        kind: "webhook",
        success: false,
        message: secret
          ? "Webhook rejected: the signature didn't match. Check the webhook secret in Razorpay settings."
          : "Webhook rejected: no webhook secret is saved for this shop.",
      });
      throw new AppError(400, "Invalid Razorpay signature", "WEBHOOK_SIGNATURE_INVALID");
    }
    let event: RazorpayWebhookEvent;
    try {
      event = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookEvent;
    } catch {
      throw new AppError(400, "Invalid Razorpay webhook body", "WEBHOOK_BODY_INVALID");
    }
    const handled = await shopCheckoutService.applyWebhook(websiteId, event);
    await logWebhookEvent(websiteId, event, handled);
    logger.info({ websiteId, event: event.event, handled }, "Shop Razorpay webhook accepted");
  }

  private toView(website: {
    id: string;
    subdomain: string;
    domains: { hostname: string }[];
    shopPayment: {
      razorpayKeyId: string | null;
      razorpayKeySecretCipher: string | null;
      razorpayWebhookSecretCipher: string | null;
      razorpayAccountId: string | null;
      oauthAccessTokenCipher: string | null;
      oauthMode: string | null;
      oauthConnectedAt: Date | null;
      updatedAt: Date;
    } | null;
  }, connectAvailable: boolean): ShopPaymentConfigView {
    const config = website.shopPayment;
    const keySecret = config?.razorpayKeySecretCipher ? decryptSecret(config.razorpayKeySecretCipher) : null;
    const webhookSecret = config?.razorpayWebhookSecretCipher ? decryptSecret(config.razorpayWebhookSecretCipher) : null;
    const connection: ShopRazorpayConnectionView | null = config?.oauthAccessTokenCipher
      ? {
          accountId: config.razorpayAccountId,
          mode: config.oauthMode === "test" ? "test" : "live",
          connectedAt: config.oauthConnectedAt?.toISOString() ?? null,
        }
      : null;
    return {
      configured: Boolean(connection || (config?.razorpayKeyId && keySecret)),
      connectAvailable,
      connection,
      mode: connection?.mode ?? modeOf(config?.razorpayKeyId),
      razorpayKeyId: config?.razorpayKeyId ?? null,
      razorpayKeySecretMasked: keySecret ? mask(keySecret) : null,
      // A connected account's events arrive on the platform's partner webhook.
      webhookConfigured: Boolean(connection || webhookSecret),
      webhookUrl: webhookUrl(website.id),
      siteUrl: siteUrl(website.subdomain, website.domains[0]?.hostname ?? null),
      updatedAt: config?.updatedAt.toISOString() ?? null,
    };
  }
}

export const shopPaymentService = new ShopPaymentService();
