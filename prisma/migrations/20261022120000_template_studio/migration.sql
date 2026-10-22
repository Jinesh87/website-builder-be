-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "website_templates" ADD COLUMN     "archivedAt" TIMESTAMPTZ(6),
ADD COLUMN     "sourceWebsiteId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "website_templates_sourceWebsiteId_key" ON "website_templates"("sourceWebsiteId");

-- AddForeignKey
ALTER TABLE "website_templates" ADD CONSTRAINT "website_templates_sourceWebsiteId_fkey" FOREIGN KEY ("sourceWebsiteId") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
