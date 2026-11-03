-- 1. Contact Inquiries Auto Increment
CREATE SEQUENCE IF NOT EXISTS "contact_inquiries_enquiryNumber_seq";

ALTER TABLE "contact_inquiries" ADD COLUMN "enquiryNumber" INTEGER;

-- Backfill any existing contact inquiries in chronological order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) as row_num
  FROM "contact_inquiries"
)
UPDATE "contact_inquiries" ci
SET "enquiryNumber" = numbered.row_num
FROM numbered
WHERE ci.id = numbered.id;

SELECT setval(
  '"contact_inquiries_enquiryNumber_seq"',
  COALESCE((SELECT MAX("enquiryNumber") FROM "contact_inquiries"), 0) + 1,
  false
);

ALTER TABLE "contact_inquiries" ALTER COLUMN "enquiryNumber" SET NOT NULL;
ALTER TABLE "contact_inquiries" ALTER COLUMN "enquiryNumber" SET DEFAULT nextval('"contact_inquiries_enquiryNumber_seq"');
ALTER SEQUENCE "contact_inquiries_enquiryNumber_seq" OWNED BY "contact_inquiries"."enquiryNumber";
CREATE UNIQUE INDEX "contact_inquiries_enquiryNumber_key" ON "contact_inquiries"("enquiryNumber");

-- 2. Questionnaires Auto Increment
CREATE SEQUENCE IF NOT EXISTS "questionnaires_questionnaireNumber_seq";

ALTER TABLE "questionnaires" ADD COLUMN "questionnaireNumber" INTEGER;

-- Backfill any existing questionnaires in chronological order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) as row_num
  FROM "questionnaires"
)
UPDATE "questionnaires" q
SET "questionnaireNumber" = numbered.row_num
FROM numbered
WHERE q.id = numbered.id;

SELECT setval(
  '"questionnaires_questionnaireNumber_seq"',
  COALESCE((SELECT MAX("questionnaireNumber") FROM "questionnaires"), 0) + 1,
  false
);

ALTER TABLE "questionnaires" ALTER COLUMN "questionnaireNumber" SET NOT NULL;
ALTER TABLE "questionnaires" ALTER COLUMN "questionnaireNumber" SET DEFAULT nextval('"questionnaires_questionnaireNumber_seq"');
ALTER SEQUENCE "questionnaires_questionnaireNumber_seq" OWNED BY "questionnaires"."questionnaireNumber";
CREATE UNIQUE INDEX "questionnaires_questionnaireNumber_key" ON "questionnaires"("questionnaireNumber");

-- 3. Partners Auto Increment
CREATE SEQUENCE IF NOT EXISTS "partners_partnerNumber_seq";

ALTER TABLE "partners" ADD COLUMN "partnerNumber" INTEGER;

-- Backfill any existing partners in chronological order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) as row_num
  FROM "partners"
)
UPDATE "partners" p
SET "partnerNumber" = numbered.row_num
FROM numbered
WHERE p.id = numbered.id;

UPDATE "partners" SET "applicationId" = 'PART-' || "partnerNumber" WHERE "partnerNumber" IS NOT NULL;

SELECT setval(
  '"partners_partnerNumber_seq"',
  COALESCE((SELECT MAX("partnerNumber") FROM "partners"), 0) + 1,
  false
);

ALTER TABLE "partners" ALTER COLUMN "partnerNumber" SET NOT NULL;
ALTER TABLE "partners" ALTER COLUMN "partnerNumber" SET DEFAULT nextval('"partners_partnerNumber_seq"');
ALTER SEQUENCE "partners_partnerNumber_seq" OWNED BY "partners"."partnerNumber";
CREATE UNIQUE INDEX "partners_partnerNumber_key" ON "partners"("partnerNumber");

