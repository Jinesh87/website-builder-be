import { AppError } from "../../../common/errors/AppError.js";
import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { env } from "../../../config/env.js";
import { prisma } from "../../../config/prisma.js";
import type { RazorpayPartnerApp } from "../../../generated/prisma/client.js";
import type { RazorpayOAuthMode, RazorpayPartnerCredentials } from "./razorpay-oauth.client.js";

const CONFIG_ID = "default";
const MODES: RazorpayOAuthMode[] = ["test", "live"];

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

/** One client's saved values (the development client for Test, the production client for Live). */
export type RazorpayPartnerClientView = {
  configured: boolean;
  clientId: string | null;
  clientSecretMasked: string | null;
  webhookConfigured: boolean;
};

export type RazorpayPartnerView = {
  /** The client for the platform's current mode is saved, so shops can connect. */
  configured: boolean;
  /** The platform's current mode. */
  mode: RazorpayOAuthMode;
  test: RazorpayPartnerClientView;
  live: RazorpayPartnerClientView;
  redirectUri: string;
  webhookUrl: string;
  webhookEvents: string[];
  updatedAt: string | null;
};

/** Saves the given mode's client and switches the whole platform to that mode. */
export type UpdateRazorpayPartnerInput = {
  mode: RazorpayOAuthMode;
  clientId: string;
  /** Omit or leave empty to keep the stored secret. */
  clientSecret?: string;
  webhookSecret?: string;
};

type ClientSlot = { clientId: string | null; clientSecret: string | null; webhookSecret: string | null };

function slot(config: RazorpayPartnerApp | null, mode: RazorpayOAuthMode): ClientSlot {
  const [id, secret, webhook] =
    mode === "test"
      ? [config?.testClientId, config?.testClientSecretCipher, config?.testWebhookSecretCipher]
      : [config?.liveClientId, config?.liveClientSecretCipher, config?.liveWebhookSecretCipher];
  return {
    clientId: id ?? null,
    clientSecret: secret ? decryptSecret(secret) : null,
    webhookSecret: webhook ? decryptSecret(webhook) : null,
  };
}

function toMode(value: string | null | undefined): RazorpayOAuthMode {
  return value === "test" ? "test" : "live";
}

function clientView(client: ClientSlot): RazorpayPartnerClientView {
  return {
    configured: Boolean(client.clientId && client.clientSecret),
    clientId: client.clientId,
    clientSecretMasked: client.clientSecret ? `••••••••${client.clientSecret.slice(-4)}` : null,
    webhookConfigured: Boolean(client.webhookSecret),
  };
}

function toView(config: RazorpayPartnerApp | null): RazorpayPartnerView {
  const mode = toMode(config?.mode);
  const test = clientView(slot(config, "test"));
  const live = clientView(slot(config, "live"));
  return {
    configured: (mode === "test" ? test : live).configured,
    mode,
    test,
    live,
    redirectUri: RAZORPAY_OAUTH_REDIRECT_URI,
    webhookUrl: RAZORPAY_PARTNER_WEBHOOK_URL,
    webhookEvents: [...RAZORPAY_PARTNER_WEBHOOK_EVENTS],
    updatedAt: config?.updatedAt.toISOString() ?? null,
  };
}

/**
 * The platform's Razorpay Technology Partner app, managed by the Super Admin. It keeps a Test
 * (development) and a Live (production) client; `mode` switches the whole platform between them.
 */
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
    if (!clientSecret && !slot(existing, input.mode).clientSecret) {
      throw new AppError(400, "Enter the partner app's client secret.", "VALIDATION_ERROR", [
        { message: "Client secret is required", path: ["clientSecret"] },
      ]);
    }
    const prefix = input.mode;
    const data = {
      mode: input.mode,
      [`${prefix}ClientId`]: input.clientId.trim(),
      ...(clientSecret ? { [`${prefix}ClientSecretCipher`]: encryptSecret(clientSecret) } : {}),
      ...(webhookSecret ? { [`${prefix}WebhookSecretCipher`]: encryptSecret(webhookSecret) } : {}),
    };
    const config = await prisma.razorpayPartnerApp.upsert({
      where: { id: CONFIG_ID },
      create: { id: CONFIG_ID, ...data },
      update: data,
    });
    return toView(config);
  }

  /** The platform's current mode. */
  async getMode(): Promise<RazorpayOAuthMode> {
    return toMode((await this.load())?.mode);
  }

  /**
   * The client for `mode` (default: the platform's current mode). Null when it isn't set up.
   * Pass a shop's own connection mode to refresh or revoke the tokens it was issued under.
   */
  async getCredentials(mode?: RazorpayOAuthMode): Promise<RazorpayPartnerCredentials | null> {
    const config = await this.load();
    const target = mode ?? toMode(config?.mode);
    const client = slot(config, target);
    if (!client.clientId || !client.clientSecret) return null;
    return { clientId: client.clientId, clientSecret: client.clientSecret, mode: target };
  }

  /** One mode's saved secrets in plain text, for the Super Admin's "show" button. */
  async revealSecrets(mode: RazorpayOAuthMode): Promise<{ clientSecret: string | null; webhookSecret: string | null }> {
    const { clientSecret, webhookSecret } = slot(await this.load(), mode);
    return { clientSecret, webhookSecret };
  }

  /** Both clients' webhook secrets: events for either mode's shops are still accepted after a switch. */
  async getWebhookSecrets(): Promise<string[]> {
    const config = await this.load();
    return MODES.map((mode) => slot(config, mode).webhookSecret).filter((secret): secret is string => Boolean(secret));
  }

  async isConfigured(): Promise<boolean> {
    return (await this.getCredentials()) !== null;
  }
}

export const razorpayPartnerSettingsService = new RazorpayPartnerSettingsService();
