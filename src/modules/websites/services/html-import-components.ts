import { randomUUID } from "node:crypto";
import * as cheerio from "cheerio";
import { AppError } from "../../../common/errors/AppError.js";
import type {
  ImportedHtmlData,
  ImportedHtmlMediaSlot,
  ImportedHtmlText,
  Section,
} from "../types/site-content.types.js";
import { sectionSchema } from "../validators/site-content.validator.js";
import { rewriteCssUrls, sectionMatcher, shakeStylesheet, type PreparedStylesheet } from "./html-import-css.js";
import { sanitizeTree } from "./html-import-sanitize.js";

type CheerioAPI = cheerio.CheerioAPI;
export type El = { type?: string; name?: string; attribs?: Record<string, string>; children?: El[]; parent?: El | null };

export type ChromeKind = "header" | "footer";

export type ComponentImportContext = {
  /** Creates the unique scope class for one block (`wbi-…`). */
  newScope: () => string;
  stylesheet: PreparedStylesheet;
  /** Asset URL (img/src, poster, srcset entry, inline url()) → stored media URL; "" drops it. */
  rewriteAsset: (raw: string) => string;
  /** Link href → builder page path (or unchanged). */
  rewriteLink: (href: string) => string;
};

export type BuiltHtmlComponent = {
  name: string;
  section: Section;
  chrome?: ChromeKind;
};

const DEFAULT_SETTINGS = { background: "default" as const, hideOnMobile: false };
const MAX_TEXTS = 300;
const MAX_MEDIA = 150;

const NON_CONTENT_TAGS = new Set(["script", "style", "link", "meta", "title", "noscript", "template", "base"]);
const BLOCK_TAGS = new Set(["section", "header", "footer", "article", "aside", "nav", "form", "figure", "table"]);
const HEADER_HINT = /(^|[\s_-])(top-?bar|header|navbar|nav|announcement|masthead|utility-bar)([\s_-]|$)/i;
const FOOTER_HINT = /(^|[\s_-])(footer|colophon)([\s_-]|$)/i;
const HAS_WORD = /[\p{L}\p{N}]/u;

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

function tagOf(el: El): string {
  return (el.name || "").toLowerCase();
}

function isElement(el: El): boolean {
  return el.type === "tag";
}

/** Element children that can carry visible content. */
function contentChildren(el: El): El[] {
  return (el.children ?? []).filter(
    (child) => isElement(child) && !NON_CONTENT_TAGS.has(tagOf(child)) && child.attribs?.hidden === undefined,
  );
}

function hasVisibleContent($: CheerioAPI, el: El): boolean {
  const node = $(el as never);
  if (node.text().replace(/\s+/g, "").length > 0) return true;
  return node.find("img, svg, video, picture, iframe, canvas, input, button").length > 0 || ["img", "svg", "video", "picture", "iframe", "hr"].includes(tagOf(el));
}

function hint(el: El): string {
  return `${el.attribs?.id ?? ""} ${el.attribs?.class ?? ""}`;
}

function isHeaderLike(el: El): boolean {
  const tag = tagOf(el);
  const role = el.attribs?.role ?? "";
  return tag === "header" || tag === "nav" || role === "banner" || role === "navigation" || HEADER_HINT.test(hint(el));
}

function isFooterLike(el: El): boolean {
  return tagOf(el) === "footer" || el.attribs?.role === "contentinfo" || FOOTER_HINT.test(hint(el));
}

function topMost($: CheerioAPI, nodes: El[]): El[] {
  const set = new Set(nodes);
  return nodes.filter((node) => !$(node as never).parents().toArray().some((parent) => set.has(parent as El)));
}

/** SPA-style page wrappers (`data-wb-page` preferred, `data-view` accepted). */
export function detectPageRoots($: CheerioAPI): El[] {
  return topMost($, $("[data-wb-page], [data-view]").toArray() as El[]);
}

function commonAncestor($: CheerioAPI, nodes: El[]): El {
  const body = $("body").get(0) as El;
  if (nodes.length === 0) return body;
  const chains = nodes.map((node) => [...($(node as never).parents().toArray() as El[])].reverse());
  let common: El = body;
  for (let depth = 0; ; depth += 1) {
    const candidate = chains[0]![depth];
    if (!candidate || !chains.every((chain) => chain[depth] === candidate)) break;
    common = candidate;
  }
  if (tagOf(common) === "html") return body;
  return common;
}

/** The element that holds page content (everything outside it is site chrome). */
export function detectContentContainer($: CheerioAPI, pageRoots: El[]): El {
  if (pageRoots.length > 0) return commonAncestor($, pageRoots);
  const main = $("main, [role='main']").first().get(0) as El | undefined;
  return main ?? ($("body").get(0) as El);
}

