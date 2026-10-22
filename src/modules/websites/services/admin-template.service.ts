import { randomUUID } from "node:crypto";
import { BuilderType } from "../../../common/constants/website.js";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { deleteObject, putObject, readObject } from "../../../common/storage/object-storage.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma, type MediaFile } from "../../../generated/prisma/client.js";
import type {
  AdminTemplateListQuery,
  AdminTemplateView,
  CreatePlatformTemplateInput,
  CreateStudioWebsiteInput,
  PatchPlatformTemplateInput,
  TemplateDetailsInput,
} from "../types/admin-template.types.js";
import type { FooterData, HeaderData, Section } from "../types/site-content.types.js";
import type { TemplatePage } from "../types/template.types.js";
import { platformTemplateKey, templateOrigin, templateStatus } from "./admin-template-rules.js";
import { ensureTemplateStudio } from "./template-studio.js";
import { detailInclude, pickSubdomain, templateContentFrom, websiteService, type WebsiteWithPages } from "./website.service.js";

const MAX_LISTED_TEMPLATES = 500;
const MAX_IMPORTED_MEDIA = 200;
const MEDIA_ID_PATTERN = /\/media\/files\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

const templateInclude = { createdBy: { select: { fullName: true } } } as const satisfies Prisma.WebsiteTemplateInclude;
type TemplateRow = Prisma.WebsiteTemplateGetPayload<{ include: typeof templateInclude }>;

const TEMPLATE_NOT_FOUND = () => new AppError(404, "Template not found", "TEMPLATE_NOT_FOUND");
const STUDIO_WEBSITE_NOT_FOUND = () => new AppError(404, "Template Studio website not found", "WEBSITE_NOT_FOUND");

