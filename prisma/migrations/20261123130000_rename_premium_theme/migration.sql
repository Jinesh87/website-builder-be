-- Rename the Premium template's theme in place (the seeder matches themes by name), so websites keep it.
UPDATE "themes" SET "name" = 'Premium Boutique'
WHERE "name" = 'Minsaree Rose'
  AND NOT EXISTS (SELECT 1 FROM "themes" WHERE "name" = 'Premium Boutique');
