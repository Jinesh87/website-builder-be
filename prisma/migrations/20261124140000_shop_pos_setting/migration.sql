-- Shop owners turn the in-store POS till on per website.
ALTER TABLE "websites" ADD COLUMN "shopPosEnabled" BOOLEAN NOT NULL DEFAULT false;
