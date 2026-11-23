import type * as cheerio from "cheerio";
import { SAFE_IMAGE_URL } from "../validators/site-content.validator.js";

/** Where the imported site's favicon is: a file inside the package, or a URL kept as is. */
export type FaviconRef = { packagePath: string } | { url: string };

/** SVG favicons are kept inline (the media library doesn't store SVG); bigger ones are skipped. */
const MAX_INLINE_SVG_BYTES = 32 * 1024;

const STORABLE = /\.(png|jpe?g|gif|webp|avif|ico)$/i;

function relTokens(value: string | undefined): string[] {
  return (value ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

/** Largest edge from a `sizes` attribute ("32x32", "16x16 32x32", "any"). */
function sizeOf(value: string | undefined): number {
  const sizes = (value ?? "").toLowerCase();
  if (sizes.includes("any")) return 1024;
  return Math.max(0, ...[...sizes.matchAll(/(\d+)x(\d+)/g)].map((match) => Number(match[1])));
}

/**
 * The best favicon declared in the page head: `<link rel="icon">` (bigger first, `shortcut icon`
 * included), then `apple-touch-icon`, then a `favicon.ico` at the package root.
 */
export function findFavicon(
  $: cheerio.CheerioAPI,
  htmlPath: string,
  files: ReadonlyMap<string, Buffer>,
  resolve: (from: string, href: string) => string | null,
): FaviconRef | null {
  const candidates: { href: string; rank: number }[] = [];
  $("link[rel][href]").each((index, raw) => {
    const node = $(raw);
    const rel = relTokens(node.attr("rel"));
    const href = (node.attr("href") ?? "").trim();
    if (!href) return;
    const isIcon = rel.includes("icon");
    const isTouch = rel.includes("apple-touch-icon") || rel.includes("apple-touch-icon-precomposed");
    if (!isIcon && !isTouch) return;
    // Plain icons beat touch icons; then the larger declared size; then document order.
    candidates.push({ href, rank: (isIcon ? 1_000_000 : 0) + sizeOf(node.attr("sizes")) * 10 - index / 1000 });
  });
  candidates.sort((a, b) => b.rank - a.rank);

  for (const { href } of candidates) {
    if (/^https?:\/\//i.test(href) || href.startsWith("//")) return { url: href.startsWith("//") ? `https:${href}` : href };
    if (href.startsWith("data:")) {
      if (SAFE_IMAGE_URL.test(href)) return { url: href };
      continue;
    }
    const packagePath = resolve(htmlPath, href);
    if (packagePath && files.has(packagePath)) return { packagePath };
  }
  return files.has("favicon.ico") ? { packagePath: "favicon.ico" } : null;
}

/** A package file the media library can store as the favicon (not SVG). */
export function isStorableFavicon(packagePath: string): boolean {
  return STORABLE.test(packagePath);
}

/** An SVG favicon as a data URI, or null when it isn't a plain, small SVG. */
export function svgFaviconDataUri(packagePath: string, buffer: Buffer | undefined): string | null {
  if (!buffer || !/\.svg$/i.test(packagePath) || buffer.length > MAX_INLINE_SVG_BYTES) return null;
  const text = buffer.toString("utf8");
  if (!/<svg[\s>]/i.test(text) || /<script|\bon\w+\s*=|javascript:|<foreignObject/i.test(text)) return null;
  return `data:image/svg+xml;base64,${buffer.toString("base64")}`;
}
