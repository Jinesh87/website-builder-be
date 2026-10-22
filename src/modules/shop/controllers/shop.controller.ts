import type { NextFunction, Request, Response } from "express";
import { shopInventoryService } from "../services/shop-inventory.service.js";
import { shopPaymentService, type UpdateShopPaymentInput } from "../services/shop-payment.service.js";
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

  getPaymentConfig = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ config: await shopPaymentService.getConfig(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updatePaymentConfig = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ config: await shopPaymentService.updateConfig(req.params.id, req.body as UpdateShopPaymentInput, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  revealPaymentSecrets = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ secrets: await shopPaymentService.revealSecrets(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  listInventory = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      res.json({ items: await shopInventoryService.list(req.params.id, search, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  setInventory = async (req: Request<WebsiteParams & { variantId: string }>, res: Response, next: NextFunction) => {
    try {
      const { quantity, note } = req.body as { quantity: number; note?: string };
      res.json({ item: await shopInventoryService.addQuantity(req.params.id, req.params.variantId, quantity, note, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  inventoryLog = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const page = Number(req.query.page) || 1;
      res.json(await shopInventoryService.log(req.params.id, search, page, req.user!));
    } catch (error) {
      next(error);
    }
  };

  razorpayWebhook = async (req: Request<{ websiteId: string }>, res: Response, next: NextFunction) => {
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
      await shopPaymentService.handleWebhook(req.params.websiteId, rawBody, req.header("x-razorpay-signature"));
      res.json({ ok: true });
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
