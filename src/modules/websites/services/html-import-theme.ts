/**
 * Derives the builder theme (colours, fonts, corner radius) from an imported site's CSS, so builder
 * sections added or converted later match the imported brand.
 */
import { FONT_KEYS, type ThemeSettings } from "../types/site-content.types.js";
import { parseCss, splitSelectorList, type CssNode } from "./html-import-css.js";

type Rule = { selectors: string[]; decls: Map<string, string> };

export type ThemePatch = {
  colors?: Partial<ThemeSettings["colors"]>;
  fonts?: Partial<ThemeSettings["fonts"]>;
  radius?: ThemeSettings["radius"];
};

const NAMED: Record<string, string> = { white: "#ffffff", black: "#000000" };

function flattenRules(nodes: CssNode[], out: Rule[] = []): Rule[] {
  for (const node of nodes) {
    if (node.kind === "rule") {
      const decls = new Map<string, string>();
      for (const part of node.body.split(";")) {
        const idx = part.indexOf(":");
        if (idx < 0) continue;
        decls.set(part.slice(0, idx).trim().toLowerCase(), part.slice(idx + 1).replace(/!important/i, "").trim());
      }
      out.push({ selectors: splitSelectorList(node.selector), decls });
    } else if (node.children && node.name !== "media" && node.name !== "container") {
      // Base styles only: responsive overrides don't define the brand.
      flattenRules(node.children, out);
    }
  }
  return out;
}

function hex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

/** First colour in a value (#hex, rgb[a], white/black); null for transparent or weak alpha. */
export function firstColor(value: string): string | null {
  const hex = /#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/i.exec(value);
  const rgb = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)/i.exec(value);
  const hexIndex = hex?.index ?? Infinity;
  const rgbIndex = rgb?.index ?? Infinity;
  if (hex && hexIndex <= rgbIndex) {
    let h = hex[1]!.toLowerCase();
    if (h.length <= 4) h = h.slice(0, 3).split("").map((c) => c + c).join("");
    if (hex[1]!.length === 8 && parseInt(hex[1]!.slice(6), 16) < 128) return null;
    return `#${h.slice(0, 6)}`;
  }
  if (rgb) {
    const alpha = rgb[4] ? (rgb[4].endsWith("%") ? parseFloat(rgb[4]) / 100 : parseFloat(rgb[4])) : 1;
    if (alpha < 0.5) return null;
    return `#${hex2(+rgb[1]!)}${hex2(+rgb[2]!)}${hex2(+rgb[3]!)}`;
  }
  const named = /\b(white|black)\b/i.exec(value);
  return named ? NAMED[named[1]!.toLowerCase()]! : null;
}

function hsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return { h: (h * 60 + 360) % 360, s, l };
}

const isBrand = (hex: string) => {
  const { s, l } = hsl(hex);
  return s > 0.25 && l > 0.12 && l < 0.88;
};

function hueDistance(a: string, b: string): number {
  const d = Math.abs(hsl(a).h - hsl(b).h);
  return Math.min(d, 360 - d);
}

