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

  for (const [index, seed] of WEBSITE_TEMPLATE_SEEDS.entries()) {
    const problems = templateProblems(seed);
    if (problems.length > 0) {
      logger.error({ key: seed.key, problems }, "Skipping invalid website template seed");
      continue;
    }
    await prisma.websiteTemplate.upsert({
      where: { key: seed.key },
      create: {
        key: seed.key,
        name: seed.name,
        category: seed.category,
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
        description: seed.description,
        themeId: themeIds.get(seed.themeName) ?? null,
        header: seed.header as Prisma.InputJsonValue,
        footer: seed.footer as Prisma.InputJsonValue,
        pages: seed.pages as unknown as Prisma.InputJsonValue,
        sortOrder: index,
      },
    });
  }

  // Only seed-created rows (no creator) are retired; client and staff-created templates are left alone.
  const retired = await prisma.websiteTemplate.updateMany({
    where: {
      clientId: null,
      createdById: null,
      isActive: true,
      key: { notIn: WEBSITE_TEMPLATE_SEEDS.map((seed) => seed.key) },
    },
    data: { isActive: false },
  });
  if (retired.count > 0) logger.info({ count: retired.count }, "Deactivated platform templates no longer seeded");

  logger.debug({ themes: themeIds.size, templates: WEBSITE_TEMPLATE_SEEDS.length }, "Design library seeded");
}
