-- Marks ACTIVE periods granted free (admin grant / bulk backfill), not paid.
ALTER TABLE "hosting_subscriptions" ADD COLUMN IF NOT EXISTS "isComplimentary" BOOLEAN NOT NULL DEFAULT false;
