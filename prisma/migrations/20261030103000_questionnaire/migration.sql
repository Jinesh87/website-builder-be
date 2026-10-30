-- CreateEnum
CREATE TYPE "QuestionnaireStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WEBSITE_CREATED', 'DONE', 'SPAM');

-- CreateEnum
CREATE TYPE "QuestionnaireActivityKind" AS ENUM ('NOTE', 'STATUS_CHANGED', 'EMAIL_SENT', 'EMAIL_NOT_SENT');

-- CreateTable
CREATE TABLE "questionnaires" (
    "id" UUID NOT NULL,
    "businessName" VARCHAR(160) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "answers" JSONB NOT NULL,
    "filesLink" VARCHAR(1000),
    "notes" VARCHAR(5000),
    "ref" VARCHAR(100),
    "clientId" UUID,
    "websiteId" UUID,
    "status" "QuestionnaireStatus" NOT NULL DEFAULT 'NEW',
    "emailStatus" "InquiryEmailStatus" NOT NULL DEFAULT 'PENDING',
    "emailError" VARCHAR(300),
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionnaire_activity" (
    "id" UUID NOT NULL,
    "questionnaireId" UUID NOT NULL,
    "kind" "QuestionnaireActivityKind" NOT NULL,
    "body" VARCHAR(5000),
    "actorId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questionnaire_activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questionnaires_status_createdAt_idx" ON "questionnaires"("status", "createdAt");

-- CreateIndex
CREATE INDEX "questionnaires_createdAt_idx" ON "questionnaires"("createdAt");

-- CreateIndex
CREATE INDEX "questionnaires_clientId_idx" ON "questionnaires"("clientId");

-- CreateIndex
CREATE INDEX "questionnaire_activity_questionnaireId_createdAt_idx" ON "questionnaire_activity"("questionnaireId", "createdAt");

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_activity" ADD CONSTRAINT "questionnaire_activity_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "questionnaires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionnaire_activity" ADD CONSTRAINT "questionnaire_activity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

