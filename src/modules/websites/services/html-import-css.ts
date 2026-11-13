/**
 * Small, dependency-free CSS engine for HTML import:
 *  - parses stylesheets into rules / at-rules (comment, string and bracket aware)
 *  - scopes every selector under one import scope class (`:root`, `html`, `body` map onto the scope)
 *  - drops rules that match nothing inside a given section (per-section tree shaking)
 *  - rewrites url() references and prefixes @keyframes so imports never clash with the builder
 *  - turns viewport-width @media queries into `@container wb-site` so device previews stay responsive
 */
import * as cheerio from "cheerio";

export type CssNode =
  | { kind: "rule"; selector: string; body: string }
  | { kind: "at"; name: string; prelude: string; body: string | null; children: CssNode[] | null };

/** At-rules whose block holds more rules (recursed into); everything else keeps its body verbatim. */
const NESTED_AT_RULES = new Set(["media", "supports", "container", "layer", "document", "-moz-document", "scope"]);
/** At-rules that are meaningless or unsafe inside a builder page. */
const DROPPED_AT_RULES = new Set(["charset", "namespace", "page", "import"]);

/** Hosts whose stylesheets may be @imported (fonts only). */
export const FONT_CSS_HOSTS = ["fonts.googleapis.com", "fonts.bunny.net", "use.typekit.net", "api.fontshare.com"];

export const IMPORT_SCOPE_PATTERN = /^wbi-[a-z0-9]{4,40}$/;

/** Outer selector every imported rule starts with. `.wb-site` lifts specificity above the site-kit reset. */
export function scopeRootSelector(scope: string): string {
  return `.wb-site .${scope}`;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

export function stripCssComments(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const ch = css[i]!;
    if (ch === '"' || ch === "'") {
      const end = skipString(css, i);
      out += css.slice(i, end);
      i = end;
      continue;
    }
    if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 2;
      out += " ";
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function skipString(css: string, start: number): number {
  const quote = css[start];
  let i = start + 1;
  while (i < css.length) {
    const ch = css[i];
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === quote || ch === "\n") return i + 1;
    i += 1;
  }
  return css.length;
}

/** Index of the first `stop` char at depth 0 (outside strings, (), []), or -1. */
function findTopLevel(css: string, start: number, stops: string): number {
  let depth = 0;
  let i = start;
  while (i < css.length) {
    const ch = css[i]!;
    if (ch === '"' || ch === "'") {
      i = skipString(css, i);
      continue;
    }
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "(" || ch === "[") depth += 1;
    else if ((ch === ")" || ch === "]") && depth > 0) depth -= 1;
    else if (depth === 0 && stops.includes(ch)) return i;
    i += 1;
  }
  return -1;
}

