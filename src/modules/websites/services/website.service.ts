import { randomBytes, randomUUID } from "node:crypto";
import { UserRole } from "../../../common/constants/roles.js";
import { BuilderType, DomainStatus, PageType, PublishStatus, WebsiteStatus } from "../../../common/constants/website.js";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import {
  Prisma,
  WebsiteOfflineReason,
  type SavedSection,
  type WebsiteGeneration,
  type WebsiteTemplate,
} from "../../../generated/prisma/client.js";
import { hostingAutopayService } from "../../hosting/services/hosting-autopay.service.js";
import { hostingService } from "../../hosting/services/hosting.service.js";
import { THEME_SEEDS } from "../../../seeder/design-library/themes.js";
import { WEBSITE_TEMPLATE_SEEDS } from "../../../seeder/design-library/templates.js";
import type { FooterData, HeaderData, LinkRef, Section, ThemeSettings } from "../types/site-content.types.js";
import { ADMIN_TEMPLATE_KEY_PREFIX, type TemplateFooter, type TemplateHeader, type TemplatePage } from "../types/template.types.js";
import type {
  CreateWebsiteInput,
  PageView,
  PublishInput,
  PublishSnapshot,
  SaveDraftInput,
  SavedSectionView,
  SavePageContentInput,
  SaveSectionInput,
  SaveTemplateInput,
  TemplateListQuery,
  TemplatePreview,
  ThemeSummary,
  UpdateTemplateInput,
  UpdateWebsiteInput,
  WebsiteDetail,
  WebsiteInfo,
  WebsiteListQuery,
  WebsiteListResult,
  WebsiteSummary,
  WebsiteTemplateSummary,
  WebsiteVersionView,
} from "../types/website.types.js";
import type { GenerationView } from "../types/website-generation.types.js";
import { SUBDOMAIN_PATTERN } from "../validators/website.validator.js";
import { liveSiteEngineService } from "./live-site-engine.service.js";
import { buildPublishSnapshot } from "./publish-snapshot.js";
import { liftSiteChrome } from "./site-chrome.js";
import { ensureTemplateStudio } from "./template-studio.js";


const summaryInclude = {
  client: { select: { businessName: true, isInternal: true, shopFeatureEnabled: true } },
  _count: { select: { pages: true } },
  generation: true,
} as const satisfies Prisma.WebsiteInclude;

export const detailInclude = {
  ...summaryInclude,
  domains: { where: { status: DomainStatus.ACTIVE }, orderBy: { isPrimary: "desc" }, select: { hostname: true } },
  pages: { orderBy: { sortOrder: "asc" } },
} as const satisfies Prisma.WebsiteInclude;

type WebsiteWithSummary = Prisma.WebsiteGetPayload<{ include: typeof summaryInclude }>;
export type WebsiteWithPages = Prisma.WebsiteGetPayload<{ include: typeof detailInclude }>;

const RESERVED_SUBDOMAINS = new Set([
  "www", "app", "api", "admin", "mail", "smtp", "ftp", "cdn", "static", "assets", "dashboard",
  "support", "help", "status", "sites", "preview", "staging", "dev", "test", "ns1", "ns2",
]);

const MAX_CLIENT_TEMPLATES = 20;
const MAX_SAVED_SECTIONS = 100;

const BUILT_IN_TEMPLATE_KEYS = WEBSITE_TEMPLATE_SEEDS.map((seed) => seed.key);
const VALID_PLATFORM_KEY_WHERE: Prisma.WebsiteTemplateWhereInput = {
  OR: [
    { key: { in: BUILT_IN_TEMPLATE_KEYS } },
    { key: { startsWith: ADMIN_TEMPLATE_KEY_PREFIX } },
  ],
};

function toTemplateSummary(template: WebsiteTemplate): WebsiteTemplateSummary {
  return {
    id: template.id,
    key: template.key,
    isCustom: template.clientId !== null,
    name: template.name,
    category: template.category,
    description: template.description,
    thumbnailUrl: template.thumbnailUrl,
    themeId: template.themeId,
    pages: (template.pages as unknown as TemplatePage[]).map(({ name, slug }) => ({ name, slug })),
  };
}

function toSavedSection(saved: SavedSection): SavedSectionView {
  return {
    id: saved.id,
    name: saved.name,
    sectionType: saved.sectionType as Section["type"],
    section: saved.section as unknown as Section,
    isPlatform: saved.clientId === null,
    createdAt: saved.createdAt.toISOString(),
  };
}

