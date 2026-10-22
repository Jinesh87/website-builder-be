import Joi from "joi";
import { BuilderType, PageType, WebsiteStatus } from "../../../common/constants/website.js";
import { GENERATION_TONES, MAX_BRIEF_IMAGES, MAX_GENERATED_PAGES } from "../types/website-generation.types.js";
import { footerSchema, headerSchema, sectionSchema, sectionsSchema, themeSchema } from "./site-content.validator.js";

export const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const PAGE_SLUG_PATTERN = /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

/** null is accepted because the API returns unset optional fields as null. */
const optionalText = (max: number) => Joi.string().trim().max(max).allow("", null).optional();

const websiteInfo = {
  businessName: optionalText(160),
  websiteType: optionalText(80),
  industry: optionalText(80),
  description: optionalText(2000),
  contactEmail: Joi.string().trim().lowercase().email().max(255).allow("", null).optional(),
  contactPhone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9 ()-]{7,20}$/)
    .allow("", null)
    .optional()
    .messages({ "string.pattern.base": "Enter a valid phone number" }),
  address: optionalText(500),
};

export const websiteIdParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
});

export const templateIdParamsSchema = Joi.object({
  templateId: Joi.string().guid().required(),
});

export const templateKeyParamsSchema = Joi.object({
  key: Joi.string()
    .trim()
    .max(80)
    .pattern(/^[a-z0-9-]+$/)
    .required(),
});

export const savedSectionParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  savedSectionId: Joi.string().guid().required(),
});

export const listTemplatesQuerySchema = Joi.object({
  clientId: Joi.string().guid().optional(),
});

export const saveTemplateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  description: optionalText(500),
});

export const updateTemplateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  description: optionalText(500),
}).min(1);
export const saveSectionSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  section: sectionSchema.required(),
});

export const listWebsitesQuerySchema = Joi.object({
  search: Joi.string().trim().max(120).allow("").optional(),
  clientId: Joi.string().guid().optional(),
  status: Joi.string()
    .valid(...Object.values(WebsiteStatus))
    .optional(),
  builderType: Joi.string()
    .valid(...Object.values(BuilderType))
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
});

export const createWebsiteSchema = Joi.object({
  clientId: Joi.string().guid().optional(),
  name: Joi.string().trim().min(2).max(120).required(),
  templateKey: Joi.string().trim().max(80).optional(),
  themeId: Joi.string().guid().optional(),
  subdomain: Joi.string()
    .trim()
    .lowercase()
    .pattern(SUBDOMAIN_PATTERN)
    .optional()
    .messages({ "string.pattern.base": "Use 3-40 lowercase letters, numbers or hyphens" }),
  ...websiteInfo,
});

export const createAiWebsiteSchema = Joi.object({
  clientId: Joi.string().guid().optional(),
  name: Joi.string().trim().min(2).max(120).required(),
  themeId: Joi.string().guid().optional(),
  subdomain: Joi.string()
    .trim()
    .lowercase()
    .pattern(SUBDOMAIN_PATTERN)
    .optional()
    .messages({ "string.pattern.base": "Use 3-40 lowercase letters, numbers or hyphens" }),
  ...websiteInfo,
  prompt: Joi.string().trim().min(20).max(2000).required().messages({
    "string.min": "Describe your website in at least 20 characters",
  }),
  pages: Joi.array()
    .items(Joi.string().trim().min(1).max(60))
    .min(1)
    .max(MAX_GENERATED_PAGES)
    .unique((a: string, b: string) => a.toLowerCase() === b.toLowerCase())
    .required()
    .messages({ "array.unique": "Page names must be different" }),
  tone: Joi.string()
    .valid(...GENERATION_TONES)
    .optional(),
  mediaIds: Joi.array().items(Joi.string().guid()).max(MAX_BRIEF_IMAGES).unique().optional(),
  logoMediaId: Joi.string().guid().optional(),
});

export const updateWebsiteSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  seoToolsEnabled: Joi.boolean().optional(),
  ...websiteInfo,
}).min(1);

const pageSchema = Joi.object({
  id: Joi.string().guid().optional(),
  name: Joi.string().trim().min(1).max(120).required(),
  slug: Joi.string()
    .trim()
    .lowercase()
    .max(160)
    .pattern(PAGE_SLUG_PATTERN)
    .required()
    .messages({ "string.pattern.base": 'Use "/" or "/lowercase-words"' }),
  pageType: Joi.string()
    .valid(...Object.values(PageType))
    .required(),
  visible: Joi.boolean().required(),
  showInNav: Joi.boolean().required(),
  seoTitle: optionalText(160),
  seoDescription: optionalText(320),
  seoKeywords: Joi.array().items(Joi.string().trim().lowercase().min(1).max(60)).max(10).unique().optional(),
  sections: sectionsSchema.required(),
});

export const pageContentParamsSchema = Joi.object({
  id: Joi.string().guid().required(),
  pageId: Joi.string().guid().required(),
});

/** Current editor document format; bump with a migration when the stored shape changes. */
export const EDITOR_SCHEMA_VERSION = 1;

/** Autosave of one page's sections. Page structure, theme, header and footer go through saveDraft. */
export const savePageContentSchema = Joi.object({
  expectedDraftUpdatedAt: Joi.string().isoDate().required(),
  schemaVersion: Joi.number().valid(EDITOR_SCHEMA_VERSION).required(),
  sections: sectionsSchema.required(),
});

/** Publishing requires the draft the user is looking at, so a stale tab can't publish older content. */
export const publishSchema = Joi.object({
  expectedDraftUpdatedAt: Joi.string().isoDate().required(),
});

export const saveDraftSchema = Joi.object({
  expectedDraftUpdatedAt: Joi.string().isoDate().required(),
  theme: themeSchema.required(),
  header: headerSchema.required(),
  footer: footerSchema.required(),
  pages: Joi.array()
    .items(pageSchema)
    .min(1)
    .max(50)
    .unique("slug")
    .unique((a: { id?: string }, b: { id?: string }) => a.id !== undefined && a.id === b.id)
    .has(Joi.object({ slug: Joi.valid("/") }).unknown())
    .required()
    .messages({
      "array.unique": "Page URLs and ids must be unique",
      "array.hasUnknown": 'The website needs a home page with the URL "/"',
    }),
});

export const generateAiSuggestionSchema = Joi.object({
  prompt: Joi.string().trim().min(1).max(2000).required(),
  scope: Joi.string().valid("section", "page").required(),
  sectionId: Joi.string().trim().max(128).optional(),
  currentSection: sectionSchema.optional(),
  currentSections: Joi.array().items(sectionSchema).max(60).optional(),
  pageId: Joi.string().trim().max(64).optional(),
  history: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid("user", "assistant").required(),
        content: Joi.string().trim().max(3000).required(),
      })
    )
    .max(10)
    .optional(),
});

export const generatePageSeoSchema = Joi.object({
  pageName: Joi.string().trim().max(120).optional(),
  pageSlug: Joi.string().trim().max(160).optional(),
  currentTitle: optionalText(160),
  currentDescription: optionalText(320),
  contentSummary: optionalText(4000),
});

export const reviewPageSeoContentSchema = Joi.object({
  targetKeyword: optionalText(100),
  language: optionalText(50),
  sections: Joi.array().items(Joi.object().unknown(true)).optional(),
});



