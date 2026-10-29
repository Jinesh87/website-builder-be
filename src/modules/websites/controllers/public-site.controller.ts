import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../../common/errors/AppError.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { clientEmailService, type WebsiteLead } from "../../email/services/client-email.service.js";
import { emailService } from "../../email/services/email.service.js";
import {
  findContactFormFields,
  leadFromEntries,
  validateContactSubmission,
  type ContactLeadContent,
} from "../services/contact-submission.js";
import { liveSiteEngineService } from "../services/live-site-engine.service.js";
import type { PublicShopListQuery } from "../../shop/types/shop.types.js";
import { siteRendererClient } from "../services/site-renderer.client.js";
import type { PublishSnapshot } from "../types/website.types.js";

const THANK_YOU = "Thank you! Your message has been received.";
/** Hidden input on contact forms; people never fill it, form-filling bots usually do. */
const HONEYPOT_FIELD = "_wb_hp";

/** Client sites embed videos, maps and images from anywhere, so they get a wider policy than the app. */
const LIVE_SITE_CSP = [
  "default-src 'self'",
  "img-src * data: blob:",
  "media-src * data: blob:",
  // Razorpay Checkout opens frames on api/checkout hosts.
  "frame-src https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://cdn.razorpay.com",
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://checkout.razorpay.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
].join("; ");

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
      const selection: Record<string, string> = {};
      const listQuery: PublicShopListQuery = {};
      for (const [key, value] of Object.entries(req.query)) {
        const text = Array.isArray(value) ? value[0] : value;
        if (typeof text !== "string" || !text || key.length > 40) continue;
        if (key === "q" && text.length <= 120) listQuery.search = text;
        else if (key === "cat" && text.length <= 80) listQuery.category = text;
        else if (key === "sort" && text.length <= 20) listQuery.sort = text;
        else if (key === "page" && text.length <= 6) listQuery.page = Number(text);
        else if (key === "per" && text.length <= 3) listQuery.pageSize = Number(text);
        else if (text.length <= 40) selection[key] = text;
      }
      const result = await liveSiteEngineService.renderPage(identifier, slug, req.baseUrl || "", selection, listQuery);

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
      res.setHeader("Content-Security-Policy", LIVE_SITE_CSP);
      // Browsers revalidate every visit (cheap 304s via ETag), so a new publish shows up immediately.
      res.setHeader("Cache-Control", result.transient ? "no-store" : "public, no-cache");
      res.send(result.html);
    } catch (error) {
      next(error);
    }
  };

  /** /_wb/site.css and /_wb/site.js; a request carrying the current ?v= is cached for good. */
  serveAsset = (kind: "css" | "js") => async (req: Request, res: Response) => {
    try {
      const assets = await siteRendererClient.assets();
      res.setHeader("Content-Type", kind === "css" ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8");
      res.setHeader(
        "Cache-Control",
        req.query.v === assets.version ? "public, max-age=31536000, immutable" : "public, max-age=300",
      );
      res.send(assets[kind]);
    } catch {
      res.status(503).setHeader("Retry-After", "30").type("text/plain").send("Site assets are temporarily unavailable.");
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

      const body: Record<string, unknown> = req.body && typeof req.body === "object" ? req.body : {};
      if (typeof body[HONEYPOT_FIELD] === "string" && body[HONEYPOT_FIELD].trim()) {
        logger.info({ websiteId: website.id }, "Contact submission dropped by the spam trap");
        return res.status(200).json({ ok: true, message: THANK_YOU });
      }

      let content: ContactLeadContent;
      if (typeof body.sectionId === "string" && body.fields !== undefined) {
        const snapshot = website.liveVersion?.snapshot as unknown as PublishSnapshot | null;
        const formFields = findContactFormFields(snapshot, body.sectionId);
        if (!formFields) {
          return res.status(409).json({ error: "This form was just updated. Refresh the page and try again." });
        }
        const result = validateContactSubmission(formFields, body.fields);
        if (!result.ok) {
          return res.status(400).json({ error: result.error });
        }
        content = leadFromEntries(result.entries);
      } else {
        const { name, email, phone, message } = body;
        if (!name || typeof name !== "string" || !name.trim()) {
          return res.status(400).json({ error: "Your name is required." });
        }
        if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          return res.status(400).json({ error: "A valid email address is required." });
        }
        if (!message || typeof message !== "string" || !message.trim()) {
          return res.status(400).json({ error: "A message is required." });
        }
        content = {
          senderName: name.trim(),
          senderEmail: email.trim(),
          senderPhone: typeof phone === "string" ? phone.trim() : undefined,
          message: message.trim(),
          fields: [],
        };
      }

      // Identify destination recipient
      let targetRecipient = website.contactEmail?.trim();
      if (!targetRecipient) {
        const client = await prisma.client.findUnique({
          where: { id: website.clientId },
          include: { users: { select: { email: true } } },
        });
        targetRecipient = client?.users?.[0]?.email ?? undefined;
      }

      const siteName = website.businessName || website.name;
      logger.info(
        { websiteId: website.id, senderEmail: content.senderEmail, fieldCount: content.fields.length, targetRecipient },
        "Contact lead submitted",
      );

      if (targetRecipient) {
        const lead: WebsiteLead = { to: targetRecipient, siteName, ...content };
        try {
          const sentByClient = await clientEmailService.sendWebsiteLead(website.clientId, lead);
          if (!sentByClient) await emailService.sendContactFormLead(lead);
        } catch (mailErr) {
          logger.warn({ err: mailErr, websiteId: website.id }, "Failed to dispatch contact form notification email");
          return next(mailErr);
        }
      } else {
        return next(new AppError(422, "This site has no contact email yet. Add one in the website settings.", "CONTACT_EMAIL_MISSING"));
      }

      return res.status(200).json({ ok: true, message: THANK_YOU });
    } catch (error) {
      next(error);
    }
  };
}

export const publicSiteController = new PublicSiteController();
