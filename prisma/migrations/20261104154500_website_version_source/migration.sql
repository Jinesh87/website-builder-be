-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "WebsiteVersionSource" AS ENUM ('MANUAL', 'BACKUP');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "website_versions" ADD COLUMN IF NOT EXISTS "source" "WebsiteVersionSource" NOT NULL DEFAULT 'MANUAL';
