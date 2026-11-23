import { AppError } from "../../../common/errors/AppError.js";
import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { env } from "../../../config/env.js";
import { prisma } from "../../../config/prisma.js";
import type { RazorpayPartnerApp } from "../../../generated/prisma/client.js";
import type { RazorpayOAuthMode, RazorpayPartnerCredentials } from "./razorpay-oauth.client.js";

const CONFIG_ID = "default";

/** Register this on the partner app as the OAuth redirect URL. */
export const RAZORPAY_OAUTH_REDIRECT_URI =
  env.RAZORPAY_OAUTH_REDIRECT_URI || `${env.API_PUBLIC_URL}/api/shop/razorpay/oauth/callback`;

/** Set this as the partner app's webhook URL. */
export const RAZORPAY_PARTNER_WEBHOOK_URL = `${env.API_PUBLIC_URL}/api/shop/razorpay/partner-webhook`;

/** Events the partner app's webhook should subscribe to. */
export const RAZORPAY_PARTNER_WEBHOOK_EVENTS = [
  "payment.captured",
  "order.paid",
  "payment.failed",
  "refund.created",
  "refund.processed",
  "refund.failed",
  "account.app.authorization_revoked",
] as const;

export type RazorpayPartnerView = {
  /** Client ID and secret are saved, so shops can connect. */
  configured: boolean;
  mode: RazorpayOAuthMode;
  clientId: string | null;
  clientSecretMasked: string | null;
  webhookConfigured: boolean;
  redirectUri: string;
  webhookUrl: string;
  webhookEvents: string[];
  updatedAt: string | null;
};

export type UpdateRazorpayPartnerInput = {
  clientId: string;
  /** Omit or leave empty to keep the stored secret. */
  clientSecret?: string;
  webhookSecret?: string;
  mode: RazorpayOAuthMode;
};

function secrets(config: RazorpayPartnerApp | null) {
  return {
    clientSecret: config?.clientSecretCipher ? decryptSecret(config.clientSecretCipher) : null,
    webhookSecret: config?.webhookSecretCipher ? decryptSecret(config.webhookSecretCipher) : null,
  };
}

function toMode(value: string | null | undefined): RazorpayOAuthMode {
  return value === "test" ? "test" : "live";
}

function toView(config: RazorpayPartnerApp | null): RazorpayPartnerView {
  const { clientSecret, webhookSecret } = secrets(config);
  return {
    configured: Boolean(config?.clientId && clientSecret),
    mode: toMode(config?.mode),
    clientId: config?.clientId ?? null,
    clientSecretMasked: clientSecret ? `••••••••${clientSecret.slice(-4)}` : null,
    webhookConfigured: Boolean(webhookSecret),
    redirectUri: RAZORPAY_OAUTH_REDIRECT_URI,
    webhookUrl: RAZORPAY_PARTNER_WEBHOOK_URL,
    webhookEvents: [...RAZORPAY_PARTNER_WEBHOOK_EVENTS],
    updatedAt: config?.updatedAt.toISOString() ?? null,
  };
}

/** The platform's Razorpay Technology Partner app, managed by the Super Admin. */
export class RazorpayPartnerSettingsService {
  private load(): Promise<RazorpayPartnerApp | null> {
    return prisma.razorpayPartnerApp.findUnique({ where: { id: CONFIG_ID } });
  }

  async getView(): Promise<RazorpayPartnerView> {
    return toView(await this.load());
  }

  async update(input: UpdateRazorpayPartnerInput): Promise<RazorpayPartnerView> {
    const existing = await this.load();
    const clientSecret = input.clientSecret?.trim();
    const webhookSecret = input.webhookSecret?.trim();
    if (!clientSecret && !secrets(existing).clientSecret) {
      throw new AppError(400, "Enter the partner app's client secret.", "VALIDATION_ERROR", [
        { message: "Client secret is required", path: ["clientSecret"] },
      ]);
    }
    const data = {
      clientId: input.clientId.trim(),
      mode: input.mode,
      ...(clientSecret ? { clientSecretCipher: encryptSecret(clientSecret) } : {}),
      ...(webhookSecret ? { webhookSecretCipher: encryptSecret(webhookSecret) } : {}),
    };
    const config = await prisma.razorpayPartnerApp.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ...data },
      update: data,
    });
    return toView(config);
  }

  /** Null when the partner app isn't set up, so shops can't use "Connect with Razorpay" yet. */
  async getCredentials(): Promise<RazorpayPartnerCredentials | null> {
    const config = await this.load();
    const { clientSecret } = secrets(config);
    if (!config?.clientId || !clientSecret) return null;
    return { clientId: config.clientId, clientSecret, mode: toMode(config.mode) };
  }

  /** The saved secrets in plain text, for the Super Admin's "show" button. */
  async revealSecrets(): Promise<{ clientSecret: string | null; webhookSecret: string | null }> {
    return secrets(await this.load());
  }

  async getWebhookSecret(): Promise<string | null> {
    return secrets(await this.load()).webhookSecret;
  }

  async isConfigured(): Promise<boolean> {
    return (await this.getCredentials()) !== null;
  }
}

export const razorpayPartnerSettingsService = new RazorpayPartnerSettingsService();