function mostFrequent(colors: string[], accept: (hex: string) => boolean): string[] {
  const counts = new Map<string, number>();
  for (const color of colors) if (accept(color)) counts.set(color, (counts.get(color) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color);
}

const GENERIC_FAMILIES = new Set(["sans-serif", "serif", "monospace", "system-ui", "-apple-system", "blinkmacsystemfont", "segoe ui", "ui-sans-serif", "ui-serif", "helvetica", "arial", "helvetica neue", "roboto flex"]);
const FONT_ALIASES: Record<string, string> = { "ibm plex sans": "plex-sans", "source serif pro": "source-serif-4", "source serif 4": "source-serif-4", "dm sans": "dm-sans" };

/** "Nunito Sans", "Segoe UI", sans-serif → "nunito"; null when no family maps to a builder font. */
export function fontKeyFor(familyList: string): ThemeSettings["fonts"]["body"] | null {
  const keys = FONT_KEYS as readonly string[];
  for (const raw of familyList.split(",")) {
    const name = raw.trim().replace(/^["']|["']$/g, "").toLowerCase();
    if (!name || name.startsWith("var(")) continue;
    if (FONT_ALIASES[name]) return FONT_ALIASES[name] as ThemeSettings["fonts"]["body"];
    if (GENERIC_FAMILIES.has(name)) {
      if (name === "serif" || name === "ui-serif") return "serif";
      if (name === "monospace") return "mono";
      continue;
    }
    const slug = name.replace(/\s+/g, "-");
    if (keys.includes(slug)) return slug as ThemeSettings["fonts"]["body"];
    const first = slug.split("-")[0]!;
    if (keys.includes(first)) return first as ThemeSettings["fonts"]["body"];
  }
  return null;
}

/** Family list from `font-family` or the `font` shorthand (`600 15px/1 "Poppins", sans-serif`). */
function familyFrom(decls: Map<string, string>): string | null {
  const family = decls.get("font-family");
  if (family) return family;
  const font = decls.get("font");
  if (!font) return null;
  const match = /(?:^|\s)[\d.]+(?:px|rem|em|%|pt)(?:\s*\/\s*[\d.]+\w*)?\s+(.+)$/.exec(font);
  return match?.[1] ?? null;
}

function radiusFor(value: string | undefined): ThemeSettings["radius"] | undefined {
  if (!value) return undefined;
  const px = /([\d.]+)(px|rem|em)?/.exec(value);
  if (!px) return undefined;
  const n = parseFloat(px[1]!) * (px[2] === "rem" || px[2] === "em" ? 16 : 1);
  if (n === 0) return "none";
  if (n <= 4) return "sm";
  if (n <= 10) return "md";
  return "lg";
}

export function extractThemeFromCss(css: string): ThemePatch {
  const rules = flattenRules(parseCss(css));
  const isRootSelector = (selector: string) => /^(?::root|html|body)$/i.test(selector.trim());

  // Custom properties declared on the document root, resolved recursively.
  const vars = new Map<string, string>();
  for (const rule of rules) {
    if (!rule.selectors.some(isRootSelector)) continue;
    for (const [prop, value] of rule.decls) if (prop.startsWith("--")) vars.set(prop, value);
  }
  const resolve = (value: string, depth = 0): string =>
    depth > 6
      ? value
      : value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g, (_m, name: string, fallback?: string) =>
          resolve(vars.get(name) ?? fallback ?? "", depth + 1),
        );
  const decl = (rule: Rule, prop: string) => {
    const value = rule.decls.get(prop);
    return value === undefined ? undefined : resolve(value);
  };

  const rootRules = rules.filter((rule) => rule.selectors.some((s) => /^(?:html|body)$/i.test(s.trim())));
  const lastOf = (list: Rule[], props: string[]) => {
    let found: string | undefined;
    for (const rule of list) for (const prop of props) {
      const value = decl(rule, prop);
      if (value) found = value;
    }
    return found;
  };

  const background = firstColor(lastOf(rootRules, ["background-color", "background"]) ?? "") ?? undefined;
  const text = firstColor(lastOf(rootRules, ["color"]) ?? "") ?? undefined;

  const buttonRules = rules.filter((rule) => rule.selectors.some((s) => /btn|button|\.cta\b|primary/i.test(s)));
  const buttonBgs = buttonRules
    .map((rule) => firstColor(decl(rule, "background-color") ?? decl(rule, "background") ?? ""))
    .filter((c): c is string => Boolean(c));
  const allColors = rules.flatMap((rule) =>
    [...rule.decls.entries()]
      .filter(([prop]) => !prop.startsWith("--") && /color|background|border|fill|stroke/.test(prop))
      .map(([, value]) => firstColor(resolve(value)))
      .filter((c): c is string => Boolean(c)),
  );

  const primary = mostFrequent(buttonBgs, isBrand)[0] ?? mostFrequent(allColors, isBrand)[0];
  const secondary = primary
    ? mostFrequent([...buttonBgs, ...allColors], (c) => isBrand(c) && hueDistance(c, primary) > 30)[0]
    : undefined;
  const lightBgs = rules
    .map((rule) => firstColor(decl(rule, "background-color") ?? decl(rule, "background") ?? ""))
    .filter((c): c is string => Boolean(c));
  const surface = mostFrequent(lightBgs, (c) => hsl(c).l > 0.9 && hsl(c).l < 0.995 && c !== background)[0];
  const textColors = rules.map((rule) => firstColor(decl(rule, "color") ?? "")).filter((c): c is string => Boolean(c));
  const muted = mostFrequent(textColors, (c) => {
    const { s, l } = hsl(c);
    return s < 0.3 && l > 0.3 && l < 0.65 && c !== text;
  })[0];

  const headingRules = rules.filter((rule) => rule.selectors.some((s) => /^(?:h1|h2|h3)$/i.test(s.trim())));
  const headingFamily = [...headingRules].reverse().map((rule) => familyFrom(rule.decls)).find(Boolean);
  const bodyFamily = [...rootRules].reverse().map((rule) => familyFrom(rule.decls)).find(Boolean);
  const heading = headingFamily ? fontKeyFor(resolve(headingFamily)) : null;
  const body = bodyFamily ? fontKeyFor(resolve(bodyFamily)) : null;

  const radius = radiusFor(buttonRules.map((rule) => decl(rule, "border-radius")).find(Boolean));

  const colors: Partial<ThemeSettings["colors"]> = {};
  if (primary) colors.primary = primary;
  if (secondary) colors.secondary = secondary;
  if (background) colors.background = background;
  if (surface) colors.surface = surface;
  if (text) colors.text = text;
  if (muted) colors.muted = muted;
  const fonts: Partial<ThemeSettings["fonts"]> = {};
  if (heading) fonts.heading = heading;
  if (body) fonts.body = body;
  return {
    ...(Object.keys(colors).length ? { colors } : {}),
    ...(Object.keys(fonts).length ? { fonts } : {}),
    ...(radius ? { radius } : {}),
  };
}

export function applyThemePatch(theme: ThemeSettings, patch: ThemePatch): ThemeSettings {
  return {
    ...theme,
    colors: { ...theme.colors, ...patch.colors },
    fonts: { ...theme.fonts, ...patch.fonts },
    ...(patch.radius ? { radius: patch.radius } : {}),
  };
}
