-- The "Premium" boutique template was still keyed by its old name; rename in place so its id and links stay.
UPDATE "website_templates" SET "key" = 'premium-boutique'
WHERE "key" = 'minsaree-boutique'
  AND NOT EXISTS (SELECT 1 FROM "website_templates" WHERE "key" = 'premium-boutique');

UPDATE "pages" SET "templateKey" = 'premium-boutique' WHERE "templateKey" = 'minsaree-boutique';