/** Given the index of `{`, returns the index of its matching `}` (or css.length). */
function matchBrace(css: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < css.length) {
    const ch = css[i]!;
    if (ch === '"' || ch === "'") {
      i = skipString(css, i);
      continue;
    }
    if (ch === "\\") {
      i += 2;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return css.length;
}

export function parseCss(css: string): CssNode[] {
  return parseBlock(stripCssComments(css));
}

function parseBlock(css: string): CssNode[] {
  const nodes: CssNode[] = [];
  let i = 0;
  while (i < css.length) {
    while (i < css.length && /[\s;]/.test(css[i]!)) i += 1;
    if (i >= css.length) break;
    if (css[i] === "}") {
      i += 1; // stray closing brace — skip, like browsers do
      continue;
    }

    if (css[i] === "@") {
      const nameMatch = /^@([a-zA-Z-]+)/.exec(css.slice(i, i + 64));
      const name = (nameMatch?.[1] ?? "").toLowerCase();
      const preludeStart = i + (nameMatch?.[0].length ?? 1);
      const stop = findTopLevel(css, preludeStart, "{;");
      if (stop < 0) break;
      const prelude = css.slice(preludeStart, stop).trim();
      if (css[stop] === ";") {
        nodes.push({ kind: "at", name, prelude, body: null, children: null });
        i = stop + 1;
        continue;
      }
      const close = matchBrace(css, stop);
      const inner = css.slice(stop + 1, close);
      nodes.push(
        NESTED_AT_RULES.has(name)
          ? { kind: "at", name, prelude, body: null, children: parseBlock(inner) }
          : { kind: "at", name, prelude, body: inner.trim(), children: null },
      );
      i = close + 1;
      continue;
    }

    const open = findTopLevel(css, i, "{");
    if (open < 0) break;
    const close = matchBrace(css, open);
    const selector = css.slice(i, open).trim();
    const body = css.slice(open + 1, close).trim();
    if (selector) nodes.push({ kind: "rule", selector, body });
    i = close + 1;
  }
  return nodes;
}

export function serializeCss(nodes: CssNode[], pretty = false): string {
  const nl = pretty ? "\n" : "";
  return nodes
    .map((node) => {
      if (node.kind === "rule") return `${node.selector}{${node.body}}`;
      const head = `@${node.name}${node.prelude ? ` ${node.prelude}` : ""}`;
      if (node.children) return `${head}{${nl}${serializeCss(node.children, pretty)}${nl}}`;
      if (node.body !== null) return `${head}{${node.body}}`;
      return `${head};`;
    })
    .join(pretty ? "\n" : "\n");
}

/** Splits on top-level commas (ignores commas inside :is(...), [attr="a,b"], strings). */
export function splitSelectorList(selector: string): string[] {
  const parts: string[] = [];
  let start = 0;
  while (start <= selector.length) {
    const idx = findTopLevel(selector, start, ",");
    if (idx < 0) {
      parts.push(selector.slice(start));
      break;
    }
    parts.push(selector.slice(start, idx));
    start = idx + 1;
  }
  return parts.map((part) => part.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Scoping
// ---------------------------------------------------------------------------

/** Reads the first compound selector (up to a top-level combinator/space). */
function firstCompound(selector: string): { compound: string; rest: string } {
  const idx = findTopLevel(selector, 0, " \t\n>+~");
  if (idx < 0) return { compound: selector, rest: "" };
  return { compound: selector.slice(0, idx), rest: selector.slice(idx) };
}

const DOCUMENT_ROOT = /^(?:html|body|:root)(?![\w-])/i;

/** `.hero h1` → `.wb-site .wbi-x .hero h1`; `:root`/`html`/`body` collapse onto the scope element. */
function isUnderScope(selector: string, root: string): boolean {
  if (!selector.startsWith(root)) return false;
  const next = selector.charAt(root.length);
  return next === "" || next === " " || next === "." || next === ":" || next === "[";
}

export function scopeSelector(selector: string, scope: string): string {
  const root = scopeRootSelector(scope);
  const trimmed = selector.trim();
  if (!trimmed) return trimmed;
  if (isUnderScope(trimmed, root)) return trimmed;

  let rest = trimmed;
  let suffix = "";
  let matchedRoot = false;
  for (;;) {
    const { compound, rest: after } = firstCompound(rest);
    const match = DOCUMENT_ROOT.exec(compound);
    if (!match) break;
    matchedRoot = true;
    suffix += compound.slice(match[0].length);
    rest = after.trim().replace(/^>\s*/, "");
    if (!rest) break;
  }

  if (!matchedRoot) return `${root} ${trimmed}`;
  if (!rest) return `${root}${suffix}`;
  // A combinator straight after the root (`body > main`) becomes a descendant: the original
  // ancestors are rebuilt inside the scope, but not as its direct children.
  const cleaned = rest.replace(/^[>+~]\s*/, "");
  return `${root}${suffix} ${cleaned}`;
}

// ---------------------------------------------------------------------------
// Matching (tree shaking)
// ---------------------------------------------------------------------------

/** Structural pseudo-classes css-select understands; everything else is stripped before matching. */
const MATCHABLE_PSEUDOS = new Set([
  "not",
  "is",
  "where",
  "has",
  "matches",
  "nth-child",
  "nth-last-child",
  "nth-of-type",
  "nth-last-of-type",
  "first-child",
  "last-child",
  "only-child",
  "first-of-type",
  "last-of-type",
  "only-of-type",
  "empty",
  "checked",
  "disabled",
  "enabled",
  "required",
  "optional",
  "link",
  "any-link",
  "root",
]);

const PSEUDO = /::?(-?[a-zA-Z][\w-]*)(\((?:[^()]|\([^()]*\))*\))?/g;

/** Removes dynamic/pseudo-element parts so `.btn:hover::after` can be tested as `.btn`. */
export function matchableSelector(selector: string): string {
  const stripped = selector.replace(PSEUDO, (full, name: string) => {
    if (full.startsWith("::")) return "";
    return MATCHABLE_PSEUDOS.has(name.toLowerCase()) ? full : "";
  });
  const cleaned = stripped.replace(/[\s>+~]+$/, "").trim();
  return cleaned || "*";
}

type MatchFn = (selector: string) => boolean;

/** A matcher over a detached section fragment: true when the selector hits any element in it. */
export function fragmentMatcher(fragmentHtml: string): MatchFn {
  const $ = cheerio.load(fragmentHtml, null, false);
  const cache = new Map<string, boolean>();
  return (selector) => {
    const key = matchableSelector(selector);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    let result: boolean;
    try {
      result = $(key).length > 0;
    } catch {
      result = true; // unsupported syntax: keep the rule rather than risk losing styles
    }
    cache.set(key, result);
    return result;
  };
}

// ---------------------------------------------------------------------------
// Declarations: url() rewriting, keyframes
// ---------------------------------------------------------------------------

const URL_FN = /url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^)\s]*))\s*\)/gi;

