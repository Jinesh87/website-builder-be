-- Template gallery categories become rows Super Admins can manage. Platform templates point at one
-- with a RESTRICT foreign key; `website_templates.category` stays as the display label.
-- Websites copy template content on creation, so nothing here touches existing websites.

-- CreateTable
CREATE TABLE "template_categories" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(60) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "template_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "template_categories_slug_key" ON "template_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "template_categories_name_key" ON "template_categories"("name");

-- CreateIndex
CREATE INDEX "template_categories_sortOrder_idx" ON "template_categories"("sortOrder");

-- AlterTable
ALTER TABLE "website_templates" ADD COLUMN "categoryId" UUID;

-- CreateIndex
CREATE INDEX "website_templates_categoryId_idx" ON "website_templates"("categoryId");

-- AddForeignKey
ALTER TABLE "website_templates" ADD CONSTRAINT "website_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "template_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Built-in categories; must match SYSTEM_TEMPLATE_CATEGORIES in src/modules/websites/types/template.types.ts.
INSERT INTO "template_categories" ("id", "slug", "name", "isSystem", "sortOrder", "updatedAt") VALUES
    (gen_random_uuid(), 'business', 'Business', true, 0, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'agency', 'Agency', true, 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'services', 'Services', true, 2, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'health', 'Health', true, 3, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'food', 'Food', true, 4, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'portfolio', 'Portfolio', true, 5, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'landing-page', 'Landing page', true, 6, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'education', 'Education', true, 7, CURRENT_TIMESTAMP);

-- Any other category a platform template already uses becomes a custom category.
INSERT INTO "template_categories" ("id", "slug", "name", "isSystem", "sortOrder", "updatedAt")
SELECT gen_random_uuid(), used.slug, used.name, false, 100 + ROW_NUMBER() OVER (ORDER BY used.name), CURRENT_TIMESTAMP
FROM (
    SELECT DISTINCT ON (slug) slug, name
    FROM (
        SELECT
            RTRIM(LEFT(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("category"), '[^a-z0-9]+', '-', 'g')), 60), '-') AS slug,
            "category" AS name
        FROM "website_templates"
        WHERE "clientId" IS NULL
    ) AS candidates
    WHERE slug <> ''
    ORDER BY slug, name
) AS used
ON CONFLICT DO NOTHING;

-- Link every platform template to its category, matching by slug so case or punctuation differences still resolve.
UPDATE "website_templates" AS t
SET "categoryId" = c."id",
    "category" = c."name"
FROM "template_categories" AS c
WHERE t."clientId" IS NULL
  AND c."slug" = RTRIM(LEFT(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(t."category"), '[^a-z0-9]+', '-', 'g')), 60), '-');

-- Anything left unmatched (an unusable category label) falls back to Business rather than failing the deploy.
UPDATE "website_templates"
SET "categoryId" = (SELECT "id" FROM "template_categories" WHERE "slug" = 'business'),
    "category" = 'Business'
WHERE "clientId" IS NULL AND "categoryId" IS NULL;

-- Platform templates always have a category; a client's own templates never use one.
ALTER TABLE "website_templates" ADD CONSTRAINT "website_templates_category_check"
    CHECK (("clientId" IS NULL AND "categoryId" IS NOT NULL) OR ("clientId" IS NOT NULL AND "categoryId" IS NULL));
