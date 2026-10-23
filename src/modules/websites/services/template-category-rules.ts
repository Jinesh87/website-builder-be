/** Max length of `template_categories.name` and `.slug`. */
export const TEMPLATE_CATEGORY_NAME_MAX = 60;

/**
 * e.g. "Food & Drink" → "food-drink". Empty when the name has no letters or digits.
 * The 20261023120000_template_categories migration applies the same rule in SQL to existing (ASCII) names.
 */
export function templateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, TEMPLATE_CATEGORY_NAME_MAX)
    .replace(/-+$/g, "");
}
