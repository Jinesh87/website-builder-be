import { Router, type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { env } from "../../config/env.js";
import { publicSiteController } from "./controllers/public-site.controller.js";

export const publicSiteRouter = Router();

const contactLimit = rateLimit({ name: "site-contact", max: 10, windowSeconds: 10 * 60 });
const submitContact = (req: Request, res: Response, next: NextFunction) =>
  contactLimit(req, res, (error?: unknown) => (error ? next(error) : publicSiteController.submitContact(req, res, next)));

// Public contact form endpoint for client websites
publicSiteRouter.post("/api/public/site/:subdomain/contact", submitContact);

// Shared stylesheet and runtime of the live renderer, identical for every site.
publicSiteRouter.get("/_wb/site.css", publicSiteController.serveAsset("css"));
publicSiteRouter.get("/_wb/site.js", publicSiteController.serveAsset("js"));

// 1. Explicit path routes for previews & local testing (/live/:subdomain and inner slugs)
publicSiteRouter.use("/live/:subdomain", (req, res, next) => {
  if (req.method === "POST" && (req.path === "/contact" || req.path === "/api/contact")) {
    return submitContact(req, res, next);
  }
  if (req.path === "/sitemap.xml") {
    return publicSiteController.serveSitemap(req, res, next);
  }
  if (req.path === "/robots.txt") {
    return publicSiteController.serveRobots(req, res, next);
  }
  return publicSiteController.servePage(req, res, next);
});

// 2. Production Host-based routing (e.g. https://<subdomain>.<PUBLIC_SITE_DOMAIN> or custom domain)
publicSiteRouter.use((req, res, next) => {
  const host = (req.hostname || req.headers.host || "").toLowerCase().split(":")[0];
  const publicDomain = env.PUBLIC_SITE_DOMAIN;
  const isCustomOrSubdomain =
    host &&
    host !== "localhost" &&
    host !== "127.0.0.1" &&
    (host.endsWith(`.${publicDomain}`) ? !["www", "api", "app"].includes(host.replace(`.${publicDomain}`, "")) : true);

  if (!isCustomOrSubdomain) {
    return next();
  }

  // Intercept contact submissions on the host domain
  if (req.method === "POST" && (req.path === "/contact" || req.path === "/api/contact")) {
    return submitContact(req, res, next);
  }

  // Intercept root sitemap & robots for the domain
  if (req.path === "/sitemap.xml") {
    return publicSiteController.serveSitemap(req, res, next);
  }
  if (req.path === "/robots.txt") {
    return publicSiteController.serveRobots(req, res, next);
  }

  // Skip internal API routes if any match
  if (req.path.startsWith("/api/")) {
    return next();
  }

  return publicSiteController.servePage(req, res, next);
});

export default publicSiteRouter;
