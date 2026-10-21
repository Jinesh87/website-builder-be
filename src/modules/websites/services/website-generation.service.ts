import { randomUUID } from "node:crypto";
import { UserRole } from "../../../common/constants/roles.js";
import { BuilderType } from "../../../common/constants/website.js";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { GenerationStatus, MediaKind } from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { aiSettingsService } from "../../admin-settings/services/ai-settings.service.js";
import { mediaUrl } from "../../media/services/media.service.js";
import type { ThemeSettings } from "../types/site-content.types.js";
import type { WebsiteDetail } from "../types/website.types.js";
import type { CreateAiWebsiteInput, GenerationBrief, GenerationView } from "../types/website-generation.types.js";
import { createOpenAiJsonCompletion } from "./openai-json.client.js";
import { generateSite, type BriefImage, type ThemeChoice } from "./site-generator.js";
import { toGenerationView, websiteService } from "./website.service.js";

/** Running jobs touch their row this often; one silent for STALE_AFTER_MINUTES is orphaned (e.g. a restart). */
const HEARTBEAT_MS = 30_000;
const STALE_AFTER_MINUTES = 3;
const MAX_ATTEMPTS = 2;
const POLL_INTERVAL_MS = 3_000;
const MAX_CONCURRENT_JOBS = 2;
const MAX_ACTIVE_PER_CLIENT = 2;

const NOT_FOUND = () => new AppError(404, "No AI generation for this website", "GENERATION_NOT_FOUND");

function generationScope(actor: AuthUser): Prisma.WebsiteGenerationWhereInput {
  if (actor.role === UserRole.SUPER_ADMIN) return {};
  if (!actor.clientId) throw new AppError(403, "No client workspace for this account", "FORBIDDEN");
  return { clientId: actor.clientId };
}

function resolveClientId(input: CreateAiWebsiteInput, actor: AuthUser): string {
  if (actor.role === UserRole.SUPER_ADMIN) {
    if (!input.clientId) throw new AppError(400, "Choose a client for this website", "CLIENT_REQUIRED");
    return input.clientId;
  }
  if (!actor.clientId) throw new AppError(403, "No client workspace for this account", "FORBIDDEN");
  return actor.clientId;
}

export function toBriefImage(file: {
  id: string;
  fileName: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}): BriefImage {
  return {
    id: file.id,
    url: mediaUrl(file.id),
    alt: (file.altText ?? "").slice(0, 300),
    fileName: file.fileName,
    width: file.width,
    height: file.height,
  };
}

/** Images of the client's library, in the requested order; unknown or foreign ids are skipped. */
export async function loadImages(clientId: string, ids: string[]): Promise<BriefImage[]> {
  if (ids.length === 0) return [];
  const files = await prisma.mediaFile.findMany({
    where: { id: { in: ids }, clientId, kind: MediaKind.IMAGE },
    select: { id: true, fileName: true, altText: true, width: true, height: true },
  });
  const byId = new Map(files.map((file) => [file.id, file]));
  return ids.flatMap((id) => {
    const file = byId.get(id);
    return file ? [toBriefImage(file)] : [];
  });
}

export class WebsiteGenerationService {
  /** Creates the website (one blank page) plus a PENDING job, and wakes the worker. */
  async createWithAi(input: CreateAiWebsiteInput, actor: AuthUser): Promise<WebsiteDetail> {
    const clientId = resolveClientId(input, actor);
    const { apiKey } = await aiSettingsService.getCredentials(clientId, actor.id);
    if (!apiKey) {
      throw new AppError(503, "AI website building isn't available yet. Ask the administrator to set it up.", "AI_NOT_CONFIGURED");
    }

    const active = await prisma.websiteGeneration.count({
      where: { clientId, status: { in: [GenerationStatus.PENDING, GenerationStatus.RUNNING] } },
    });
    if (active >= MAX_ACTIVE_PER_CLIENT) {
      throw new AppError(429, "Wait for your other AI websites to finish before starting another.", "GENERATION_BUSY");
    }

    const mediaIds = [...new Set(input.mediaIds ?? [])];
    const requested = [...new Set([...mediaIds, ...(input.logoMediaId ? [input.logoMediaId] : [])])];
    const found = await loadImages(clientId, requested);
    if (found.length !== requested.length) {
      throw new AppError(400, "Some chosen images are no longer in your media library.", "MEDIA_NOT_FOUND");
    }

    const brief: GenerationBrief = {
      prompt: input.prompt.trim(),
      pages: input.pages.map((page) => page.trim()),
      tone: input.tone ?? null,
      themeId: input.themeId ?? null,
      mediaIds,
      logoMediaId: input.logoMediaId ?? null,
    };

    const website = await websiteService.create(
      {
        clientId,
        name: input.name,
        subdomain: input.subdomain,
        themeId: input.themeId,
        businessName: input.businessName,
        websiteType: input.websiteType,
        industry: input.industry,
        description: input.description,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        address: input.address,
      },
      actor,
      BuilderType.AI,
    );

    try {
      await prisma.websiteGeneration.create({
        data: {
          websiteId: website.id,
          clientId: website.clientId,
          input: brief as unknown as Prisma.InputJsonValue,
          step: "Waiting to start",
          requestedById: actor.id,
        },
      });
    } catch (error) {
      await prisma.website.delete({ where: { id: website.id } }).catch(() => undefined);
      throw error;
    }

    logger.info({ websiteId: website.id, clientId, actorId: actor.id, pages: brief.pages.length }, "AI website queued");
    generationWorker.wake();
    return websiteService.get(website.id, actor);
  }

