-- Track who last changed a platform template, and when its Template Studio design was last copied in,
-- so the admin can see templates whose design has unpublished edits.

-- AlterTable
ALTER TABLE "website_templates" ADD COLUMN "sourceDraftUpdatedAt" TIMESTAMPTZ(6),
ADD COLUMN "updatedById" UUID;

-- AddForeignKey
ALTER TABLE "website_templates" ADD CONSTRAINT "website_templates_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Until now the creator was the only known editor.
UPDATE "website_templates" SET "updatedById" = "createdById" WHERE "createdById" IS NOT NULL;

-- A Studio draft edited after the template's last save has unpublished edits; otherwise the design is in sync.
UPDATE "website_templates" AS t
SET "sourceDraftUpdatedAt" = LEAST(w."draftUpdatedAt", t."updatedAt")
FROM "websites" AS w
WHERE w."id" = t."sourceWebsiteId";