/** Calls `visit` for every url() in a stylesheet. */
export function forEachCssUrl(css: string, visit: (url: string) => void): void {
  for (const match of css.matchAll(URL_FN)) {
    const raw = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    if (raw) visit(raw);
  }
}

/** Replaces every url(); `rewrite` returns the new URL or null to blank it. */
export function rewriteCssUrls(css: string, rewrite: (url: string) => string | null): string {
  return css.replace(URL_FN, (_full, dq?: string, sq?: string, bare?: string) => {
    const raw = (dq ?? sq ?? bare ?? "").trim();
    if (!raw) return "url()";
    const next = rewrite(raw);
    if (next === null) return 'url("")';
    return `url("${next.replace(/["\\\n]/g, (c) => `\\${c === "\n" ? "a " : c}`)}")`;
  });
}

const ANIMATION_DECL = /(^|[;{\s])(animation(?:-name)?\s*:)([^;}]*)/gi;

function renameAnimations(body: string, renames: Map<string, string>): string {
  if (renames.size === 0) return body;
  return body.replace(ANIMATION_DECL, (_full, lead: string, prop: string, value: string) => {
    const next = value.replace(/-?[a-zA-Z_][\w-]*/g, (token) => renames.get(token) ?? token);
    return `${lead}${prop}${next}`;
  });
}

function referencedAnimationNames(css: string): Set<string> {
  const names = new Set<string>();
  for (const match of css.matchAll(ANIMATION_DECL)) {
    for (const token of match[3]!.match(/-?[a-zA-Z_][\w-]*/g) ?? []) names.add(token);
  }
  return names;
}

// ---------------------------------------------------------------------------
// Media → container queries
// ---------------------------------------------------------------------------

const WIDTH_FEATURE = /^\(\s*(?:(?:min|max)-width\s*:\s*[^()]+|width\s*(?:<=?|>=?)\s*[^()]+|[^()]+(?:<=?|>=?)\s*width(?:\s*(?:<=?|>=?)\s*[^()]+)?)\)$/i;

/**
 * `@media (max-width: 900px)` → `@container wb-site (max-width: 900px)` so the builder's device
 * preview (narrow frame, wide window) gets the same breakpoints as a real phone. Non-width or
 * mixed queries stay as @media.
 */
export function mediaToContainerPrelude(prelude: string): string | null {
  const text = prelude.trim().replace(/^only\s+/i, "");
  if (!text || text.includes(",")) return null;
  const parts = text.split(/\s+and\s+/i).map((part) => part.trim());
  const features: string[] = [];
  for (const part of parts) {
    if (/^(?:screen|all)$/i.test(part)) continue;
    if (!WIDTH_FEATURE.test(part)) return null;
    features.push(part);
  }
  if (features.length === 0) return null;
  return `wb-site ${features.join(" and ")}`;
}

// ---------------------------------------------------------------------------
// Public pipeline
// ---------------------------------------------------------------------------

export type PreparedStylesheet = {
  /** Allowed font @imports, hoisted to the top of every section stylesheet. */
  imports: string[];
  /** Scoped, url-rewritten rules (not yet shaken per section). */
  nodes: CssNode[];
  /** Original keyframe names → prefixed names. */
  keyframeRenames: Map<string, string>;
};

function isAllowedImportUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && FONT_CSS_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function importUrl(prelude: string): string | null {
  const urlMatch = /^url\(\s*["']?([^"')]+)["']?\s*\)/i.exec(prelude) || /^["']([^"']+)["']/.exec(prelude);
  return urlMatch?.[1]?.trim() ?? null;
}

