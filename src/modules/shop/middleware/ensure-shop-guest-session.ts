import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getShopGuestSessionId, setShopGuestSessionId } from "../../../common/utils/cookies.js";

declare global {
  namespace Express {
    interface Request {
      shopGuestSessionId?: string;
    }
  }
}

/** Ensures a durable anonymous cart cookie exists for guest checkout. */
export function ensureShopGuestSession(req: Request, res: Response, next: NextFunction) {
  const existing = getShopGuestSessionId(req);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (existing && uuidPattern.test(existing)) {
    req.shopGuestSessionId = existing;
    next();
    return;
  }
  const sessionId = randomUUID();
  setShopGuestSessionId(res, sessionId);
  req.shopGuestSessionId = sessionId;
  next();
}
