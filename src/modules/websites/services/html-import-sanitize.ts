/**
 * Allowlist sanitizer for imported HTML. Runs at import time AND on every draft save
 * (see site-content.validator), because `imported_html.html` is rendered with
 * dangerouslySetInnerHTML in the builder and in the server-rendered live site.
 */
import * as cheerio from "cheerio";

type Cheerio$ = cheerio.CheerioAPI;
type AnyNode = { type?: string; name?: string; attribs?: Record<string, string>; children?: AnyNode[] };

/** Removed together with their content. */
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "object",
  "embed",
  "applet",
  "frame",
  "frameset",
  "noframes",
  "noembed",
  "base",
  "link",
  "meta",
  "title",
  "head",
  "xmp",
  "plaintext",
  "math",
  "portal",
  "param",
  "foreignobject",
  "set",
  "dialog",
]);

const HTML_TAGS = [
  "a", "abbr", "address", "article", "aside", "audio", "b", "bdi", "bdo", "blockquote", "br", "button",
  "caption", "cite", "code", "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn", "div",
  "dl", "dt", "em", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6",
  "header", "hgroup", "hr", "i", "iframe", "img", "input", "ins", "kbd", "label", "legend", "li", "main", "mark",
  "menu", "meter", "nav", "ol", "optgroup", "option", "output", "p", "picture", "pre", "progress", "q", "rp",
  "rt", "ruby", "s", "samp", "search", "section", "select", "small", "source", "span", "strong", "sub",
  "summary", "sup", "table", "tbody", "td", "textarea", "tfoot", "th", "thead", "time", "tr", "track", "u",
  "ul", "var", "video", "wbr", "center", "font", "big", "strike", "tt",
];

const SVG_TAGS = [
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "textpath",
  "defs", "lineargradient", "radialgradient", "stop", "clippath", "mask", "pattern", "symbol", "use", "image",
  "desc", "marker", "filter", "fegaussianblur", "feoffset", "feblend", "fecolormatrix", "fecomposite",
  "feflood", "femerge", "femergenode", "femorphology", "feturbulence", "fedisplacementmap", "fedropshadow",
  "fecomponenttransfer", "fefunca", "fefuncr", "fefuncg", "fefuncb", "fespecularlighting",
  "fediffuselighting", "fepointlight", "fedistantlight", "fespotlight", "fetile", "feimage",
  "animate", "animatetransform", "animatemotion", "mpath", "switch", "view", "metadata",
];

const ALLOWED_TAGS = new Set([...HTML_TAGS, ...SVG_TAGS]);
const CUSTOM_ELEMENT = /^[a-z][a-z0-9]*-[a-z0-9-]*$/;

const DROP_ATTRS = new Set(["formaction", "action", "srcdoc", "ping", "http-equiv", "nonce", "is", "autofocus"]);
const URL_ATTRS = new Set(["href", "xlink:href", "src", "poster", "background", "cite", "data", "longdesc", "lowsrc", "dynsrc", "usemap"]);

/** Iframes are only kept for well-known embeds (maps, video). */
const IFRAME_HOSTS = [
  "www.google.com",
  "maps.google.com",
  "www.youtube.com",
  "www.youtube-nocookie.com",
  "youtube.com",
  "player.vimeo.com",
];

/** id/name values that would clobber document/window properties the builder relies on. */
const CLOBBER_NAMES = new Set(
  [
    "document", "window", "location", "cookie", "domain", "body", "head", "forms", "images", "links", "scripts",
    "anchors", "all", "createelement", "getelementbyid", "getelementsbyclassname", "getelementsbytagname",
    "queryselector", "queryselectorall", "addeventlistener", "removeeventlistener", "attributes", "nodename",
    "nodetype", "parentnode", "ownerdocument", "defaultview", "top", "self", "parent", "frames", "opener",
    "localstorage", "sessionstorage", "fetch", "alert", "open", "close", "history", "navigator", "origin",
    "root", "__proto__", "constructor", "prototype", "implementation", "documentelement", "activeelement",
  ],
);

// Browsers ignore these inside URL schemes ("java\tscript:"), so they are stripped before checking.
// oxlint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0020\u007f-\u00a0\u1680\u180e\u2000-\u2029\u205f\u3000\ufeff]/g;
const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon|svg\+xml)[;,]/i;

