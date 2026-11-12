import { randomUUID } from "node:crypto";
import type { AiSuggestionPayload } from "../services/ai-generator.service.js";
import type { WebsiteDetail } from "../types/website.types.js";
import type { SectionEnvelope } from "./ai-ops.js";
import type { CreatedPageEdit, NavigationPatchEdit, UpdatedPageEdit } from "./section-edits.js";

export const SHOP_SLUG = "/shop";
export const PRODUCT_SLUG = "/product";
export const LOGIN_SLUG = "/login";
export const ACCOUNT_SLUG = "/account";

/** Pages the builder can create without the model: the shop catalogue and the shopper's own pages. */
export type ShopPageKind = "shop" | "product" | "login" | "account";

type DraftPage = WebsiteDetail["draft"]["pages"][number];

const PAGE_WORD = /\b(pages?|screens?|sections?|flows?|areas?|portals?|dashboards?)\b/i;
/** Requests about the header, menu bar or a button are navigation edits, never page builds. */
const NAV_WORDS = /\b(header|nav|navbar|navigation|menu\s*bar|top\s*bar|button|link|cta|footer)\b/i;

/** Section type that makes a page actually provide that shop capability. */
const CAPABILITY_SECTION: Record<ShopPageKind, string> = {
  shop: "products",
  product: "product_detail",
  login: "auth",
  account: "account",
};

/**
 * Catalogue / storefront intent: list products, shop page, ecommerce, etc.
 * Broader than naming "product page" so casual owner wording still resolves.
 */
