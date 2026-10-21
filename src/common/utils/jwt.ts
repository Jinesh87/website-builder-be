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
