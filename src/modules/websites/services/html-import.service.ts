import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import AdmZip from "adm-zip";
import * as cheerio from "cheerio";
import { UserRole } from "../../../common/constants/roles.js";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { PageType } from "../../../generated/prisma/client.js";
import { mediaService } from "../../media/services/media.service.js";
import type { CreateWebsiteInput, SaveDraftInput } from "../types/website.types.js";
import type { FooterData, HeaderData, Section } from "../types/site-content.types.js";
import { SAFE_IMAGE_URL } from "../validators/site-content.validator.js";
import {
  buildHtmlComponent,
  detectChrome,
  detectContentContainer,
  detectPageRoots,
  detectSections,
  type BuiltHtmlComponent,
  type ComponentImportContext,
  type El,
} from "./html-import-components.js";
import { forEachCssUrl, prepareStylesheet, rewriteCssUrls } from "./html-import-css.js";
import { prerenderPages } from "./html-import-prerender.js";
import { extractHeaderFromChrome } from "./html-import-section-mappers.js";
import { websiteService } from "./website.service.js";

const MB = 1024 * 1024;
const MAX_PACKAGE_BYTES = 50 * MB;
const MAX_FILES = 300;
const MAX_HTML_BYTES = 2 * MB;
const MAX_PAGES = 20;
const MAX_CSS_BYTES = 2 * MB;
const MAX_SAVED_COMPONENTS = 40;

type PackageFile = { path: string; buffer: Buffer };
type ImportFields = CreateWebsiteInput;
/** Lower-cased package path → file contents. */
type FileMap = Map<string, Buffer>;

// ---------------------------------------------------------------------------
// Package handling
// ---------------------------------------------------------------------------

function normalizePath(raw: string): string {
  return raw.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

function isSafeRelativePath(raw: string): boolean {
  const normalized = normalizePath(raw);
  if (!normalized || normalized.includes("\0")) return false;
  return !normalized.split("/").some((part) => part === "..");
}

function dirnameOf(filePath: string): string {
  const normalized = normalizePath(filePath);
  const idx = normalized.lastIndexOf("/");
  return idx < 0 ? "" : normalized.slice(0, idx);
}

/** Resolves a reference inside the package; null for external/data/fragment URLs. */
function resolveRelative(fromFile: string, href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith("//")) return null;
  let clean = trimmed.split("?")[0]!.split("#")[0]!;
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // keep as-is
  }
  if (!clean) return null;
  const joined = clean.startsWith("/")
    ? normalizePath(clean)
    : normalizePath(path.posix.join(dirnameOf(fromFile) || ".", clean));
  return isSafeRelativePath(joined) ? joined.toLowerCase() : null;
}

function unpackPackage(fileName: string, buffer: Buffer): PackageFile[] {
  if (buffer.length > MAX_PACKAGE_BYTES) {
    throw new AppError(413, `Import package must be under ${MAX_PACKAGE_BYTES / MB} MB.`, "IMPORT_TOO_LARGE");
  }
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    return [{ path: "index.html", buffer }];
  }
  if (!lower.endsWith(".zip")) {
    throw new AppError(400, "Upload a .html file or a .zip folder.", "IMPORT_INVALID_TYPE");
  }

  let zip: AdmZip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new AppError(400, "Could not read that ZIP file.", "IMPORT_ZIP_INVALID");
  }

  const files: PackageFile[] = [];
  let totalBytes = 0;
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const entryPath = normalizePath(entry.entryName);
    if (!isSafeRelativePath(entryPath)) continue;
    if (/^__macosx\//i.test(entryPath) || entryPath.split("/").some((part) => part.startsWith("."))) continue;
    // Zip-bomb guard: check the declared size before inflating.
    totalBytes += entry.header.size;
    if (totalBytes > MAX_PACKAGE_BYTES * 4) {
      throw new AppError(413, "The ZIP expands to too much data.", "IMPORT_TOO_LARGE");
    }
    const data = entry.getData();
    if (!data || data.length === 0) continue;
    files.push({ path: entryPath, buffer: data });
    if (files.length > MAX_FILES) {
      throw new AppError(400, `ZIP can contain at most ${MAX_FILES} files.`, "IMPORT_TOO_MANY_FILES");
    }
  }
  if (files.length === 0) throw new AppError(400, "The ZIP file is empty.", "IMPORT_ZIP_EMPTY");
  return stripCommonFolder(files);
}

