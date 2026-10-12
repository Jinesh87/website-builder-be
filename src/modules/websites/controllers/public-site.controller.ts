import type { Request, Response, NextFunction } from "express";
import { liveSiteEngineService } from "../services/live-site-engine.service.js";

function extractIdentifier(req: Request): string {
  // 1. Explicit path parameter (e.g. /site/:subdomain or /live/:subdomain)
  if (req.params.subdomain) {
    const raw = req.params.subdomain;
    return Array.isArray(raw) ? raw[0] : raw;
  }


  // 2. Host-based routing (e.g. subdomain.bytezora.site or custom domain)
  const host = (req.hostname || req.headers.host || "").toLowerCase().split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    if (host.endsWith(".bytezora.site")) {
      const sub = host.replace(".bytezora.site", "");
      if (sub && sub !== "www" && sub !== "api" && sub !== "app") {
        return sub;
      }
    }
    // Custom domain
    return host;
  }

  return "";
}

export class PublicSiteController {
  servePage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = extractIdentifier(req);
      if (!identifier) {
        return next();
      }

      const slug = req.path || "/";
      const result = await liveSiteEngineService.renderPage(identifier, slug);

      res.status(result.statusCode);
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("X-Robots-Tag", "all");
      res.send(result.html);
    } catch (error) {
      next(error);
    }
  };

  serveSitemap = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = extractIdentifier(req);
      if (!identifier) {
        return next();
      }

      const result = await liveSiteEngineService.renderSitemap(identifier);
      res.status(result.statusCode);
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("X-Robots-Tag", "all");
      res.send(result.xml);
    } catch (error) {
      next(error);
    }
  };

  serveRobots = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = extractIdentifier(req);
      if (!identifier) {
        return next();
      }

      const txt = await liveSiteEngineService.renderRobots(identifier);
      res.status(200);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("X-Robots-Tag", "all");
      res.send(txt);
    } catch (error) {
      next(error);
    }
  };
}

export const publicSiteController = new PublicSiteController();
