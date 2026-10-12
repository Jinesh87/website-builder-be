import type { Request, Response, NextFunction } from "express";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { emailService } from "../../email/services/email.service.js";
import { liveSiteEngineService } from "../services/live-site-engine.service.js";

function extractIdentifier(req: Request): string {
  // 1. Explicit path parameter (e.g. /site/:subdomain or /live/:subdomain)
  if (req.params.subdomain) {
    const raw = req.params.subdomain;
    return Array.isArray(raw) ? raw[0] : raw;
  }

  // 2. Host-based routing (e.g. subdomain.bytezora.site or custom domain)
  const host = (req.hostname || req.headers.host || "").toLowerCase().split(":")[0];
  const publicDomain = env.PUBLIC_SITE_DOMAIN;
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    if (host.endsWith(`.${publicDomain}`)) {
      const sub = host.replace(`.${publicDomain}`, "");
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

      if (result.redirectUrl) {
        const queryString = req.url && req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
        const targetUrl =
          result.redirectUrl.startsWith("http://") || result.redirectUrl.startsWith("https://")
            ? result.redirectUrl
            : `${req.baseUrl || ""}${result.redirectUrl}`;
        return res.redirect(result.statusCode || 301, `${targetUrl}${queryString}`);
      }

      if (result.statusCode === 404) {
        res.status(404);
        res.setHeader("Content-Type", result.contentType);
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
        return res.send(result.html);
      }

      res.status(result.statusCode);
      res.setHeader("Content-Type", result.contentType);
      res.setHeader("X-Robots-Tag", "all");
      res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400");
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

  submitContact = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identifier = extractIdentifier(req);
      if (!identifier) {
        return res.status(400).json({ error: "Missing site identifier" });
      }

      const website = await liveSiteEngineService.resolveWebsite(identifier);
      if (!website) {
        return res.status(404).json({ error: "Website not found or not published" });
      }

      const { name, email, phone, message } = req.body || {};
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Your name is required." });
      }
      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ error: "A valid email address is required." });
      }
      if (!message || typeof message !== "string" || !message.trim()) {
        return res.status(400).json({ error: "A message is required." });
      }

      // Identify destination recipient
      let targetRecipient = website.contactEmail?.trim();
      if (!targetRecipient) {
        const client = await prisma.client.findUnique({
          where: { id: website.clientId },
          include: { users: { select: { email: true } } },
        });
        targetRecipient = client?.users?.[0]?.email;
      }

      const siteName = website.businessName || website.name;
      logger.info(
        { websiteId: website.id, senderEmail: email.trim(), targetRecipient },
        "Contact lead submitted",
      );

      if (targetRecipient) {
        try {
          await emailService.sendContactFormLead({
            to: targetRecipient,
            siteName,
            senderName: name.trim(),
            senderEmail: email.trim(),
            senderPhone: typeof phone === "string" ? phone.trim() : undefined,
            message: message.trim(),
          });
        } catch (mailErr) {
          logger.warn(
            { err: mailErr, websiteId: website.id },
            "Failed to dispatch contact form notification email, but lead was logged safely.",
          );
        }
      }

      return res.status(200).json({
        ok: true,
        message: "Thank you! Your message has been received.",
      });
    } catch (error) {
      next(error);
    }
  };
}

export const publicSiteController = new PublicSiteController();
