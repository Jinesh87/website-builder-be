import { randomUUID } from "node:crypto";
import { PageType } from "../../../common/constants/website.js";
import { AppError } from "../../../common/errors/AppError.js";
import { logger } from "../../../config/logger.js";
import {
  FONT_KEYS,
  type FontKey,
  type FooterData,
  type HeaderData,
  type LinkRef,
  type Section,
  type ThemeSettings,
} from "../types/site-content.types.js";
import type { GenerationBrief } from "../types/website-generation.types.js";
import { footerSchema, headerSchema, sectionSchema, themeSchema } from "../validators/site-content.validator.js";
import { sanitizeHexColor, sanitizeSectionData, sanitizeSectionSettings } from "./ai-generator.service.js";
import type { JsonCompletion } from "./openai-json.client.js";

/** Section types the AI may use in a generated page body. */
export const GENERATED_SECTION_TYPES = [
  "hero",
  "features",
  "services",
  "split",
  "stats",
  "testimonials",
  "team",
  "pricing",
  "faq",
  "gallery",
  "contact",
  "cta",
  "text",
] as const;
export type GeneratedSectionType = (typeof GENERATED_SECTION_TYPES)[number];

export function isGeneratedSectionType(value: unknown): value is GeneratedSectionType {
  return typeof value === "string" && (GENERATED_SECTION_TYPES as readonly string[]).includes(value);
}

/** Every page has exactly one of each, so the AI may change them but never add, remove or move them. */
export const FIXED_SECTION_TYPES = ["header", "footer"] as const;
export const EDITABLE_SECTION_TYPES = [...FIXED_SECTION_TYPES, ...GENERATED_SECTION_TYPES] as const;
export type EditableSectionType = (typeof EDITABLE_SECTION_TYPES)[number];

export function isEditableSectionType(value: unknown): value is EditableSectionType {
  return typeof value === "string" && (EDITABLE_SECTION_TYPES as readonly string[]).includes(value);
}

const HEADER_DESIGN_CHOICES = ["logo-left", "centered", "minimalist", "floating"] as const;
const FOOTER_DESIGN_CHOICES = ["columns", "simple", "centered", "split"] as const;
const MAX_SECTIONS_PER_PAGE = 8;
const PAGE_CONCURRENCY = 3;

export type SiteFacts = {
  name: string;
  businessName: string | null;
  websiteType: string | null;
  industry: string | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
};

export type BriefImage = { id: string; url: string; alt: string; fileName: string; width: number | null; height: number | null };
export type ThemeChoice = { id: string; name: string; settings: ThemeSettings };

export type GeneratedPage = {
  name: string;
  slug: string;
  pageType: PageType;
  showInNav: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  sections: Section[];
};

export type GeneratedSite = {
  theme: ThemeSettings;
  header: HeaderData;
  footer: FooterData;
  pages: GeneratedPage[];
};

export type GenerateSiteOptions = {
  facts: SiteFacts;
  brief: GenerationBrief;
  images: BriefImage[];
  logo: BriefImage | null;
  themes: ThemeChoice[];
  complete: JsonCompletion;
  onProgress?: (step: string, progress: number) => Promise<void>;
};

type PlannedPage = {
  name: string;
  slug: string;
  pageType: PageType;
  purpose: string;
  seoTitle: string;
  seoDescription: string;
  sections: GeneratedSectionType[];
};

