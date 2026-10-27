import { randomUUID } from "node:crypto";
import type { AiSuggestionPayload } from "../services/ai-generator.service.js";
import type { WebsiteDetail } from "../types/website.types.js";
import type { SectionEnvelope } from "./ai-ops.js";
import type { CreatedPageEdit, NavigationPatchEdit } from "./section-edits.js";

export const SHOP_SLUG = "/shop";
export const PRODUCT_SLUG = "/product";
export const LOGIN_SLUG = "/login";
export const ACCOUNT_SLUG = "/account";

/** Pages the builder can create without the model: the shop catalogue and the shopper's own pages. */
export type ShopPageKind = "shop" | "product" | "login" | "account";

const PAGE_WORD = /\b(pages?|screens?|sections?|flows?|areas?|portals?|dashboards?)\b/i;
/** Requests about the header, menu bar or a button are navigation edits, never page builds. */
const NAV_WORDS = /\b(header|nav|navbar|navigation|menu\s*bar|top\s*bar|button|link|cta|footer)\b/i;

/**
 * A request to add shop or shopper pages that don't exist yet: it names the pages explicitly
 * ("login page", "product pages", "account page", "online store") and isn't about the header or a
 * button. Anything else goes to the model, which knows the page that's open.
 */
export function isShopPageRequest(prompt: string): boolean {
  if (NAV_WORDS.test(prompt)) return false;
  const asksToCreate = /\b(new|create|add|make|build|need|want|generate|set\s*up|setup)\b/i.test(prompt);
  return asksToCreate && requestedShopPages(prompt).length > 0;
}

/** Which page kinds the prompt names. A login request brings the account page and vice versa. */
export function requestedShopPages(prompt: string): ShopPageKind[] {
  const kinds = new Set<ShopPageKind>();
  if (/\b(product\s+pages?|products\s+pages?|shop\s+pages?|store\s+pages?|product\s+list|product\s+detail|online\s+(?:shop|store)|e-?commerce)\b/i.test(prompt)) {
    kinds.add("shop");
    kinds.add("product");
  }
  const mentionsLogin = /\b(login|log\s*in|sign\s*in|sign\s*up|signup|register|registration|auth(?:entication)?)\b/i.test(prompt);
  const mentionsAccount = /\b(account|profile|my\s+orders|order\s+history|dashboard)\b/i.test(prompt);
  if ((mentionsLogin || mentionsAccount) && (PAGE_WORD.test(prompt) || /\b(customer|shopper|user)s?\b/i.test(prompt))) {
    kinds.add("login");
    kinds.add("account");
  }
  return [...kinds];
}

export function pathKey(value: string): string {
  return value.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
}

function section(type: string, data: Record<string, unknown>): SectionEnvelope {
  return {
    id: randomUUID(),
    type,
    hidden: false,
    settings: { background: "default", hideOnMobile: false },
    data,
  };
}

function shopSections(business: string): SectionEnvelope[] {
  return [
    section("hero", {
      variant: "centered",
      eyebrow: "Shop",
      heading: `Shop ${business}`,
      subheading: "Browse the catalogue. Open a product to see its options, price and how many are in stock.",
    }),
    section("products", {
      eyebrow: "Catalogue",
      title: "Our products",
      subtitle: "Search by name or filter by category.",
      layout: "grid-3",
      showSearch: true,
      showCategoryFilter: true,
      detailBase: PRODUCT_SLUG,
      emptyMessage: "No products yet.",
    }),
  ];
}

function detailSections(): SectionEnvelope[] {
  return [
    section("product_detail", {
      backLabel: "All products",
      backHref: SHOP_SLUG,
      showDescription: true,
      showStock: true,
    }),
  ];
}

export function loginSections(business: string): SectionEnvelope[] {
  const email = {
    name: "email",
    label: "Email",
    type: "email",
    placeholder: "Enter your email address",
    required: true,
    width: "full",
  };
  const password = {
    name: "password",
    label: "Password",
    type: "password",
    placeholder: "Enter your password",
    required: true,
    width: "full",
  };
  return [
    section("auth", {
      variant: "diagonal-split",
      defaultView: "login",
      brandName: business,
      formPosition: "right",
      minHeight: "screen",
      inputStyle: "outline",
      buttonShape: "rounded",
      headingSize: "md",
      showLabels: true,
      showFieldIcons: false,
      showPasswordToggle: true,
      animation: "fade",
      backgroundMotion: true,
      social: { enabled: false, label: "Or continue with", style: "icons", position: "bottom", providers: [] },
      login: {
        heading: "Welcome back",
        subheading: "Sign in to your account to continue shopping.",
        fields: [email, password],
        submitLabel: "Log in",
        showRemember: true,
        rememberLabel: "Remember me",
        forgotLabel: "Forgot password?",
        switchPrompt: "Don't have an account?",
        switchLabel: "Sign up",
      },
      register: {
        enabled: true,
        heading: "Create an account",
        subheading: "Save your details so you can purchase from this shop.",
        fields: [
          { name: "fullName", label: "Full name", type: "text", placeholder: "Your name", required: true, width: "full" },
          email,
          password,
        ],
        submitLabel: "Sign up",
        showTerms: false,
        switchPrompt: "Already have an account?",
        switchLabel: "Log in",
      },
      forgot: {
        enabled: true,
        heading: "Reset your password",
        subheading: "Enter the email linked to your account and we'll send you a reset link.",
        fields: [email],
        submitLabel: "Send reset link",
        backLabel: "Back to log in",
        successHeading: "Check your inbox",
        successText: "If an account exists for that email, a reset link is on its way.",
      },
      otp: {
        enabled: true,
        heading: "Verify it's you",
        subheading: "Enter the verification code we just sent to your email.",
        length: 6,
        submitLabel: "Verify code",
        resendLabel: "Resend code",
        resendSeconds: 45,
        requireOnLogin: false,
        requireOnRegister: true,
        requireOnForgot: false,
      },
      successHeading: "You're signed in",
      successText: "Your account is ready.",
      successLink: { label: "Continue to account", href: ACCOUNT_SLUG },
    }),
  ];
}