/** "my-site/index.html" → "index.html" when everything sits in one top folder. */
function stripCommonFolder(files: PackageFile[]): PackageFile[] {
  const first = files[0]!.path.split("/")[0]!;
  const allNested = files.every((file) => file.path.includes("/") && file.path.split("/")[0] === first);
  if (!allNested) return files;
  return files.map((file) => ({ ...file, path: file.path.slice(first.length + 1) }));
}

function toFileMap(files: PackageFile[]): FileMap {
  const map: FileMap = new Map();
  for (const file of files) map.set(normalizePath(file.path).toLowerCase(), file.buffer);
  return map;
}

function listHtmlFiles(files: PackageFile[]): string[] {
  const htmlFiles = files
    .map((f) => normalizePath(f.path).toLowerCase())
    .filter((p) => /\.html?$/i.test(p))
    .sort((a, b) => {
      const rank = (p: string) => (/^index\.html?$/.test(p) ? 0 : /(^|\/)index\.html?$/.test(p) ? 1 : 2);
      return rank(a) - rank(b) || a.split("/").length - b.split("/").length || a.localeCompare(b);
    });
  if (htmlFiles.length === 0) {
    throw new AppError(400, "No HTML files found in the upload.", "IMPORT_NO_HTML");
  }
  return htmlFiles.slice(0, MAX_PAGES);
}

// ---------------------------------------------------------------------------
// Pages & links
// ---------------------------------------------------------------------------

type PagePlan = { key: string; name: string; slug: string; pageType: PageType };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function titleCase(value: string): string {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim().slice(0, 80) || "Page";
}

function isHomeId(id: string): boolean {
  return /^(home|index|main|start)$/i.test(id);
}

function planForFile(filePath: string): PagePlan {
  const base = path.posix.basename(filePath).replace(/\.html?$/i, "") || "page";
  const dir = dirnameOf(filePath);
  if (/^index$/i.test(base) && !dir) return { key: filePath, name: "Home", slug: "/", pageType: PageType.HOME };
  const slug = `/${slugify([dir, /^index$/i.test(base) ? "" : base].filter(Boolean).join("-")) || "page"}`;
  return { key: filePath, name: titleCase(/^index$/i.test(base) ? path.posix.basename(dir) : base), slug, pageType: PageType.CUSTOM };
}

function planForView(viewId: string): PagePlan {
  if (isHomeId(viewId)) return { key: viewId, name: "Home", slug: "/", pageType: PageType.HOME };
  return { key: viewId, name: titleCase(viewId), slug: `/${slugify(viewId) || "page"}`, pageType: PageType.CUSTOM };
}

function viewIdOf(el: El): string {
  return (el.attribs?.["data-wb-page"] || el.attribs?.["data-view"] || "").trim().toLowerCase();
}

/** Page path for links: SPA view ids and package HTML files both map to builder slugs. */
type LinkTable = { views: Map<string, string>; files: Map<string, string> };

function makeLinkRewriter(table: LinkTable, htmlPath: string): (href: string) => string {
  return (href) => {
    const trimmed = href.trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith("#")) {
      const id = trimmed.slice(1).toLowerCase();
      return table.views.get(id) ?? trimmed;
    }
    const resolved = resolveRelative(htmlPath, trimmed);
    if (!resolved) return trimmed;
    const fileSlug = table.files.get(resolved);
    if (!fileSlug) return trimmed;
    const fragment = trimmed.includes("#") ? trimmed.slice(trimmed.indexOf("#") + 1).toLowerCase() : "";
    if (fragment && table.views.has(fragment)) return table.views.get(fragment)!;
    return fragment ? `${fileSlug}#${fragment}` : fileSlug;
  };
}

// ---------------------------------------------------------------------------
// Assets & CSS
// ---------------------------------------------------------------------------

type StyleSource = { css: string; base: string };

