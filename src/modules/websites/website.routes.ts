import express from "express";
import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import {
  authenticate,
  authorize,
} from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { receiveFile } from "../../common/middleware/receive-file.js";
import { validate } from "../../common/middleware/validate.js";
import { websiteController } from "./controllers/website.controller.js";
import {
  createAiWebsiteSchema,
  createWebsiteSchema,
  generateAiSuggestionSchema,
  generatePageSeoSchema,
  importHtmlWebsiteSchema,
  reviewPageSeoContentSchema,
  listTemplatesQuerySchema,
  listWebsitesQuerySchema,
  pageContentParamsSchema,
  publishSchema,
  saveDraftSchema,
  savePageContentSchema,
  savedSectionParamsSchema,
  saveSectionSchema,
  saveTemplateSchema,
  templateIdParamsSchema,
  updateTemplateSchema,
  updateWebsiteSchema,
  websiteIdParamsSchema,
  websiteVersionParamsSchema,
} from "./validators/website.validator.js";
import { rebuildImportedHtmlSchema } from "./validators/imported-html-code.validator.js";

const IMPORT_MAX_BYTES = 50 * 1024 * 1024;

const receiveImportFile = receiveFile({
  maxBytes: IMPORT_MAX_BYTES,
  fields: 20,
  fieldSize: 8 * 1024,
  tooLarge: (mb) => ({ message: `Import file must be under ${mb} MB.`, code: "IMPORT_TOO_LARGE" }),
});

/** Shared by Super Admin and clients; the service limits clients to their own websites and templates. */
const websitesRouter = Router();
const byId = validate(websiteIdParamsSchema, "params");
const byTemplateId = validate(templateIdParamsSchema, "params");

// Public crawler endpoints for search engines (no auth required)
websitesRouter.get(
  "/public/:subdomain/sitemap.xml",
  websiteController.getPublicSitemapXml,
);
websitesRouter.get(
  "/public/:subdomain/robots.txt",
  websiteController.getPublicRobotsTxt,
);

websitesRouter.use(
  authenticate,
  authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT, UserRole.PARTNER),
);

/**
 * Editor saves send the whole draft, and imported HTML blocks carry their own HTML and CSS, so these
 * routes accept up to 25 MB. The app-wide parser skips them (app.ts EDITOR_SAVE_PATH), so the body
 * is only read after sign-in. Behind nginx, the API server block needs `client_max_body_size 25m;`.
 */
export const EDITOR_SAVE_BODY_LIMIT = "25mb";
const editorSaveBody = express.json({ limit: EDITOR_SAVE_BODY_LIMIT });

