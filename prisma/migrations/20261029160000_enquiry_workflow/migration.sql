-- Status now tracks handling; whether an enquiry was opened stays in "readAt".
ALTER TYPE "ContactInquiryStatus" RENAME TO "ContactInquiryStatus_old";
CREATE TYPE "ContactInquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM');

ALTER TABLE "contact_inquiries" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "contact_inquiries" ALTER COLUMN "status" TYPE "ContactInquiryStatus" USING (
    CASE "status"::text
        WHEN 'READ' THEN 'NEW'
        WHEN 'ARCHIVED' THEN 'RESOLVED'
        ELSE "status"::text
    END
)::"ContactInquiryStatus";
ALTER TABLE "contact_inquiries" ALTER COLUMN "status" SET DEFAULT 'NEW';

DROP TYPE "ContactInquiryStatus_old";

-- CreateEnum
CREATE TYPE "ContactInquiryActivityKind" AS ENUM ('NOTE', 'STATUS_CHANGED', 'EMAIL_SENT', 'EMAIL_NOT_SENT');

-- CreateTable
CREATE TABLE "contact_inquiry_activity" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "kind" "ContactInquiryActivityKind" NOT NULL,
    "body" VARCHAR(2000),
    "actorId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_inquiry_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_inquiry_activity_inquiryId_createdAt_idx" ON "contact_inquiry_activity"("inquiryId", "createdAt");

-- AddForeignKey
ALTER TABLE "contact_inquiry_activity" ADD CONSTRAINT "contact_inquiry_activity_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "contact_inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_inquiry_activity" ADD CONSTRAINT "contact_inquiry_activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
