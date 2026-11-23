/** Renamed template keys: old links (gallery, "use template", questionnaires) keep working. */
const TEMPLATE_KEY_ALIASES: Record<string, string> = {
  "minsaree-boutique": "premium-boutique",
};

export function resolveTemplateKey(key: string): string {
  return Object.hasOwn(TEMPLATE_KEY_ALIASES, key) ? TEMPLATE_KEY_ALIASES[key]! : key;
}
