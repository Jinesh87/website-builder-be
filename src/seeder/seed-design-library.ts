import type { ObjectSchema, ArraySchema } from "joi";
import { logger } from "../config/logger.js";
import { prisma } from "../config/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import {
  footerSchema,
  headerSchema,
  sectionsSchema,
  themeSchema,
} from "../modules/websites/validators/site-content.validator.js";
import { ADMIN_TEMPLATE_KEY_PREFIX, SYSTEM_TEMPLATE_CATEGORIES } from "../modules/websites/types/template.types.js";
import { THEME_SEEDS } from "./design-library/themes.js";
import { WEBSITE_TEMPLATE_SEEDS, type WebsiteTemplateSeed } from "./design-library/templates.js";

function check(schema: ObjectSchema | ArraySchema, value: unknown, label: string): string[] {
  const { error } = schema.validate(value, { abortEarly: false });
  return error ? error.details.map((detail) => `${label}: ${detail.message}`) : [];
}

/** Seed content is code, but it goes through the same validation as user drafts. */
function templateProblems(template: WebsiteTemplateSeed): string[] {
  return [
    ...check(headerSchema, { ...template.header, siteName: "Preview", menu: [] }, "header"),
    ...check(footerSchema, { ...template.footer, siteName: "Preview", copyright: "" }, "footer"),
    ...template.pages.flatMap((page) =>
      check(
        sectionsSchema,
        page.sections.map((section, index) => ({ ...section, id: `seed-${index}` })),
        `page ${page.slug}`,
      ),
    ),
  ];
}

/**
 * Creates the built-in themes and website templates when missing. Existing
 * rows are never overwritten, so Super Admin edits survive restarts.
 */
export async function seedDesignLibrary(): Promise<void> {
  const themeIds = new Map<string, string>();

  for (const seed of THEME_SEEDS) {
    const problems = check(themeSchema, seed.settings, `theme ${seed.name}`);
    if (problems.length > 0) {
      logger.error({ problems }, "Skipping invalid theme seed");
      continue;
    }
    const theme = await prisma.theme.upsert({
      where: { name: seed.name },
      create: { name: seed.name, settings: seed.settings as Prisma.InputJsonValue },
      update: {},
      select: { id: true },
    });
    themeIds.set(seed.name, theme.id);
  }

  // Built-in categories are code-owned like the built-in templates, so they are locked in the admin.
  const categoryIds = new Map<string, string>();
  for (const [index, seed] of SYSTEM_TEMPLATE_CATEGORIES.entries()) {
    const category = await prisma.templateCategory.upsert({
      where: { slug: seed.slug },
      create: { slug: seed.slug, name: seed.name, isSystem: true, sortOrder: index },
      update: { name: seed.name, isSystem: true, sortOrder: index },
      select: { id: true },
    });
    categoryIds.set(seed.name, category.id);
  }

  for (const [index, seed] of WEBSITE_TEMPLATE_SEEDS.entries()) {
    const problems = templateProblems(seed);
    const categoryId = categoryIds.get(seed.category);
    if (!categoryId) problems.push(`category "${seed.category}" is not in SYSTEM_TEMPLATE_CATEGORIES`);
    if (problems.length > 0 || !categoryId) {
      logger.error({ key: seed.key, problems }, "Skipping invalid website template seed");
      continue;
    }
    await prisma.websiteTemplate.upsert({
      where: { key: seed.key },
      create: {
        key: seed.key,
        name: seed.name,
        category: seed.category,
        categoryId,
        description: seed.description,
        themeId: themeIds.get(seed.themeName) ?? null,
        header: seed.header as Prisma.InputJsonValue,
        footer: seed.footer as Prisma.InputJsonValue,
        pages: seed.pages as unknown as Prisma.InputJsonValue,
        sortOrder: index,
      },
      update: {
        name: seed.name,
        category: seed.category,
        categoryId,
        description: seed.description,
        themeId: themeIds.get(seed.themeName) ?? null,
        header: seed.header as Prisma.InputJsonValue,
        footer: seed.footer as Prisma.InputJsonValue,
        pages: seed.pages as unknown as Prisma.InputJsonValue,
        sortOrder: index,
      },
    });
  }

  // Only seed-created rows are removed. Super Admin templates are matched by key prefix and source website too,
  // because their createdById becomes null once the admin's account is deleted.
  const retired = await prisma.websiteTemplate.deleteMany({
    where: {
      clientId: null,
      createdById: null,
      sourceWebsiteId: null,
      key: { notIn: WEBSITE_TEMPLATE_SEEDS.map((seed) => seed.key) },
      NOT: { key: { startsWith: ADMIN_TEMPLATE_KEY_PREFIX } },
    },
  });
  if (retired.count > 0) logger.info({ count: retired.count }, "Deleted platform templates no longer seeded");

  // Clean up any custom categories that were created for obsolete seeds and now have no templates.
  const systemSlugs = SYSTEM_TEMPLATE_CATEGORIES.map((seed) => seed.slug);
  const unusedCategories = await prisma.templateCategory.deleteMany({
    where: {
      isSystem: false,
      slug: { notIn: systemSlugs },
      templates: { none: {} },
    },
  });
  if (unusedCategories.count > 0) logger.info({ count: unusedCategories.count }, "Cleaned up unused template categories");

  logger.debug({ themes: themeIds.size, templates: WEBSITE_TEMPLATE_SEEDS.length }, "Design library seeded");
}