/** Starting point when no template is chosen: one empty home page the client builds up. */
const BLANK_PAGES: TemplatePage[] = [{ name: "Home", slug: "/", pageType: PageType.HOME, showInNav: true, sections: [] }];
const BLANK_HEADER: TemplateHeader = { design: "logo-left", sticky: true };
const BLANK_FOOTER: TemplateFooter = { design: "simple", columns: [], social: [] };

const NOT_FOUND = () => new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
const SUBDOMAIN_TAKEN = () => new AppError(409, "This address is already taken.", "SUBDOMAIN_TAKEN");
const DRAFT_CONFLICT = () =>
  new AppError(409, "This website was changed somewhere else. Reload to get the latest draft.", "DRAFT_CONFLICT");
const PAGE_NOT_FOUND = () => new AppError(404, "Page not found", "PAGE_NOT_FOUND");

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function ownClientId(actor: AuthUser): string {
  if (!actor.clientId) throw new AppError(403, "No client workspace for this account", "FORBIDDEN");
  return actor.clientId;
}

/** The single place that decides which websites an actor may see or change. */
export function scopeFor(actor: AuthUser): Prisma.WebsiteWhereInput {
  return actor.role === UserRole.SUPER_ADMIN ? {} : { clientId: ownClientId(actor) };
}

function toSummary(website: WebsiteWithSummary): WebsiteSummary {
  return {
    id: website.id,
    clientId: website.clientId,
    clientName: website.client.businessName,
    name: website.name,
    builderType: website.builderType,
    status: website.status,
    subdomain: website.subdomain,
    pageCount: website._count.pages,
    generationStatus: website.generation?.status ?? null,
    hasUnpublishedChanges: website.publishedAt !== null && website.draftUpdatedAt > website.publishedAt,
    seoToolsEnabled: website.seoToolsEnabled,
    isTemplateStudio: website.client.isInternal,
    shopFeatureEnabled: website.client.shopFeatureEnabled,
    shopEnabled: website.shopEnabled,
    publishedAt: website.publishedAt?.toISOString() ?? null,
    createdAt: website.createdAt.toISOString(),
    updatedAt: website.updatedAt.toISOString(),
  };
}

function toInfo(website: WebsiteWithPages): WebsiteInfo {
  return {
    businessName: website.businessName,
    websiteType: website.websiteType,
    industry: website.industry,
    description: website.description,
    contactEmail: website.contactEmail,
    contactPhone: website.contactPhone,
    address: website.address,
  };
}

// JSON columns are validated against the site-content schemas on every write.
function toPage(page: WebsiteWithPages["pages"][number]): PageView {
  return {
    id: page.id,
    name: page.name,
    slug: page.slug,
    pageType: page.pageType,
    visible: page.visible,
    showInNav: page.showInNav,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
    seoKeywords: page.seoKeywords ?? [],
    templateKey: page.templateKey ?? null,
    sections: page.sections as unknown as Section[],
  };
}

function toDetail(website: WebsiteWithPages): WebsiteDetail {
  let header = website.header as unknown as HeaderData;
  let footer = website.footer as unknown as FooterData;
  let pages = website.pages.map(toPage);

  // If website header or footer has no logo, check if any page was created from a built-in template seed
  const templateKey = pages.find((p) => p.templateKey)?.templateKey;
  const seed = templateKey ? WEBSITE_TEMPLATE_SEEDS.find((s) => s.key === templateKey) : null;
  if (seed) {
    if (!header.logo?.url && seed.header.logo) {
      header = {
        ...header,
        logo: seed.header.logo,
        logoDisplay: header.logoDisplay ?? seed.header.logoDisplay ?? "logo_only",
      };
    }
    if (!footer.logo?.url && seed.footer.logo) {
      footer = {
        ...footer,
        logo: seed.footer.logo,
        logoDisplay: footer.logoDisplay ?? seed.footer.logoDisplay ?? "logo_only",
      };
    }

    pages = pages.map((page) => ({
      ...page,
      sections: (page.sections as Section[]).map((sec) => {
        if (sec.type === "header") {
          const secHeader = (sec.data || {}) as HeaderData;
          if (!secHeader.logo?.url && seed.header.logo) {
            return {
              ...sec,
              data: {
                ...secHeader,
                logo: seed.header.logo,
                logoDisplay: secHeader.logoDisplay ?? seed.header.logoDisplay ?? "logo_only",
              },
            };
          }
        }
        if (sec.type === "footer") {
          const secFooter = (sec.data || {}) as FooterData;
          if (!secFooter.logo?.url && seed.footer.logo) {
            return {
              ...sec,
              data: {
                ...secFooter,
                logo: seed.footer.logo,
                logoDisplay: secFooter.logoDisplay ?? seed.footer.logoDisplay ?? "logo_only",
              },
            };
          }
        }
        return sec;
      }),
    }));
  }

  ({ header, footer, pages } = liftSiteChrome({ header, footer, pages }));

  return {
    ...toSummary(website),
    customDomain: website.domains[0]?.hostname ?? null,
    info: toInfo(website),
    generation: website.generation ? toGenerationView(website.generation) : null,
    draft: {
      theme: website.theme as unknown as ThemeSettings,
      header,
      footer,
      pages,
      draftUpdatedAt: website.draftUpdatedAt.toISOString(),
    },
  };
}

