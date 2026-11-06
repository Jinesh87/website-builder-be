-- Plan-level media library quota (MiB). Existing packages keep the previous platform default of 1 GiB.
ALTER TABLE "hosting_packages" ADD COLUMN IF NOT EXISTS "mediaStorageMb" INTEGER NOT NULL DEFAULT 1024;
