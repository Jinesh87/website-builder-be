import type { NextFunction, Request, Response } from "express";
import { adminTemplateService } from "../services/admin-template.service.js";
import type { AdminTemplateListQuery, TemplateDraftListQuery } from "../types/admin-template.types.js";

type TemplateParams = { templateId: string };
type WebsiteParams = { websiteId: string };

export class AdminTemplateController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ templates: await adminTemplateService.list(req.query as AdminTemplateListQuery, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  listDrafts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ drafts: await adminTemplateService.listDrafts(req.query as TemplateDraftListQuery, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  discardDraft = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      await adminTemplateService.discardDraft(req.params.websiteId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  getBySourceWebsite = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ template: await adminTemplateService.getBySourceWebsite(req.params.websiteId) });
    } catch (error) {
      next(error);
    }
  };

  createStudioWebsite = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await adminTemplateService.createStudioWebsite(req.body, req.user!));
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ template: await adminTemplateService.create(req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updateFromSource = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ template: await adminTemplateService.updateFromSource(req.params.templateId, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updateDetails = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ template: await adminTemplateService.updateDetails(req.params.templateId, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  archive = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ template: await adminTemplateService.archive(req.params.templateId, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  restore = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ template: await adminTemplateService.restore(req.params.templateId, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  preview = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await adminTemplateService.preview(req.params.templateId));
    } catch (error) {
      next(error);
    }
  };

  deletePermanently = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      await adminTemplateService.deletePermanently(req.params.templateId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}

export const adminTemplateController = new AdminTemplateController();
