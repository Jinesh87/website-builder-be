-- Per-company media library quota override (MiB). Null = use highest ACTIVE/GRACE package limit.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "mediaStorageMbOverride" INTEGER;