  async status(websiteId: string, actor: AuthUser): Promise<GenerationView> {
    const generation = await prisma.websiteGeneration.findFirst({ where: { websiteId, ...generationScope(actor) } });
    if (!generation) throw NOT_FOUND();
    return toGenerationView(generation);
  }

  /** Re-queues a failed build with the same brief. */
  async retry(websiteId: string, actor: AuthUser): Promise<GenerationView> {
    const generation = await prisma.websiteGeneration.findFirst({ where: { websiteId, ...generationScope(actor) } });
    if (!generation) throw NOT_FOUND();
    const { count } = await prisma.websiteGeneration.updateMany({
      where: { id: generation.id, status: GenerationStatus.FAILED },
      data: {
        status: GenerationStatus.PENDING,
        step: "Waiting to start",
        progress: 0,
        attempts: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        requestedById: actor.id,
      },
    });
    if (count === 0) throw new AppError(409, "Only a failed generation can be retried", "GENERATION_NOT_FAILED");
    generationWorker.wake();
    return this.status(websiteId, actor);
  }

  /** Drops a failed build so the website opens as a normal (blank) draft. */
  async dismiss(websiteId: string, actor: AuthUser): Promise<void> {
    const generation = await prisma.websiteGeneration.findFirst({ where: { websiteId, ...generationScope(actor) } });
    if (!generation) throw NOT_FOUND();
    const { count } = await prisma.websiteGeneration.deleteMany({
      where: { id: generation.id, status: GenerationStatus.FAILED },
    });
    if (count === 0) throw new AppError(409, "Only a failed generation can be dismissed", "GENERATION_NOT_FAILED");
  }

  /** Runs one claimed job end to end. Never throws; failures are stored on the row. */
  async run(generationId: string): Promise<void> {
    const heartbeat = setInterval(() => {
      void prisma.websiteGeneration
        .updateMany({ where: { id: generationId, status: GenerationStatus.RUNNING }, data: { updatedAt: new Date() } })
        .catch(() => undefined);
    }, HEARTBEAT_MS);
    try {
      await this.build(generationId);
    } catch (error) {
      if (error instanceof AppError && error.code === "GENERATION_SUPERSEDED") {
        logger.warn({ generationId }, "AI generation was taken over by another worker");
        return;
      }
      const message =
        error instanceof AppError && (error.statusCode < 500 || error.code.startsWith("AI_"))
          ? error.message
          : "Something went wrong while building your website. Try again.";
      logger.error({ err: error, generationId }, "AI website generation failed");
      await prisma.websiteGeneration
        .updateMany({
          where: { id: generationId, status: GenerationStatus.RUNNING },
          data: { status: GenerationStatus.FAILED, errorMessage: message.slice(0, 500), completedAt: new Date() },
        })
        .catch((updateError: unknown) => logger.error({ err: updateError, generationId }, "Could not mark generation failed"));
    } finally {
      clearInterval(heartbeat);
    }
  }

