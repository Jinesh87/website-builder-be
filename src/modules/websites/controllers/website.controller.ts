import type { NextFunction, Request, Response } from "express";
import { BuilderType } from "../../../common/constants/website.js";
import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import type { LayoutSlot } from "../ai/ai-ops.js";
import { aiGeneratorService, type AiSuggestionPayload, type GenerateAiOptions } from "../services/ai-generator.service.js";
import { aiChatService } from "../services/ai-chat.service.js";
import { aiSeoService } from "../services/ai-seo.service.js";
import { aiSiteCopilotService } from "../services/ai-site-copilot.service.js";
import { isEditableSectionType } from "../services/site-generator.js";
import { liveSiteEngineService } from "../services/live-site-engine.service.js";
import { websiteGenerationService } from "../services/website-generation.service.js";
import { websiteService } from "../services/website.service.js";
import type { TemplateListQuery, WebsiteListQuery } from "../types/website.types.js";


type IdParams = { id: string };
type TemplateParams = { templateId: string };
type TemplateKeyParams = { key: string };
type SavedSectionParams = { id: string; savedSectionId: string };
type PageParams = { id: string; pageId: string };

const NDJSON = "application/x-ndjson";

type AiStreamEvent =
  | { type: "plan"; layout: LayoutSlot[] }
  | { type: "result"; suggestion: AiSuggestionPayload }
  | { type: "error"; error: { code: string; message: string } };

