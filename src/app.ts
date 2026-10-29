import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler, notFoundHandler } from "./common/middleware/error-handler.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import authRouter from "./modules/auth/auth.routes.js";
import { domainSyncRouter, websiteDomainsRouter } from "./modules/domains/domain.routes.js";
import clientsRouter from "./modules/clients/client.routes.js";
import emailSettingsRouter from "./modules/email/email.routes.js";
import clientEmailRouter from "./modules/email/client-email.routes.js";
import aiSettingsRouter from "./modules/admin-settings/ai-settings.routes.js";
import clientAiSettingsRouter from "./modules/admin-settings/client-ai-settings.routes.js";
import aiUsageRouter from "./modules/admin-ai-usage/ai-usage.routes.js";
import healthRouter from "./modules/health/health.routes.js";
import {
  adminHostingRouter,
  hostingSettingsRouter,
  publicPricingRouter,
  websiteHostingRouter,
} from "./modules/hosting/hosting.routes.js";
import notificationsRouter from "./modules/notifications/notification.routes.js";
import mediaRouter from "./modules/media/media.routes.js";
import adminTemplatesRouter from "./modules/websites/admin-template.routes.js";
import publicTemplatesRouter from "./modules/websites/public-template.routes.js";
import publicSiteRouter from "./modules/websites/public-site.routes.js";
import templateCategoriesRouter from "./modules/websites/template-category.routes.js";
import shopRouter, { shopRazorpayWebhookRouter } from "./modules/shop/shop.routes.js";
import shopAuthRouter from "./modules/shop/shop-auth.routes.js";
import websitesRouter from "./modules/websites/website.routes.js";
import adminEnquiriesRouter from "./modules/contact/admin-enquiry.routes.js";
import contactRouter from "./modules/contact/contact.routes.js";
import {
  adminWalletRouter,
  billingSettingsRouter,
  paymentSettingsRouter,
  razorpayWebhookRouter,
  walletRouter,
} from "./modules/wallet/wallet.routes.js";


const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY ? 1 : false);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", "https:", "http:"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: env.CORS_ORIGIN?.split(",").map((value) => value.trim()) ?? false,
    credentials: true,
  }),
);
app.use("/api/payments/razorpay/webhook", razorpayWebhookRouter);
app.use("/api/shop/razorpay/webhook", shopRazorpayWebhookRouter);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    logger.info(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - started,
      },
      "request",
    );
  });
  next();
});

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin/settings/email", emailSettingsRouter);
app.use("/api/admin/settings/ai", aiSettingsRouter);
app.use("/api/account/ai-settings", clientAiSettingsRouter);
app.use("/api/account/email", clientEmailRouter);
app.use("/api/account/wallet", walletRouter);
app.use("/api/admin/settings/payments", paymentSettingsRouter);
app.use("/api/admin/settings/billing", billingSettingsRouter);
app.use("/api/admin/settings/hosting", hostingSettingsRouter);
app.use("/api/admin/wallet", adminWalletRouter);
app.use("/api/admin/hosting", adminHostingRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin/clients", clientsRouter);
app.use("/api/admin/enquiries", adminEnquiriesRouter);
app.use("/api/admin/ai-usage", aiUsageRouter);
app.use("/api/admin/templates", adminTemplatesRouter);
app.use("/api/admin/template-categories", templateCategoriesRouter);
app.use("/api/templates", publicTemplatesRouter);
app.use("/api/pricing", publicPricingRouter);
app.use("/api/internal/domains", domainSyncRouter);
app.use("/api/websites/:id/domains", websiteDomainsRouter);
app.use("/api/websites/:id/hosting", websiteHostingRouter);
app.use("/api/shop/:websiteId/auth", shopAuthRouter);
app.use("/api/websites/:id/shop", shopRouter);
app.use("/api/websites", websitesRouter);
app.use("/api/media", mediaRouter);
app.use("/api/contact", contactRouter);

app.use(publicSiteRouter);

app.use(notFoundHandler);

app.use(errorHandler);

export default app;
