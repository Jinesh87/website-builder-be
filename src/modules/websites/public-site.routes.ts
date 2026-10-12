import { Router } from "express";
import { env } from "../../config/env.js";
import { publicSiteController } from "./controllers/public-site.controller.js";

export const publicSiteRouter = Router();

// Public contact form endpoint for client websites
publicSiteRouter.post("/api/public/site/:subdomain/contact", publicSiteController.submitContact);

// 1. Explicit path routes for previews & local testing (/live/:subdomain and inner slugs)
publicSiteRouter.use("/live/:subdomain", (req, res, next) => {
  if (req.method === "POST" && (req.path === "/contact" || req.path === "/api/contact")) {
    return publicSiteController.submitContact(req, res, next);
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
    return publicSiteController.submitContact(req, res, next);
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
