import type { NextFunction, Request, Response } from "express";
import { clearAuthCookies, getRefreshToken, setAuthCookies } from "../../../common/utils/cookies.js";
import { verifyRefreshToken } from "../../../common/utils/jwt.js";
import { authService } from "../services/auth.service.js";
import type { AuthResult } from "../types/auth.types.js";

function sendSession(res: Response, result: AuthResult) {
  setAuthCookies(res, result.tokens, result.remember);
  res.status(200).json({ user: result.user });
}

export class AuthController {
  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await authService.signup(req.body));
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await authService.verifyEmail(req.body.email, req.body.code));
    } catch (error) {
      next(error);
    }
  };

  resendVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await authService.resendVerification(req.body.email));
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await authService.login(req.body));
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = getRefreshToken(req);
      if (!refreshToken) {
        res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Refresh token missing" } });
        return;
      }
      sendSession(res, await authService.refresh(refreshToken));
    } catch (error) {
      clearAuthCookies(res);
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(getRefreshToken(req));
      clearAuthCookies(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ user: await authService.me(req.user!.id) });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  getResetPreview = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await authService.getPasswordResetPreview(String(req.query.token)));
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await authService.resetPassword(req.body.token, req.body.password));
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      sendSession(res, await authService.changePassword(req.user!.id, req.body, isRememberedSession(req)));
    } catch (error) {
      next(error);
    }
  };
}

/** Keeps the "Remember me" choice of the current session when its tokens are reissued. */
function isRememberedSession(req: Request): boolean {
  const refreshToken = getRefreshToken(req);
  if (!refreshToken) return false;
  try {
    return verifyRefreshToken(refreshToken).remember;
  } catch {
    return false;
  }
}

export const authController = new AuthController();
