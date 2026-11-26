import express, { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import {
  authenticate,
  authorize,
} from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { receiveFile } from "../../common/middleware/receive-file.js";
import { validate } from "../../common/middleware/validate.js";
import { shopProductImportController } from "./controllers/shop-product-import.controller.js";
import { shopController } from "./controllers/shop.controller.js";
import { shopPosController } from "./controllers/shop-pos.controller.js";
import { shopSalesController } from "./controllers/shop-sales.controller.js";
import { shopRazorpayConnectController } from "./controllers/shop-razorpay-connect.controller.js";
import {
  shopCategoryParamsSchema,
  shopCategorySchema,
  shopCouponParamsSchema,
  shopCreateCouponSchema,
  shopCustomerParamsSchema,
  shopCustomerQuerySchema,
  shopInventoryAdjustSchema,
  shopInventoryLogQuerySchema,
  shopInventoryParamsSchema,
  shopInventoryQuerySchema,
  shopInvoiceDesignSchema,
  shopInventoryReturnsParamsSchema,
  shopOrderEmailDesignSchema,
  shopOrderEmailParamsSchema,
  shopOrderEmailTemplateSchema,
  shopOrderParamsSchema,
  shopOrderQuerySchema,
  shopReturnQuerySchema,
  shopPaymentLogQuerySchema,
  shopOrderStatusSchema,
  shopPaymentSchema,
  shopPosEmailSchema,
  shopPosSaleSchema,
  shopPosSummaryQuerySchema,
  shopRazorpayConnectSchema,
  shopProductParamsSchema,
  shopProductQuerySchema,
  shopProductSchema,
  shopUpdateCouponSchema,
  shopWebhookParamsSchema,
  shopWebsiteParamsSchema,
} from "./validators/shop.validator.js";

const shopRouter = Router({ mergeParams: true });

const websiteParams = validate(shopWebsiteParamsSchema, "params");

shopRouter.use(
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT, UserRole.PARTNER),
);

shopRouter.get("/categories", websiteParams, shopController.listCategories);
shopRouter.post(
  "/categories",
  websiteParams,
  validate(shopCategorySchema),
  shopController.createCategory,
);
shopRouter.patch(
  "/categories/:categoryId",
  validate(shopCategoryParamsSchema, "params"),
  validate(shopCategorySchema),
  shopController.updateCategory,
);
shopRouter.delete(
  "/categories/:categoryId",
  validate(shopCategoryParamsSchema, "params"),
  shopController.deleteCategory,
);

shopRouter.get(
  "/products",
  websiteParams,
  validate(shopProductQuerySchema, "query"),
  shopController.listProducts,
);
shopRouter.post(
  "/products",
  websiteParams,
  validate(shopProductSchema),
  shopController.createProduct,
);
// Bulk import from a CSV or Excel sheet: preview first, then apply the same file.
const receiveProductSheet = receiveFile({
  maxBytes: 5 * 1024 * 1024,
  tooLarge: (mb) => ({ message: `The import file must be under ${mb} MB.`, code: "IMPORT_TOO_LARGE" }),
});
const importLimit = rateLimit({ name: "shop-product-import", max: 30, windowSeconds: 60 });
shopRouter.post("/products/import/preview", websiteParams, importLimit, receiveProductSheet, shopProductImportController.preview);
shopRouter.post("/products/import", websiteParams, importLimit, receiveProductSheet, shopProductImportController.apply);
shopRouter.patch(
  "/products/:productId",
  validate(shopProductParamsSchema, "params"),
  validate(shopProductSchema),
  shopController.updateProduct,
);
shopRouter.delete(
  "/products/:productId",
  validate(shopProductParamsSchema, "params"),
  shopController.deleteProduct,
);

shopRouter.get(
  "/inventory",
  websiteParams,
  validate(shopInventoryQuerySchema, "query"),
  shopController.listInventory,
);
shopRouter.patch(
  "/inventory/:variantId",
  validate(shopInventoryParamsSchema, "params"),
  validate(shopInventoryAdjustSchema),
  shopController.setInventory,
);
shopRouter.get(
  "/inventory/log",
  websiteParams,
  validate(shopInventoryLogQuerySchema, "query"),
  shopController.inventoryLog,
);
shopRouter.get(
  "/inventory/returns/:productId",
  validate(shopInventoryReturnsParamsSchema, "params"),
  shopController.listProductReturns,
);

shopRouter.get(
  "/customers",
  websiteParams,
  validate(shopCustomerQuerySchema, "query"),
  shopController.listCustomers,
);
shopRouter.get(
  "/customers/:customerId",
  validate(shopCustomerParamsSchema, "params"),
  shopController.getCustomer,
);

