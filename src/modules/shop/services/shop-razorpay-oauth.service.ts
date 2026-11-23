import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { scopeFor } from "../../websites/services/website.service.js";
import {
  exchangeRazorpayCode,
  razorpayAuthorizeUrl,
  revokeRazorpayToken,
} from "../../wallet/services/razorpay-oauth.client.js";
import {
  RAZORPAY_OAUTH_REDIRECT_URI,
  razorpayPartnerSettingsService,
} from "../../wallet/services/razorpay-partner-settings.service.js";
import { CLEARED_OAUTH } from "./shop-razorpay-auth.js";

/** How long the shop owner has to finish on Razorpay's page. */
const STATE_TTL_MS = 30 * 60 * 1000;

/** Encrypted into the OAuth `state`, so the callback knows which shop it is for and can't be forged. */
type ConnectState = { websiteId: string; userId: string; returnTo: string; expiresAt: number };

export type RazorpayCallbackQuery = { code?: string; state?: string; error?: string; error_description?: string };

function defaultReturnTo(websiteId: string): string {
  return `/websites/${websiteId}?tab=shop&section=razorpay`;
}

/** Only paths on the app itself, never another site. */
function safeReturnTo(value: string | undefined, websiteId: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return defaultReturnTo(websiteId);
  return value.slice(0, 500);
}

function withResult(returnTo: string, result: "connected" | "error", message?: string): string {
  const url = new URL(returnTo, env.FRONTEND_URL);
  url.searchParams.set("razorpay", result);
  if (message) url.searchParams.set("razorpayMessage", message.slice(0, 200));
  return url.toString();
}

function readState(raw: string | undefined): ConnectState | null {
  const json = raw ? decryptSecret(raw) : null;
  if (!json) return null;
  try {
    const state = JSON.parse(json) as ConnectState;
    return state.expiresAt > Date.now() && state.websiteId ? state : null;
  } catch {
    return null;
  }
}

export class ShopRazorpayOAuthService {
  private async openShop(websiteId: string, actor: AuthUser) {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...scopeFor(actor) },
      select: { id: true, clientId: true, client: { select: { shopFeatureEnabled: true } } },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!website.client.shopFeatureEnabled) throw new AppError(403, "Shop isn't available for this company yet.", "SHOP_NOT_ALLOWED");
    return website;
  }

  /** The Razorpay page to send the shop owner to. They can log in, or create a Razorpay account there. */
  async startConnect(websiteId: string, actor: AuthUser, returnTo?: string): Promise<{ url: string }> {
    await this.openShop(websiteId, actor);
    const credentials = await razorpayPartnerSettingsService.getCredentials();
    if (!credentials) {
      throw new AppError(400, "Connecting with Razorpay isn't available yet. Add your API keys instead.", "RAZORPAY_CONNECT_UNAVAILABLE");
    }
    const state: ConnectState = {
      websiteId,
      userId: actor.id,
      returnTo: safeReturnTo(returnTo, websiteId),
      expiresAt: Date.now() + STATE_TTL_MS,
    };
    return { url: razorpayAuthorizeUrl(credentials, RAZORPAY_OAUTH_REDIRECT_URI, encryptSecret(JSON.stringify(state))) };
  }

  /** Razorpay sends the browser here after the owner approves (or declines). Returns where to send them next. */
  async handleCallback(query: RazorpayCallbackQuery): Promise<string> {
    const state = readState(query.state);
    if (!state) {
      return withResult("/websites", "error", "The Razorpay connection link expired. Please try again.");
    }
    if (query.error || !query.code) {
      const message = query.error === "access_denied" ? "You cancelled the Razorpay connection." : query.error_description || "Razorpay didn't connect.";
      return withResult(state.returnTo, "error", message);
    }

    const website = await prisma.website.findUnique({ where: { id: state.websiteId }, select: { id: true, clientId: true } });
    const credentials = await razorpayPartnerSettingsService.getCredentials();
    if (!website || !credentials) return withResult(state.returnTo, "error", "Razorpay couldn't be connected to this shop.");

    try {
      const tokens = await exchangeRazorpayCode(credentials, RAZORPAY_OAUTH_REDIRECT_URI, query.code);
      const data = {
        razorpayAccountId: tokens.accountId,
        oauthAccessTokenCipher: encryptSecret(tokens.accessToken),
        oauthRefreshTokenCipher: encryptSecret(tokens.refreshToken),
        oauthPublicToken: tokens.publicToken,
        oauthMode: credentials.mode,
        oauthExpiresAt: tokens.expiresAt,
        oauthConnectedAt: new Date(),
        // One Razorpay setup at a time: connecting replaces the pasted API keys and webhook secret.
        razorpayKeyId: null,
        razorpayKeySecretCipher: null,
        razorpayWebhookSecretCipher: null,
      };
      await prisma.shopPaymentConfig.upsert({
        where: { websiteId: website.id },
        create: { websiteId: website.id, clientId: website.clientId, ...data },
        update: data,
      });
      logger.info({ websiteId: website.id, userId: state.userId, accountId: tokens.accountId }, "Shop Razorpay account connected");
      return withResult(state.returnTo, "connected");
    } catch (error) {
      logger.error({ err: error, websiteId: website.id }, "Shop Razorpay connection failed");
      const message = error instanceof AppError ? error.message : "Razorpay couldn't be connected. Please try again.";
      return withResult(state.returnTo, "error", message);
    }
  }

  /** Revokes the platform's access on Razorpay (best effort) and forgets the tokens. */
  async disconnect(websiteId: string, actor: AuthUser): Promise<void> {
    await this.openShop(websiteId, actor);
    const config = await prisma.shopPaymentConfig.findUnique({
      where: { websiteId },
      select: { oauthAccessTokenCipher: true, oauthRefreshTokenCipher: true },
    });
    if (!config?.oauthAccessTokenCipher) return;
    const credentials = await razorpayPartnerSettingsService.getCredentials();
    const refreshToken = config.oauthRefreshTokenCipher ? decryptSecret(config.oauthRefreshTokenCipher) : null;
    const accessToken = decryptSecret(config.oauthAccessTokenCipher);
    if (credentials) {
      await Promise.allSettled([
        refreshToken ? revokeRazorpayToken(credentials, refreshToken, "refresh_token") : Promise.resolve(),
        accessToken ? revokeRazorpayToken(credentials, accessToken, "access_token") : Promise.resolve(),
      ]);
    }
    await prisma.shopPaymentConfig.update({ where: { websiteId }, data: CLEARED_OAUTH });
    logger.info({ websiteId, userId: actor.id }, "Shop Razorpay account disconnected");
  }
}

export const shopRazorpayOAuthService = new ShopRazorpayOAuthService();