/** Page stylesheets in cascade (document) order, each with the base its url()s resolve against. */
function collectStyleSources(
  $: cheerio.CheerioAPI,
  htmlPath: string,
  files: FileMap,
  externalCss: Map<string, string>,
): { sources: StyleSource[]; fontImports: string[] } {
  const sources: StyleSource[] = [];
  const fontImports: string[] = [];
  $("style, link[rel~='stylesheet']").each((_, raw) => {
    const el = raw as El;
    if ((el.name || "").toLowerCase() === "style") {
      sources.push({ css: $(raw).html() || "", base: htmlPath });
      return;
    }
    const href = ($(raw).attr("href") || "").trim();
    if (!href) return;
    if (/^https?:\/\//i.test(href) || href.startsWith("//")) {
      const absolute = href.startsWith("//") ? `https:${href}` : href;
      const host = (() => {
        try {
          return new URL(absolute).hostname;
        } catch {
          return "";
        }
      })();
      if (host === "fonts.googleapis.com" || host === "fonts.bunny.net" || host === "use.typekit.net" || host === "api.fontshare.com") {
        fontImports.push(`@import url("${absolute.replace(/"/g, "%22")}");`);
        return;
      }
      const captured = externalCss.get(absolute);
      if (captured) sources.push({ css: captured, base: absolute });
      return;
    }
    const resolved = resolveRelative(htmlPath, href);
    const buffer = resolved ? files.get(resolved) : undefined;
    if (resolved && buffer && buffer.length <= MAX_CSS_BYTES) sources.push({ css: buffer.toString("utf8"), base: resolved });
  });
  return { sources, fontImports };
}

