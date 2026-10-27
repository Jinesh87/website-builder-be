import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../../common/errors/AppError.js";
import { getShopAccessToken } from "../../../common/utils/cookies.js";
import { verifyShopAccessToken } from "../../../common/utils/jwt.js";

export type ShopAuthCustomer = {
  id: string;
  websiteId: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      shopCustomer?: ShopAuthCustomer;
    }
  }
}

export function authenticateShopCustomer(req: Request, _res: Response, next: NextFunction) {
  const token = getShopAccessToken(req);
  if (!token) {
    next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
    return;
  }
  try {
    const payload = verifyShopAccessToken(token);
    const websiteId = req.params.websiteId;
    if (websiteId && payload.websiteId !== websiteId) {
      next(new AppError(401, "Authentication required", "UNAUTHORIZED"));
      return;
    }
    req.shopCustomer = { id: payload.sub, websiteId: payload.websiteId, email: payload.email };
    next();
  } catch {
    next(new AppError(401, "Invalid or expired access token", "UNAUTHORIZED"));
  }
}
