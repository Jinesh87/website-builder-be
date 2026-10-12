import { AppError } from "../../../common/errors/AppError.js";
import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { prisma } from "../../../config/prisma.js";
import type { PaymentConfig } from "../../../generated/prisma/client.js";
import { checkRazorpayKeys, type RazorpayKeys } from "./razorpay.client.js";

const CONFIG_ID = "default";

export type PaymentConfigView = {
  /** Key id and secret are both set, so clients can top up. */
  configured: boolean;
  mode: "test" | "live" | null;
  razorpayKeyId: string | null;
  /** Masked, e.g. "••••••••3f9a". Secrets are never returned. */
  razorpayKeySecretMasked: string | null;
  webhookConfigured: boolean;
  updatedAt: string | null;
};

export type UpdatePaymentConfigInput = {
  razorpayKeyId: string;
  /** Omit or leave empty to keep the stored secret. */
  razorpayKeySecret?: string;
  razorpayWebhookSecret?: string;
};

function mask(secret: string): string {
  return `••••••••${secret.slice(-4)}`;
}

function modeOf(keyId: string | null | undefined): PaymentConfigView["mode"] {
  if (!keyId) return null;
  return keyId.startsWith("rzp_live_") ? "live" : "test";
}

function secrets(config: PaymentConfig | null) {
  return {
    keySecret: config?.razorpayKeySecretCipher ? decryptSecret(config.razorpayKeySecretCipher) : null,
    webhookSecret: config?.razorpayWebhookSecretCipher ? decryptSecret(config.razorpayWebhookSecretCipher) : null,
  };
}

function toView(config: PaymentConfig | null): PaymentConfigView {
  const { keySecret, webhookSecret } = secrets(config);
  return {
    configured: Boolean(config?.razorpayKeyId && keySecret),
    mode: modeOf(config?.razorpayKeyId),
    razorpayKeyId: config?.razorpayKeyId ?? null,
    razorpayKeySecretMasked: keySecret ? mask(keySecret) : null,
    webhookConfigured: Boolean(webhookSecret),
    updatedAt: config?.updatedAt.toISOString() ?? null,
  };
}

export class PaymentSettingsService {
  private load(): Promise<PaymentConfig | null> {
    return prisma.paymentConfig.findUnique({ where: { id: CONFIG_ID } });
  }

  async getConfigView(): Promise<PaymentConfigView> {
    return toView(await this.load());
  }

  async updateConfig(input: UpdatePaymentConfigInput): Promise<PaymentConfigView> {
    const existing = await this.load();
    const keyId = input.razorpayKeyId.trim();
    const newSecret = input.razorpayKeySecret?.trim();
    const newWebhookSecret = input.razorpayWebhookSecret?.trim();
    const keySecret = newSecret || secrets(existing).keySecret;
    if (!keySecret) {
      throw new AppError(400, "Enter the Razorpay key secret.", "VALIDATION_ERROR", [
        { message: "Key secret is required", path: ["razorpayKeySecret"] },
      ]);
    }
    if (keyId !== existing?.razorpayKeyId || newSecret) {
      await checkRazorpayKeys({ keyId, keySecret });
    }

    const data = {
      razorpayKeyId: keyId,
      ...(newSecret ? { razorpayKeySecretCipher: encryptSecret(newSecret) } : {}),
      ...(newWebhookSecret ? { razorpayWebhookSecretCipher: encryptSecret(newWebhookSecret) } : {}),
    };
    const config = await prisma.paymentConfig.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ...data },
      update: data,
    });
    return toView(config);
  }

  /** Throws when payments aren't set up, so callers can tell the user. */
  async getKeys(): Promise<RazorpayKeys> {
    const config = await this.load();
    const { keySecret } = secrets(config);
    if (!config?.razorpayKeyId || !keySecret) {
      throw new AppError(503, "Online payments aren't available yet. Please contact support.", "PAYMENTS_NOT_CONFIGURED");
    }
    return { keyId: config.razorpayKeyId, keySecret };
  }

  async getWebhookSecret(): Promise<string | null> {
    return secrets(await this.load()).webhookSecret;
  }

  async isConfigured(): Promise<boolean> {
    return toView(await this.load()).configured;
  }
}

export const paymentSettingsService = new PaymentSettingsService();
