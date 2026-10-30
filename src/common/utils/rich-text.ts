/**
 * Inline rich text stored inside plain content strings.
 *
 * Stored format: plain text plus a small allowlist of tags —
 * `<strong> <em> <u> <s> <mark> <br>` and `<span style="…" data-font="…">`.
 * Anything else is kept as literal text (React escapes it on render), and
 * every style value is checked against a strict pattern, so stored content can
 * never inject markup or CSS. Plain strings are valid rich text unchanged.
 *
 * Port of website-builder-fe/src/site-kit/rich-text-core.ts; keep the two in sync.
 */

import { FONT_KEYS } from "../../modules/websites/types/site-content.types.js";

type FontKey = (typeof FONT_KEYS)[number];

const FONT_KEY_SET: ReadonlySet<string> = new Set(FONT_KEYS);

function isFontKey(value: unknown): value is FontKey {
  return typeof value === "string" && FONT_KEY_SET.has(value);
}

export type RichTextStyle = {
  color?: string;
  background?: string;
  fontSize?: string;
  fontSizeTablet?: string;
  fontSizeMobile?: string;
  fontWeight?: string;
  italic?: boolean;
  fontFamily?: FontKey;
  letterSpacing?: string;
  lineHeight?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  textDecoration?: "none" | "underline" | "line-through" | "underline line-through";
};

export type RichTextTag = "strong" | "em" | "u" | "s" | "mark" | "span";

export type RichTextElement = {
  tag: RichTextTag;
  style?: RichTextStyle;
  className?: string;
  children: RichTextNode[];
};

export type RichTextNode = string | { tag: "br" } | RichTextElement;

const TAG_ALIASES: Record<string, RichTextTag | "br"> = {
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  u: "u",
  s: "s",
  mark: "mark",
  span: "span",
  br: "br",
};

const TAG_PATTERN = /<(\/?)(strong|b|em|i|u|s|mark|span|br)\b((?:\s+[a-zA-Z-]+\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*)\s*\/?>/gi;
const ATTRIBUTE_PATTERN = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const QUICK_CHECK = /<\/?(?:strong|b|em|i|u|s|mark|span|br)\b/i;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB_COLOR = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d{1,3})\s*)?\)$/i;
const NAMED_COLOR = /^[a-z]{3,20}$/i;
const FONT_SIZE = /^(\d{1,3}(?:\.\d{1,2})?)(px|em|rem)$/i;
const LETTER_SPACING = /^-?\d{1,2}(?:\.\d{1,3})?(?:px|em)$/i;
const LINE_HEIGHT = /^(?:\d(?:\.\d{1,2})?|\d{1,3}px)$/i;
const FONT_WEIGHTS = new Set(["100", "200", "300", "400", "500", "600", "700", "800", "900"]);
const TEXT_TRANSFORMS = new Set(["none", "uppercase", "lowercase", "capitalize"]);
const TEXT_DECORATIONS = new Set(["none", "underline", "line-through", "underline line-through"]);
const CLASS_TOKEN = /^wb-[a-z0-9-]{1,40}$/;

export const RICH_TEXT_MIN_PX = 6;
export const RICH_TEXT_MAX_PX = 240;

/** True when the string may hold rich text tags; plain strings skip all parsing. */
export function hasRichText(value: string | null | undefined): boolean {
  return typeof value === "string" && QUICK_CHECK.test(value);
}

export function cleanColor(value: string | undefined): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (HEX_COLOR.test(v) || RGB_COLOR.test(v) || NAMED_COLOR.test(v)) return v.toLowerCase();
  return undefined;
}

export function cleanFontSize(value: string | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  const normalized = /^\d{1,3}(?:\.\d{1,2})?$/.test(v) ? `${v}px` : v;
  const match = FONT_SIZE.exec(normalized);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const px = match[2] === "px" ? amount : amount * 16;
  if (px < RICH_TEXT_MIN_PX || px > RICH_TEXT_MAX_PX) return undefined;
  return normalized;
}

function cleanFontWeight(value: string | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  if (v === "bold") return "700";
  if (v === "normal") return "400";
  return FONT_WEIGHTS.has(v) ? v : undefined;
}

function cleanLetterSpacing(value: string | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  return LETTER_SPACING.test(v) ? v : undefined;
}

function cleanLineHeight(value: string | undefined): string | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  return LINE_HEIGHT.test(v) ? v : undefined;
}

