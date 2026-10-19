-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" VARCHAR(40),
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- Every account needs at least one login identifier.
ALTER TABLE "users" ADD CONSTRAINT "users_login_identifier_check" CHECK ("email" IS NOT NULL OR "username" IS NOT NULL);