shopRouter.get(
  "/orders",
  websiteParams,
  validate(shopOrderQuerySchema, "query"),
  shopController.listOrders,
);
shopRouter.get(
  "/orders/:orderId",
  validate(shopOrderParamsSchema, "params"),
  shopController.getOrder,
);
shopRouter.patch(
  "/orders/:orderId",
  validate(shopOrderParamsSchema, "params"),
  validate(shopOrderStatusSchema),
  shopController.updateOrderStatus,
);
shopRouter.get(
  "/orders/:orderId/invoice",
  validate(shopOrderParamsSchema, "params"),
  rateLimit({ name: "shop-store-invoice", max: 30, windowSeconds: 60 }),
  shopPosController.downloadInvoice,
);

// Sales summary across the online store and the till.
shopRouter.get("/sales/summary", websiteParams, validate(shopPosSummaryQuerySchema, "query"), shopSalesController.summary);
shopRouter.get("/sales/export.csv", websiteParams, validate(shopPosSummaryQuerySchema, "query"), shopSalesController.exportCsv);
shopRouter.get(
  "/sales/export.pdf",
  websiteParams,
  validate(shopPosSummaryQuerySchema, "query"),
  rateLimit({ name: "shop-sales-pdf", max: 20, windowSeconds: 60 }),
  shopSalesController.exportPdf,
);

// In-store till (POS).
const posOrderParams = validate(shopOrderParamsSchema, "params");
shopRouter.get("/pos/catalog", websiteParams, shopPosController.catalog);
shopRouter.get("/pos/summary", websiteParams, validate(shopPosSummaryQuerySchema, "query"), shopPosController.summary);
shopRouter.post(
  "/pos/sales",
  websiteParams,
  rateLimit({ name: "shop-pos-sale", max: 120, windowSeconds: 60 }),
  validate(shopPosSaleSchema),
  shopPosController.createSale,
);
shopRouter.get(
  "/pos/sales/:orderId/qr",
  posOrderParams,
  rateLimit({ name: "shop-pos-qr-check", max: 60, windowSeconds: 60 }),
  shopPosController.checkQr,
);
shopRouter.post("/pos/sales/:orderId/qr/cancel", posOrderParams, shopPosController.cancelQr);
shopRouter.get("/pos/sales/:orderId/receipt", posOrderParams, shopPosController.receipt);
shopRouter.post(
  "/pos/sales/:orderId/email",
  posOrderParams,
  rateLimit({ name: "shop-pos-email", max: 20, windowSeconds: 60 }),
  validate(shopPosEmailSchema),
  shopPosController.emailInvoice,
);

shopRouter.get(
  "/payment-logs",
  websiteParams,
  validate(shopPaymentLogQuerySchema, "query"),
  shopController.listPaymentLogs,
);
shopRouter.get("/returns/summary", websiteParams, shopController.returnsSummary);
shopRouter.get(
  "/returns",
  websiteParams,
  validate(shopReturnQuerySchema, "query"),
  shopController.listReturns,
);
shopRouter.post(
  "/orders/:orderId/refund",
  validate(shopOrderParamsSchema, "params"),
  rateLimit({ name: "shop-order-refund-retry", max: 20, windowSeconds: 60 }),
  shopController.retryOrderRefund,
);

shopRouter.get(
  "/order-emails",
  websiteParams,
  shopController.listOrderEmailTemplates,
);
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

shopRouter.get(
  "/invoice-template",
  websiteParams,
  shopController.getInvoiceTemplateDesign,
);
shopRouter.put(
  "/invoice-template",
  websiteParams,
  validate(shopInvoiceDesignSchema),
  shopController.updateInvoiceTemplateDesign,
);

shopRouter.get("/coupons", websiteParams, shopController.listCoupons);
shopRouter.post(
  "/coupons",
  websiteParams,
  validate(shopCreateCouponSchema),
  shopController.createCoupon,
);
shopRouter.get(
  "/coupons/:couponId/redemptions",
  validate(shopCouponParamsSchema, "params"),
  shopController.listCouponRedemptions,
);
shopRouter.patch(
  "/coupons/:couponId",
  validate(shopCouponParamsSchema, "params"),
  validate(shopUpdateCouponSchema),
  shopController.updateCoupon,
);

shopRouter.get("/payments", websiteParams, shopController.getPaymentConfig);
shopRouter.put(
  "/payments",
  websiteParams,
  validate(shopPaymentSchema),
  shopController.updatePaymentConfig,
);
shopRouter.get(
  "/payments/secrets",
  websiteParams,
  rateLimit({ name: "shop-payment-secrets", max: 20, windowSeconds: 60 * 60 }),
  shopController.revealPaymentSecrets,
);

shopRouter.post(
  "/payments/razorpay/connect",
  websiteParams,
  rateLimit({ name: "shop-razorpay-connect", max: 30, windowSeconds: 60 * 60 }),
  validate(shopRazorpayConnectSchema),
  shopRazorpayConnectController.start,
);
shopRouter.delete("/payments/razorpay/connect", websiteParams, shopRazorpayConnectController.disconnect);
shopRouter.post(
  "/payments/razorpay/qr-check",
  websiteParams,
  rateLimit({ name: "shop-razorpay-qr-check", max: 30, windowSeconds: 60 * 60 }),
  shopRazorpayConnectController.checkQrCodes,
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
