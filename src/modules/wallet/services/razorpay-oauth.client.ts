import { AppError } from "../../../common/errors/AppError.js";

/** Razorpay Technology Partner OAuth: https://razorpay.com/docs/partners/technology-partners/onboard-businesses/integrate-oauth/ */
const AUTH_BASE = "https://auth.razorpay.com";

export type RazorpayOAuthMode = "test" | "live";

export type RazorpayPartnerCredentials = { clientId: string; clientSecret: string; mode: RazorpayOAuthMode };

export type RazorpayTokenSet = {
  accessToken: string;
  refreshToken: string;
  publicToken: string;
  /** Present on the first exchange; the refresh response omits it. */
  accountId: string | null;
  expiresAt: Date;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  public_token?: string;
  razorpay_account_id?: string;
  expires_in?: number;
  error?: { description?: string } | string;
  error_description?: string;
};

/** The Razorpay page where the shop owner logs in (or signs up) and approves the platform. */
export function razorpayAuthorizeUrl(credentials: RazorpayPartnerCredentials, redirectUri: string, state: string): string {
  const query = new URLSearchParams({
    client_id: credentials.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "read_write",
    state,
  });
  return `${AUTH_BASE}/authorize?${query}`;
}

function errorText(json: TokenResponse): string | undefined {
  if (typeof json.error === "string") return json.error_description || json.error;
  return json.error?.description || json.error_description;
}

async function post<T>(path: string, body: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${AUTH_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new AppError(502, "Couldn't reach Razorpay. Please try again.", "PAYMENT_GATEWAY_UNAVAILABLE");
  }
  const json = (await response.json().catch(() => ({}))) as T & TokenResponse;
  if (!response.ok) {
    throw new AppError(502, errorText(json) || "Razorpay couldn't complete the connection.", "RAZORPAY_OAUTH_FAILED");
  }
  return json;
}

function toTokenSet(json: TokenResponse): RazorpayTokenSet {
  if (!json.access_token || !json.refresh_token || !json.public_token) {
    throw new AppError(502, "Razorpay returned an incomplete connection. Please try again.", "RAZORPAY_OAUTH_FAILED");
  }
  // Razorpay documents 90 days; trust expires_in and fall back to that.
  const seconds = json.expires_in && json.expires_in > 0 ? json.expires_in : 90 * 24 * 60 * 60;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    publicToken: json.public_token,
    accountId: json.razorpay_account_id ?? null,
    expiresAt: new Date(Date.now() + seconds * 1000),
  };
}

export async function exchangeRazorpayCode(
  credentials: RazorpayPartnerCredentials,
  redirectUri: string,
  code: string,
): Promise<RazorpayTokenSet> {
  return toTokenSet(
    await post<TokenResponse>("/token", {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
      mode: credentials.mode,
    }),
  );
}

/** The old refresh token stops working once this succeeds. */
export async function refreshRazorpayToken(credentials: RazorpayPartnerCredentials, refreshToken: string): Promise<RazorpayTokenSet> {
  return toTokenSet(
    await post<TokenResponse>("/token", {
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export async function revokeRazorpayToken(
  credentials: RazorpayPartnerCredentials,
  token: string,
  tokenType: "access_token" | "refresh_token",
): Promise<void> {
  await post("/revoke", {
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    token_type_hint: tokenType,
    token,
  });
}
