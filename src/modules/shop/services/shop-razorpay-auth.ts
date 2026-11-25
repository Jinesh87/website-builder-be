import { decryptSecret, encryptSecret } from "../../../common/utils/secret-box.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { refreshRazorpayToken } from "../../wallet/services/razorpay-oauth.client.js";
import type { RazorpayAuth } from "../../wallet/services/razorpay.client.js";
import { razorpayPartnerSettingsService } from "../../wallet/services/razorpay-partner-settings.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Refresh on use when the access token has less than this left. */
const REFRESH_ON_USE_MS = 2 * DAY_MS;
/** The background sweep refreshes tokens this close to expiry, so quiet shops never lapse. */
const REFRESH_AHEAD_MS = 15 * DAY_MS;

/** Clears an OAuth connection; the shop falls back to its own API keys, if it has any. */
export const CLEARED_OAUTH = {
  razorpayAccountId: null,
  oauthAccessTokenCipher: null,
  oauthRefreshTokenCipher: null,
  oauthPublicToken: null,
  oauthMode: null,
  oauthExpiresAt: null,
  oauthConnectedAt: null,
  qrCodesEnabled: null,
  qrCheckedAt: null,
} satisfies Prisma.ShopPaymentConfigUpdateInput;

const authSelect = {
  websiteId: true,
  razorpayKeyId: true,
  razorpayKeySecretCipher: true,
  oauthAccessTokenCipher: true,
  oauthRefreshTokenCipher: true,
  oauthPublicToken: true,
  oauthExpiresAt: true,
  oauthMode: true,
} as const satisfies Prisma.ShopPaymentConfigSelect;

type AuthRow = Prisma.ShopPaymentConfigGetPayload<{ select: typeof authSelect }>;

/** One refresh per shop at a time: Razorpay invalidates the old refresh token on use. */
const refreshing = new Map<string, Promise<AuthRow | null>>();

async function refreshRow(row: AuthRow): Promise<AuthRow | null> {
  const pending = refreshing.get(row.websiteId);
  if (pending) return pending;
  const work = (async () => {
    // Tokens are refreshed with the client that issued them, whatever mode the platform is in now.
    const credentials = await razorpayPartnerSettingsService.getCredentials(row.oauthMode === "test" ? "test" : "live");
    const refreshToken = row.oauthRefreshTokenCipher ? decryptSecret(row.oauthRefreshTokenCipher) : null;
    if (!credentials || !refreshToken) return row;
    try {
      const tokens = await refreshRazorpayToken(credentials, refreshToken);
      return await prisma.shopPaymentConfig.update({
        where: { websiteId: row.websiteId },
        data: {
          oauthAccessTokenCipher: encryptSecret(tokens.accessToken),
          oauthRefreshTokenCipher: encryptSecret(tokens.refreshToken),
          oauthPublicToken: tokens.publicToken,
          oauthExpiresAt: tokens.expiresAt,
        },
        select: authSelect,
      });
    } catch (error) {
      logger.error({ err: error, websiteId: row.websiteId }, "Shop Razorpay token refresh failed");
      return row;
    }
  })().finally(() => refreshing.delete(row.websiteId));
  refreshing.set(row.websiteId, work);
  return work;
}

function oauthOf(row: AuthRow): RazorpayAuth | null {
  const accessToken = row.oauthAccessTokenCipher ? decryptSecret(row.oauthAccessTokenCipher) : null;
  if (!accessToken || !row.oauthPublicToken) return null;
  return { accessToken, publicToken: row.oauthPublicToken };
}

/**
 * How the platform calls Razorpay for this shop: the connected account (OAuth) when there is one,
 * otherwise the shop's own API keys. Null when the shop can't take payments.
 */
export async function shopRazorpayAuth(websiteId: string): Promise<RazorpayAuth | null> {
  let row = await prisma.shopPaymentConfig.findUnique({ where: { websiteId }, select: authSelect });
  if (!row) return null;

  // A connection keeps working in the mode it was made in, even after the platform switches Test/Live.
  if (row.oauthAccessTokenCipher) {
    if (row.oauthExpiresAt && row.oauthExpiresAt.getTime() - Date.now() < REFRESH_ON_USE_MS) {
      row = (await refreshRow(row)) ?? row;
    }
    const oauth = oauthOf(row);
    if (oauth) return oauth;
  }

  const keySecret = row.razorpayKeySecretCipher ? decryptSecret(row.razorpayKeySecretCipher) : null;
  if (!row.razorpayKeyId || !keySecret) return null;
  return { keyId: row.razorpayKeyId, keySecret };
}

/** Background sweep: keeps connections alive even when a shop has no orders for months. */
export async function refreshExpiringShopTokens(): Promise<void> {
  const rows = await prisma.shopPaymentConfig.findMany({
    where: { oauthRefreshTokenCipher: { not: null }, oauthExpiresAt: { lt: new Date(Date.now() + REFRESH_AHEAD_MS) } },
    select: authSelect,
    take: 200,
  });
  for (const row of rows) await refreshRow(row);
}
