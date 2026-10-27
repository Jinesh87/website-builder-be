import type { NextFunction, Request, Response } from "express";
import { clearShopAuthCookies, getShopRefreshToken, setShopAuthCookies } from "../../../common/utils/cookies.js";
import { shopAuthService } from "../services/shop-auth.service.js";
import type { ShopAuthResult } from "../types/shop-auth.types.js";

type WebsiteParams = { websiteId: string };

function sendSession(res: Response, result: ShopAuthResult) {
  setShopAuthCookies(res, result.tokens, result.remember);
  res.status(200).json({ customer: result.customer });
}

export class ShopAuthController {
  signup = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await shopAuthService.signup(req.params.websiteId, req.body));
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await shopAuthService.verifyEmail(req.params.websiteId, req.body.email, req.body.code));
    } catch (error) {
      next(error);
    }
  };

  resendVerification = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await shopAuthService.resendVerification(req.params.websiteId, req.body.email));
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await shopAuthService.login(req.params.websiteId, req.body));
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const refreshToken = getShopRefreshToken(req);
      if (!refreshToken) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Refresh token missing" } });
        return;
      }
      sendSession(res, await shopAuthService.refresh(req.params.websiteId, refreshToken));
    } catch (error) {
      clearShopAuthCookies(res);
      next(error);
    }
  };

  logout = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      await shopAuthService.logout(getShopRefreshToken(req));
      clearShopAuthCookies(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({
        customer: await shopAuthService.me(req.params.websiteId, req.shopCustomer!.id),
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      await shopAuthService.requestPasswordReset(req.params.websiteId, req.body.email);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await shopAuthService.resetPassword(req.params.websiteId, req.body.token, req.body.password));
    } catch (error) {
      next(error);
    }
  };
}

export const shopAuthController = new ShopAuthController();