type Plan = {
  theme: ThemeSettings;
  headerDesign: (typeof HEADER_DESIGN_CHOICES)[number];
  footerDesign: (typeof FOOTER_DESIGN_CHOICES)[number];
  headerCtaLabel: string;
  headerCtaHref: string;
  tagline: string;
  pages: PlannedPage[];
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

// ---------------------------------------------------------------------------
// Pages: names come from the client, so slugs and page types are derived here.
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function pageTypeFor(name: string, isHome: boolean): PageType {
  if (isHome) return PageType.HOME;
  const lower = name.toLowerCase();
  if (/\babout\b|\bstory\b|\bwho we are\b/.test(lower)) return PageType.ABOUT;
  if (/\bservices?\b|\bwhat we do\b|\bsolutions?\b/.test(lower)) return PageType.SERVICES;
  if (/\bcontact\b|\bget in touch\b/.test(lower)) return PageType.CONTACT;
  if (/\bblog\b|\bnews\b|\barticles?\b/.test(lower)) return PageType.BLOG;
  return PageType.CUSTOM;
}

const DEFAULT_SECTIONS: Record<PageType, GeneratedSectionType[]> = {
  [PageType.HOME]: ["hero", "features", "split", "testimonials", "cta"],
  [PageType.ABOUT]: ["hero", "split", "stats", "team", "cta"],
  [PageType.SERVICES]: ["hero", "services", "faq", "cta"],
  [PageType.CONTACT]: ["hero", "contact", "faq"],
  [PageType.BLOG]: ["hero", "text", "cta"],
  [PageType.LANDING]: ["hero", "features", "testimonials", "cta"],
  [PageType.CUSTOM]: ["hero", "text", "cta"],
};

function pageSkeletons(names: string[]): Array<Pick<PlannedPage, "name" | "slug" | "pageType">> {
  const used = new Set<string>();
  return names.map((rawName, index) => {
    const name = rawName.trim().slice(0, 120) || `Page ${index + 1}`;
    if (index === 0) {
      used.add("/");
      return { name, slug: "/", pageType: PageType.HOME };
    }
    const base = `/${slugify(name) || `page-${index + 1}`}`;
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return { name, slug, pageType: pageTypeFor(name, false) };
  });
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

export function describeFacts(facts: SiteFacts, brief: Pick<GenerationBrief, "prompt" | "tone"> | null): string {
  const lines = [
    `Website name: ${facts.name}`,
    facts.businessName ? `Business name: ${facts.businessName}` : null,
    facts.websiteType ? `Website type: ${facts.websiteType}` : null,
    facts.industry ? `Industry: ${facts.industry}` : null,
    facts.description ? `About the business: ${facts.description}` : null,
    facts.address ? `Location: ${facts.address}` : null,
    brief?.tone ? `Tone of voice: ${brief.tone}` : null,
    brief ? `Owner's brief: ${brief.prompt}` : null,
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

export function describeImages(images: BriefImage[]): string {
  if (images.length === 0) {
    return "No images are available. Leave out every image field and never use the gallery section.";
  }
  const list = images
    .map((image, index) => {
      const size = image.width && image.height ? `, ${image.width}x${image.height}` : "";
      return `- IMAGE_${index + 1}: ${image.alt || image.fileName}${size}`;
    })
    .join("\n");
  return `Images from the owner's media library. Image fields accept ONLY one of these tokens as a string, e.g. "image": "IMAGE_1". Never invent image URLs.\n${list}`;
}

const PLAN_SYSTEM_PROMPT = `You are a senior web designer planning a small business website.
Choose a visual theme and, for every requested page, an ordered list of sections that tells a clear story and converts visitors.
Rules:
- Keep every page name exactly as requested and in the same order.
- The home page starts with "hero". Every page has 3 to 7 sections.
- Use "gallery" only when images are available. Use "contact" on a contact page.
- Use "pricing" only if the brief suggests prices or plans.
- primaryColor is a #rrggbb brand color that fits the brief, or "" to keep the theme's color.
- headerCtaPage is the slug of the page the header button links to.
Respond in JSON.`;

export const SECTION_GUIDE = `Section JSON shapes (all text is plain text, no HTML or markdown):
- hero: { variant: "centered"|"split", eyebrow, heading, highlightText (a phrase from heading), subheading, primaryCta: {label, href}, secondaryCta?: {label, href}, image?: IMAGE token, imagePosition?: "right"|"left" }
- features: { eyebrow, heading, intro, variant: "grid"|"cards"|"minimal", columns: 2|3|4, items: [{ icon, title, description }] } (3-6 items)
- services: { eyebrow, heading, intro, variant: "cards-grid"|"horizontal-cards"|"minimal-numbered", columns: 2|3, items: [{ title, description, icon, image?: IMAGE token, features?: [string] }] }
- split: { eyebrow, heading, body, bullets: [string] (2-5), imagePosition: "left"|"right", image?: IMAGE token, cta?: {label, href} }
- stats: { heading, intro, items: [{ value, label }] } (3-4 items, value max 20 chars)
- testimonials: { heading, items: [{ quote, name, role }] } (3 items)
- team: { eyebrow, heading, intro, columns: 3, mobileColumns: 1, members: [{ name, role, bio, photo?: IMAGE token }] }
- pricing: { eyebrow, heading, intro, plans: [{ name, price, period, description, features: [string], featured: boolean, cta: {label, href} }] }
- faq: { eyebrow, heading, intro, variant: "accordion-classic"|"two-column-grid", items: [{ question, answer }] } (4-6 items)
- gallery: { heading, columns: 3, mobileColumns: 1, images: [IMAGE token, ...] }
- contact: { eyebrow, heading, text, email, phone, address, showForm: true, submitLabel, formHeading } (showForm renders name, email and message fields that email the site owner; submitLabel is the button, such as "Send message")
- cta: { variant: "centered-card"|"split-visual", eyebrow, heading, text, button: {label, href}, secondaryButton?: {label, href} }
- text: { heading, body } (body uses blank lines between paragraphs)
Icons are lowercase names such as: star, check, shield, zap, heart, users, globe, sparkles, rocket, layers, box, lock, cloud, code, phone, mail, clock, award.
Each section is { "type": string, "settings": { "background": "default"|"surface"|"primary"|"dark" }, "data": { ... } }. Alternate backgrounds between "default" and "surface" for rhythm; use "primary" or "dark" at most once per page, usually for the cta.`;

const PAGE_SYSTEM_PROMPT = `You are a senior conversion copywriter and web designer writing one page of a small business website.
Write specific, credible, benefit-led copy for this business; never use lorem ipsum or generic filler.
Do not invent contact details, addresses, awards or exact statistics presented as facts; keep numbers modest and plausible.
Testimonials and team members are placeholders the owner will replace: use believable first names and roles.
Links: use only the page slugs provided, or "#contact"-style anchors.
${SECTION_GUIDE}
Respond in JSON: { "sections": [ ...sections in the requested order... ] }`;

function planSchema(themeNames: string[]): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "themeName",
      "primaryColor",
      "headingFont",
      "bodyFont",
      "headerDesign",
      "footerDesign",
      "headerCtaLabel",
      "headerCtaPage",
      "tagline",
      "pages",
    ],
    properties: {
      themeName: { type: "string", enum: themeNames },
      primaryColor: { type: "string" },
      headingFont: { type: "string", enum: [...FONT_KEYS] },
      bodyFont: { type: "string", enum: [...FONT_KEYS] },
      headerDesign: { type: "string", enum: [...HEADER_DESIGN_CHOICES] },
      footerDesign: { type: "string", enum: [...FOOTER_DESIGN_CHOICES] },
      headerCtaLabel: { type: "string" },
      headerCtaPage: { type: "string" },
      tagline: { type: "string" },
      pages: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "purpose", "seoTitle", "seoDescription", "sections"],
          properties: {
            name: { type: "string" },
            purpose: { type: "string" },
            seoTitle: { type: "string" },
            seoDescription: { type: "string" },
            sections: { type: "array", items: { type: "string", enum: [...GENERATED_SECTION_TYPES] } },
          },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

function normalizeSectionList(raw: unknown, pageType: PageType, hasImages: boolean): GeneratedSectionType[] {
  const list = Array.isArray(raw) ? raw : [];
  const result: GeneratedSectionType[] = [];
  for (const item of list) {
    const type = pick(item, GENERATED_SECTION_TYPES, "text");
    if (item !== type) continue;
    if (type === "gallery" && !hasImages) continue;
    if (type === "hero" && result.length > 0) continue;
    if (result.at(-1) === type) continue;
    result.push(type);
    if (result.length === MAX_SECTIONS_PER_PAGE) break;
  }
  if (result.length < 2) return DEFAULT_SECTIONS[pageType];
  if (pageType === PageType.HOME && result[0] !== "hero") result.unshift("hero");
  return result.slice(0, MAX_SECTIONS_PER_PAGE);
}

function buildTheme(base: ThemeSettings, raw: JsonRecord, fixed: boolean): ThemeSettings {
  if (fixed) return base;
  const primary = sanitizeHexColor(raw.primaryColor);
  const candidate: ThemeSettings = {
    ...base,
    colors: { ...base.colors, ...(primary ? { primary } : {}) },
    fonts: {
      heading: pick<FontKey>(raw.headingFont, FONT_KEYS, base.fonts.heading),
      body: pick<FontKey>(raw.bodyFont, FONT_KEYS, base.fonts.body),
    },
  };
  return themeSchema.validate(candidate).error ? base : candidate;
}

async function planSite(options: GenerateSiteOptions): Promise<Plan> {
  const { facts, brief, images, themes, complete } = options;
  const skeletons = pageSkeletons(brief.pages);
  const fixedTheme = brief.themeId ? themes.find((theme) => theme.id === brief.themeId) : undefined;
  const themeNames = (fixedTheme ? [fixedTheme] : themes).map((theme) => theme.name);

  const user = `${describeFacts(facts, brief)}

Pages to plan (name -> slug):
${skeletons.map((page) => `- ${page.name} -> ${page.slug}`).join("\n")}

Available themes: ${themeNames.join(", ")}${fixedTheme ? " (the owner chose this theme)" : ""}
Available section types: ${GENERATED_SECTION_TYPES.join(", ")}
${images.length > 0 ? `${images.length} images are available.` : "No images are available."}`;

  const raw = await complete({
    messages: [
      { role: "system", content: PLAN_SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
    schema: { name: "site_plan", schema: planSchema(themeNames) },
    maxTokens: 2500,
    temperature: 0.7,
    scope: "site_plan",
  });
  const plan = isRecord(raw) ? raw : {};
  const rawPages = Array.isArray(plan.pages) ? plan.pages.filter(isRecord) : [];

  const pages = skeletons.map((skeleton, index): PlannedPage => {
    const match =
      rawPages.find((page) => str(page.name, 120).toLowerCase() === skeleton.name.toLowerCase()) ?? rawPages[index] ?? {};
    return {
      ...skeleton,
      purpose: str(match.purpose, 400),
      seoTitle: str(match.seoTitle, 160),
      seoDescription: str(match.seoDescription, 320),
      sections: normalizeSectionList(match.sections, skeleton.pageType, images.length > 0),
    };
  });

  const baseTheme = fixedTheme ?? themes.find((theme) => theme.name === plan.themeName) ?? themes[0];
  if (!baseTheme) throw new AppError(500, "No themes are available", "NO_THEMES");
  const ctaPage = pages.find((page) => page.slug === plan.headerCtaPage) ??
    pages.find((page) => page.pageType === PageType.CONTACT) ?? pages[0]!;

  return {
    theme: buildTheme(baseTheme.settings, plan, Boolean(fixedTheme)),
    headerDesign: pick(plan.headerDesign, HEADER_DESIGN_CHOICES, "logo-left"),
    footerDesign: pick(plan.footerDesign, FOOTER_DESIGN_CHOICES, "columns"),
    headerCtaLabel: str(plan.headerCtaLabel, 40) || "Get in touch",
    headerCtaHref: ctaPage.slug,
    tagline: str(plan.tagline, 200),
    pages,
  };
}

// ---------------------------------------------------------------------------
// Section clean-up: only owner media, only internal links, then the real schema.
// ---------------------------------------------------------------------------

const IMAGE_KEYS = new Set(["image", "secondaryImage", "backgroundImage", "splitImage", "photo", "logo"]);
const IMAGE_LIST_KEYS = new Set(["images", "logos"]);
const REMOVE = Symbol("remove");

export type CleanContext = {
  images: BriefImage[];
  slugs: Set<string>;
  fallbackHref: string;
  /** Image URLs and links the owner already has on the page; edits may keep them. */
  keepUrls?: Set<string>;
  keepHrefs?: Set<string>;
};

function resolveImage(value: unknown, context: CleanContext): { url: string; alt: string } | typeof REMOVE {
  const ref = (typeof value === "string" ? value : isRecord(value) && typeof value.url === "string" ? value.url : "").trim();
  // The sanitizer's placeholders for bare strings; the library's alt text is better.
  const genericTerms = new Set(["image", "hero background", "team member", "product preview", "photo", "background", "thumbnail", "preview"]);
  const isGeneric = (alt: string) => genericTerms.has(alt.trim().toLowerCase());
  const altOf = (fallback: string) => {
    if (isRecord(value) && typeof value.alt === "string" && value.alt.trim() && !isGeneric(value.alt)) {
      return value.alt.slice(0, 300);
    }
    if (fallback && !isGeneric(fallback)) {
      return fallback.slice(0, 300);
    }
    return "Website feature";
  };
  const token = /^IMAGE_(\d{1,2})$/i.exec(ref);
  const image = token ? context.images[Number(token[1]) - 1] : context.images.find((candidate) => candidate.url === ref);
  if (image) {
    const fallbackTitle = image.alt && !isGeneric(image.alt)
      ? image.alt
      : image.fileName
        ? image.fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ")
        : "Website showcase";
    return { url: image.url, alt: altOf(fallbackTitle) };
  }
  if (ref && context.keepUrls?.has(ref)) return { url: ref, alt: altOf("Site graphic") };
  return REMOVE;
}

/** A library token, library URL or URL already on the page as an image value; null for anything else. */
export function resolveImageRef(value: unknown, context: CleanContext): { url: string; alt: string } | null {
  const resolved = resolveImage(value, context);
  return resolved === REMOVE ? null : resolved;
}

export function cleanHref(href: string, context: CleanContext): string {
  const trimmed = href.trim();
  if (/^#[a-z][a-z0-9-]{0,39}$/i.test(trimmed)) return trimmed.toLowerCase();
  if (context.keepHrefs?.has(trimmed)) return trimmed;
  const path = trimmed.split(/[?#]/)[0] ?? "";
  if (context.slugs.has(path)) return path;
  return context.fallbackHref;
}

function cleanValue(value: unknown, key: string, context: CleanContext): unknown {
  if (IMAGE_KEYS.has(key)) return resolveImage(value, context);
  if (key === "href" && typeof value === "string") return cleanHref(value, context);
  if (Array.isArray(value)) {
    const items = IMAGE_LIST_KEYS.has(key)
      ? value.map((item) => resolveImage(item, context))
      : value.map((item) => cleanValue(item, "", context));
    return items.filter((item) => item !== REMOVE);
  }
  if (isRecord(value)) {
    const result: JsonRecord = {};
    for (const [childKey, child] of Object.entries(value)) {
      const cleaned = cleanValue(child, childKey, context);
      if (cleaned !== REMOVE && cleaned !== undefined) result[childKey] = cleaned;
    }
    return result;
  }
  return value;
}

/** Fields that would embed third-party media or invented contact details. */
function stripUnsafeFields(type: GeneratedSectionType, data: JsonRecord, facts: SiteFacts): void {
  if (type === "hero") {
    for (const key of ["videoUrl", "backgroundVideoUrl", "trustedBy", "rating", "floatingCards"]) delete data[key];
    data.mediaType = "image";
    if (!data.image && (data.imagePosition === "background" || data.variant === "split")) data.imagePosition = "none";
  }
  if (type === "team" && Array.isArray(data.members)) {
    for (const member of data.members) if (isRecord(member)) delete member.socialLinks;
  }
  if (type === "contact") {
    delete data.channels;
    for (const [field, fact] of [
      ["email", facts.contactEmail],
      ["phone", facts.contactPhone],
      ["address", facts.address],
    ] as const) {
      if (fact) data[field] = fact;
      else delete data[field];
    }
  }
}

export type CleanSectionOptions = {
  /** Keep the id of the section being edited. */
  id?: string;
  /** Existing settings to keep; the AI may only change background, spacing and custom colors. */
  baseSettings?: JsonRecord;
  /** The caller already removed unsafe fields from the AI's changes, so existing owner values stay. */
  trusted?: boolean;
};

export function cleanSection(
  raw: unknown,
  expectedType: GeneratedSectionType,
  facts: SiteFacts,
  context: CleanContext,
  options: CleanSectionOptions = {},
): Section | null {
  const section = isRecord(raw) ? raw : {};
  const type = pick(section.type, GENERATED_SECTION_TYPES, expectedType);
  const rawSettings = isRecord(section.settings) ? section.settings : {};
  const settings = sanitizeSectionSettings({
    ...options.baseSettings,
    ...(rawSettings.background ? { background: rawSettings.background } : {}),
    ...(rawSettings.spacing ? { spacing: rawSettings.spacing } : {}),
    ...(options.baseSettings && isRecord(rawSettings.customColors)
      ? {
          customColors: {
            ...(isRecord(options.baseSettings.customColors) ? options.baseSettings.customColors : {}),
            ...rawSettings.customColors,
          },
        }
      : {}),
  });
  // The sanitizer fills missing fields with generic demo copy; an empty reply shouldn't become that.
  if (!isRecord(section.data) || Object.keys(section.data).length === 0) return null;
  const sanitized = sanitizeSectionData(type, section.data);
  const data = cleanValue(sanitized, "", context) as JsonRecord;
  if (!options.trusted) stripUnsafeFields(type, data, facts);
  if (type === "gallery" && (!Array.isArray(data.images) || data.images.length === 0)) return null;

  const { value, error } = sectionSchema.validate(
    { id: options.id ?? randomUUID(), type, hidden: false, settings, data },
    { stripUnknown: true },
  );
  if (error) {
    logger.warn({ type, reason: error.message }, "Dropped an invalid AI-generated section");
    return null;
  }
  return value as Section;
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

function fallbackHero(page: PlannedPage, facts: SiteFacts, context: CleanContext): Section | null {
  return cleanSection(
    {
      type: "hero",
      data: {
        heading: page.name === "Home" ? facts.businessName ?? facts.name : page.name,
        subheading: page.purpose || facts.description || "",
        primaryCta: { label: "Get in touch", href: context.fallbackHref },
      },
    },
    "hero",
    facts,
    context,
  );
}

async function writePage(
  page: PlannedPage,
  plan: Plan,
  options: GenerateSiteOptions,
  context: CleanContext,
): Promise<Section[]> {
  const { facts, brief, images, complete } = options;
  const user = `${describeFacts(facts, brief)}

Site pages (name -> slug): ${plan.pages.map((p) => `${p.name} -> ${p.slug}`).join(", ")}
Write the "${page.name}" page (${page.slug}). Purpose: ${page.purpose || "not specified"}
Sections in order: ${page.sections.join(", ")}
${describeImages(images)}`;

  const request = {
    messages: [
      { role: "system" as const, content: PAGE_SYSTEM_PROMPT },
      { role: "user" as const, content: user },
    ],
    maxTokens: 6000,
    temperature: 0.8,
    scope: "site_page",
  };
  let raw: unknown;
  try {
    raw = await complete(request);
  } catch (error) {
    // One retry for transient provider errors; auth and quota errors won't recover.
    if (error instanceof AppError && (error.code === "AI_AUTH_FAILED" || error.code === "AI_RATE_LIMITED")) throw error;
    raw = await complete(request);
  }

  const rawSections = isRecord(raw) && Array.isArray(raw.sections) ? raw.sections : [];
  const sections: Section[] = [];
  page.sections.forEach((expected, index) => {
    const candidate = rawSections.find((item, i) => i >= index && isRecord(item) && item.type === expected) ?? rawSections[index];
    const cleaned = cleanSection(candidate, expected, facts, context);
    if (cleaned) sections.push(cleaned);
  });
  if (sections.length === 0 || (page.pageType === PageType.HOME && sections[0]?.type !== "hero")) {
    const hero = fallbackHero(page, facts, context);
    if (hero) sections.unshift(hero);
  }
  return sections;
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]!);
    }
  });
  await Promise.all(runners);
  return results;
}

// ---------------------------------------------------------------------------
// Header / footer
// ---------------------------------------------------------------------------

function validated<T>(schema: typeof headerSchema, value: JsonRecord, label: string): T {
  const result = schema.validate(value, { stripUnknown: true });
  if (result.error) throw new AppError(500, `Generated ${label} is invalid: ${result.error.message}`, "GENERATION_INVALID");
  return result.value as T;
}

function buildHeaderAndFooter(plan: Plan, facts: SiteFacts, logo: BriefImage | null): { header: HeaderData; footer: FooterData } {
  const siteName = (facts.businessName ?? facts.name).slice(0, 120);
  const navLinks: LinkRef[] = plan.pages.map((page) => ({ label: page.name.slice(0, 80), href: page.slug }));
  const logoRef = logo ? { url: logo.url, alt: logo.alt || siteName } : undefined;

  const header = validated<HeaderData>(
    headerSchema,
    {
      design: plan.headerDesign,
      siteName,
      ...(logoRef ? { logo: logoRef } : {}),
      menu: navLinks,
      cta: { label: plan.headerCtaLabel, href: plan.headerCtaHref },
      sticky: true,
    },
    "header",
  );

  const contact = {
    ...(facts.contactEmail ? { email: facts.contactEmail } : {}),
    ...(facts.contactPhone ? { phone: facts.contactPhone } : {}),
    ...(facts.address ? { address: facts.address } : {}),
  };
  const footer = validated<FooterData>(
    footerSchema,
    {
      design: plan.footerDesign,
      siteName,
      ...(logoRef ? { logo: logoRef } : {}),
      tagline: plan.tagline,
      columns: plan.footerDesign === "columns" ? [{ title: "Pages", links: navLinks.slice(0, 12) }] : [],
      menu: navLinks.slice(0, 12),
      social: [],
      ...(Object.keys(contact).length > 0 ? { contact } : {}),
      copyright: `© ${new Date().getFullYear()} ${siteName}`,
    },
    "footer",
  );

  return { header, footer };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** Plans and writes a whole site. Every section in the result has passed `sectionSchema`. */
export async function generateSite(options: GenerateSiteOptions): Promise<GeneratedSite> {
  const progress = options.onProgress ?? (async () => undefined);
  if (options.brief.pages.length === 0) throw new AppError(400, "Choose at least one page", "PAGES_REQUIRED");

  await progress("Planning your website", 5);
  const plan = await planSite(options);
  const contactPage = plan.pages.find((page) => page.pageType === PageType.CONTACT);
  const context: CleanContext = {
    images: options.images,
    slugs: new Set(plan.pages.map((page) => page.slug)),
    fallbackHref: contactPage?.slug ?? "/",
  };

  const { header, footer } = buildHeaderAndFooter(plan, options.facts, options.logo);
  let done = 0;
  await progress(`Writing ${plan.pages.length === 1 ? "your page" : `${plan.pages.length} pages`}`, 20);

  const bodies = await mapWithConcurrency(plan.pages, PAGE_CONCURRENCY, async (page) => {
    const sections = await writePage(page, plan, options, context);
    done += 1;
    await progress(`Wrote the ${page.name} page`, 20 + Math.round((done / plan.pages.length) * 70));
    return sections;
  });

  // Every page shows the site-wide header and footer, so pages hold only their own body sections.
  const pages = plan.pages.map((page, index): GeneratedPage => ({
    name: page.name,
    slug: page.slug,
    pageType: page.pageType,
    showInNav: true,
    seoTitle: page.seoTitle || null,
    seoDescription: page.seoDescription || null,
    sections: bodies[index]!,
  }));

  return { theme: plan.theme, header, footer, pages };
}