/** Header/footer chrome: siblings before/after the content container on the way up to <body>. */
export function detectChrome($: CheerioAPI, container: El): { header: El[]; footer: El[] } {
  const body = $("body").get(0) as El;
  if (container === body) {
    const children = contentChildren(body);
    const header: El[] = [];
    const footer: El[] = [];
    for (const child of children) {
      if (!isHeaderLike(child)) break;
      header.push(child);
    }
    for (const child of [...children].reverse()) {
      if (!isFooterLike(child) || header.includes(child)) break;
      footer.unshift(child);
    }
    return { header, footer };
  }

  const levelsBefore: El[][] = [];
  const levelsAfter: El[][] = [];
  let node: El = container;
  while (node.parent && node !== body) {
    const parent = node.parent;
    const siblings = contentChildren(parent);
    const index = siblings.indexOf(node);
    if (index >= 0) {
      levelsBefore.unshift(siblings.slice(0, index));
      levelsAfter.push(siblings.slice(index + 1));
    }
    if (parent === body) break;
    node = parent;
  }
  const keep = (el: El) => hasVisibleContent($, el);
  return { header: levelsBefore.flat().filter(keep), footer: levelsAfter.flat().filter(keep) };
}

/** Top-level blocks of one page: marked `data-wb-section` blocks, else the root's natural children. */
export function detectSections($: CheerioAPI, root: El, exclude: Set<El> = new Set()): El[] {
  const marked = topMost($, $(root as never).find("[data-wb-section]").toArray() as El[]);
  if (marked.length > 0) return marked.filter((el) => !exclude.has(el));

  let container = root;
  for (;;) {
    const children = contentChildren(container).filter((child) => !exclude.has(child));
    if (children.length !== 1) break;
    const only = children[0]!;
    if (BLOCK_TAGS.has(tagOf(only)) || contentChildren(only).length === 0) break;
    container = only;
  }
  const sections = contentChildren(container).filter((child) => !exclude.has(child) && hasVisibleContent($, child));
  return sections.length > 0 ? sections : hasVisibleContent($, root) ? [root] : [];
}

// ---------------------------------------------------------------------------
// Fragment building
// ---------------------------------------------------------------------------

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Vertical box styles are neutralised so a wrapper repeated around every section doesn't stack. */
const ANCESTOR_NEUTRALISE = "margin-top:0;margin-bottom:0;padding-top:0;padding-bottom:0;min-height:0;height:auto";

/**
 * Re-creates the element's ancestors (tag, classes, data-attrs) around it so selectors like
 * `main .hero h1` or `.view > section` still match after the block is lifted out of the page.
 */
function wrapWithAncestors($: CheerioAPI, el: El): string {
  const ancestors = ($(el as never).parents().toArray() as El[])
    .filter((parent) => !["html", "body"].includes(tagOf(parent)))
    .reverse();
  let open = "";
  let close = "";
  for (const ancestor of ancestors) {
    const tag = tagOf(ancestor);
    const attrs: string[] = [];
    for (const [name, value] of Object.entries(ancestor.attribs ?? {})) {
      const lower = name.toLowerCase();
      if (lower === "class" || lower === "role" || lower === "lang" || lower === "dir") {
        attrs.push(`${lower}="${escapeAttr(value)}"`);
      } else if (lower.startsWith("data-") && !lower.startsWith("data-wb-")) {
        attrs.push(`${lower}="${escapeAttr(value)}"`);
      }
    }
    const style = `${(ancestor.attribs?.style ?? "").trim().replace(/;?$/, ";")}${ANCESTOR_NEUTRALISE}`.replace(/^;/, "");
    attrs.push(`style="${escapeAttr(style)}"`, "data-wb-import-ancestor");
    open += `<${tag} ${attrs.join(" ")}>`;
    close = `</${tag}>${close}`;
  }
  return `${open}${$.html(el as never)}${close}`;
}

function rewriteSrcset(value: string, rewrite: (raw: string) => string): string {
  return value
    .split(/,\s+/)
    .map((candidate) => {
      const [url = "", ...descriptor] = candidate.trim().split(/\s+/);
      const next = rewrite(url);
      return next ? [next, ...descriptor].join(" ") : "";
    })
    .filter(Boolean)
    .join(", ");
}

function rewriteFragment($: CheerioAPI, ctx: ComponentImportContext): void {
  $("[src], [poster], [srcset], [xlink\\:href], image[href], use[href]").each((_, raw) => {
    const node = $(raw);
    for (const attr of ["src", "poster", "xlink:href", "href"] as const) {
      const value = node.attr(attr);
      if (!value) continue;
      if (attr === "href" && !["image", "use", "feimage"].includes(((raw as El).name || "").toLowerCase())) continue;
      if ((attr === "href" || attr === "xlink:href") && value.startsWith("#")) continue;
      const next = ctx.rewriteAsset(value);
      if (next) node.attr(attr, next);
      else node.removeAttr(attr);
    }
    const srcset = node.attr("srcset");
    if (srcset) {
      const next = rewriteSrcset(srcset, ctx.rewriteAsset);
      if (next) node.attr("srcset", next);
      else node.removeAttr("srcset");
    }
  });
  $("[style*='url(']").each((_, raw) => {
    const node = $(raw);
    node.attr("style", rewriteCssUrls(node.attr("style") || "", (url) => ctx.rewriteAsset(url) || null));
  });
  $("a[href]").each((_, raw) => {
    const node = $(raw);
    node.attr("href", ctx.rewriteLink(node.attr("href") || ""));
  });
  $("[hidden]").each((_, raw) => {
    // Page-view wrappers hidden by the SPA router must not hide the imported block.
    if ((raw as El).attribs?.["data-wb-import-ancestor"] !== undefined) $(raw).removeAttr("hidden");
  });
}

