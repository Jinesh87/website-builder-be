import express, { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { shopController } from "./controllers/shop.controller.js";
import {
  shopCategoryParamsSchema,
  shopCategorySchema,
  shopCustomerParamsSchema,
  shopCustomerQuerySchema,
  shopInventoryAdjustSchema,
  shopInventoryLogQuerySchema,
  shopInventoryParamsSchema,
  shopInventoryQuerySchema,
  shopOrderEmailDesignSchema,
  shopOrderEmailParamsSchema,
  shopOrderEmailTemplateSchema,
  shopOrderParamsSchema,
  shopOrderQuerySchema,
  shopOrderStatusSchema,
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

shopRouter.get("/inventory", websiteParams, validate(shopInventoryQuerySchema, "query"), shopController.listInventory);
shopRouter.patch(
  "/inventory/:variantId",
  validate(shopInventoryParamsSchema, "params"),
  validate(shopInventoryAdjustSchema),
  shopController.setInventory,
);
shopRouter.get("/inventory/log", websiteParams, validate(shopInventoryLogQuerySchema, "query"), shopController.inventoryLog);

shopRouter.get("/customers", websiteParams, validate(shopCustomerQuerySchema, "query"), shopController.listCustomers);
shopRouter.get("/customers/:customerId", validate(shopCustomerParamsSchema, "params"), shopController.getCustomer);

shopRouter.get("/orders", websiteParams, validate(shopOrderQuerySchema, "query"), shopController.listOrders);
shopRouter.get("/orders/:orderId", validate(shopOrderParamsSchema, "params"), shopController.getOrder);
shopRouter.patch(
  "/orders/:orderId",
  validate(shopOrderParamsSchema, "params"),
  validate(shopOrderStatusSchema),
  shopController.updateOrderStatus,
);

shopRouter.get("/order-emails", websiteParams, shopController.listOrderEmailTemplates);
shopRouter.put(
  "/order-emails/design",
  websiteParams,
  validate(shopOrderEmailDesignSchema),
  shopController.updateOrderEmailDesign,
);
shopRouter.put(
  "/order-emails/:status",
  validate(shopOrderEmailParamsSchema, "params"),
  validate(shopOrderEmailTemplateSchema),
  shopController.updateOrderEmailTemplate,
);
shopRouter.post(
  "/order-emails/:status/reset",
  validate(shopOrderEmailParamsSchema, "params"),
  shopController.resetOrderEmailTemplate,
);

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