/** Resolves a CSS url() against its stylesheet (package path or absolute CDN URL). */
function resolveCssUrl(base: string, raw: string): { packagePath?: string; absolute?: string } {
  if (/^https?:\/\//i.test(base)) {
    try {
      return { absolute: new URL(raw, base).toString() };
    } catch {
      return {};
    }
  }
  if (/^https?:\/\//i.test(raw)) return { absolute: raw };
  const resolved = resolveRelative(base, raw);
  return resolved ? { packagePath: resolved } : {};
}

function collectAssetRefs($: cheerio.CheerioAPI, htmlPath: string, styles: StyleSource[], needed: Set<string>): void {
  const add = (from: string, raw: string | undefined) => {
    if (!raw) return;
    const resolved = resolveRelative(from, raw);
    if (resolved) needed.add(resolved);
  };
  $("[src], [poster], [srcset], image[href], [xlink\\:href]").each((_, raw) => {
    const node = $(raw);
    add(htmlPath, node.attr("src"));
    add(htmlPath, node.attr("poster"));
    add(htmlPath, node.attr("xlink:href"));
    if (((raw as El).name || "").toLowerCase() === "image") add(htmlPath, node.attr("href"));
    for (const candidate of (node.attr("srcset") || "").split(/,\s+/)) add(htmlPath, candidate.trim().split(/\s+/)[0]);
  });
  $("[style*='url(']").each((_, raw) => forEachCssUrl($(raw).attr("style") || "", (url) => add(htmlPath, url)));
  for (const style of styles) {
    if (/^https?:\/\//i.test(style.base)) continue;
    forEachCssUrl(style.css, (url) => add(style.base, url));
  }
}

const UPLOADABLE = /\.(png|jpe?g|gif|webp|avif|svg|ico|bmp|mp4|webm|mov|m4v)$/i;

async function uploadAssets(params: {
  needed: Set<string>;
  files: FileMap;
  clientId: string;
  websiteId: string;
  userId: string | null;
}): Promise<Map<string, string>> {
  const uploaded = new Map<string, string>();
  for (const key of params.needed) {
    const buffer = params.files.get(key);
    if (!buffer || !UPLOADABLE.test(key)) continue;
    try {
      const view = await mediaService.storeImportAsset({
        clientId: params.clientId,
        websiteId: params.websiteId,
        userId: params.userId,
        buffer,
        fileName: path.posix.basename(key),
      });
      uploaded.set(key, view.url);
    } catch (error) {
      logger.warn({ err: error, asset: key }, "HTML import: asset skipped");
    }
  }
  return uploaded;
}

function makeAssetRewriter(uploaded: Map<string, string>, base: string): (raw: string) => string {
  return (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return "";
    const resolved = resolveRelative(base, trimmed);
    if (resolved) return uploaded.get(resolved) ?? "";
    if (/^https?:\/\//i.test(trimmed) || SAFE_IMAGE_URL.test(trimmed)) return trimmed;
    if (trimmed.startsWith("//")) return `https:${trimmed}`;
    return "";
  };
}

function buildStylesheetText(
  sources: StyleSource[],
  fontImports: string[],
  uploaded: Map<string, string>,
): string {
  const chunks = sources.map((source) =>
    rewriteCssUrls(source.css, (raw) => {
      if (raw.startsWith("data:")) return SAFE_IMAGE_URL.test(raw) || /^data:font\//i.test(raw) ? raw : null;
      const target = resolveCssUrl(source.base, raw);
      if (target.absolute) return target.absolute.startsWith("https://") ? target.absolute : null;
      if (target.packagePath) return uploaded.get(target.packagePath) ?? null;
      return null;
    }),
  );
  const joined = [...fontImports, ...chunks].join("\n");
  return joined.length > MAX_CSS_BYTES * 2 ? joined.slice(0, MAX_CSS_BYTES * 2) : joined;
}

// ---------------------------------------------------------------------------
// Page building
// ---------------------------------------------------------------------------

type BuiltPage = PagePlan & { title: string; sections: Section[]; components: BuiltHtmlComponent[] };

type LoadedDocument = {
  htmlPath: string;
  $: cheerio.CheerioAPI;
  styles: StyleSource[];
  fontImports: string[];
  pageRoots: El[];
};

function loadDocument(htmlPath: string, html: string, files: FileMap, externalCss: Map<string, string>): LoadedDocument {
  if (Buffer.byteLength(html) > MAX_HTML_BYTES * 2) {
    throw new AppError(413, `HTML file too large: ${htmlPath}`, "IMPORT_HTML_TOO_LARGE");
  }
  const $ = cheerio.load(html);
  const { sources, fontImports } = collectStyleSources($, htmlPath, files, externalCss);
  return { htmlPath, $, styles: sources, fontImports, pageRoots: detectPageRoots($) };
}

function buildDocumentPages(
  doc: LoadedDocument,
  ctx: Omit<ComponentImportContext, "rewriteLink" | "rewriteAsset">,
  uploaded: Map<string, string>,
  links: LinkTable,
  withChrome: boolean,
): { pages: BuiltPage[]; header: BuiltHtmlComponent | null; footer: BuiltHtmlComponent | null } {
  const { $, htmlPath } = doc;
  const componentCtx: ComponentImportContext = {
    ...ctx,
    rewriteAsset: makeAssetRewriter(uploaded, htmlPath),
    rewriteLink: makeLinkRewriter(links, htmlPath),
  };
  const docTitle = ($("title").first().text() || "").trim().slice(0, 160);

  const container = detectContentContainer($, doc.pageRoots);
  const chrome = detectChrome($, container);
  const chromeSet = new Set<El>([...chrome.header, ...chrome.footer]);

  const header = withChrome
    ? buildHtmlComponent($, chrome.header, componentCtx, { label: htmlPath, fallbackName: "Site header", chrome: "header" })
    : null;
  const footer = withChrome
    ? buildHtmlComponent($, chrome.footer, componentCtx, { label: htmlPath, fallbackName: "Site footer", chrome: "footer" })
    : null;

  const roots: { plan: PagePlan; root: El }[] =
    doc.pageRoots.length > 0
      ? doc.pageRoots.map((root) => ({ plan: planForView(viewIdOf(root) || "page"), root }))
      : [{ plan: planForFile(htmlPath), root: container }];

  const pages: BuiltPage[] = [];
  for (const { plan, root } of roots) {
    const blocks = detectSections($, root, chromeSet);
    const components = blocks
      .map((block, index) =>
        buildHtmlComponent($, [block], componentCtx, {
          label: `${htmlPath}${doc.pageRoots.length ? `#${plan.key}` : ""}`,
          fallbackName: `${plan.name} block ${index + 1}`,
        }),
      )
      .filter((component): component is BuiltHtmlComponent => component !== null);
    if (components.length === 0) continue;
    pages.push({
      ...plan,
      title: plan.pageType === PageType.HOME && docTitle ? docTitle : docTitle ? `${plan.name} | ${docTitle}` : plan.name,
      sections: components.map((component) => component.section),
      components,
    });
  }
  return { pages, header, footer };
}

function withFreshIds(section: Section): Section {
  return { ...section, id: randomUUID() };
}

export type HtmlImportPlan = {
  pages: SaveDraftInput["pages"];
  header: HeaderData;
  footer: FooterData;
  /** Content blocks to add to the component library (deduped by name). */
  components: BuiltHtmlComponent[];
};

/**
 * Pure import pipeline (no DB): prerender → parse → detect pages/sections/chrome → build sections.
 * `upload` stores the referenced package assets and returns package path → public URL.
 */
export async function planHtmlImport(params: {
  files: FileMap;
  htmlPaths: string[];
  siteName: string;
  upload: (needed: Set<string>) => Promise<Map<string, string>>;
  prerender?: boolean;
}): Promise<HtmlImportPlan> {
  const { files, htmlPaths, siteName } = params;

  // 1. Run each page's JavaScript so script-built content is part of the import.
  const rendered = params.prerender === false ? { html: new Map<string, string>(), externalCss: new Map<string, string>() } : await prerenderPages(htmlPaths, files);
  const docs = htmlPaths.map((htmlPath) =>
    loadDocument(htmlPath, rendered.html.get(htmlPath) ?? files.get(htmlPath)!.toString("utf8"), files, rendered.externalCss),
  );

  // 2. Link table: SPA views and HTML files → builder page paths.
  const links: LinkTable = { views: new Map(), files: new Map() };
  for (const doc of docs) {
    links.files.set(doc.htmlPath, planForFile(doc.htmlPath).slug);
    for (const root of doc.pageRoots) {
      const id = viewIdOf(root);
      if (id) links.views.set(id, planForView(id).slug);
    }
  }
  if (docs[0]?.pageRoots.length) links.files.set(docs[0].htmlPath, "/");

  // 3. Upload every image/video referenced by markup or CSS.
  const needed = new Set<string>();
  for (const doc of docs) collectAssetRefs(doc.$, doc.htmlPath, doc.styles, needed);
  const uploaded = await params.upload(needed);

  // 4. Every block gets its own CSS scope; keyframes share one prefix per import.
  const importId = randomBytes(3).toString("hex");
  const newScope = () => `wbi-${importId}${randomBytes(3).toString("hex")}`;

  const pages: SaveDraftInput["pages"] = [];
  const usedSlugs = new Set<string>();
  const components: BuiltHtmlComponent[] = [];
  const savedNames = new Set<string>();
  let headerComponent: BuiltHtmlComponent | null = null;
  let footerComponent: BuiltHtmlComponent | null = null;
  let headerData: HeaderData | null = null;

  for (const [index, doc] of docs.entries()) {
    const stylesheet = prepareStylesheet(buildStylesheetText(doc.styles, doc.fontImports, uploaded), `wbi-${importId}`);
    const built = buildDocumentPages(doc, { newScope, stylesheet }, uploaded, links, index === 0);
    if (index === 0) {
      headerComponent = built.header;
      footerComponent = built.footer;
      headerData = extractHeaderFromChrome(doc.$, siteName, {
        htmlPath: doc.htmlPath,
        uploaded,
        resolveUrl: (from: string, href: string) => resolveRelative(from, href),
      }) as HeaderData | null;
    }

    for (const page of built.pages) {
      for (const component of page.components) {
        const key = component.name.toLowerCase();
        if (savedNames.has(key)) continue;
        savedNames.add(key);
        components.push(component);
      }
      let { slug, pageType } = page;
      if (usedSlugs.has(slug)) {
        let i = 2;
        const base = slug === "/" ? "/page" : slug;
        while (usedSlugs.has(`${base}-${i}`)) i += 1;
        slug = `${base}-${i}`;
        pageType = PageType.CUSTOM;
      }
      usedSlugs.add(slug);
      pages.push({
        id: randomUUID(),
        name: page.name,
        slug,
        pageType,
        visible: true,
        showInNav: true,
        seoTitle: page.title.slice(0, 160),
        seoDescription: null,
        sections: page.sections,
      });
    }
  }

  if (pages.length === 0) {
    throw new AppError(400, "Could not find any visible content in the uploaded HTML.", "IMPORT_EMPTY_PAGES");
  }
  if (!pages.some((p) => p.slug === "/")) {
    pages[0]!.slug = "/";
    pages[0]!.pageType = PageType.HOME;
  }

  // 5. The original header/footer markup is kept on every page (exact look); the builder's
  // own header/footer are prefilled but hidden so they can be switched on later.
  for (const page of pages) {
    page.sections = [
      ...(headerComponent ? [withFreshIds(headerComponent.section)] : []),
      ...page.sections,
      ...(footerComponent ? [withFreshIds(footerComponent.section)] : []),
    ];
  }
  const menu = pages.map((p) => ({ label: p.name, href: p.slug }));
  const header: HeaderData = {
    ...(headerData ?? { design: "logo-left", siteName, sticky: true }),
    siteName,
    menu: headerData?.menu?.length && !headerData.menu.every((item) => item.href.startsWith("#")) ? headerData.menu : menu,
    hidden: Boolean(headerComponent),
  } as HeaderData;
  const footer: FooterData = {
    design: "simple",
    siteName,
    columns: [],
    social: [],
    copyright: `© ${new Date().getFullYear()} ${siteName}`,
    hidden: Boolean(footerComponent),
  };

  return { pages, header, footer, components };
}

/** Reads an uploaded .html/.zip into the in-memory package used by {@link planHtmlImport}. */
export function readImportPackage(fileName: string, buffer: Buffer): { files: FileMap; htmlPaths: string[] } {
  const files = unpackPackage(fileName, buffer);
  const map = toFileMap(files);
  const htmlPaths = listHtmlFiles(files);
  for (const htmlPath of htmlPaths) {
    if ((map.get(htmlPath)?.length ?? 0) > MAX_HTML_BYTES) {
      throw new AppError(413, `HTML file too large: ${htmlPath}`, "IMPORT_HTML_TOO_LARGE");
    }
  }
  return { files: map, htmlPaths };
}

export class HtmlImportService {
  async importWebsite(file: { buffer: Buffer; originalName: string }, input: ImportFields, actor: AuthUser) {
    let clientId: string;
    if (actor.role === UserRole.SUPER_ADMIN) {
      if (!input.clientId) throw new AppError(400, "Choose a client for this website", "CLIENT_REQUIRED");
      const client = await prisma.client.findFirst({
        where: { id: input.clientId, isInternal: false },
        select: { id: true },
      });
      if (!client) throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
      clientId = client.id;
    } else {
      if (!actor.clientId) throw new AppError(403, "No client workspace", "NO_CLIENT");
      clientId = actor.clientId;
    }

    // Validate the package before creating anything.
    const { files, htmlPaths } = readImportPackage(file.originalName || "import.zip", file.buffer);
    const website = await websiteService.create({ ...input, clientId, templateKey: undefined, themeId: input.themeId }, actor);

    try {
      const plan = await planHtmlImport({
        files,
        htmlPaths,
        siteName: (input.businessName || input.name || "Site").slice(0, 120),
        upload: (needed) => uploadAssets({ needed, files, clientId, websiteId: website.id, userId: actor.id }),
      });

      const detail = await websiteService.saveDraft(
        website.id,
        {
          expectedDraftUpdatedAt: website.draft.draftUpdatedAt,
          theme: website.draft.theme,
          header: plan.header,
          footer: plan.footer,
          pages: plan.pages,
        },
        actor,
      );

      // Each content block is also saved to the component library for reuse.
      for (const component of plan.components.slice(0, MAX_SAVED_COMPONENTS)) {
        try {
          await websiteService.saveSection(website.id, { name: component.name.slice(0, 120), section: component.section }, actor);
        } catch (error) {
          logger.warn({ err: error, component: component.name }, "HTML import: component not saved to library");
        }
      }

      return detail;
    } catch (error) {
      try {
        await websiteService.delete(website.id, actor);
      } catch {
        // Best-effort cleanup if the import fails after create.
      }
      throw error;
    }
  }
}

export const htmlImportService = new HtmlImportService();