/**
 * Placeholder scope used while preparing a page stylesheet once; each section's shaken copy
 * then gets its own scope (so one block's rules can never re-order another block's cascade).
 */
const PLACEHOLDER_SCOPE = "wbi-scope0placeholder";

/**
 * `html`/`body`/`:root` rules land on every block's wrapper. Properties about the viewport or
 * page box (scrolling, height, spacing, layout) would repeat per block, so only typography,
 * colours, backgrounds and custom properties are kept.
 */
const ROOT_ONLY_PROPS =
  /^(?:overflow(?:-[xy])?|overscroll-behavior.*|scroll-.*|height|min-height|max-height|width|min-width|max-width|margin.*|padding.*|display|flex.*|grid.*|place-.*|align-.*|justify-.*|gap|row-gap|column-gap|position|top|right|bottom|left|inset.*|zoom|contain|container.*|transform.*|perspective.*)$/i;

function splitDeclarations(body: string): string[] {
  const parts: string[] = [];
  let start = 0;
  while (start < body.length) {
    const idx = findTopLevel(body, start, ";");
    if (idx < 0) {
      parts.push(body.slice(start));
      break;
    }
    parts.push(body.slice(start, idx));
    start = idx + 1;
  }
  return parts.map((part) => part.trim()).filter(Boolean);
}

function filterRootDeclarations(body: string): string {
  // Nested rules (CSS nesting) inside a root rule are dropped too: they rarely make sense per block.
  if (body.includes("{")) return "";
  return splitDeclarations(body)
    .filter((decl) => {
      const prop = decl.slice(0, decl.indexOf(":")).trim();
      return prop.startsWith("--") || !ROOT_ONLY_PROPS.test(prop);
    })
    .join(";");
}

