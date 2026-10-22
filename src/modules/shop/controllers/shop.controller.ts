import type { NextFunction, Request, Response } from "express";
import { shopService } from "../services/shop.service.js";
import type { ShopCategoryInput, ShopProductInput, ShopProductQuery } from "../types/shop.types.js";

type WebsiteParams = { id: string };
type CategoryParams = WebsiteParams & { categoryId: string };
type ProductParams = WebsiteParams & { productId: string };

export class ShopController {
  listCategories = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ categories: await shopService.listCategories(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  createCategory = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ category: await shopService.createCategory(req.params.id, req.body as ShopCategoryInput, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updateCategory = async (req: Request<CategoryParams>, res: Response, next: NextFunction) => {
    try {
      res.json({
        category: await shopService.updateCategory(req.params.id, req.params.categoryId, req.body as ShopCategoryInput, req.user!),
      });
    } catch (error) {
      next(error);
    }
  };

  deleteCategory = async (req: Request<CategoryParams>, res: Response, next: NextFunction) => {
    try {
      await shopService.deleteCategory(req.params.id, req.params.categoryId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  listProducts = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ products: await shopService.listProducts(req.params.id, req.query as unknown as ShopProductQuery, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  createProduct = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ product: await shopService.createProduct(req.params.id, req.body as ShopProductInput, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updateProduct = async (req: Request<ProductParams>, res: Response, next: NextFunction) => {
    try {
      res.json({
        product: await shopService.updateProduct(req.params.id, req.params.productId, req.body as ShopProductInput, req.user!),
      });
    } catch (error) {
      next(error);
    }
  };

  deleteProduct = async (req: Request<ProductParams>, res: Response, next: NextFunction) => {
    try {
      await shopService.deleteProduct(req.params.id, req.params.productId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };
}

export const shopController = new ShopController();