export class WebsiteController {
  listTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ templates: await websiteService.listTemplates(req.query as TemplateListQuery, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  listPlatformTemplates = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ templates: await websiteService.listPlatformTemplates() });
    } catch (error) {
      next(error);
    }
  };

  getTemplatePreview = async (req: Request<TemplateKeyParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await websiteService.getTemplatePreview(req.params.key));
    } catch (error) {
      next(error);
    }
  };

  saveAsTemplate = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ template: await websiteService.saveAsTemplate(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  updateTemplate = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ template: await websiteService.updateTemplate(req.params.templateId, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  deleteTemplate = async (req: Request<TemplateParams>, res: Response, next: NextFunction) => {
    try {
      await websiteService.deleteTemplate(req.params.templateId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  listSavedSections = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ sections: await websiteService.listSavedSections(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  saveSection = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ section: await websiteService.saveSection(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  deleteSavedSection = async (req: Request<SavedSectionParams>, res: Response, next: NextFunction) => {
    try {
      await websiteService.deleteSavedSection(req.params.id, req.params.savedSectionId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  listThemes = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ themes: await websiteService.listThemes() });
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await websiteService.list(req.query as unknown as WebsiteListQuery, req.user!));
    } catch (error) {
      next(error);
    }
  };

  get = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ website: await websiteService.get(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ website: await websiteService.create(req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  createWithAi = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ website: await websiteGenerationService.createWithAi(req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  generationStatus = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ generation: await websiteGenerationService.status(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  retryGeneration = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ generation: await websiteGenerationService.retry(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  dismissGeneration = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      await websiteGenerationService.dismiss(req.params.id, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ website: await websiteService.update(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      await websiteService.delete(req.params.id, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  saveDraft = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ website: await websiteService.saveDraft(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  savePageContent = async (req: Request<PageParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await websiteService.savePageContent(req.params.id, req.params.pageId, req.body, req.user!));
    } catch (error) {
      next(error);
    }
  };

  publish = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ website: await websiteService.publish(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  unpublish = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ website: await websiteService.unpublish(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  listVersions = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ versions: await websiteService.listVersions(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  generateAiSuggestion = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      // Ensure user has access to this website
      const website = await websiteService.get(req.params.id, req.user!);
      const abortController = new AbortController();

      // `res` (not `req`) "close" means the client disconnected; `req` closes once the body is read.
      res.on("close", () => {
        if (!res.writableEnded) {
          abortController.abort();
        }
      });

      const body = req.body as GenerateAiOptions;
      const selectedType = body.scope === "section" ? body.currentSection?.type : undefined;
      const useCopilot =
        website.builderType === BuilderType.AI && (selectedType === undefined || isEditableSectionType(selectedType));

      const generate = (onPlan?: (layout: LayoutSlot[]) => void): Promise<AiSuggestionPayload> =>
        useCopilot
          ? aiSiteCopilotService.generate({
              ...body,
              website,
              userId: req.user?.id ?? null,
              signal: abortController.signal,
            })
          : aiGeneratorService.generate(
              {
                ...body,
                website,
                clientId: website.clientId,
                websiteId: website.id,
                userId: req.user?.id,
                signal: abortController.signal,
              },
              onPlan,
            );

      if (!req.get("accept")?.includes(NDJSON)) {
        res.json({ suggestion: await generate() });
        return;
      }

      // NDJSON stream: a `plan` event (section positions) first, then the `result`.
      const send = (event: AiStreamEvent) => {
        if (!res.headersSent) {
          res.status(200).type(NDJSON).set({ "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
        }
        res.write(`${JSON.stringify(event)}\n`);
      };

      try {
        const suggestion = await generate((layout) => send({ type: "plan", layout }));
        send({ type: "result", suggestion });
        res.end();
      } catch (error) {
        if (abortController.signal.aborted) {
          if (!res.headersSent) {
            res.status(499).json({ error: { code: "CANCELLED", message: "AI generation cancelled." } });
          } else {
            res.end();
          }
          return;
        }

        if (!res.headersSent) throw error;
        // Headers are already sent, so the error travels as the final event instead of an HTTP status.
        const appError = error instanceof AppError ? error : null;
        if (!appError || appError.statusCode >= 500) logger.error({ err: error }, "AI generation failed mid-stream");
        send({
          type: "error",
          error: {
            code: appError?.code ?? "INTERNAL_ERROR",
            message: appError?.message ?? "Internal server error",
          },
        });
        res.end();
      }
    } catch (error) {
      next(error);
    }
  };

  listAiSessions = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ sessions: await aiChatService.listSessions(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  saveAiSession = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const session = await aiChatService.saveSession(req.params.id, req.body, req.user!);
      res.json({ session });
    } catch (error) {
      next(error);
    }
  };

  deleteAiSession = async (req: Request<{ id: string; sessionId: string }>, res: Response, next: NextFunction) => {
    try {
      await aiChatService.deleteSession(req.params.id, req.params.sessionId, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  clearAiSessions = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      await aiChatService.clearSessions(req.params.id, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  generatePageSeo = async (req: Request<PageParams>, res: Response, next: NextFunction) => {
    try {
      const result = await aiSeoService.generatePageSeo(req.params.id, req.params.pageId, req.body, req.user!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  reviewPageSeoContent = async (req: Request<PageParams>, res: Response, next: NextFunction) => {
    try {
      const result = await aiSeoService.reviewPageSeoContent(req.params.id, req.params.pageId, req.body, req.user!);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  getSitemapXml = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const xml = await aiSeoService.getSitemapXml(req.params.id, req.user!);
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.send(xml);
    } catch (error) {
      next(error);
    }
  };

  getRobotsTxt = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const txt = await aiSeoService.getRobotsTxt(req.params.id, req.user!);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(txt);
    } catch (error) {
      next(error);
    }
  };

  getPublicSitemapXml = async (req: Request<{ subdomain: string }>, res: Response, next: NextFunction) => {
    try {
      const result = await liveSiteEngineService.renderSitemap(req.params.subdomain);
      res.status(result.statusCode);
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.send(result.xml);
    } catch (error) {
      next(error);
    }
  };

  getPublicRobotsTxt = async (req: Request<{ subdomain: string }>, res: Response, next: NextFunction) => {
    try {
      const txt = await aiSeoService.getPublicRobotsTxt(req.params.subdomain);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.send(txt);
    } catch (error) {
      next(error);
    }
  };
}

export const websiteController = new WebsiteController();

