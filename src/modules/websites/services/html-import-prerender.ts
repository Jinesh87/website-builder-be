/**
 * Runs each uploaded page in headless Chrome so content built by the page's own JavaScript
 * (product grids, carousels, templated lists, inline SVG art) is captured before import.
 *
 * Safety: Chrome runs with its sandbox ON; every request is intercepted and only files from the
 * upload (served from a fake origin) plus a short allowlist of public CDNs are fetched — no access
 * to the server's network. Failures fall back to the raw HTML.
 */
import path from "node:path";
import puppeteer, { type Browser, type HTTPRequest } from "puppeteer";
import { logger } from "../../../config/logger.js";
import { resolveChromeExecutable } from "../../shop/utils/html-to-pdf.js";

export const PRERENDER_ORIGIN = "https://import.invalid/";

/** Public CDNs the page may load scripts/styles/fonts from while rendering. */
const CDN_HOSTS = new Set([
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "cdn.jsdelivr.net",
  "cdnjs.cloudflare.com",
  "unpkg.com",
  "code.jquery.com",
  "ajax.googleapis.com",
  "stackpath.bootstrapcdn.com",
  "maxcdn.bootstrapcdn.com",
  "use.fontawesome.com",
  "cdn.tailwindcss.com",
]);

const PAGE_TIMEOUT_MS = 15_000;
const SETTLE_MS = 400;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
};

/**
 * Injected before any page script: makes scroll-reveal / lazy patterns render their final state,
 * and blocks popups/navigation side effects.
 */
const BOOTSTRAP_SCRIPT = `(() => {
  const now = () => (typeof performance !== "undefined" ? performance.now() : 0);
  class ImportIntersectionObserver {
    constructor(callback) { this.callback = callback; this.root = null; this.rootMargin = "0px"; this.thresholds = [0]; }
    observe(target) {
      const rect = target.getBoundingClientRect();
      const entry = { target, isIntersecting: true, intersectionRatio: 1, boundingClientRect: rect,
        intersectionRect: rect, rootBounds: null, time: now() };
      setTimeout(() => { try { this.callback([entry], this); } catch (e) {} }, 0);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  window.IntersectionObserver = ImportIntersectionObserver;
  window.open = () => null;
  window.alert = () => undefined;
  window.confirm = () => false;
  window.prompt = () => null;
})();`;

export type PrerenderResult = {
  /** Rendered HTML per package path (only for pages that rendered successfully). */
  html: Map<string, string>;
  /** Stylesheets loaded from CDNs, keyed by absolute URL. */
  externalCss: Map<string, string>;
};

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.posix.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function packagePathFromUrl(url: string): string | null {
  if (!url.startsWith(PRERENDER_ORIGIN)) return null;
  const withoutQuery = url.slice(PRERENDER_ORIGIN.length).split(/[?#]/)[0] ?? "";
  try {
    return decodeURIComponent(withoutQuery).toLowerCase();
  } catch {
    return withoutQuery.toLowerCase();
  }
}

function isAllowedCdn(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && CDN_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

async function handleRequest(request: HTTPRequest, files: Map<string, Buffer>, entryUrl: string): Promise<void> {
  const url = request.url();
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    await request.continue();
    return;
  }
  // Only the entry document may navigate the top frame.
  if (request.isNavigationRequest() && request.frame()?.parentFrame() == null && url !== entryUrl) {
    await request.abort("blockedbyclient");
    return;
  }
  const packagePath = packagePathFromUrl(url);
  if (packagePath !== null) {
    const body = files.get(packagePath);
    if (!body) {
      await request.respond({ status: 404, contentType: "text/plain", body: "" });
      return;
    }
    await request.respond({ status: 200, contentType: contentTypeFor(packagePath), body });
    return;
  }
  const type = request.resourceType();
  if (isAllowedCdn(url) && (type === "script" || type === "stylesheet" || type === "font")) {
    await request.continue();
    return;
  }
  await request.abort("blockedbyclient");
}

async function renderOne(
  browser: Browser,
  htmlPath: string,
  files: Map<string, Buffer>,
  externalCss: Map<string, string>,
): Promise<string> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    await page.evaluateOnNewDocument(BOOTSTRAP_SCRIPT);
    const entryUrl = `${PRERENDER_ORIGIN}${htmlPath.split("/").map(encodeURIComponent).join("/")}`;
    page.on("request", (request) => {
      handleRequest(request, files, entryUrl).catch(() => undefined);
    });
    page.on("dialog", (dialog) => {
      dialog.dismiss().catch(() => undefined);
    });
    page.on("response", (response) => {
      const url = response.url();
      if (response.request().resourceType() !== "stylesheet" || !isAllowedCdn(url)) return;
      if (new URL(url).hostname === "fonts.googleapis.com") return; // kept as @import
      response
        .text()
        .then((text) => externalCss.set(url, text))
        .catch(() => undefined);
    });

    await page.goto(entryUrl, { waitUntil: "load", timeout: PAGE_TIMEOUT_MS });
    await page.waitForNetworkIdle({ idleTime: 300, timeout: 3_000 }).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    // Evaluated in the page (string form: the backend tsconfig has no DOM lib).
    const snapshot = await page.evaluate("'<!doctype html>\\n' + document.documentElement.outerHTML");
    return String(snapshot);
  } finally {
    await page.close().catch(() => undefined);
  }
}

/** Renders every HTML page in the package. Never throws; missing entries mean "use raw HTML". */
export async function prerenderPages(htmlPaths: string[], files: Map<string, Buffer>): Promise<PrerenderResult> {
  const result: PrerenderResult = { html: new Map(), externalCss: new Map() };
  if (process.env.HTML_IMPORT_PRERENDER === "false" || htmlPaths.length === 0) return result;

  let browser: Browser | null = null;
  try {
    const executablePath = resolveChromeExecutable();
    browser = await puppeteer.launch({
      ...(executablePath ? { executablePath } : {}),
      headless: true,
      // Sandbox stays ON: this browser executes uploaded, untrusted JavaScript.
      args: ["--disable-dev-shm-usage", "--disable-gpu", "--mute-audio", "--no-first-run"],
    });
    for (const htmlPath of htmlPaths) {
      try {
        result.html.set(htmlPath, await renderOne(browser, htmlPath, files, result.externalCss));
      } catch (error) {
        logger.warn({ err: error, htmlPath }, "HTML import: prerender failed for page, using raw HTML");
      }
    }
  } catch (error) {
    logger.warn({ err: error }, "HTML import: headless browser unavailable, importing raw HTML (no JS)");
  } finally {
    await browser?.close().catch(() => undefined);
  }
  return result;
}