  private async build(generationId: string): Promise<void> {
    const generation = await prisma.websiteGeneration.findUnique({
      where: { id: generationId },
      include: { website: true },
    });
    if (!generation || generation.status !== GenerationStatus.RUNNING) return;
    const { website } = generation;
    const brief = generation.input as unknown as GenerationBrief;
    const startedFrom = website.draftUpdatedAt;

    const { apiKey, model } = await aiSettingsService.getCredentials(website.clientId, generation.requestedById);
    if (!apiKey) throw new AppError(503, "AI website building isn't configured.", "AI_NOT_CONFIGURED");

    const [images, logoImages, themeRows] = await Promise.all([
      loadImages(website.clientId, brief.mediaIds),
      loadImages(website.clientId, brief.logoMediaId ? [brief.logoMediaId] : []),
      prisma.theme.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    ]);
    const themes: ThemeChoice[] = themeRows.map((row) => ({
      id: row.id,
      name: row.name,
      settings: row.settings as unknown as ThemeSettings,
    }));

    const site = await generateSite({
      facts: {
        name: website.name,
        businessName: website.businessName,
        websiteType: website.websiteType,
        industry: website.industry,
        description: website.description,
        contactEmail: website.contactEmail,
        contactPhone: website.contactPhone,
        address: website.address,
      },
      brief,
      images,
      logo: logoImages[0] ?? null,
      themes,
      complete: createOpenAiJsonCompletion({
        apiKey,
        model,
        clientId: website.clientId,
        websiteId: website.id,
        userId: generation.requestedById,
      }),
      // Each progress write doubles as the heartbeat that keeps the job from looking stale.
      onProgress: async (step, progress) => {
        await prisma.websiteGeneration.updateMany({
          where: { id: generationId, status: GenerationStatus.RUNNING },
          data: { step, progress },
        });
      },
    });

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.website.updateMany({
        where: { id: website.id, draftUpdatedAt: startedFrom },
        data: {
          theme: site.theme as unknown as Prisma.InputJsonValue,
          header: site.header as unknown as Prisma.InputJsonValue,
          footer: site.footer as unknown as Prisma.InputJsonValue,
          ...(logoImages[0] ? { logoMediaId: logoImages[0].id } : {}),
          draftUpdatedAt: new Date(),
        },
      });
      if (claimed.count === 0) {
        throw new AppError(409, "The website was edited while the AI was working, so nothing was changed.", "DRAFT_CONFLICT");
      }
      await tx.page.deleteMany({ where: { websiteId: website.id } });
      await tx.page.createMany({
        data: site.pages.map((page, index) => ({
          id: randomUUID(),
          websiteId: website.id,
          clientId: website.clientId,
          name: page.name,
          slug: page.slug,
          pageType: page.pageType,
          visible: true,
          showInNav: page.showInNav,
          seoTitle: page.seoTitle,
          seoDescription: page.seoDescription,
          sortOrder: index,
          sections: page.sections as unknown as Prisma.InputJsonValue,
        })),
      });
      const finished = await tx.websiteGeneration.updateMany({
        where: { id: generationId, status: GenerationStatus.RUNNING },
        data: { status: GenerationStatus.SUCCEEDED, step: "Done", progress: 100, completedAt: new Date() },
      });
      // Another worker took the job over (stale recovery); let it own the result.
      if (finished.count === 0) throw new AppError(409, "Generation was taken over by another worker", "GENERATION_SUPERSEDED");
    });

    logger.info(
      { generationId, websiteId: website.id, model, pages: site.pages.length, images: images.length },
      "AI website generated",
    );
  }
}

export const websiteGenerationService = new WebsiteGenerationService();

/**
 * In-process job runner. Safe with several API instances: jobs are claimed with
 * FOR UPDATE SKIP LOCKED, and orphaned RUNNING jobs are re-queued after a quiet period.
 */
class GenerationWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = 0;
  private ticking = false;
  private stopped = true;

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.timer = setInterval(() => this.wake(), POLL_INTERVAL_MS);
    this.timer.unref();
    this.wake();
    logger.info("AI generation worker started");
  }

  stop(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  wake(): void {
    if (this.stopped || this.ticking) return;
    this.ticking = true;
    void this.tick()
      .catch((error: unknown) => logger.error({ err: error }, "AI generation worker tick failed"))
      .finally(() => {
        this.ticking = false;
      });
  }

  private async tick(): Promise<void> {
    await this.recoverStale();
    while (!this.stopped && this.running < MAX_CONCURRENT_JOBS) {
      const id = await this.claim();
      if (!id) return;
      this.running += 1;
      void websiteGenerationService.run(id).finally(() => {
        this.running -= 1;
        this.wake();
      });
    }
  }

  // Timestamps are bound from JS rather than using now(): Prisma writes `updatedAt` through the
  // driver adapter, and comparing those values with the database clock is skewed by the session time zone.
  private async claim(): Promise<string | null> {
    const now = new Date();
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      UPDATE website_generations
      SET status = 'RUNNING', attempts = attempts + 1, "startedAt" = ${now}, "updatedAt" = ${now},
          step = 'Starting', progress = 0
      WHERE id = (
        SELECT id FROM website_generations
        WHERE status = 'PENDING'
        ORDER BY "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING id`;
    return rows[0]?.id ?? null;
  }

  private async recoverStale(): Promise<void> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_AFTER_MINUTES * 60_000);
    const recovered = await prisma.$executeRaw`
      UPDATE website_generations
      SET status = CASE WHEN attempts >= ${MAX_ATTEMPTS}::int THEN 'FAILED'::"GenerationStatus" ELSE 'PENDING'::"GenerationStatus" END,
          "errorMessage" = CASE WHEN attempts >= ${MAX_ATTEMPTS}::int
            THEN 'The build was interrupted. Try again.' ELSE NULL END,
          "completedAt" = CASE WHEN attempts >= ${MAX_ATTEMPTS}::int THEN ${now}::timestamptz ELSE NULL END,
          "updatedAt" = ${now}
      WHERE status = 'RUNNING' AND "updatedAt" < ${staleBefore}`;
    if (recovered > 0) logger.warn({ recovered }, "Re-queued stale AI generation jobs");
  }
}

export const generationWorker = new GenerationWorker();
