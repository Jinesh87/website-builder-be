-- Several renewal reminders before expiry and overdue reminders after it, instead of one reminder.
ALTER TYPE "HostingNoticeKind" ADD VALUE IF NOT EXISTS 'OVERDUE_REMINDER';
ALTER TYPE "HostingEmailKind" ADD VALUE IF NOT EXISTS 'OVERDUE_REMINDER';

ALTER TABLE "hosting_config"
  ADD COLUMN "reminderDaysBefore" INTEGER[] NOT NULL DEFAULT ARRAY[3]::INTEGER[],
  ADD COLUMN "reminderDaysAfter" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

UPDATE "hosting_config"
SET "reminderDaysBefore" = CASE WHEN "reminderDays" > 0 THEN ARRAY["reminderDays"] ELSE ARRAY[]::INTEGER[] END;

-- Each reminder entry is sent once per period, so notices remember which entry they were.
ALTER TABLE "hosting_notices" ADD COLUMN "offsetDays" INTEGER NOT NULL DEFAULT 0;

-- Reminders already sent this period were for the old single setting; don't send that entry again.
UPDATE "hosting_notices" n
SET "offsetDays" = c."reminderDays"
FROM "hosting_config" c
WHERE n."kind" = 'RENEWAL_REMINDER' AND c."reminderDays" > 0;

ALTER TABLE "hosting_config" DROP COLUMN "reminderDays";

DROP INDEX "hosting_notices_subscriptionId_kind_periodEnd_key";
CREATE UNIQUE INDEX "hosting_notices_subscriptionId_kind_periodEnd_offsetDays_key"
  ON "hosting_notices"("subscriptionId", "kind", "periodEnd", "offsetDays");
