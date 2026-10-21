-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('RESEND', 'BREVO');

-- CreateTable
CREATE TABLE "client_email_config" (
    "clientId" UUID NOT NULL,
    "provider" "EmailProvider" NOT NULL,
    "apiKeyCipher" TEXT NOT NULL,
    "fromEmail" VARCHAR(255) NOT NULL,
    "fromName" VARCHAR(255) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "client_email_config_pkey" PRIMARY KEY ("clientId")
);

ALTER TABLE "client_email_config" ADD CONSTRAINT "client_email_config_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