function toView(template: TemplateRow): AdminTemplateView {
  return {
    id: template.id,
    key: template.key,
    name: template.name,
    category: template.category,
    description: template.description,
    origin: templateOrigin(template),
    status: templateStatus(template),
    sourceWebsiteId: template.sourceWebsiteId,
    pages: (template.pages as unknown as TemplatePage[]).map(({ name, slug }) => ({ name, slug })),
    createdByName: template.createdBy?.fullName ?? null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function assertHasSections(website: WebsiteWithPages): void {
  if (!website.pages.some((page) => (page.sections as unknown as Section[]).length > 0)) {
    throw new AppError(400, "Add at least one section before saving this website as a template.", "TEMPLATE_EMPTY");
  }
}

function detailsData(input: Partial<TemplateDetailsInput>): Prisma.WebsiteTemplateUpdateInput {
  return {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.category !== undefined ? { category: input.category } : {}),
    ...(input.description !== undefined ? { description: emptyToNull(input.description) } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };
}

/**
 * Super Admin management of the platform template gallery. Templates are designed in Template Studio
 * websites and copied into `website_templates`; websites created from a template get their own copy,
 * so editing, hiding or archiving a template never changes existing drafts or live sites.
 */
export class AdminTemplateService {
  async list(query: AdminTemplateListQuery): Promise<AdminTemplateView[]> {
    const search = query.search?.trim();
    const byStatus: Prisma.WebsiteTemplateWhereInput =
      query.status === "archived"
        ? { archivedAt: { not: null } }
        : query.status === "live"
          ? { archivedAt: null, isActive: true }
          : query.status === "hidden"
            ? { archivedAt: null, isActive: false }
            : { archivedAt: null };
    const templates = await prisma.websiteTemplate.findMany({
      where: {
        clientId: null,
        ...byStatus,
        ...(query.category ? { category: query.category } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { key: { contains: search.toLowerCase() } },
              ],
            }
          : {}),
      },
      include: templateInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: MAX_LISTED_TEMPLATES,
    });
    return templates.map(toView);
  }

  /** The template a Template Studio website is the source of, or null before its first save. */
  async getBySourceWebsite(websiteId: string): Promise<AdminTemplateView | null> {
    await this.findStudioWebsite(websiteId);
    const template = await prisma.websiteTemplate.findUnique({ where: { sourceWebsiteId: websiteId }, include: templateInclude });
    return template ? toView(template) : null;
  }

  /** Creates the Template Studio website a new template is designed in. */
  async createStudioWebsite(input: CreateStudioWebsiteInput, actor: AuthUser): Promise<{ websiteId: string }> {
    const name = input.name.trim();
    if (input.startFrom === "website") {
      return { websiteId: await this.importClientWebsite(input.websiteId, name, actor) };
    }
    const website = await websiteService.create(
      { name, ...(input.startFrom === "template" ? { templateKey: input.templateKey } : {}) },
      actor,
      BuilderType.MANUAL,
      { templateStudio: true },
    );
    logger.info({ websiteId: website.id, startFrom: input.startFrom, actorId: actor.id }, "Template Studio website created");
    return { websiteId: website.id };
  }

  async create(input: CreatePlatformTemplateInput, actor: AuthUser): Promise<AdminTemplateView> {
    const website = await this.findStudioWebsite(input.websiteId);
    assertHasSections(website);
    if (await this.sourceTaken(website.id)) throw this.alreadySaved();

    const content = templateContentFrom(website);
    const { _max } = await prisma.websiteTemplate.aggregate({ where: { clientId: null }, _max: { sortOrder: true } });

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const template = await prisma.websiteTemplate.create({
          data: {
            key: platformTemplateKey(input.name),
            clientId: null,
            name: input.name.trim(),
            category: input.category,
            description: emptyToNull(input.description),
            ...content,
            isActive: input.isActive,
            sortOrder: (_max.sortOrder ?? -1) + 1,
            sourceWebsiteId: website.id,
            createdById: actor.id,
          },
          include: templateInclude,
        });
        logger.info({ templateId: template.id, key: template.key, websiteId: website.id, actorId: actor.id }, "Platform template created");
        return toView(template);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        if (await this.sourceTaken(website.id)) throw this.alreadySaved();
      }
    }
    throw new AppError(409, "Couldn't create a unique template ID. Please try again.", "TEMPLATE_KEY_CONFLICT");
  }

  /** Saves new details and the source website's current design over the template. Only new websites see the change. */
  async updateFromSource(templateId: string, input: TemplateDetailsInput, actor: AuthUser): Promise<AdminTemplateView> {
    const template = await this.findEditableOrThrow(templateId);
    if (!template.sourceWebsiteId) {
      throw new AppError(409, "This template has no Template Studio website to update its design from.", "TEMPLATE_NO_SOURCE");
    }
    const website = await this.findStudioWebsite(template.sourceWebsiteId);
    assertHasSections(website);

    const updated = await prisma.websiteTemplate.update({
      where: { id: template.id },
      data: { ...detailsData(input), ...templateContentFrom(website) },
      include: templateInclude,
    });
    logger.info({ templateId: updated.id, websiteId: website.id, actorId: actor.id }, "Platform template design updated");
    return toView(updated);
  }

  /** Built-in templates can only be shown or hidden: the seeder rewrites their other fields on every boot. */
  async updateDetails(templateId: string, input: PatchPlatformTemplateInput, actor: AuthUser): Promise<AdminTemplateView> {
    const template = await this.findPlatformOrThrow(templateId);
    if (template.archivedAt) throw new AppError(409, "Restore this template before editing it.", "TEMPLATE_ARCHIVED");
    const { isActive, ...details } = input;
    if (templateOrigin(template) === "BUILT_IN" && Object.values(details).some((value) => value !== undefined)) {
      throw new AppError(400, "Built-in templates can only be shown or hidden.", "TEMPLATE_BUILT_IN");
    }

    const updated = await prisma.websiteTemplate.update({
      where: { id: template.id },
      data: detailsData({ ...details, isActive }),
      include: templateInclude,
    });
    logger.info({ templateId: updated.id, actorId: actor.id, fields: Object.keys(input) }, "Platform template details updated");
    return toView(updated);
  }

  /** Soft delete: gone from the gallery and website creation, restorable, and existing websites keep their copy. */
  async archive(templateId: string, actor: AuthUser): Promise<AdminTemplateView> {
    const template = await this.findEditableOrThrow(templateId);
    const updated = await prisma.websiteTemplate.update({
      where: { id: template.id },
      data: { archivedAt: new Date(), isActive: false },
      include: templateInclude,
    });
    logger.info({ templateId: updated.id, actorId: actor.id }, "Platform template archived");
    return toView(updated);
  }

  /** Comes back hidden, so the admin decides when it is live again. */
  async restore(templateId: string, actor: AuthUser): Promise<AdminTemplateView> {
    const template = await this.findPlatformOrThrow(templateId);
    if (!template.archivedAt) throw new AppError(409, "This template isn't archived.", "TEMPLATE_NOT_ARCHIVED");
    const updated = await prisma.websiteTemplate.update({
      where: { id: template.id },
      data: { archivedAt: null, isActive: false },
      include: templateInclude,
    });
    logger.info({ templateId: updated.id, actorId: actor.id }, "Platform template restored");
    return toView(updated);
  }

  /**
   * Copies a client website into the Template Studio so it can be cleaned up and saved as a template.
   * Its media is copied too, so the template never depends on files the client can delete.
   */
  private async importClientWebsite(sourceId: string, name: string, actor: AuthUser): Promise<string> {
    const studioId = await ensureTemplateStudio();
    const source = await prisma.website.findFirst({
      where: { id: sourceId, client: { isInternal: false } },
      include: { pages: { orderBy: { sortOrder: "asc" } } },
    });
    if (!source) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");

    const header: HeaderData = { ...(source.header as unknown as HeaderData), siteName: name };
    const { contact: _contact, ...sourceFooter } = source.footer as unknown as FooterData;
    const footer: FooterData = { ...sourceFooter, siteName: name, copyright: `© ${new Date().getFullYear()} ${name}` };
    const pages = source.pages.map((page) => ({
      name: page.name,
      slug: page.slug,
      pageType: page.pageType,
      visible: page.visible,
      showInNav: page.showInNav,
      sections: (page.sections as unknown as Section[]).map((section) => {
        const fresh = { ...section, id: randomUUID() };
        if (fresh.type === "header") return { ...fresh, data: header };
        if (fresh.type === "footer") return { ...fresh, data: footer };
        return fresh;
      }),
    }));

    let content = JSON.stringify({ theme: source.theme, header, footer, pages });
    const mediaIds = [...new Set([...content.matchAll(MEDIA_ID_PATTERN)].map((match) => match[1]!.toLowerCase()))];
    if (mediaIds.length > MAX_IMPORTED_MEDIA) {
      throw new AppError(400, `This website uses more than ${MAX_IMPORTED_MEDIA} files, too many to copy.`, "IMPORT_TOO_LARGE");
    }
    const files = mediaIds.length
      ? await prisma.mediaFile.findMany({ where: { id: { in: mediaIds }, clientId: source.clientId } })
      : [];

    const websiteId = randomUUID();
    const copies: { from: MediaFile; id: string; storageKey: string }[] = [];
    try {
      for (const file of files) {
        const id = randomUUID();
        const extension = file.storageKey.split(".").pop() ?? "bin";
        const storageKey = `clients/${studioId}/media/${id}.${extension}`;
        await putObject({ key: storageKey, body: await readObject(file.storageKey), contentType: file.mimeType });
        copies.push({ from: file, id, storageKey });
      }
      for (const copy of copies) {
        content = content.replaceAll(`/media/files/${copy.from.id}`, `/media/files/${copy.id}`);
      }
      const copied = JSON.parse(content) as { theme: Prisma.InputJsonValue; header: HeaderData; footer: FooterData; pages: typeof pages };

      const subdomain = await pickSubdomain(undefined, `template-${name}`);
      await prisma.$transaction(async (tx) => {
        await tx.website.create({
          data: {
            id: websiteId,
            clientId: studioId,
            name,
            builderType: BuilderType.MANUAL,
            subdomain,
            theme: copied.theme,
            header: copied.header as unknown as Prisma.InputJsonValue,
            footer: copied.footer as unknown as Prisma.InputJsonValue,
            draftUpdatedAt: new Date(),
            createdById: actor.id,
            pages: {
              create: copied.pages.map((page, index) => ({
                ...page,
                sortOrder: index,
                sections: page.sections as unknown as Prisma.InputJsonValue,
              })),
            },
          },
        });
        if (copies.length > 0) {
          await tx.mediaFile.createMany({
            data: copies.map(({ from, id, storageKey }) => ({
              id,
              clientId: studioId,
              websiteId,
              kind: from.kind,
              fileName: from.fileName,
              mimeType: from.mimeType,
              sizeBytes: from.sizeBytes,
              width: from.width,
              height: from.height,
              altText: from.altText,
              storageKey,
              uploadedById: actor.id,
            })),
          });
        }
      });
    } catch (error) {
      await Promise.allSettled(copies.map((copy) => deleteObject(copy.storageKey)));
      if (isUniqueViolation(error)) throw new AppError(409, "That address was just taken. Please try again.", "SUBDOMAIN_TAKEN");
      throw error;
    }

    logger.info(
      { websiteId, sourceWebsiteId: source.id, sourceClientId: source.clientId, copiedMedia: copies.length, actorId: actor.id },
      "Client website imported into Template Studio",
    );
    return websiteId;
  }

  private async findStudioWebsite(websiteId: string): Promise<WebsiteWithPages> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, client: { isInternal: true } },
      include: detailInclude,
    });
    if (!website) throw STUDIO_WEBSITE_NOT_FOUND();
    return website;
  }

  private async findPlatformOrThrow(templateId: string): Promise<TemplateRow> {
    const template = await prisma.websiteTemplate.findFirst({ where: { id: templateId, clientId: null }, include: templateInclude });
    if (!template) throw TEMPLATE_NOT_FOUND();
    return template;
  }

  /** Templates a Super Admin created; built-in ones are owned by the seed files. */
  private async findEditableOrThrow(templateId: string): Promise<TemplateRow> {
    const template = await this.findPlatformOrThrow(templateId);
    if (templateOrigin(template) === "BUILT_IN") {
      throw new AppError(400, "Built-in templates can only be shown or hidden.", "TEMPLATE_BUILT_IN");
    }
    if (template.archivedAt) throw new AppError(409, "Restore this template before changing it.", "TEMPLATE_ARCHIVED");
    return template;
  }

  private async sourceTaken(websiteId: string): Promise<boolean> {
    return (await prisma.websiteTemplate.count({ where: { sourceWebsiteId: websiteId } })) > 0;
  }

  private alreadySaved(): AppError {
    return new AppError(409, "This website is already saved as a template. Update that template instead.", "TEMPLATE_EXISTS");
  }
}

export const adminTemplateService = new AdminTemplateService();
