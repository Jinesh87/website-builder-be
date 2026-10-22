import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { hostingController } from "./controllers/hosting.controller.js";
import {
  backfillSchema,
  clientParamsSchema,
  clientPricesSchema,
  clientsOverviewQuerySchema,
  collectHostingSchema,
  payHostingSchema,
  paymentsCsvQuerySchema,
  paymentsQuerySchema,
  subscriptionsQuerySchema,
  updatePlanSchema,
  updateSettingsSchema,
  websiteParamsSchema,
} from "./validators/hosting.validator.js";

/** Mounted at /api/websites/:id/hosting. Clients reach only their own websites (checked in the service). */
export const websiteHostingRouter = Router({ mergeParams: true });
const byWebsite = validate(websiteParamsSchema, "params");

websiteHostingRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT));
websiteHostingRouter.get("/", byWebsite, hostingController.get);
websiteHostingRouter.patch("/", byWebsite, validate(updatePlanSchema), hostingController.updatePlan);
websiteHostingRouter.post(
  "/pay",
  authorize(UserRole.CLIENT),
  byWebsite,
  rateLimit({ name: "hosting-pay", max: 30, windowSeconds: 60 * 60 }),
  validate(payHostingSchema),
  hostingController.pay,
);
websiteHostingRouter.post(
  "/collect",
  authorize(UserRole.SUPER_ADMIN),
  byWebsite,
  rateLimit({ name: "hosting-collect", max: 60, windowSeconds: 60 * 60 }),
  validate(collectHostingSchema),
  hostingController.collect,
);

/** Public: the platform's default hosting prices for the marketing pricing page. */
export const publicPricingRouter = Router();
publicPricingRouter.use(rateLimit({ name: "public-pricing", max: 120, windowSeconds: 60 }));
publicPricingRouter.get("/", hostingController.publicPricing);

/** Super admin: global hosting prices and billing rules. */
export const hostingSettingsRouter = Router();
hostingSettingsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));
hostingSettingsRouter.get("/", hostingController.getSettings);
hostingSettingsRouter.put("/", validate(updateSettingsSchema), hostingController.updateSettings);
hostingSettingsRouter.post(
  "/backfill",
  rateLimit({ name: "hosting-backfill", max: 10, windowSeconds: 60 * 60 }),
  validate(backfillSchema),
  hostingController.backfill,
);

/** Super admin: plans and payments across clients, and per-client hosting. */
export const adminHostingRouter = Router();
const byClient = validate(clientParamsSchema, "params");
adminHostingRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));
adminHostingRouter.get("/subscriptions", validate(subscriptionsQuerySchema, "query"), hostingController.subscriptions);
adminHostingRouter.get("/payments", validate(paymentsQuerySchema, "query"), hostingController.payments);
adminHostingRouter.get(
  "/payments.csv",
  rateLimit({ name: "hosting-payments-csv", max: 30, windowSeconds: 60 * 60 }),
  validate(paymentsCsvQuerySchema, "query"),
  hostingController.paymentsCsv,
);
adminHostingRouter.get("/clients", validate(clientsOverviewQuerySchema, "query"), hostingController.clients);
adminHostingRouter.get("/clients/:clientId", byClient, hostingController.clientHosting);
adminHostingRouter.put("/clients/:clientId/prices", byClient, validate(clientPricesSchema), hostingController.updateClientPrices);
