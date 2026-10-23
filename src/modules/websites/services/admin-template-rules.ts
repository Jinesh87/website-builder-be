import { randomBytes } from "node:crypto";
import type { PlatformTemplateOrigin, PlatformTemplateStatus } from "../types/admin-template.types.js";
import { ADMIN_TEMPLATE_KEY_PREFIX } from "../types/template.types.js";

/**
 * e.g. "admin-dental-clinic-modern-3f9a1c"; the random suffix keeps keys unique when names repeat.
 * Always fits `website_templates.key` (80 chars) and the public `^[a-z0-9-]+$` key pattern.
 */
export function platformTemplateKey(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `${ADMIN_TEMPLATE_KEY_PREFIX}${slug || "template"}-${randomBytes(3).toString("hex")}`;
}

/** "3001" or "#3001" as a template number to search for; null for any other search text. */
export function templateNumberFromSearch(search: string): number | null {
  const match = /^#?(\d{1,9})$/.exec(search.trim());
  return match ? Number(match[1]) : null;
}

export function templateOrigin(template: { key: string }): PlatformTemplateOrigin {
  return template.key.startsWith(ADMIN_TEMPLATE_KEY_PREFIX) ? "ADMIN" : "BUILT_IN";
}

export function templateStatus(template: { archivedAt: Date | null; isActive: boolean }): PlatformTemplateStatus {
  if (template.archivedAt) return "ARCHIVED";
  return template.isActive ? "LIVE" : "HIDDEN";
}

/**
 * True when the Template Studio draft was edited after its design was last copied into the template,
 * i.e. those edits are not what new websites get yet. Unknown copy times count as in sync.
 */
export function hasUnpublishedDesign(studioDraftUpdatedAt: Date | null | undefined, copiedAt: Date | null): boolean {
  if (!studioDraftUpdatedAt || !copiedAt) return false;
  return studioDraftUpdatedAt.getTime() > copiedAt.getTime();
}
