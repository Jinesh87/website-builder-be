import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { UserRole } from "../constants/roles.js";
import { AppError } from "../errors/AppError.js";

export type AccessTokenPayload = {
  sub: string;
  email: string | null;
  role: UserRole;
  clientId: string | null;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  tokenId: string;
  /** Whether the session should survive browser restarts ("Remember me"). */
  remember: boolean;
  type: "refresh";
};

/** Buyer session on a client website's shop. Separate from platform access tokens. */
export type ShopAccessTokenPayload = {
  sub: string;
  websiteId: string;
  email: string;
  type: "shop_access";
};

export type ShopRefreshTokenPayload = {
  sub: string;
  websiteId: string;
  tokenId: string;
  remember: boolean;
  type: "shop_refresh";
};

export function signAccessToken(payload: Omit<AccessTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (payload.type !== "access") {
    throw new AppError(401, "Invalid access token", "INVALID_TOKEN");
  }
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (payload.type !== "refresh") {
    throw new AppError(401, "Invalid refresh token", "INVALID_TOKEN");
  }
  return payload;
}

export function signShopAccessToken(payload: Omit<ShopAccessTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "shop_access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function signShopRefreshToken(payload: Omit<ShopRefreshTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "shop_refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyShopAccessToken(token: string): ShopAccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as ShopAccessTokenPayload;
  if (payload.type !== "shop_access") {
    throw new AppError(401, "Invalid access token", "INVALID_TOKEN");
  }
  return payload;
}

export function verifyShopRefreshToken(token: string): ShopRefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as ShopRefreshTokenPayload;
  if (payload.type !== "shop_refresh") {
    throw new AppError(401, "Invalid refresh token", "INVALID_TOKEN");
  }
  return payload;
}
