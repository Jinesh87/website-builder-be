import type { ThemeSeed } from "../themes.js";
import type { WebsiteTemplateSeed } from "../templates.js";
import { PREMIUM_BOUTIQUE, PREMIUM_BOUTIQUE_THEME } from "./premium-boutique.js";
import { PANNJHA_SAREE, PANNJHA_SAREE_THEME } from "./pannjha-saree.js";
import { ARA_SHOPS, ARA_SHOPS_THEME } from "./ara-shops.js";
import { ARA_SHOPS_EXACT, ARA_SHOPS_EXACT_THEME } from "./ara-shops-exact.js";

/** Full multi-page shop templates. */
export const ECOMMERCE_TEMPLATES: readonly WebsiteTemplateSeed[] = [PANNJHA_SAREE, PREMIUM_BOUTIQUE, ARA_SHOPS, ARA_SHOPS_EXACT];

export const ECOMMERCE_THEMES: readonly ThemeSeed[] = [PANNJHA_SAREE_THEME, PREMIUM_BOUTIQUE_THEME, ARA_SHOPS_THEME, ARA_SHOPS_EXACT_THEME];