const TEXT_LABELS: Record<string, string> = {
  h1: "Heading",
  h2: "Heading",
  h3: "Subheading",
  h4: "Subheading",
  h5: "Subheading",
  h6: "Subheading",
  p: "Paragraph",
  a: "Link",
  button: "Button",
  li: "List item",
  label: "Label",
  summary: "Question",
  td: "Table cell",
  th: "Table heading",
  blockquote: "Quote",
  figcaption: "Caption",
  small: "Small text",
  b: "Bold text",
  strong: "Bold text",
  option: "Option",
};

function ownText(el: El): string {
  return (el.children ?? [])
    .filter((child) => child.type === "text")
    .map((child) => (child as { data?: string }).data ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function camelToLabel(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Marks every element that directly holds words as an editable text, and every img/video as media. */
function extractEditableFields($: CheerioAPI): { texts: ImportedHtmlText[]; mediaSlots: ImportedHtmlMediaSlot[] } {
  const texts: ImportedHtmlText[] = [];
  const mediaSlots: ImportedHtmlMediaSlot[] = [];

  $("*").each((_, raw) => {
    const el = raw as El;
    const tag = tagOf(el);
    const node = $(raw);

    if ((tag === "img" || tag === "video") && mediaSlots.length < MAX_MEDIA) {
      const url = node.attr("src") || (tag === "video" ? node.find("source[src]").first().attr("src") : "") || "";
      if (url && !url.startsWith("data:")) {
        const key = `m${mediaSlots.length}`;
        node.attr("data-wb-media-key", key);
        const alt = node.attr("alt") || node.attr("aria-label");
        mediaSlots.push({ key, kind: tag === "video" ? "video" : "image", url, ...(alt ? { alt: alt.slice(0, 300) } : {}) });
      }
      return;
    }

    if (texts.length >= MAX_TEXTS || node.closest("svg").length > 0) return;
    const value = ownText(el);
    if (!value || value.length > 5000 || !HAS_WORD.test(value)) return;
    const id = `t${texts.length}`;
    node.attr("data-wb-text-id", id);
    const field = (node.attr("data-wb-field") || "").trim();
    texts.push({ id, label: (field ? camelToLabel(field) : TEXT_LABELS[tag] ?? "Text").slice(0, 120), value });
  });

  return { texts, mediaSlots };
}

function componentName($root: cheerio.Cheerio<never>, fallback: string): string {
  const named = ($root.attr("data-wb-component") || "").trim();
  if (named) return named.slice(0, 120);
  const heading = $root.find("h1, h2, h3").first().text().replace(/\s+/g, " ").trim();
  if (heading) return heading.slice(0, 80);
  return fallback;
}

/**
 * Builds one `imported_html` section from one or more top-level blocks of the page.
 * The source document is not modified.
 */
export function buildHtmlComponent(
  $: CheerioAPI,
  pieces: El[],
  ctx: ComponentImportContext,
  options: { label: string; fallbackName: string; chrome?: ChromeKind },
): BuiltHtmlComponent | null {
  if (pieces.length === 0) return null;
  const fragmentSource = pieces.map((piece) => wrapWithAncestors($, piece)).join("\n");
  const $f = cheerio.load(fragmentSource, null, false);

  rewriteFragment($f, ctx);
  sanitizeTree($f, $f.root().contents().toArray() as never);
  const { texts, mediaSlots } = extractEditableFields($f);
  const html = $f.html().trim();
  if (!html) return null;

  const scope = ctx.newScope();
  const css = shakeStylesheet(ctx.stylesheet, sectionMatcher(html), scope);
  const name =
    options.chrome === "header"
      ? "Site header"
      : options.chrome === "footer"
        ? "Site footer"
        : componentName($(pieces[0] as never) as never, options.fallbackName);

  const data: ImportedHtmlData = {
    title: name,
    html,
    css,
    scope,
    ...(options.chrome ? { chrome: options.chrome } : {}),
    texts,
    mediaSlots,
  };
  const candidate = {
    id: randomUUID(),
    type: "imported_html" as const,
    hidden: false,
    settings: { ...DEFAULT_SETTINGS },
    data,
  };

  const { error, value } = sectionSchema.validate(candidate, { abortEarly: false, stripUnknown: true });
  if (error) {
    const detail = error.details.map((d) => d.message).join("; ");
    throw new AppError(400, `${options.label}: block "${name}" could not be imported — ${detail}`, "IMPORT_SECTION_INVALID");
  }
  return { name, section: value as Section, ...(options.chrome ? { chrome: options.chrome } : {}) };
}
