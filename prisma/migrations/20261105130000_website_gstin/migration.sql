-- Optional GSTIN for the business, shown on shop invoices.
ALTER TABLE "websites" ADD COLUMN IF NOT EXISTS "gstin" VARCHAR(20);
