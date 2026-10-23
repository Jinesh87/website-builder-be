-- Rename Basic to Starter and Standard to Dedicated, with new feature lists for all three packages.
-- Slugs stay the same; payments and orders keep the package name they were made under.
UPDATE "hosting_packages"
SET "name" = 'Starter',
    "features" = ARRAY['Self-managed CMS', 'Independent website management', 'Unlimited templates', 'Manual website builder'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'basic';

UPDATE "hosting_packages"
SET "name" = 'Dedicated',
    "description" = 'Everything you need to build smarter.',
    "features" = ARRAY['Team-managed setup', 'Dedicated website solution', 'Unlimited templates', 'Manual and AI-powered website builder'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'standard';

UPDATE "hosting_packages"
SET "features" = ARRAY['A website designed around your vision', 'Custom-designed templates', 'Unlimited revisions', 'Manual and AI-powered website builder'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'custom';
