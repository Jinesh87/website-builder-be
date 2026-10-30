import type { NextFunction, Request, Response } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { getAccessToken } from "../../common/utils/cookies.js";
import { verifyAccessToken } from "../../common/utils/jwt.js";
import { questionnaireService } from "./questionnaire.service.js";

function resolveClientIdFromToken(req: Request): string | null {
  if (req.user?.clientId) {
    return req.user.clientId;
  }
  const token = getAccessToken(req);
  if (!token) return null;
  try {
    const payload = verifyAccessToken(token);
    if (payload.role === UserRole.CLIENT && payload.clientId) {
      return payload.clientId;
    }
  } catch {
    // Ignore invalid/expired token on public route
  }
  return null;
}

export class QuestionnaireController {
  submit = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = resolveClientIdFromToken(req);
      const { questionnaire, emailDispatched } = await questionnaireService.submit(
        req.body,
        clientId,
      );
      res.status(201).json({
        ok: true,
        message: emailDispatched
          ? "Thank you! Your website questionnaire has been submitted and sent to our team."
          : "Thank you! We have received your website questionnaire.",
        id: questionnaire?.id,
        emailDispatched,
      });
    } catch (error) {
      next(error);
    }
  };

  listMine = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        res.status(200).json({ items: [] });
        return;
      }
      const items = await questionnaireService.listMine(clientId);
      res.status(200).json({ items });
    } catch (error) {
      next(error);
    }
  };
}

export const questionnaireController = new QuestionnaireController();