const CATALOGUE_INTENT =
  /\b(?:'?(?:list|show|display|browse|sell|add|include|put|need|want|have)\b[\s\S]{0,48}\bproducts?\b|\bproducts?\b[\s\S]{0,48}\b(?:list(?:ing)?|grid|catalogue|catalog|shop|store|on\s+(?:the\s+)?(?:page|site|website))\b|\b(?:shop|store|catalogue|catalog|e-?commerce)\s+pages?\b|\bproduct\s+(?:pages?|list(?:ing)?|detail|grid|catalogue|catalog)\b|\bonline\s+(?:shop|store)\b|\be-?commerce\b|\bour\s+products\b)\b/i;

/**
 * A request for shop or shopper pages (or to fix a shop page that doesn't list products yet).
 * Header / nav / button wording is excluded so those stay navigation edits.
 */
export function isShopPageRequest(prompt: string): boolean {
  if (NAV_WORDS.test(prompt)) return false;
  return requestedShopPages(prompt).length > 0;
}

/** Which page kinds the prompt needs. A login request brings the account page and vice versa. */
export function requestedShopPages(prompt: string): ShopPageKind[] {
  const kinds = new Set<ShopPageKind>();

  if (CATALOGUE_INTENT.test(prompt)) {
    kinds.add("shop");
    kinds.add("product");
  }

  const mentionsLogin = /\b(login|log\s*in|sign\s*in|sign\s*up|signup|register|registration|auth(?:entication)?)\b/i.test(
    prompt,
  );
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
      showCancellationPolicy: true,
      showReturnPolicy: true,
      showCoupons: true,
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

const PAGE_SPECS: Record<
  ShopPageKind,
  { name: string; slug: string; showInNav: boolean; sections: (business: string) => SectionEnvelope[]; seo: (business: string) => string }
> = {
  shop: { name: "Shop", slug: SHOP_SLUG, showInNav: true, sections: shopSections, seo: (b) => `Browse products from ${b}.` },
  product: {
    name: "Product",
    slug: PRODUCT_SLUG,
    showInNav: false,
    sections: () => detailSections(),
    seo: (b) => `Product details, options and stock at ${b}.`,
  },
  login: { name: "Login", slug: LOGIN_SLUG, showInNav: false, sections: loginSections, seo: (b) => `Sign in or create an account at ${b}.` },
  account: {
    name: "Account",
    slug: ACCOUNT_SLUG,
    showInNav: false,
    sections: accountSections,
    seo: (b) => `Manage your profile, orders and cart at ${b}.`,
  },
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

function isChrome(section: { type: string }): boolean {
  return section.type === "header" || section.type === "footer";
}

/** True when the page already has the live section that delivers this capability. */
export function pageHasShopCapability(kind: ShopPageKind, page: DraftPage): boolean {
  const needed = CAPABILITY_SECTION[kind];
  return page.sections.some((item) => item.type === needed);
}

/**
 * Prefer a page that already provides the capability; otherwise the page named/slugged for that
 * role (even if it is still a marketing stub). Matching by section type alone is last.
 */
export function findShopPage(kind: ShopPageKind, pages: readonly DraftPage[]) {
  const capable = pages.find((page) => pageHasShopCapability(kind, page));
  if (capable) return capable;
  const spec = PAGE_SPECS[kind];
  return (
    pages.find((page) => pathKey(page.slug) === pathKey(spec.slug) || pathKey(page.name) === pathKey(spec.name)) ??
    pages.find((page) => page.sections.some((item) => item.type === CAPABILITY_SECTION[kind]))
  );
}

function withPageChrome(template: SectionEnvelope[], existing: DraftPage): SectionEnvelope[] {
  const header = existing.sections.find((item) => item.type === "header");
  const footer = existing.sections.find((item) => item.type === "footer");
  const body = template.filter((item) => !isChrome(item));
  return [...(header ? [header as SectionEnvelope] : []), ...body, ...(footer ? [footer as SectionEnvelope] : [])];
}

export type ShopPagesSuggestionOptions = {
  /** Page open in the editor; when it is the shop page being fixed, preview uses before/after. */
  pageId?: string | null;
};

/**
 * Builds or repairs shop / shopper pages without asking the model.
 * - Missing pages are created.
 * - Pages that exist by name/slug but lack the live capability section are upgraded in place
 *   (e.g. a marketing "/shop" page with no products grid).
 * Capable pages are left alone; if every requested capability already exists, returns a short chat.
 */
export function shopPagesSuggestion(
  prompt: string,
  website: WebsiteDetail | undefined,
  options: ShopPagesSuggestionOptions = {},
): AiSuggestionPayload | null {
  if (!isShopPageRequest(prompt)) return null;

  const business = businessNameOf(website);
  const pages = website?.draft.pages ?? [];
  const kinds = requestedShopPages(prompt);
  const createdPages: CreatedPageEdit[] = [];
  const updatedPages: UpdatedPageEdit[] = [];
  const notes: string[] = [];

  for (const kind of kinds) {
    const existing = findShopPage(kind, pages);
    if (existing && pageHasShopCapability(kind, existing)) continue;

    if (existing) {
      const nextSections = withPageChrome(PAGE_SPECS[kind].sections(business), existing);
      updatedPages.push({
        pageId: existing.id,
        name: existing.name || PAGE_SPECS[kind].name,
        slug: existing.slug || PAGE_SPECS[kind].slug,
        showInNav: kind === "shop" ? true : existing.showInNav,
        sections: nextSections,
      });
      notes.push(
        kind === "shop"
          ? `Updated "${existing.name}" so it lists your live products.`
          : `Updated "${existing.name}" into a working ${PAGE_SPECS[kind].name.toLowerCase()} page.`,
      );
      continue;
    }

    const page = shopPage(kind, business);
    createdPages.push(page);
    notes.push(`Created ${page.name}.`);
  }

  if (createdPages.length === 0 && updatedPages.length === 0) {
    const hasShop = kinds.includes("shop");
    return {
      id: randomUUID(),
      prompt,
      summary: hasShop
        ? "Your shop page already lists products from the catalogue."
        : "Those shopper pages are already set up.",
      chatReply: hasShop
        ? "Your shop page already uses the live products catalogue. Add products under Shop in the editor if the list looks empty."
        : "Those pages are already on the site. Open them from the page list or header to review.",
      target: { scope: "chat" },
      before: [],
      after: [],
    };
  }

  const menu = [...(website?.draft.header.menu ?? [])];
  const shopReady =
    createdPages.some((page) => page.slug === SHOP_SLUG) ||
    updatedPages.some((page) => pathKey(page.slug ?? "") === pathKey(SHOP_SLUG)) ||
    pages.some((page) => pageHasShopCapability("shop", page));
  const hasShopLink = menu.some((item) => pathKey(item.href) === pathKey(SHOP_SLUG) || pathKey(item.label) === "shop");
  const navigationPatch: NavigationPatchEdit | undefined =
    shopReady && !hasShopLink ? { headerMenu: [...menu, { label: "Shop", href: SHOP_SLUG }] } : undefined;

  if (navigationPatch) notes.push("Added Shop to the header menu.");
  if (createdPages.some((page) => page.slug === SHOP_SLUG) || updatedPages.some((page) => pathKey(page.slug ?? "") === pathKey(SHOP_SLUG))) {
    notes.push("The shop page lists your products; each one opens on the product page with its options, price and stock.");
  }
  if (createdPages.some((page) => page.slug === ACCOUNT_SLUG)) {
    notes.push("Customers sign in on Login and see their orders, cart and profile on Account (visible only when signed in).");
  }

  const currentId = options.pageId ?? null;
  const currentUpdate = currentId ? updatedPages.find((page) => page.pageId === currentId) : undefined;
  const currentPage = currentId ? pages.find((page) => page.id === currentId) : undefined;

  return {
    id: randomUUID(),
    prompt,
    summary: notes.filter(Boolean).join(" "),
    target: {
      scope: "site",
      createdPageIds: createdPages.map((page) => page.id),
      affectedPageIds: [currentId, ...updatedPages.map((page) => page.pageId)].filter((id): id is string => Boolean(id)),
    },
    before: currentUpdate && currentPage ? currentPage.sections : [],
    after: currentUpdate?.sections ?? [],
    createdPages: createdPages.length > 0 ? createdPages : undefined,
    updatedPages: updatedPages.length > 0 ? updatedPages : undefined,
    ...(navigationPatch ? { navigationPatch } : {}),
  };
}