/** Drops every property whose value isn't safe and well-formed. */
export function cleanRichTextStyle(style: RichTextStyle | undefined): RichTextStyle | undefined {
  if (!style) return undefined;
  const clean: RichTextStyle = {};
  const color = cleanColor(style.color);
  if (color) clean.color = color;
  const background = cleanColor(style.background);
  if (background) clean.background = background;
  const fontSize = cleanFontSize(style.fontSize);
  if (fontSize) clean.fontSize = fontSize;
  const fontSizeTablet = cleanFontSize(style.fontSizeTablet);
  if (fontSizeTablet) clean.fontSizeTablet = fontSizeTablet;
  const fontSizeMobile = cleanFontSize(style.fontSizeMobile);
  if (fontSizeMobile) clean.fontSizeMobile = fontSizeMobile;
  const fontWeight = cleanFontWeight(style.fontWeight);
  if (fontWeight) clean.fontWeight = fontWeight;
  if (style.italic) clean.italic = true;
  if (isFontKey(style.fontFamily)) clean.fontFamily = style.fontFamily;
  const letterSpacing = cleanLetterSpacing(style.letterSpacing);
  if (letterSpacing) clean.letterSpacing = letterSpacing;
  const lineHeight = cleanLineHeight(style.lineHeight);
  if (lineHeight) clean.lineHeight = lineHeight;
  if (style.textTransform && TEXT_TRANSFORMS.has(style.textTransform)) clean.textTransform = style.textTransform;
  if (style.textDecoration && TEXT_DECORATIONS.has(style.textDecoration)) clean.textDecoration = style.textDecoration;
  return Object.keys(clean).length > 0 ? clean : undefined;
}

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  ATTRIBUTE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE_PATTERN.exec(source)) !== null) {
    attributes[match[1]!.toLowerCase()] = match[2] ?? match[3] ?? "";
  }
  return attributes;
}

/** Style of a stored `<span>` from its attributes (`style`, `data-font`, `data-size-*`). */
export function richTextStyleFromAttributes(attributes: Record<string, string>): RichTextStyle | undefined {
  const style: RichTextStyle = {};
  for (const rule of (attributes.style ?? "").split(";")) {
    const index = rule.indexOf(":");
    if (index < 0) continue;
    const property = rule.slice(0, index).trim().toLowerCase();
    const value = rule.slice(index + 1).trim();
    switch (property) {
      case "color":
        style.color = value;
        break;
      case "background":
      case "background-color":
        style.background = value;
        break;
      case "font-size":
        style.fontSize = value;
        break;
      case "font-weight":
        style.fontWeight = value;
        break;
      case "font-style":
        if (value.toLowerCase() === "italic") style.italic = true;
        break;
      case "letter-spacing":
        style.letterSpacing = value;
        break;
      case "line-height":
        style.lineHeight = value;
        break;
      case "text-transform":
        style.textTransform = value.toLowerCase() as RichTextStyle["textTransform"];
        break;
      case "text-decoration":
      case "text-decoration-line":
        style.textDecoration = value.toLowerCase() as RichTextStyle["textDecoration"];
        break;
    }
  }
  const font = attributes["data-font"];
  if (isFontKey(font)) style.fontFamily = font;
  if (attributes["data-size-tablet"]) style.fontSizeTablet = attributes["data-size-tablet"];
  if (attributes["data-size-mobile"]) style.fontSizeMobile = attributes["data-size-mobile"];
  return cleanRichTextStyle(style);
}

function classFromAttributes(attributes: Record<string, string>): string | undefined {
  const tokens = (attributes.class ?? "").split(/\s+/).filter((token) => CLASS_TOKEN.test(token));
  return tokens.length > 0 ? tokens.join(" ") : undefined;
}

/**
 * Parses stored rich text into a tree. Tolerant of hand-written or truncated
 * markup: unknown tags stay text, stray closing tags are dropped and unclosed
 * tags end at the end of the string.
 */
export function parseRichTextTree(value: string | null | undefined): RichTextNode[] {
  if (!value) return [];
  if (!hasRichText(value)) return [value];

  const root: RichTextElement = { tag: "span", children: [] };
  const stack: RichTextElement[] = [root];
  const top = () => stack[stack.length - 1]!;
  const pushText = (text: string) => {
    if (!text) return;
    const children = top().children;
    const last = children[children.length - 1];
    if (typeof last === "string") children[children.length - 1] = last + text;
    else children.push(text);
  };

  TAG_PATTERN.lastIndex = 0;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TAG_PATTERN.exec(value)) !== null) {
    pushText(value.slice(lastIndex, match.index));
    lastIndex = TAG_PATTERN.lastIndex;
    const closing = match[1] === "/";
    const tag = TAG_ALIASES[match[2]!.toLowerCase()]!;

    if (tag === "br") {
      if (!closing) top().children.push({ tag: "br" });
      continue;
    }
    if (closing) {
      for (let depth = stack.length - 1; depth > 0; depth--) {
        if (stack[depth]!.tag === tag) {
          stack.length = depth;
          break;
        }
      }
      continue;
    }
    const element: RichTextElement = { tag, children: [] };
    if (tag === "span") {
      const attributes = parseAttributes(match[3] ?? "");
      const style = richTextStyleFromAttributes(attributes);
      const className = classFromAttributes(attributes);
      if (style) element.style = style;
      if (className) element.className = className;
    }
    top().children.push(element);
    stack.push(element);
  }
  pushText(value.slice(lastIndex));
  return root.children;
}

