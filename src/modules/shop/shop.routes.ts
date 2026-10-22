import express, { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { shopController } from "./controllers/shop.controller.js";
import {
  shopCategoryParamsSchema,
  shopCategorySchema,
  shopPaymentSchema,
  shopProductParamsSchema,
  shopProductQuerySchema,
  shopProductSchema,
  shopWebhookParamsSchema,
  shopWebsiteParamsSchema,
} from "./validators/shop.validator.js";

const shopRouter = Router({ mergeParams: true });

const websiteParams = validate(shopWebsiteParamsSchema, "params");

shopRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT));

shopRouter.get("/categories", websiteParams, shopController.listCategories);
shopRouter.post("/categories", websiteParams, validate(shopCategorySchema), shopController.createCategory);
shopRouter.patch(
  "/categories/:categoryId",
  validate(shopCategoryParamsSchema, "params"),
  validate(shopCategorySchema),
  shopController.updateCategory,
);
shopRouter.delete("/categories/:categoryId", validate(shopCategoryParamsSchema, "params"), shopController.deleteCategory);

shopRouter.get("/products", websiteParams, validate(shopProductQuerySchema, "query"), shopController.listProducts);
shopRouter.post("/products", websiteParams, validate(shopProductSchema), shopController.createProduct);
shopRouter.patch(
  "/products/:productId",
  validate(shopProductParamsSchema, "params"),
  validate(shopProductSchema),
  shopController.updateProduct,
);
shopRouter.delete("/products/:productId", validate(shopProductParamsSchema, "params"), shopController.deleteProduct);

shopRouter.get("/payments", websiteParams, shopController.getPaymentConfig);
shopRouter.put("/payments", websiteParams, validate(shopPaymentSchema), shopController.updatePaymentConfig);
shopRouter.get(
  "/payments/secrets",
  websiteParams,
  rateLimit({ name: "shop-payment-secrets", max: 20, windowSeconds: 60 * 60 }),
  shopController.revealPaymentSecrets,
);

/** Public. Mounted before express.json() so the Razorpay signature covers the raw body. */
export const shopRazorpayWebhookRouter = Router();
shopRazorpayWebhookRouter.post(
  "/:websiteId",
  express.raw({ type: "*/*", limit: "1mb" }),
  validate(shopWebhookParamsSchema, "params"),
  shopController.razorpayWebhook,
);

export default shopRouter;
