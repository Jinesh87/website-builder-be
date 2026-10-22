-- Default copy for Basic and Standard. Only packages still on the original seeded text are updated,
-- so wording a Super Admin already edited is kept.
UPDATE "hosting_packages"
SET "description" = 'Self-managed setup and configuration.',
    "features" = ARRAY['Client-managed CMS', 'Independent operations', 'Unlimited templates', 'Manual and AI builder'],
    "updatedAt" = CURRENT_TIMESTAMP
WHERE ("slug" = 'basic' AND "description" = 'Hosting for one website, with everything you need to go live.')
   OR ("slug" = 'standard' AND "description" = 'Hosting for one website, for growing businesses.');