function styleToCss(style: RichTextStyle): string {
  const rules: string[] = [];
  if (style.color) rules.push(`color:${style.color}`);
  if (style.background) rules.push(`background-color:${style.background}`);
  if (style.fontSize) rules.push(`font-size:${style.fontSize}`);
  if (style.fontWeight) rules.push(`font-weight:${style.fontWeight}`);
  if (style.italic) rules.push("font-style:italic");
  if (style.letterSpacing) rules.push(`letter-spacing:${style.letterSpacing}`);
  if (style.lineHeight) rules.push(`line-height:${style.lineHeight}`);
  if (style.textTransform) rules.push(`text-transform:${style.textTransform}`);
  if (style.textDecoration) rules.push(`text-decoration:${style.textDecoration}`);
  return rules.join(";");
}

/** Attributes of a stored `<span>`, shared by the serializer and the editor. */
export function richTextSpanAttributeMap(style: RichTextStyle | undefined, className?: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  if (className) attributes.class = className;
  if (style) {
    const css = styleToCss(style);
    if (css) attributes.style = css;
    if (style.fontFamily) attributes["data-font"] = style.fontFamily;
    if (style.fontSizeTablet) attributes["data-size-tablet"] = style.fontSizeTablet;
    if (style.fontSizeMobile) attributes["data-size-mobile"] = style.fontSizeMobile;
  }
  return attributes;
}

/** Attribute string for a stored `<span>`; values are already validated, so no escaping is needed. */
export function richTextSpanAttributes(style: RichTextStyle | undefined, className?: string): string {
  const parts = Object.entries(richTextSpanAttributeMap(style, className)).map(([name, value]) => `${name}="${value}"`);
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

function isEmptyElement(node: RichTextElement): boolean {
  return node.children.length === 0;
}

/** Serializes a tree back to the stored format, dropping empty and no-op elements. */
export function serializeRichTextTree(nodes: RichTextNode[]): string {
  let out = "";
  for (const node of nodes) {
    if (typeof node === "string") {
      out += node;
      continue;
    }
    if (node.tag === "br") {
      out += "<br>";
      continue;
    }
    if (isEmptyElement(node)) continue;
    const inner = serializeRichTextTree(node.children);
    if (!inner) continue;
    if (node.tag === "span") {
      const attributes = richTextSpanAttributes(node.style, node.className);
      out += attributes ? `<span${attributes}>${inner}</span>` : inner;
      continue;
    }
    out += `<${node.tag}>${inner}</${node.tag}>`;
  }
  return out;
}

/** Normalizes stored rich text: unsafe attributes and values are dropped, tags balanced. */
export function sanitizeRichText(value: string): string {
  if (!hasRichText(value)) return value;
  return serializeRichTextTree(parseRichTextTree(value));
}

function plainText(nodes: RichTextNode[], lineBreak: string): string {
  let out = "";
  for (const node of nodes) {
    if (typeof node === "string") out += node;
    else if (node.tag === "br") out += lineBreak;
    else out += plainText(node.children, lineBreak);
  }
  return out;
}

/** Visible text without any tags, for titles, attributes, SEO and length limits. */
export function toPlainText(value: string | null | undefined, lineBreak = " "): string {
  if (!value) return "";
  if (!hasRichText(value)) return value;
  return plainText(parseRichTextTree(value), lineBreak);
}

/** Every font key referenced by inline styles in the string. */
export function richTextFonts(value: string | null | undefined, into: Set<FontKey> = new Set()): Set<FontKey> {
  if (!value || !value.includes("data-font")) return into;
  const visit = (nodes: RichTextNode[]) => {
    for (const node of nodes) {
      if (typeof node === "string" || node.tag === "br") continue;
      if (node.style?.fontFamily) into.add(node.style.fontFamily);
      visit(node.children);
    }
  };
  visit(parseRichTextTree(value));
  return into;
}

/** Copy of a content value with every string reduced to its visible text, for SEO and AI analysis. */
export function toPlainTextDeep<T>(value: T): T {
  if (typeof value === "string") return toPlainText(value) as T;
  if (Array.isArray(value)) return value.map((item) => toPlainTextDeep(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toPlainTextDeep(item)])) as T;
  }
  return value;
}
