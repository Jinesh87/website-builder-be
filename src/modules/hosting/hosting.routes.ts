import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { hostingController } from "./controllers/hosting.controller.js";
import {
  backfillSchema,
  clientParamsSchema,
  clientsOverviewQuerySchema,
  collectHostingSchema,
  confirmCheckoutSchema,
  packageParamsSchema,
  paymentsCsvQuerySchema,
  paymentsQuerySchema,
  planChoiceSchema,
  subscriptionsQuerySchema,
  updatePackageSchema,
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
  "/checkout",
  authorize(UserRole.CLIENT),
  byWebsite,
  rateLimit({ name: "hosting-checkout", max: 30, windowSeconds: 60 * 60 }),
  validate(planChoiceSchema),
  hostingController.checkout,
);
websiteHostingRouter.post(
  "/checkout/verify",
  authorize(UserRole.CLIENT),
  byWebsite,
  rateLimit({ name: "hosting-checkout-verify", max: 60, windowSeconds: 60 * 60 }),
  validate(confirmCheckoutSchema),
  hostingController.confirmCheckout,
);
websiteHostingRouter.post(
  "/pay",
  authorize(UserRole.CLIENT),
  byWebsite,
  rateLimit({ name: "hosting-pay", max: 30, windowSeconds: 60 * 60 }),
  validate(planChoiceSchema),
  hostingController.payWithConnects,
);
websiteHostingRouter.post(
  "/collect",
  authorize(UserRole.SUPER_ADMIN),
  byWebsite,
  rateLimit({ name: "hosting-collect", max: 60, windowSeconds: 60 * 60 }),
  validate(collectHostingSchema),
  hostingController.collect,
);

/** Public: the packages and list prices for the marketing pricing page. */
export const publicPricingRouter = Router();
publicPricingRouter.use(rateLimit({ name: "public-pricing", max: 120, windowSeconds: 60 }));
publicPricingRouter.get("/", hostingController.publicPricing);

/** Super admin: hosting packages and billing rules. */
export const hostingSettingsRouter = Router();
hostingSettingsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));
hostingSettingsRouter.get("/", hostingController.getSettings);
hostingSettingsRouter.put("/", validate(updateSettingsSchema), hostingController.updateSettings);
hostingSettingsRouter.put(
  "/packages/:packageId",
  validate(packageParamsSchema, "params"),
  validate(updatePackageSchema),
  hostingController.updatePackage,
);
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
