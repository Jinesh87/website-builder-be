import type { NextFunction, Request, Response } from "express";
import { enquiryService } from "./enquiry.service.js";
import type { EnquiryListQuery, EnquiryReplyInput, UpdateEnquiryInput } from "./enquiry.types.js";

type IdParams = { id: string };

export class EnquiryAdminController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await enquiryService.list(req.query as unknown as EnquiryListQuery));
    } catch (error) {
      next(error);
    }
  };

  summary = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ newCount: await enquiryService.newCount() });
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await enquiryService.detail(req.params.id));
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const enquiry = await enquiryService.update(req.params.id, req.body as UpdateEnquiryInput, req.user!.id);
      res.json({ enquiry });
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const { body } = req.body as { body: string };
      res.status(201).json({ activity: await enquiryService.addNote(req.params.id, body, req.user!.id) });
    } catch (error) {
      next(error);
    }
  };

  reply = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const enquiry = await enquiryService.reply(req.params.id, req.body as EnquiryReplyInput, req.user!.id);
      res.json({ enquiry });
    } catch (error) {
      next(error);
    }
  };

  resendEmail = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ enquiry: await enquiryService.resendEmail(req.params.id, req.user!.id) });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      await enquiryService.remove(req.params.id);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}

export const enquiryAdminController = new EnquiryAdminController();
