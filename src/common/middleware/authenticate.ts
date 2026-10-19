import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../constants/roles.js";
import { AppError } from "../errors/AppError.js";
import { getAccessToken } from "../utils/cookies.js";
import { verifyAccessToken } from "../utils/jwt.js";

export type AuthUser = {
  id: string;
  email: string | null;
  role: UserRole;
  clientId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = getAccessToken(req);
  if (!token) {
    next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      clientId: payload.clientId,
    };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired access token", "UNAUTHORIZED"));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
      return;
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      next(new AppError(403, "Insufficient permissions", "FORBIDDEN"));
      return;
    }
    next();
  };
}
