-- Library blocks added by an HTML import now belong to that website and are deleted with it.
ALTER TABLE "saved_sections" ADD COLUMN IF NOT EXISTS "sourceWebsiteId" UUID;

CREATE INDEX IF NOT EXISTS "saved_sections_sourceWebsiteId_idx" ON "saved_sections"("sourceWebsiteId");

ALTER TABLE "saved_sections"
  ADD CONSTRAINT "saved_sections_sourceWebsiteId_fkey"
  FOREIGN KEY ("sourceWebsiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Link existing imported blocks to the website whose pages still hold the same section.
UPDATE "saved_sections" AS ss
SET "sourceWebsiteId" = p."websiteId"
FROM "pages" AS p, jsonb_array_elements(p."sections") AS s
WHERE ss."sectionType" = 'imported_html'
  AND ss."sourceWebsiteId" IS NULL
  AND p."clientId" = ss."clientId"
  AND s->>'id' = ss."section"->>'id';

-- Imported blocks whose website was already deleted are orphans: remove them.
DELETE FROM "saved_sections"
WHERE "sectionType" = 'imported_html' AND "sourceWebsiteId" IS NULL AND "clientId" IS NOT NULL;
