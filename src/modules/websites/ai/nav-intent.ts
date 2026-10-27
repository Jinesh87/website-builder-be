import type { PlannedLink } from "./ai-ops.js";
import { MAX_MENU_LINKS, type MenuItem, type NavPage } from "./navigation.js";
import type { NavigationPatchEdit } from "./section-edits.js";
import { ACCOUNT_SLUG, LOGIN_SLUG, SHOP_SLUG, type ShopPageKind } from "./shop-pages.js";

/**
 * Header navigation requests, understood without the model: "add a button in nav to this page",
 * "in header i need login", "put About in the menu bar". The model still plans the change; this
 * makes sure the header really ends up with the link the owner asked for, whatever page it points
 * to, instead of silently doing nothing when the model misses the reference.
 */

export type NavTarget =
  | { kind: "page"; page: NavPage }
  /** A shopper page that doesn't exist yet; the caller may create it. */
  | { kind: "missing"; shopPage: ShopPageKind; label: string; slug: string };

export type NavIntent = {
  /** The owner said "button", so the link is the header's call-to-action, not a menu item. */
  asButton: boolean;
  target: NavTarget;
  /** The label the owner used, when they named one ("add a Book now button"). */
  label: string | null;
};

const HEADER_WORDS = /\b(header|nav|navbar|navigation|menu\s*bar|top\s*bar|top\s*menu|main\s*menu|site\s*menu|header\s*menu)\b/i;
const ADD_WORDS = /\b(add|put|place|include|need|want|show|link|create|insert|make|give|redirect|point|connect)\b/i;
const BUTTON_WORDS = /\b(button|cta|call\s*to\s*action)\b/i;
const THIS_PAGE = /\b(this|current|the\s+open|the\s+active|present)\s+(page|one|screen)\b|\bhere\b/i;

const SHOPPER_PAGES: Array<{ kind: ShopPageKind; label: string; slug: string; words: RegExp }> = [
  { kind: "login", label: "Login", slug: LOGIN_SLUG, words: /\b(login|log\s*in|sign\s*in|sign\s*up|signup|register|registration)\b/i },
  { kind: "account", label: "Account", slug: ACCOUNT_SLUG, words: /\b(account|my\s+account|profile|dashboard|my\s+orders)\b/i },
  { kind: "shop", label: "Shop", slug: SHOP_SLUG, words: /\b(shop|store|products?|catalog(?:ue)?)\b/i },
];

function words(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function pathKey(value: string): string {
  return `/${value.trim().toLowerCase().replace(/^\/+|\/+$/g, "")}`;
}

/** Whether the request is about the header navigation at all. */
export function isHeaderNavRequest(prompt: string): boolean {
  return HEADER_WORDS.test(prompt) && (ADD_WORDS.test(prompt) || BUTTON_WORDS.test(prompt));
}

/** A label the owner wrote in quotes or after "called"/"labelled"/"named"/"saying". */
function namedLabel(prompt: string): string | null {
  const quoted = prompt.match(/["“']([^"”']{1,40})["”']/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();
  const called = prompt.match(/\b(?:called|labell?ed|named|saying|that\s+says|with\s+text)\s+([A-Za-z0-9][A-Za-z0-9 &'-]{0,30}?)(?=\s+(?:to|in|on|that|which|for|linking|pointing)\b|[.,!?]|$)/i);
  return called?.[1]?.trim() || null;
}

/** The page the owner means: the open page, a page named in the prompt, or a shopper page. */
function findTarget(prompt: string, pages: readonly NavPage[], currentPage: NavPage | null): NavTarget | null {
  if (THIS_PAGE.test(prompt) && currentPage) return { kind: "page", page: currentPage };

  // "menu bar", "header" and friends name the header, not a page called Menu or Header.
  const promptText = ` ${words(prompt.replace(new RegExp(HEADER_WORDS.source, "gi"), " ")).join(" ")} `;
  // Longest page name first, so "About us" wins over "Us" and "Product list" over "Product".
  const candidates = [...pages]
    .filter((page) => page.slug !== "/")
    .sort((a, b) => words(b.name).length - words(a.name).length);
  for (const page of candidates) {
    const nameWords = words(page.name);
    const slugWords = words(page.slug);
    const keys = [nameWords.join(" "), slugWords.join(" ")].filter((key) => key.length >= 3);
    if (keys.some((key) => promptText.includes(` ${key} `))) return { kind: "page", page };
  }
  if (/\bhome\b/i.test(prompt)) {
    const home = pages.find((page) => pathKey(page.slug) === "/");
    if (home) return { kind: "page", page: home };
  }

  for (const shopper of SHOPPER_PAGES) {
    if (!shopper.words.test(prompt)) continue;
    const existing = pages.find((page) => pathKey(page.slug) === pathKey(shopper.slug) || words(page.name).join(" ") === shopper.label.toLowerCase());
    return existing
      ? { kind: "page", page: existing }
      : { kind: "missing", shopPage: shopper.kind, label: shopper.label, slug: shopper.slug };
  }
  return null;
}

/** Reads the header request out of the prompt; null when it isn't one or names no page we know. */
export function navIntent(prompt: string, pages: readonly NavPage[], currentPage: NavPage | null): NavIntent | null {
  if (!isHeaderNavRequest(prompt)) return null;
  const target = findTarget(prompt, pages, currentPage);
  if (!target) return null;
  return { asButton: BUTTON_WORDS.test(prompt), target, label: namedLabel(prompt) };
}

export type HeaderState = {
  menu: readonly MenuItem[];
  cta?: PlannedLink;
};

/**
 * The header patch that fulfils the intent on top of what the model already planned: nothing
 * when the planned header already links the page, otherwise the link added as a menu item or as
 * the header button.
 */
export function ensureNavLink(
  intent: NavIntent,
  current: HeaderState,
  planned: NavigationPatchEdit | undefined,
  link: { label: string; href: string },
): NavigationPatchEdit | undefined {
  const href = pathKey(link.href);
  const label = (intent.label ?? link.label).trim() || link.label;
  const menu = planned?.headerMenu ?? current.menu;
  const cta = planned?.headerCta ?? current.cta;
  const menuHas = menu.some((item) => pathKey(item.href) === href);
  const ctaHas = Boolean(cta?.href && pathKey(cta.href) === href);
  if (menuHas || ctaHas) return planned;

  if (intent.asButton) {
    return { ...(planned ?? {}), headerCta: { label, href: link.href } };
  }
  if (menu.length >= MAX_MENU_LINKS) {
    return { ...(planned ?? {}), headerCta: { label, href: link.href } };
  }
  return { ...(planned ?? {}), headerMenu: [...menu.map(({ label: l, href: h }) => ({ label: l, href: h })), { label, href: link.href }] };
}

/** Owner-facing line for a navigation link that was added. */
export function describeNavLink(intent: NavIntent, link: { label: string; href: string }): string {
  const label = (intent.label ?? link.label).trim() || link.label;
  return intent.asButton
    ? `Set the header button to "${label}" opening ${link.href}.`
    : `Added "${label}" (${link.href}) to the header menu.`;
}
