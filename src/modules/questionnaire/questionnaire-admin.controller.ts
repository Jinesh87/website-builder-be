import type { NextFunction, Request, Response } from "express";
import { questionnaireService } from "./questionnaire.service.js";
import type {
  QuestionnaireListQuery,
  UpdateQuestionnaireInput,
} from "./questionnaire.types.js";

export class QuestionnaireAdminController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as QuestionnaireListQuery;
      const result = await questionnaireService.list(query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  summary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const newCount = await questionnaireService.newCount();
      res.status(200).json({ newCount });
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const detail = await questionnaireService.detail(req.params.id as string);
      res.status(200).json(detail);
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const actorId = req.user!.id;
      const questionnaire = await questionnaireService.update(
        id,
        req.body as UpdateQuestionnaireInput,
        actorId,
      );
      res.status(200).json({ questionnaire });
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const actorId = req.user!.id;
      const activity = await questionnaireService.addNote(
        id,
        (req.body as { body: string }).body,
        actorId,
      );
      res.status(201).json({ activity });
    } catch (error) {
      next(error);
    }
  };

  resendEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const actorId = req.user!.id;
      const questionnaire = await questionnaireService.resendEmail(id, actorId);
      res.status(200).json({ questionnaire });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await questionnaireService.remove(req.params.id as string);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}

export const questionnaireAdminController = new QuestionnaireAdminController();