/** Parses, scopes (to a placeholder), renames keyframes and converts media queries — once per page. */
export function prepareStylesheet(css: string, keyframePrefix: string): PreparedStylesheet {
  const scope = PLACEHOLDER_SCOPE;
  const root = scopeRootSelector(scope);
  const imports: string[] = [];
  const keyframeRenames = new Map<string, string>();
  const nodes = parseCss(css);

  const collectKeyframes = (list: CssNode[]) => {
    for (const node of list) {
      if (node.kind !== "at") continue;
      if (/^(?:-webkit-|-moz-)?keyframes$/.test(node.name) && node.prelude) {
        const name = node.prelude.replace(/^["']|["']$/g, "").trim();
        if (name) keyframeRenames.set(name, `${keyframePrefix}-${name}`.replace(/[^\w-]/g, "-"));
      }
      if (node.children) collectKeyframes(node.children);
    }
  };
  collectKeyframes(nodes);

  const transform = (list: CssNode[]): CssNode[] => {
    const out: CssNode[] = [];
    for (const node of list) {
      if (node.kind === "rule") {
        const body = renameAnimations(node.body, keyframeRenames);
        const rootParts: string[] = [];
        const otherParts: string[] = [];
        for (const part of splitSelectorList(node.selector)) {
          const scoped = scopeSelector(part, scope);
          if (scoped.startsWith(`${root} `)) otherParts.push(scoped);
          // body::before overlays would repeat on every block: drop pseudo-elements on the root.
          else if (!/::?(?:before|after|backdrop|selection|-webkit-scrollbar)/i.test(scoped.slice(root.length))) rootParts.push(scoped);
        }
        if (rootParts.length) {
          const filtered = filterRootDeclarations(body);
          if (filtered) out.push({ kind: "rule", selector: rootParts.join(", "), body: filtered });
        }
        if (otherParts.length) out.push({ kind: "rule", selector: otherParts.join(", "), body });
        continue;
      }
      if (node.name === "import") {
        const url = importUrl(node.prelude);
        if (url && isAllowedImportUrl(url) && !imports.includes(url)) imports.push(url);
        continue;
      }
      if (DROPPED_AT_RULES.has(node.name)) continue;
      if (/^(?:-webkit-|-moz-)?keyframes$/.test(node.name)) {
        const name = node.prelude.replace(/^["']|["']$/g, "").trim();
        out.push({ ...node, prelude: keyframeRenames.get(name) ?? node.prelude });
        continue;
      }
      if (node.children) {
        const children = transform(node.children);
        if (node.name === "media") {
          const container = mediaToContainerPrelude(node.prelude);
          if (container) {
            out.push({ kind: "at", name: "container", prelude: container, body: null, children });
            continue;
          }
        }
        out.push({ ...node, children });
        continue;
      }
      out.push(node);
    }
    return out;
  };

  return { imports, nodes: transform(nodes), keyframeRenames };
}

/** Builds the matcher input for a section: its HTML inside an element carrying the placeholder scope. */
export function sectionMatcher(html: string): MatchFn {
  return fragmentMatcher(`<div class="${PLACEHOLDER_SCOPE}">${html}</div>`);
}

/**
 * Keeps only the rules that can apply inside one section (plus the keyframes / font faces they use),
 * so every section carries a self-contained, small stylesheet scoped to `scope`.
 */
export function shakeStylesheet(sheet: PreparedStylesheet, matches: MatchFn, scope: string): string {
  const root = scopeRootSelector(PLACEHOLDER_SCOPE);

  const shake = (list: CssNode[]): CssNode[] => {
    const out: CssNode[] = [];
    for (const node of list) {
      if (node.kind === "rule") {
        const kept = splitSelectorList(node.selector).filter((part) => {
          // Rules on the scope itself (from :root/html/body) always apply.
          if (isUnderScope(part, root) && !part.startsWith(`${root} `)) return true;
          const local = part.startsWith(`${root} `) ? part.slice(root.length + 1) : part;
          return matches(local);
        });
        if (kept.length && node.body.trim()) out.push({ ...node, selector: kept.join(", ") });
        continue;
      }
      if (node.name.endsWith("keyframes") || node.name === "font-face") {
        out.push(node); // filtered by usage below
        continue;
      }
      if (node.children) {
        const children = shake(node.children);
        if (children.length) out.push({ ...node, children });
        continue;
      }
      out.push(node);
    }
    return out;
  };

  const shaken = shake(sheet.nodes);
  const ruleText = serializeCss(shaken.filter((n) => !(n.kind === "at" && (n.name.endsWith("keyframes") || n.name === "font-face"))));
  const usedAnimations = referencedAnimationNames(ruleText);
  const lowerRules = ruleText.toLowerCase();

  const prune = (list: CssNode[]): CssNode[] =>
    list.flatMap((node): CssNode[] => {
      if (node.kind !== "at") return [node];
      if (node.name.endsWith("keyframes")) return usedAnimations.has(node.prelude) ? [node] : [];
      if (node.name === "font-face") {
        const family = /font-family\s*:\s*["']?([^;"']+)/i.exec(node.body ?? "")?.[1]?.trim().toLowerCase();
        return family && lowerRules.includes(family) ? [node] : [];
      }
      if (node.children) {
        const children = prune(node.children);
        return children.length ? [{ ...node, children }] : [];
      }
      return [node];
    });

  const body = serializeCss(prune(shaken)).split(PLACEHOLDER_SCOPE).join(scope);
  const head = sheet.imports.map((url) => `@import url("${url}");`).join("\n");
  return finalizeCss([head, body].filter(Boolean).join("\n"));
}

/** Last-line safety for CSS embedded in a <style> element (also used when saving). */
export function finalizeCss(css: string): string {
  return css
    .replace(/</g, "\\3c ")
    .replace(/expression\s*\(/gi, "(")
    .replace(/(?:java|vb)script\s*:/gi, "")
    .replace(/-moz-binding\s*:/gi, "-x-binding:")
    .replace(/behavior\s*:/gi, "x-behavior:");
}

/**
 * Save-time guard: re-scopes any selector not under the section's scope, drops disallowed
 * @imports and neutralises `<`, so hand-edited CSS can never restyle the builder or break out of
 * its <style> tag.
 */
export function enforceScopedCss(css: string, scope: string): string {
  if (!css.trim()) return "";
  const root = scopeRootSelector(scope);
  const enforce = (list: CssNode[]): CssNode[] =>
    list.flatMap((node): CssNode[] => {
      if (node.kind === "rule") {
        const selector = splitSelectorList(node.selector)
          .map((part) => (isUnderScope(part, root) ? part : scopeSelector(part, scope)))
          .join(", ");
        return [{ ...node, selector }];
      }
      if (node.name === "import") {
        const url = importUrl(node.prelude);
        return url && isAllowedImportUrl(url) ? [node] : [];
      }
      if (DROPPED_AT_RULES.has(node.name)) return [];
      if (node.children) return [{ ...node, children: enforce(node.children) }];
      return [node];
    });
  return finalizeCss(serializeCss(enforce(parseCss(css))));
}
