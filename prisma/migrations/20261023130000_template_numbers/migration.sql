-- Super Admin templates get a permanent gallery number (#3001, #3002, …) like the built-in ones (#2134–#2157).
-- They start at 3001 so they never clash with numbers given to future built-in templates.

-- AlterTable
ALTER TABLE "website_templates" ADD COLUMN "number" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "website_templates_number_key" ON "website_templates"("number");

-- Numbers come from this sequence (see AdminTemplateService.create), so they are never reused.
CREATE SEQUENCE "website_template_number_seq" START WITH 3001 MINVALUE 1;

-- Existing Super Admin templates are numbered in the order they were created.
UPDATE "website_templates" AS t
SET "number" = 3000 + numbered.position
FROM (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS position
    FROM "website_templates"
    WHERE "clientId" IS NULL AND "key" LIKE 'admin-%'
) AS numbered
WHERE t."id" = numbered."id";

-- The next new template continues after the last number given above.
SELECT setval('"website_template_number_seq"', COALESCE((SELECT MAX("number") FROM "website_templates"), 3000));