/** The shopper's own page: orders, cart and profile, shown only to signed-in customers. */
export function accountSections(business: string, variant = "sidebar-tabs"): SectionEnvelope[] {
  return [
    section("account", {
      variant,
      heading: "My account",
      subheading: `Your orders, cart and profile at ${business}.`,
      showOrders: true,
      showCart: true,
      showProfile: true,
      showPassword: true,
      loginHref: LOGIN_SLUG,
      shopHref: SHOP_SLUG,
      guestHeading: "Sign in to see your account",
      guestText: "Your orders, cart and profile details are only shown to signed-in customers.",
      guestButtonLabel: "Log in",
    }),
  ];
}

const PAGE_SPECS: Record<ShopPageKind, { name: string; slug: string; showInNav: boolean; sections: (business: string) => SectionEnvelope[]; seo: (business: string) => string }> = {
  shop: { name: "Shop", slug: SHOP_SLUG, showInNav: true, sections: shopSections, seo: (b) => `Browse products from ${b}.` },
  product: { name: "Product", slug: PRODUCT_SLUG, showInNav: false, sections: () => detailSections(), seo: (b) => `Product details, options and stock at ${b}.` },
  login: { name: "Login", slug: LOGIN_SLUG, showInNav: false, sections: loginSections, seo: (b) => `Sign in or create an account at ${b}.` },
  account: { name: "Account", slug: ACCOUNT_SLUG, showInNav: false, sections: accountSections, seo: (b) => `Manage your profile, orders and cart at ${b}.` },
};

export function businessNameOf(website: WebsiteDetail | undefined): string {
  return website?.info.businessName?.trim() || website?.name?.trim() || "the shop";
}

/** A ready-to-add page of the given kind. */
export function shopPage(kind: ShopPageKind, business: string): CreatedPageEdit {
  const spec = PAGE_SPECS[kind];
  return {
    id: randomUUID(),
    name: spec.name,
    slug: spec.slug,
    pageType: "CUSTOM",
    showInNav: spec.showInNav,
    seoTitle: `${spec.name} | ${business}`,
    seoDescription: spec.seo(business),
    sections: spec.sections(business),
  };
}

/** The existing page of the given kind, matched by slug, name or (for login/account) section type. */
export function findShopPage(kind: ShopPageKind, pages: readonly WebsiteDetail["draft"]["pages"][number][]) {
  const spec = PAGE_SPECS[kind];
  const byType = kind === "login" ? "auth" : kind === "account" ? "account" : kind === "shop" ? "products" : "product_detail";
  return (
    pages.find((page) => pathKey(page.slug) === pathKey(spec.slug) || pathKey(page.name) === pathKey(spec.name)) ??
    pages.find((page) => page.sections.some((item) => item.type === byType))
  );
}

/**
 * Builds the requested shop pages that are missing, without asking the model. Existing pages are
 * never overwritten here: rewrites are real edits and go through the model with the page content.
 */
export function shopPagesSuggestion(prompt: string, website: WebsiteDetail | undefined): AiSuggestionPayload | null {
  if (!isShopPageRequest(prompt)) return null;

  const business = businessNameOf(website);
  const pages = website?.draft.pages ?? [];
  const kinds = requestedShopPages(prompt);
  const createdPages = kinds.filter((kind) => !findShopPage(kind, pages)).map((kind) => shopPage(kind, business));
  if (createdPages.length === 0) return null;

  const menu = [...(website?.draft.header.menu ?? [])];
  const addsShop = createdPages.some((page) => page.slug === SHOP_SLUG);
  const hasShop = menu.some((item) => pathKey(item.href) === pathKey(SHOP_SLUG) || pathKey(item.label) === "shop");
  const navigationPatch: NavigationPatchEdit | undefined =
    addsShop && !hasShop ? { headerMenu: [...menu, { label: "Shop", href: SHOP_SLUG }] } : undefined;

  const names = createdPages.map((page) => page.name);
  const summary = [
    `Created ${names.join(", ")}.`,
    navigationPatch ? "Added Shop to the header menu." : "",
    createdPages.some((page) => page.slug === SHOP_SLUG) ? "The shop page lists your products; each one opens on the product page with its options, price and stock." : "",
    createdPages.some((page) => page.slug === ACCOUNT_SLUG) ? "Customers sign in on Login and see their orders, cart and profile on Account (visible only when signed in)." : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: randomUUID(),
    prompt,
    summary,
    target: { scope: "site", createdPageIds: createdPages.map((page) => page.id), affectedPageIds: [] },
    before: [],
    after: [],
    createdPages,
    ...(navigationPatch ? { navigationPatch } : {}),
  };
}