websitesRouter.get(
  "/templates",
  validate(listTemplatesQuerySchema, "query"),
  websiteController.listTemplates,
);
websitesRouter.patch(
  "/templates/:templateId",
  byTemplateId,
  validate(updateTemplateSchema),
  websiteController.updateTemplate,
);
websitesRouter.delete(
  "/templates/:templateId",
  byTemplateId,
  websiteController.deleteTemplate,
);
websitesRouter.get("/themes", websiteController.listThemes);
websitesRouter.get(
  "/",
  validate(listWebsitesQuerySchema, "query"),
  websiteController.list,
);
websitesRouter.post(
  "/",
  rateLimit({ name: "website-create", max: 30, windowSeconds: 60 * 60 }),
  validate(createWebsiteSchema),
  websiteController.create,
);
websitesRouter.post(
  "/ai",
  rateLimit({ name: "website-ai-create", max: 10, windowSeconds: 60 * 60 }),
  validate(createAiWebsiteSchema),
  websiteController.createWithAi,
);
websitesRouter.post(
  "/import-html",
  rateLimit({ name: "website-import-html", max: 10, windowSeconds: 60 * 60 }),
  receiveImportFile,
  validate(importHtmlWebsiteSchema),
  websiteController.importHtml,
);
websitesRouter.get("/:id", byId, websiteController.get);
websitesRouter.get("/:id/generation", byId, websiteController.generationStatus);
websitesRouter.post(
  "/:id/generation/retry",
  byId,
  rateLimit({ name: "website-ai-create", max: 10, windowSeconds: 60 * 60 }),
  websiteController.retryGeneration,
);
websitesRouter.delete(
  "/:id/generation",
  byId,
  websiteController.dismissGeneration,
);
websitesRouter.patch(
  "/:id",
  byId,
  validate(updateWebsiteSchema),
  websiteController.update,
);
websitesRouter.delete("/:id", byId, websiteController.delete);
websitesRouter.put(
  "/:id/draft",
  byId,
  editorSaveBody,
  validate(saveDraftSchema),
  websiteController.saveDraft,
);
websitesRouter.post(
  "/:id/imported-html/rebuild",
  byId,
  rateLimit({ name: "imported-html-rebuild", max: 120, windowSeconds: 60 }),
  editorSaveBody,
  validate(rebuildImportedHtmlSchema),
  websiteController.rebuildImportedHtml,
);
websitesRouter.put(
  "/:id/pages/:pageId/content",
  validate(pageContentParamsSchema, "params"),
  rateLimit({ name: "page-autosave", max: 240, windowSeconds: 60 }),
  editorSaveBody,
  validate(savePageContentSchema),
  websiteController.savePageContent,
);
websitesRouter.post(
  "/:id/publish",
  byId,
  rateLimit({ name: "website-publish", max: 30, windowSeconds: 60 * 60 }),
  validate(publishSchema),
  websiteController.publish,
);
websitesRouter.post("/:id/unpublish", byId, websiteController.unpublish);
websitesRouter.get("/:id/versions", byId, websiteController.listVersions);
websitesRouter.post(
  "/:id/versions/:versionId/restore",
  validate(websiteVersionParamsSchema, "params"),
  websiteController.restoreVersion,
);
websitesRouter.post(
  "/:id/templates",
  byId,
  rateLimit({ name: "template-save", max: 30, windowSeconds: 60 * 60 }),
  validate(saveTemplateSchema),
  websiteController.saveAsTemplate,
);
websitesRouter.get(
  "/:id/saved-sections",
  byId,
  websiteController.listSavedSections,
);
websitesRouter.post(
  "/:id/saved-sections",
  byId,
  validate(saveSectionSchema),
  websiteController.saveSection,
);
websitesRouter.delete(
  "/:id/saved-sections/:savedSectionId",
  validate(savedSectionParamsSchema, "params"),
  websiteController.deleteSavedSection,
);
websitesRouter.post(
  "/:id/ai/generate",
  byId,
  rateLimit({ name: "website-ai-generate", max: 60, windowSeconds: 60 }),
  validate(generateAiSuggestionSchema),
  websiteController.generateAiSuggestion,
);

websitesRouter.post(
  "/:id/pages/:pageId/seo/generate",
  validate(pageContentParamsSchema, "params"),
  rateLimit({ name: "website-ai-generate", max: 60, windowSeconds: 60 }),
  validate(generatePageSeoSchema),
  websiteController.generatePageSeo,
);

websitesRouter.post(
  "/:id/pages/:pageId/seo/content-review",
  validate(pageContentParamsSchema, "params"),
  rateLimit({ name: "website-ai-generate", max: 60, windowSeconds: 60 }),
  validate(reviewPageSeoContentSchema),
  websiteController.reviewPageSeoContent,
);

websitesRouter.get(
  "/:id/seo/sitemap.xml",
  byId,
  websiteController.getSitemapXml,
);
websitesRouter.get("/:id/seo/robots.txt", byId, websiteController.getRobotsTxt);

websitesRouter.get("/:id/ai/sessions", byId, websiteController.listAiSessions);
websitesRouter.post("/:id/ai/sessions", byId, websiteController.saveAiSession);
websitesRouter.delete(
  "/:id/ai/sessions/:sessionId",
  byId,
  websiteController.deleteAiSession,
);
websitesRouter.delete(
  "/:id/ai/sessions",
  byId,
  websiteController.clearAiSessions,
);

export default websitesRouter;
