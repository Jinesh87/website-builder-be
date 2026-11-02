-- Allow products without a category.
ALTER TABLE "products" ALTER COLUMN "categoryId" DROP NOT NULL;