/** True for relative URLs, fragments, http(s), mailto/tel/sms; data: images only where allowed. */
export function isSafeUrl(value: string, opts: { allowDataImage?: boolean } = {}): boolean {
  const compact = value.replace(CONTROL_CHARS, "").toLowerCase();
  if (!compact) return true;
  if (compact.startsWith("data:")) return Boolean(opts.allowDataImage) && SAFE_DATA_IMAGE.test(compact);
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(compact);
  if (!scheme) return true; // relative / fragment / protocol-relative
  return ["http", "https", "mailto", "tel", "sms"].includes(scheme[1]!);
}

function isSafeSrcset(value: string): boolean {
  return value
    .split(/,\s+/)
    .map((candidate) => candidate.trim().split(/\s+/)[0] ?? "")
    .every((url) => isSafeUrl(url, { allowDataImage: true }));
}

function isSafeStyle(value: string): boolean {
  const compact = value.replace(CONTROL_CHARS, "").toLowerCase();
  return !/expression\(|javascript:|vbscript:|-moz-binding|behavior:|@import/.test(compact);
}

function isAllowedIframe(src: string | undefined): boolean {
  if (!src) return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && IFRAME_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

function sanitizeAttributes($: Cheerio$, el: AnyNode, tag: string): void {
  const node = $(el as never);
  const attribs = el.attribs ?? {};
  for (const [rawName, value] of Object.entries(attribs)) {
    const name = rawName.toLowerCase();
    if (name.startsWith("on") || DROP_ATTRS.has(name) || name.includes(":") && !["xlink:href", "xml:lang", "xml:space", "xmlns:xlink"].includes(name)) {
      node.removeAttr(rawName);
      continue;
    }
    if (URL_ATTRS.has(name) && !isSafeUrl(value, { allowDataImage: tag !== "a" && tag !== "iframe" })) {
      node.removeAttr(rawName);
      continue;
    }
    if ((name === "srcset" || name === "imagesrcset") && !isSafeSrcset(value)) {
      node.removeAttr(rawName);
      continue;
    }
    if (name === "style" && !isSafeStyle(value)) {
      node.removeAttr(rawName);
      continue;
    }
    if ((name === "id" || name === "name") && CLOBBER_NAMES.has(value.trim().toLowerCase())) {
      node.removeAttr(rawName);
      continue;
    }
    if (name === "name" && ["img", "form", "iframe", "map"].includes(tag)) {
      node.removeAttr(rawName);
      continue;
    }
    // SMIL can animate an href into javascript: — block animating link targets.
    if (name === "attributename" && /href/i.test(value)) {
      node.remove();
      return;
    }
  }
  if (tag === "a" && (node.attr("target") || "").toLowerCase() === "_blank") {
    node.attr("rel", "noopener noreferrer");
  }
  if (tag === "form") {
    node.removeAttr("method");
  }
}

function walk($: Cheerio$, nodes: AnyNode[]): void {
  // Copy: removing/unwrapping nodes mutates the live children array.
  // oxlint-disable-next-line no-useless-spread
  for (const el of [...nodes]) {
    if (el.type === "comment" || el.type === "directive" || el.type === "cdata") {
      $(el as never).remove();
      continue;
    }
    if (el.type !== "tag" && el.type !== "script" && el.type !== "style") continue;
    const tag = (el.name || "").toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) {
      $(el as never).remove();
      continue;
    }
    if (tag === "iframe" && !isAllowedIframe(el.attribs?.src)) {
      $(el as never).remove();
      continue;
    }
    if (!ALLOWED_TAGS.has(tag) && !CUSTOM_ELEMENT.test(tag)) {
      // Unknown element: keep its content, drop the wrapper.
      const children = [...(el.children ?? [])];
      $(el as never).replaceWith(children as never);
      walk($, children);
      continue;
    }
    sanitizeAttributes($, el, tag);
    if (el.children?.length) walk($, el.children);
  }
}

/** Sanitizes a fragment (or a loaded subtree) in place. */
export function sanitizeTree($: Cheerio$, roots: AnyNode[]): void {
  walk($, roots);
}

/** Returns a sanitized copy of an HTML fragment. */
export function sanitizeImportedHtml(html: string): string {
  if (!html) return "";
  const $ = cheerio.load(html, null, false);
  walk($, $.root().contents().toArray() as AnyNode[]);
  return $.html();
}
