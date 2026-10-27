import type { CookieOptions, Request, Response } from "express";
import { env } from "../../config/env.js";
import { parseDurationMs } from "./duration.js";

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
const REFRESH_COOKIE_PATH = "/api/auth";

const SHOP_ACCESS_COOKIE = "shop_access_token";
const SHOP_REFRESH_COOKIE = "shop_refresh_token";
const SHOP_REFRESH_COOKIE_PATH = "/api/shop";

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
  };
}

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * `remember` = persistent cookies; otherwise session cookies that end with the browser session.
 * The refresh cookie is scoped to /api/auth so it is only sent to refresh/logout.
 */
export function setAuthCookies(res: Response, tokens: AuthTokens, remember: boolean): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    path: "/",
    ...(remember ? { maxAge: parseDurationMs(env.JWT_ACCESS_EXPIRES_IN) } : {}),
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    ...(remember ? { maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN) } : {}),
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookieOptions(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseCookieOptions(), path: REFRESH_COOKIE_PATH });
}

export function getAccessToken(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined> | undefined)?.[ACCESS_COOKIE];
}

export function getRefreshToken(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined> | undefined)?.[REFRESH_COOKIE];
}

export function setShopAuthCookies(res: Response, tokens: AuthTokens, remember: boolean): void {
  res.cookie(SHOP_ACCESS_COOKIE, tokens.accessToken, {
    ...baseCookieOptions(),
    path: "/",
    ...(remember ? { maxAge: parseDurationMs(env.JWT_ACCESS_EXPIRES_IN) } : {}),
  });
  res.cookie(SHOP_REFRESH_COOKIE, tokens.refreshToken, {
    ...baseCookieOptions(),
    path: SHOP_REFRESH_COOKIE_PATH,
    ...(remember ? { maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN) } : {}),
  });
}

export function clearShopAuthCookies(res: Response): void {
  res.clearCookie(SHOP_ACCESS_COOKIE, { ...baseCookieOptions(), path: "/" });
  res.clearCookie(SHOP_REFRESH_COOKIE, { ...baseCookieOptions(), path: SHOP_REFRESH_COOKIE_PATH });
}

export function getShopAccessToken(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined> | undefined)?.[SHOP_ACCESS_COOKIE];
}

export function getShopRefreshToken(req: Request): string | undefined {
  return (req.cookies as Record<string, string | undefined> | undefined)?.[SHOP_REFRESH_COOKIE];
}
