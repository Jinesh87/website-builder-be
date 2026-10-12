-- AlterTable
ALTER TABLE "pages" ADD COLUMN     "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
