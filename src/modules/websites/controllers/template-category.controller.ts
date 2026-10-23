import type { NextFunction, Request, Response } from "express";
import { templateCategoryService } from "../services/template-category.service.js";
import type { DeleteTemplateCategoryQuery, TemplateCategoryInput } from "../types/template-category.types.js";

type CategoryParams = { categoryId: string };

export class TemplateCategoryController {
  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ categories: await templateCategoryService.list() });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ category: await templateCategoryService.create(req.body as TemplateCategoryInput, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  rename = async (req: Request<CategoryParams>, res: Response, next: NextFunction) => {
    try {
      res.json({
        category: await templateCategoryService.rename(req.params.categoryId, req.body as TemplateCategoryInput, req.user!),
      });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request<CategoryParams>, res: Response, next: NextFunction) => {
    try {
      const { moveTo } = req.query as DeleteTemplateCategoryQuery;
      await templateCategoryService.remove(req.params.categoryId, moveTo, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}

export const templateCategoryController = new TemplateCategoryController();