export function toGenerationView(generation: WebsiteGeneration): GenerationView {
  return {
    status: generation.status,
    step: generation.step,
    progress: generation.progress,
    errorMessage: generation.errorMessage,
    createdAt: generation.createdAt.toISOString(),
    startedAt: generation.startedAt?.toISOString() ?? null,
    completedAt: generation.completedAt?.toISOString() ?? null,
  };
}

function fillPlaceholders<T>(value: T, vars: Record<string, string>): T {
  if (typeof value === "string") {
    return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) => vars[key] ?? match) as T;
  }
  if (Array.isArray(value)) return value.map((item) => fillPlaceholders(item, vars)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fillPlaceholders(item, vars)]),
    ) as T;
  }
  return value;
}

type TemplateWithTheme = WebsiteTemplate & { theme: { settings: Prisma.JsonValue } | null };

/** Pages, header and footer a template produces for a site named `siteName`; contact details are added by the caller. */
function buildTemplateContent(
  template: TemplateWithTheme | null,
  siteName: string,
  websiteName: string,
): { pages: TemplatePage[]; header: HeaderData; footer: FooterData } {
  const seed = template ? WEBSITE_TEMPLATE_SEEDS.find((s) => s.key === template.key) : null;
  const rawHeader = seed ? seed.header : (template ? (template.header as unknown as TemplateHeader) : BLANK_HEADER);
  const rawFooter = seed ? seed.footer : (template ? (template.footer as unknown as TemplateFooter) : BLANK_FOOTER);
  const rawPages = seed ? seed.pages : (template ? (template.pages as unknown as TemplatePage[]) : BLANK_PAGES);

  const vars = { businessName: siteName, websiteName };
  const pages = fillPlaceholders(rawPages, vars);
  const templateHeader = rawHeader;
  const templateFooter = fillPlaceholders(rawFooter, vars);
  const navLinks: LinkRef[] = pages
    .filter((page) => page.showInNav && page.visible !== false)
    .slice(0, 12)
    .map((page) => ({ label: page.name, href: page.slug }));

  const finalHeader: HeaderData = { ...templateHeader, siteName, menu: navLinks };
  const finalFooter: FooterData = {
    ...templateFooter,
    siteName,
    columns:
      templateFooter.design === "columns" && templateFooter.columns.length === 0 && navLinks.length > 0
        ? [{ title: "Pages", links: navLinks }]
        : templateFooter.columns,
    copyright: `© ${new Date().getFullYear()} ${siteName}`,
  };

  const syncedPages: TemplatePage[] = pages.map((page) => ({
    ...page,
    sections: page.sections.map((sec) => {
      if (sec.type === "header") {
        return { ...sec, data: finalHeader };
      }
      if (sec.type === "footer") {
        return { ...sec, data: finalFooter };
      }
      return sec;
    }),
  }));

  return liftSiteChrome({ pages: syncedPages, header: finalHeader, footer: finalFooter });
}

function templateTheme(template: TemplateWithTheme | null): Prisma.JsonValue {
  return template?.themeSettings ?? template?.theme?.settings ?? THEME_SEEDS[0]!.settings;
}

/** Read-only site data for a template, named after the template itself. Callers decide who may see it. */
export function templatePreview(template: TemplateWithTheme): TemplatePreview {
  const { pages, header, footer } = buildTemplateContent(template, template.name, template.name);
  return {
    template: toTemplateSummary(template),
    site: {
      theme: templateTheme(template) as unknown as ThemeSettings,
      header,
      footer,
      pages: pages
        .filter((page) => page.visible !== false)
        .map((page, pageIndex) => ({
          id: `template-page-${pageIndex}`,
          name: page.name,
          slug: page.slug,
          sections: page.sections.map((section, sectionIndex) => ({
            ...section,
            id: `template-section-${pageIndex}-${sectionIndex}`,
          })) as Section[],
        })),
    },
  };
}

