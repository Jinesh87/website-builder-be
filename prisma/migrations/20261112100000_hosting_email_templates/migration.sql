-- Editable platform hosting notice emails (reminder, paid, expired, suspended, autopay stopped).
CREATE TYPE "HostingEmailKind" AS ENUM ('RENEWAL_REMINDER', 'PAID', 'EXPIRED', 'SUSPENDED', 'AUTOPAY_STOPPED');

CREATE TABLE "hosting_email_templates" (
    "id" UUID NOT NULL,
    "kind" "HostingEmailKind" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "subject" VARCHAR(200) NOT NULL,
    "heading" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hosting_email_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hosting_email_templates_kind_key" ON "hosting_email_templates"("kind");
