import { Router } from "express";
import { publicSiteController } from "./controllers/public-site.controller.js";

export const publicSiteRouter = Router();

// 1. Explicit path routes for previews & local testing
publicSiteRouter.get("/live/:subdomain/sitemap.xml", publicSiteController.serveSitemap);
publicSiteRouter.get("/live/:subdomain/robots.txt", publicSiteController.serveRobots);
publicSiteRouter.get("/live/:subdomain", publicSiteController.servePage);
publicSiteRouter.get("/live/:subdomain/*", publicSiteController.servePage);

// 2. Production Host-based routing (e.g. https://<subdomain>.bytezora.site or custom domain)
publicSiteRouter.use((req, res, next) => {
  const host = (req.hostname || req.headers.host || "").toLowerCase().split(":")[0];
  const isCustomOrSubdomain =
    host &&
    host !== "localhost" &&
    host !== "127.0.0.1" &&
    (host.endsWith(".bytezora.site") ? !["www", "api", "app"].includes(host.replace(".bytezora.site", "")) : true);

  if (!isCustomOrSubdomain) {
    return next();
  }

  // Intercept root sitemap & robots for the domain
  if (req.path === "/sitemap.xml") {
    return publicSiteController.serveSitemap(req, res, next);
  }
  if (req.path === "/robots.txt") {
    return publicSiteController.serveRobots(req, res, next);
  }

  // Skip API routes if any match
  if (req.path.startsWith("/api/")) {
    return next();
  }

  return publicSiteController.servePage(req, res, next);
});

export default publicSiteRouter;