/** The website's saved draft as template content, without the site's name, menu, contact details or section ids. */
export function templateContentFrom(website: WebsiteWithPages) {
  const { siteName: _siteName, menu: _menu, ...header } = website.header as unknown as HeaderData;
  const {
    siteName: _footerName,
    contact: _contact,
    copyright: _copyright,
    ...footer
  } = website.footer as unknown as FooterData;
  const pages: TemplatePage[] = website.pages.map((page) => ({
    name: page.name,
    slug: page.slug,
    pageType: page.pageType,
    showInNav: page.showInNav,
    visible: page.visible,
    sections: (page.sections as unknown as Section[]).map(({ id: _sectionId, ...section }) => section),
  }));
  return {
    themeSettings: website.theme as Prisma.InputJsonValue,
    header: header as Prisma.InputJsonValue,
    footer: footer as Prisma.InputJsonValue,
    pages: pages as unknown as Prisma.InputJsonValue,
  };
}

function slugifySubdomain(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
  return slug.length >= 3 ? slug : `site-${slug || randomBytes(2).toString("hex")}`;
}

async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  if (RESERVED_SUBDOMAINS.has(subdomain) || !SUBDOMAIN_PATTERN.test(subdomain)) return false;
  const existing = await prisma.website.findUnique({ where: { subdomain }, select: { id: true } });
  return !existing;
}

export async function pickSubdomain(requested: string | undefined, name: string): Promise<string> {
  if (requested) {
    if (!(await isSubdomainAvailable(requested))) throw SUBDOMAIN_TAKEN();
    return requested;
  }
  const base = slugifySubdomain(name);
  if (await isSubdomainAvailable(base)) return base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${base}-${randomBytes(2).toString("hex")}`;
    if (await isSubdomainAvailable(candidate)) return candidate;
  }
  throw SUBDOMAIN_TAKEN();
}

export class WebsiteService {
  /** Platform templates plus the client's own; a Super Admin sees a client's own via `clientId`. */
  async listTemplates(query: TemplateListQuery, actor: AuthUser): Promise<WebsiteTemplateSummary[]> {
    const ownerId = actor.role === UserRole.SUPER_ADMIN ? query.clientId : ownClientId(actor);
    const templates = await prisma.websiteTemplate.findMany({
      where: {
        isActive: true,
        archivedAt: null,
        OR: [
          { clientId: null, ...VALID_PLATFORM_KEY_WHERE },
          ...(ownerId ? [{ clientId: ownerId }] : []),
        ],
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return templates.sort((a, b) => Number(b.clientId !== null) - Number(a.clientId !== null)).map(toTemplateSummary);
  }

  /** Public: active platform templates for the gallery. */
  async listPlatformTemplates(): Promise<WebsiteTemplateSummary[]> {
    const templates = await prisma.websiteTemplate.findMany({
      where: { clientId: null, isActive: true, archivedAt: null, ...VALID_PLATFORM_KEY_WHERE },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return templates.map(toTemplateSummary);
  }

  /** Public: only active platform templates, never a client's private ones. */
  async getTemplatePreview(key: string): Promise<TemplatePreview> {
    const template = await prisma.websiteTemplate.findFirst({
      where: { key, clientId: null, isActive: true, archivedAt: null, ...VALID_PLATFORM_KEY_WHERE },
      include: { theme: { select: { settings: true } } },
    });
    if (!template) throw new AppError(404, "Template not found", "TEMPLATE_NOT_FOUND");
    return templatePreview(template);
  }

  /** Copies the website's saved draft into a template private to the website's client. */
  async saveAsTemplate(id: string, input: SaveTemplateInput, actor: AuthUser): Promise<WebsiteTemplateSummary> {
    const website = await prisma.website.findFirst({ where: { id, ...scopeFor(actor) }, include: detailInclude });
    if (!website) throw NOT_FOUND();

    const existing = await prisma.websiteTemplate.count({ where: { clientId: website.clientId } });
    if (existing >= MAX_CLIENT_TEMPLATES) {
      throw new AppError(409, `You can keep up to ${MAX_CLIENT_TEMPLATES} templates. Delete one first.`, "TEMPLATE_LIMIT");
    }

    const template = await prisma.websiteTemplate.create({
      data: {
        key: `custom-${randomUUID()}`,
        clientId: website.clientId,
        name: input.name.trim(),
        category: "My templates",
        description: emptyToNull(input.description),
        ...templateContentFrom(website),
        createdById: actor.id,
      },
    });
    logger.info({ templateId: template.id, websiteId: id, clientId: website.clientId, actorId: actor.id }, "Template saved");
    return toTemplateSummary(template);
  }

  async updateTemplate(templateId: string, input: UpdateTemplateInput, actor: AuthUser): Promise<WebsiteTemplateSummary> {
    await this.findOwnTemplateOrThrow(templateId, actor);
    const template = await prisma.websiteTemplate.update({
      where: { id: templateId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.description !== undefined ? { description: emptyToNull(input.description) } : {}),
      },
    });
    return toTemplateSummary(template);
  }

  async deleteTemplate(templateId: string, actor: AuthUser): Promise<void> {
    await this.findOwnTemplateOrThrow(templateId, actor);
    await prisma.websiteTemplate.delete({ where: { id: templateId } });
  }

  async listSavedSections(id: string, actor: AuthUser): Promise<SavedSectionView[]> {
    const website = await this.findAccessibleOrThrow(id, actor);
    const saved = await prisma.savedSection.findMany({
      where: { OR: [{ clientId: website.clientId }, { clientId: null }] },
      orderBy: { createdAt: "desc" },
    });
    return saved.map(toSavedSection);
  }

  async saveSection(id: string, input: SaveSectionInput, actor: AuthUser): Promise<SavedSectionView> {
    const website = await this.findAccessibleOrThrow(id, actor);
    const existing = await prisma.savedSection.count({ where: { clientId: website.clientId } });
    if (existing >= MAX_SAVED_SECTIONS) {
      throw new AppError(409, `You can keep up to ${MAX_SAVED_SECTIONS} saved sections. Delete one first.`, "SAVED_SECTION_LIMIT");
    }
    const saved = await prisma.savedSection.create({
      data: {
        clientId: website.clientId,
        name: input.name.trim(),
        sectionType: input.section.type,
        section: input.section as unknown as Prisma.InputJsonValue,
        createdById: actor.id,
      },
    });
    return toSavedSection(saved);
  }

  /** Platform-wide saved sections (clientId null) are never deletable from a website. */
  async deleteSavedSection(id: string, savedSectionId: string, actor: AuthUser): Promise<void> {
    const website = await this.findAccessibleOrThrow(id, actor);
    const { count } = await prisma.savedSection.deleteMany({ where: { id: savedSectionId, clientId: website.clientId } });
    if (count === 0) throw new AppError(404, "Saved section not found", "SAVED_SECTION_NOT_FOUND");
  }

  async listThemes(): Promise<ThemeSummary[]> {
    const themes = await prisma.theme.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
    return themes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      settings: theme.settings as unknown as ThemeSettings,
    }));
  }

  async list(query: WebsiteListQuery, actor: AuthUser): Promise<WebsiteListResult> {
    const search = query.search?.trim();
    const where: Prisma.WebsiteWhereInput = {
      AND: [
        scopeFor(actor),
        // Template Studio websites are managed from the template gallery, not listed with client sites.
        { client: { isInternal: false } },
        query.clientId ? { clientId: query.clientId } : {},
        query.status ? { status: query.status } : {},
        query.builderType ? { builderType: query.builderType } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { subdomain: { contains: search.toLowerCase() } },
                { client: { businessName: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    };

    const [total, websites] = await prisma.$transaction([
      prisma.website.count({ where }),
      prisma.website.findMany({
        where,
        include: summaryInclude,
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return { items: websites.map(toSummary), total, page: query.page, pageSize: query.pageSize };
  }

  async get(id: string, actor: AuthUser): Promise<WebsiteDetail> {
    const website = await prisma.website.findFirst({ where: { id, ...scopeFor(actor) }, include: detailInclude });
    if (!website) throw NOT_FOUND();
    return toDetail(website);
  }

  /** `templateStudio` puts the website in the internal Template Studio; only the admin template API sets it. */
  async create(
    input: CreateWebsiteInput,
    actor: AuthUser,
    builderType: BuilderType = BuilderType.MANUAL,
    options: { templateStudio?: boolean } = {},
  ): Promise<WebsiteDetail> {
    let clientId: string;
    if (options.templateStudio) {
      if (actor.role !== UserRole.SUPER_ADMIN) throw new AppError(403, "Insufficient permissions", "FORBIDDEN");
      clientId = await ensureTemplateStudio();
    } else if (actor.role === UserRole.SUPER_ADMIN) {
      if (!input.clientId) throw new AppError(400, "Choose a client for this website", "CLIENT_REQUIRED");
      const client = await prisma.client.findFirst({ where: { id: input.clientId, isInternal: false }, select: { id: true } });
      if (!client) throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      clientId = client.id;
    } else {
      clientId = ownClientId(actor);
    }

    const template = input.templateKey
      ? await prisma.websiteTemplate.findFirst({
          // A client's own templates are usable only for that client's websites.
          where: {
            key: input.templateKey,
            isActive: true,
            archivedAt: null,
            OR: [
              { clientId: null, ...VALID_PLATFORM_KEY_WHERE },
              ...(clientId ? [{ clientId }] : []),
            ],
          },
          include: { theme: { select: { settings: true } } },
        })
      : null;
    if (input.templateKey && !template) throw new AppError(400, "Template not found", "TEMPLATE_NOT_FOUND");

    const chosenTheme = input.themeId
      ? await prisma.theme.findFirst({ where: { id: input.themeId, isActive: true }, select: { settings: true } })
      : null;
    if (input.themeId && !chosenTheme) throw new AppError(400, "Theme not found", "THEME_NOT_FOUND");

    const name = input.name.trim();
    const businessName = emptyToNull(input.businessName);
    const siteName = (businessName ?? name).slice(0, 120);
    const content = buildTemplateContent(template, siteName, name);
    const { pages, header } = content;

    const contactEmail = emptyToNull(input.contactEmail);
    const contactPhone = emptyToNull(input.contactPhone);
    const address = emptyToNull(input.address);

    const footer: FooterData = {
      ...content.footer,
      ...(contactEmail || contactPhone || address
        ? {
            contact: {
              ...(contactEmail ? { email: contactEmail } : {}),
              ...(contactPhone ? { phone: contactPhone } : {}),
              ...(address ? { address } : {}),
            },
          }
        : {}),
    };
    const theme = (chosenTheme?.settings ?? templateTheme(template)) as Prisma.InputJsonValue;

    const subdomain = await pickSubdomain(input.subdomain, name);
    let website: WebsiteWithPages;
    try {
      website = await prisma.website.create({
        data: {
          clientId,
          name,
          builderType,
          subdomain,
          businessName,
          websiteType: emptyToNull(input.websiteType),
          industry: emptyToNull(input.industry),
          description: emptyToNull(input.description),
          contactEmail,
          contactPhone,
          address,
          theme,
          header: header as Prisma.InputJsonValue,
          footer: footer as Prisma.InputJsonValue,
          // Set from JS so the stored value has millisecond precision and the
          // optimistic-concurrency comparison in saveDraft round-trips exactly.
          draftUpdatedAt: new Date(),
          createdById: actor.id,
          pages: {
            create: pages.map((page, index) => ({
              name: page.name,
              slug: page.slug,
              pageType: page.pageType,
              showInNav: page.showInNav,
              visible: page.visible ?? true,
              templateKey: template?.key ?? null,
              sortOrder: index,
              sections: page.sections.map((section) => ({ ...section, id: randomUUID() })) as Prisma.InputJsonValue,
            })),
          },
        },
        include: detailInclude,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw SUBDOMAIN_TAKEN();
      throw error;
    }

    logger.info(
      { websiteId: website.id, clientId, actorId: actor.id, template: template?.key ?? "blank" },
      "Website created",
    );
    return toDetail(website);
  }

  async update(id: string, input: UpdateWebsiteInput, actor: AuthUser): Promise<WebsiteDetail> {
    const current = await this.findAccessibleOrThrow(id, actor);

    const data: Prisma.WebsiteUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.seoToolsEnabled !== undefined) data.seoToolsEnabled = input.seoToolsEnabled;
    if (input.shopEnabled !== undefined) {
      if (input.shopEnabled) {
        const client = await prisma.client.findUnique({
          where: { id: current.clientId },
          select: { shopFeatureEnabled: true },
        });
        if (!client?.shopFeatureEnabled) {
          throw new AppError(
            403,
            "Shop isn't available for this company yet. Ask an admin to enable it.",
            "SHOP_NOT_ALLOWED",
          );
        }
      }
      data.shopEnabled = input.shopEnabled;
    }
    const infoKeys = [
      "businessName",
      "websiteType",
      "industry",
      "description",
      "contactEmail",
      "contactPhone",
      "address",
    ] as const;
    for (const key of infoKeys) {
      if (input[key] !== undefined) data[key] = emptyToNull(input[key]);
    }

    const website = await prisma.website.update({ where: { id }, data, include: detailInclude });
    const hostnames = (website.domains || []).map((d) => d.hostname);
    await liveSiteEngineService.purgeWebsiteCache(website.subdomain, hostnames);
    return toDetail(website);
  }

  async delete(id: string, actor: AuthUser): Promise<void> {
    const website = await prisma.website.findFirst({
      where: { id, ...scopeFor(actor) },
      select: { id: true, clientId: true, subdomain: true, domains: { select: { hostname: true } } },
    });
    if (!website) throw NOT_FOUND();

    await hostingAutopayService.stopForWebsite(website.id);
    await prisma.$transaction(async (tx) => {
      await tx.website.update({
        where: { id: website.id },
        data: { liveVersionId: null },
      });
      await tx.website.delete({
        where: { id: website.id },
      });
    });

    const hostnames = (website.domains || []).map((d) => d.hostname);
    await liveSiteEngineService.purgeWebsiteCache(website.subdomain, hostnames);
    logger.info({ websiteId: website.id, clientId: website.clientId, actorId: actor.id }, "Website deleted");
  }

  /**
   * Replaces the whole draft (theme, header, footer, pages) in one transaction.
   * `expectedDraftUpdatedAt` must match the stored value, so a stale editor tab
   * can't silently overwrite newer work.
   */
  async saveDraft(id: string, input: SaveDraftInput, actor: AuthUser): Promise<WebsiteDetail> {
    const website = await prisma.website.findFirst({
      where: { id, ...scopeFor(actor) },
      select: { id: true, clientId: true, draftUpdatedAt: true, pages: { select: { id: true, createdAt: true } } },
    });
    if (!website) throw NOT_FOUND();
    if (new Date(input.expectedDraftUpdatedAt).getTime() !== website.draftUpdatedAt.getTime()) {
      throw DRAFT_CONFLICT();
    }

    // A client-generated UUID is kept for new pages so the editor's page ids stay stable across
    // autosaves. An id owned by another website fails the primary key and rolls back the save.
    const existingPages = new Map(website.pages.map((page) => [page.id, page.createdAt]));

    try {
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.website.updateMany({
          where: { id: website.id, draftUpdatedAt: website.draftUpdatedAt },
          data: {
            theme: input.theme as Prisma.InputJsonValue,
            header: input.header as Prisma.InputJsonValue,
            footer: input.footer as Prisma.InputJsonValue,
            draftUpdatedAt: new Date(),
          },
        });
        if (claimed.count === 0) throw DRAFT_CONFLICT();

        await tx.page.deleteMany({ where: { websiteId: website.id } });
        await tx.page.createMany({
          data: input.pages.map((page, index) => {
            const createdAt = page.id === undefined ? undefined : existingPages.get(page.id);
            return {
              id: page.id ?? randomUUID(),
              websiteId: website.id,
              clientId: website.clientId,
              name: page.name,
              slug: page.slug,
              pageType: page.pageType,
              visible: page.visible,
              showInNav: page.showInNav,
              seoTitle: emptyToNull(page.seoTitle),
              seoDescription: emptyToNull(page.seoDescription),
              seoKeywords: page.seoKeywords ?? [],
              sortOrder: index,
              sections: page.sections as unknown as Prisma.InputJsonValue,
              ...(createdAt ? { createdAt } : {}),
            };
          }),
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new AppError(409, "A page id is already in use. Reload the editor.", "PAGE_ID_TAKEN");
      throw error;
    }

    return this.get(id, actor);
  }

  /**
   * Autosave path: replaces one page's sections. Uses the same optimistic
   * concurrency token as saveDraft, so both paths can't overwrite each other.
   */
  async savePageContent(
    id: string,
    pageId: string,
    input: SavePageContentInput,
    actor: AuthUser,
  ): Promise<{ draftUpdatedAt: string }> {
    const website = await prisma.website.findFirst({
      where: { id, ...scopeFor(actor) },
      select: { id: true, draftUpdatedAt: true },
    });
    if (!website) throw NOT_FOUND();
    if (new Date(input.expectedDraftUpdatedAt).getTime() !== website.draftUpdatedAt.getTime()) {
      throw DRAFT_CONFLICT();
    }

    const draftUpdatedAt = new Date();
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.website.updateMany({
        where: { id: website.id, draftUpdatedAt: website.draftUpdatedAt },
        data: { draftUpdatedAt },
      });
      if (claimed.count === 0) throw DRAFT_CONFLICT();

      const updated = await tx.page.updateMany({
        where: { id: pageId, websiteId: website.id },
        data: { sections: input.sections as unknown as Prisma.InputJsonValue },
      });
      if (updated.count === 0) throw PAGE_NOT_FOUND();
    });

    return { draftUpdatedAt: draftUpdatedAt.toISOString() };
  }

  /**
   * Snapshots the current draft into a new immutable version and points the
   * live site at it. The draft itself is never modified by publishing.
   */
  async publish(id: string, input: PublishInput, actor: AuthUser): Promise<WebsiteDetail> {
    const website = await prisma.website.findFirst({ where: { id, ...scopeFor(actor) }, include: detailInclude });
    if (!website) throw NOT_FOUND();
    if (website.client.isInternal) {
      throw new AppError(
        409,
        "Template Studio websites can't be published. Save them to the template gallery instead.",
        "TEMPLATE_STUDIO_NOT_PUBLISHABLE",
      );
    }
    if (new Date(input.expectedDraftUpdatedAt).getTime() !== website.draftUpdatedAt.getTime()) {
      throw DRAFT_CONFLICT();
    }
    await hostingService.assertCanPublish(website.id);

    const now = new Date();
    const previousVersion = website.liveVersionId
      ? await prisma.websiteVersion.findUnique({
          where: { id: website.liveVersionId },
          select: { snapshot: true, createdAt: true },
        })
      : null;
    const snapshot = buildPublishSnapshot(
      toDetail(website).draft,
      now,
      previousVersion && {
        snapshot: previousVersion.snapshot as unknown as PublishSnapshot,
        publishedAt: previousVersion.createdAt,
      },
    );
    let versionNumber = 0;
    try {
      await prisma.$transaction(async (tx) => {
        const latest = await tx.websiteVersion.aggregate({ where: { websiteId: website.id }, _max: { version: true } });
        versionNumber = (latest._max.version ?? 0) + 1;
        const version = await tx.websiteVersion.create({
          data: {
            websiteId: website.id,
            version: versionNumber,
            status: PublishStatus.SUCCEEDED,
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            publishedById: actor.id,
            completedAt: now,
          },
        });
        const claimed = await tx.website.updateMany({
          where: { id: website.id, draftUpdatedAt: website.draftUpdatedAt },
          data: { liveVersionId: version.id, publishedAt: now, status: WebsiteStatus.PUBLISHED, offlineReason: null },
        });
        if (claimed.count === 0) throw DRAFT_CONFLICT();
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, "Another publish is in progress. Try again in a moment.", "PUBLISH_IN_PROGRESS");
      }
      throw error;
    }

    logger.info({ websiteId: website.id, version: versionNumber, actorId: actor.id }, "Website published");
    const hostnames = (website.domains || []).map((d) => d.hostname);
    await liveSiteEngineService.purgeWebsiteCache(website.subdomain, hostnames);
    return this.get(id, actor);
  }

  /** Takes the site offline. The live version is kept, so publishing again restores it. */
  async unpublish(id: string, actor: AuthUser): Promise<WebsiteDetail> {
    const website = await prisma.website.findFirst({ where: { id, ...scopeFor(actor) }, include: detailInclude });
    if (!website) throw NOT_FOUND();
    if (website.status !== WebsiteStatus.PUBLISHED) {
      throw new AppError(409, "This website isn't published.", "WEBSITE_NOT_PUBLISHED");
    }

    await prisma.website.update({
      where: { id: website.id },
      data: { status: WebsiteStatus.UNPUBLISHED, offlineReason: WebsiteOfflineReason.MANUAL },
    });
    logger.info({ websiteId: website.id, actorId: actor.id }, "Website unpublished");
    const hostnames = (website.domains || []).map((d) => d.hostname);
    await liveSiteEngineService.purgeWebsiteCache(website.subdomain, hostnames);
    return this.get(id, actor);
  }

  async listVersions(id: string, actor: AuthUser): Promise<WebsiteVersionView[]> {
    const website = await prisma.website.findFirst({
      where: { id, ...scopeFor(actor) },
      select: { id: true, liveVersionId: true },
    });
    if (!website) throw NOT_FOUND();
    const versions = await prisma.websiteVersion.findMany({
      where: { websiteId: website.id },
      orderBy: { version: "desc" },
      take: 20,
      select: {
        id: true,
        version: true,
        status: true,
        createdAt: true,
        completedAt: true,
        publishedBy: { select: { fullName: true } },
      },
    });
    return versions.map((version) => ({
      id: version.id,
      version: version.version,
      status: version.status,
      isLive: version.id === website.liveVersionId,
      publishedByName: version.publishedBy?.fullName ?? null,
      createdAt: version.createdAt.toISOString(),
      completedAt: version.completedAt?.toISOString() ?? null,
    }));
  }

  private async findAccessibleOrThrow(id: string, actor: AuthUser): Promise<{ id: string; clientId: string }> {
    const website = await prisma.website.findFirst({
      where: { id, ...scopeFor(actor) },
      select: { id: true, clientId: true },
    });
    if (!website) throw NOT_FOUND();
    return website;
  }

  /** Client templates only: clients manage their own, a Super Admin any client's. Platform templates are seeded. */
  private async findOwnTemplateOrThrow(templateId: string, actor: AuthUser): Promise<void> {
    const owner = actor.role === UserRole.SUPER_ADMIN ? { not: null } : ownClientId(actor);
    const template = await prisma.websiteTemplate.findFirst({
      where: { id: templateId, clientId: owner },
      select: { id: true },
    });
    if (!template) throw new AppError(404, "Template not found", "TEMPLATE_NOT_FOUND");
  }
}

export const websiteService = new WebsiteService();
