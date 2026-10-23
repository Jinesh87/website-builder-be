import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { siteRendererClient, type RenderedSitePage } from "./site-renderer.client.js";
import { siteCacheService, type CachedPagePayload } from "./site-cache.service.js";
import { DomainStatus, WebsiteStatus } from "../../../common/constants/website.js";
import type { PublishSnapshot } from "../types/website.types.js";
import type { Section } from "../types/site-content.types.js";

export type CachedPage = CachedPagePayload;

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeJsonLd(str: string | null | undefined): string {
  if (!str) return "";
  return String(str).replace(/</g, "\\u003c");
}

/** Resolves links safely so relative links to non-existent pages fall back to anchors instead of 404 */
function resolveSafeHref(href: string | undefined, pageSlugs: Set<string>): string {
  if (!href) return "#";
  const trimmed = href.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }
  const clean = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (pageSlugs.has(clean)) {
    return clean;
  }
  // Contextual anchor fallbacks
  if (clean.includes("service")) return "#services";
  if (clean.includes("contact")) return "#contact";
  if (clean.includes("pric")) return "#pricing";
  if (clean.includes("about")) return "#about";
  if (clean.includes("faq")) return "#faq";
  return "#";
}

function publishedWebsiteWhere(identifier: string) {
  const clean = identifier.toLowerCase().trim();
  return {
    OR: [{ subdomain: clean }, { domains: { some: { hostname: clean, status: DomainStatus.ACTIVE } } }],
    status: WebsiteStatus.PUBLISHED,
    liveVersionId: { not: null },
  };
}

/** Every website field a rendered page depends on besides the snapshot itself. */
const renderStateSelect = {
  liveVersionId: true,
  name: true,
  subdomain: true,
  businessName: true,
  description: true,
  contactEmail: true,
  contactPhone: true,
  address: true,
  logoMediaId: true,
  domains: {
    where: { status: DomainStatus.ACTIVE },
    orderBy: { isPrimary: "desc" as const },
    select: { hostname: true },
  },
};


export class LiveSiteEngineService {
  /** Purges cache entries for a specific subdomain or custom domain across L1 memory and L2 Redis */
  async purgeCache(identifier?: string | null): Promise<void> {
    await siteCacheService.purgeSite(identifier);
  }

  /** Clears cache for both subdomain and all configured custom domains upon publish */
  async purgeWebsiteCache(subdomain: string, hostnames: string[] = []): Promise<void> {
    await siteCacheService.purgeWebsite(subdomain, hostnames);
  }

  async resolveWebsite(identifier: string) {
    return prisma.website.findFirst({
      where: publishedWebsiteWhere(identifier),
      select: {
        ...renderStateSelect,
        id: true,
        clientId: true,
        publishedAt: true,
        liveVersion: {
          select: {
            id: true,
            version: true,
            snapshot: true,
            createdAt: true,
          },
        },
      },
    });
  }

  getPublicDomain(website: { subdomain: string; domains?: Array<{ hostname: string }> }): string {
    const custom = website.domains?.[0]?.hostname;
    if (custom) return `https://${custom}`;
    return `https://${website.subdomain}.${env.PUBLIC_SITE_DOMAIN}`;
  }

  async renderSitemap(identifier: string): Promise<{ xml: string; statusCode: number }> {
    const cached = await siteCacheService.getPage(identifier, "/sitemap.xml");
    if (cached) {
      return { xml: cached.html, statusCode: cached.statusCode };
    }

    const website = await this.resolveWebsite(identifier);
    if (!website || !website.liveVersion) {
      return { xml: "<?xml version=\"1.0\" encoding=\"UTF-8\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"></urlset>", statusCode: 404 };
    }

    const snapshot = website.liveVersion.snapshot as unknown as PublishSnapshot;
    const domain = this.getPublicDomain(website);
    const lastMod = (website.publishedAt || website.liveVersion.createdAt).toISOString().split("T")[0];

    const visiblePages = snapshot.pages.filter((p) => (p as { visible?: boolean }).visible !== false);
    const urls = visiblePages.map((p) => {
      const slug = p.slug === "/" ? "" : p.slug.startsWith("/") ? p.slug : `/${p.slug}`;
      const priority = p.slug === "/" ? "1.0" : "0.8";
      const changefreq = p.slug === "/" ? "daily" : "weekly";
      const pageLastMod = p.lastModified ? p.lastModified.split("T")[0] : lastMod;
      return `  <url>
    <loc>${domain}${slug}</loc>
    <lastmod>${pageLastMod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    await siteCacheService.setPage(identifier, "/sitemap.xml", {
      html: xml,
      statusCode: 200,
      contentType: "application/xml; charset=utf-8",
      cachedAt: Date.now(),
    });

    return { xml, statusCode: 200 };
  }

  async renderRobots(identifier: string): Promise<string> {
    const cached = await siteCacheService.getPage(identifier, "/robots.txt");
    if (cached) {
      return cached.html;
    }

    const website = await this.resolveWebsite(identifier);
    if (!website) {
      return `# This site is not published
User-agent: *
Disallow: /
`;
    }
    const domain = this.getPublicDomain(website);

    const txt = `# Robots.txt generated automatically by Bytezora Engine
User-agent: *
Allow: /

# Directives for AI Search Agents
User-agent: GPTBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

Sitemap: ${domain}/sitemap.xml
`;

    await siteCacheService.setPage(identifier, "/robots.txt", {
      html: txt,
      statusCode: 200,
      contentType: "text/plain; charset=utf-8",
      cachedAt: Date.now(),
    });

    return txt;
  }

  /** `basePath` is the URL prefix in preview mode ("/live/<subdomain>"); empty when served on the site's own host. */
  async renderPage(identifier: string, pathSlug: string, basePath = ""): Promise<CachedPage> {
    // 1. Trailing slash canonical redirect (e.g., /about/ -> /about)
    if (pathSlug.length > 1 && pathSlug.endsWith("/")) {
      const canonicalSlug = pathSlug.replace(/\/+$/, "");
      return {
        html: "",
        statusCode: 301,
        contentType: "text/plain",
        cachedAt: Date.now(),
        redirectUrl: canonicalSlug,
      };
    }

    // 2. Lowercase redirect
    if (pathSlug !== pathSlug.toLowerCase()) {
      return {
        html: "",
        statusCode: 301,
        contentType: "text/plain",
        cachedAt: Date.now(),
        redirectUrl: pathSlug.toLowerCase(),
      };
    }

    const cleanSlug = pathSlug === "" || pathSlug === "/" ? "/" : pathSlug.startsWith("/") ? pathSlug : `/${pathSlug}`;
    const pageRoute = `${basePath}${cleanSlug}`;

    // Multi-tier L1 Memory + L2 Redis cached resolution with single-flight stampede protection
    return siteCacheService.getOrRender(identifier, pageRoute, async () => {
      return this.renderPageInternal(identifier, cleanSlug, basePath);
    });
  }

  private async renderPageInternal(identifier: string, cleanSlug: string, basePath = ""): Promise<CachedPage> {
    const website = await this.resolveWebsite(identifier);
    if (!website || !website.liveVersion) {
      const notFoundHtml = this.renderNotFoundHtml(identifier);
      return { html: notFoundHtml, statusCode: 404, contentType: "text/html; charset=utf-8", cachedAt: Date.now() };
    }

    // 3. 301 Canonical redirect: if accessed via subdomain but primary custom domain exists (not in preview mode)
    const primaryCustomDomain = website.domains?.[0]?.hostname;
    const isSubdomainRequest = identifier.toLowerCase() === website.subdomain.toLowerCase();
    if (primaryCustomDomain && isSubdomainRequest && !basePath) {
      return {
        html: "",
        statusCode: 301,
        contentType: "text/plain",
        cachedAt: Date.now(),
        redirectUrl: `https://${primaryCustomDomain}${cleanSlug === "/" ? "" : cleanSlug}`,
      };
    }

    const snapshot = website.liveVersion.snapshot as unknown as PublishSnapshot;
    const targetPage =
      snapshot.pages.find((p) => p.slug === cleanSlug) ||
      snapshot.pages.find((p) => p.slug === cleanSlug.replace(/\/+$/, "")) ||
      (cleanSlug === "/" ? snapshot.pages[0] : null);

    if (!targetPage) {
      const notFoundHtml = this.renderNotFoundHtml(identifier, website.name);
      return { html: notFoundHtml, statusCode: 404, contentType: "text/html; charset=utf-8", cachedAt: Date.now() };
    }

    const domain = this.getPublicDomain(website);
    const pageUrl = `${domain}${targetPage.slug === "/" ? "" : targetPage.slug}`;

    const businessName = website.businessName || website.name;
    const businessDesc = website.description || "";
    const contactEmail = website.contactEmail || "";
    const contactPhone = website.contactPhone || "";
    const address = website.address || "";
    const faviconUrl = website.logoMediaId ? `${env.API_PUBLIC_URL}/api/media/files/${website.logoMediaId}` : "";

    const title =
      targetPage.seoTitle ||
      (targetPage.slug === "/" ? `${businessName} — Official Website` : `${targetPage.name} | ${businessName}`);
    const description =
      targetPage.seoDescription || businessDesc || `Welcome to ${businessName}. Discover our services, products, and contact details.`;

    // Find prominent image for OG tag
    let ogImageUrl = "";
    for (const sec of targetPage.sections) {
      const d = sec.data as Record<string, unknown>;
      if (d.image && typeof d.image === "object" && "url" in d.image && typeof d.image.url === "string") {
        ogImageUrl = d.image.url;
        break;
      }
      if (typeof d.imageUrl === "string" && d.imageUrl) {
        ogImageUrl = d.imageUrl;
        break;
      }
      if (Array.isArray(d.images) && d.images[0]) {
        const first = d.images[0] as Record<string, unknown>;
        if (typeof first.url === "string") {
          ogImageUrl = first.url;
          break;
        }
      }
      if (d.backgroundImage && typeof d.backgroundImage === "object" && "url" in d.backgroundImage && typeof d.backgroundImage.url === "string") {
        ogImageUrl = d.backgroundImage.url;
        break;
      }
      if (Array.isArray(d.members) && d.members[0]) {
        const m = d.members[0] as Record<string, unknown>;
        if (m.photo && typeof m.photo === "object" && "url" in m.photo && typeof m.photo.url === "string") {
          ogImageUrl = m.photo.url;
          break;
        }
      }
    }
    if (!ogImageUrl && faviconUrl) {
      ogImageUrl = faviconUrl;
    }

    // JSON-LD Schemas for Search Engines
    const schemas: Record<string, unknown>[] = [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: businessName,
        url: domain,
        description,
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: businessName,
        url: domain,
        ...(businessDesc ? { description: businessDesc } : {}),
        ...(faviconUrl ? { logo: faviconUrl } : {}),
        ...(contactEmail ? { email: contactEmail } : {}),
        ...(contactPhone ? { telephone: contactPhone } : {}),
        ...(address ? { address: { "@type": "PostalAddress", streetAddress: address } } : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: domain,
          },
          ...(targetPage.slug !== "/"
            ? [
                {
                  "@type": "ListItem",
                  position: 2,
                  name: targetPage.name,
                  item: pageUrl,
                },
              ]
            : []),
        ],
      },
    ];

    // FAQ schema if page contains FAQ section
    const faqSection = targetPage.sections.find((s) => s.type === "faq");
    if (faqSection) {
      const d = faqSection.data as Record<string, unknown>;
      if (Array.isArray(d.items)) {
        const questions = d.items
          .filter((it) => it && typeof it === "object" && "question" in it && "answer" in it)
          .map((it) => ({
            "@type": "Question",
            name: String(it.question),
            acceptedAnswer: {
              "@type": "Answer",
              text: String(it.answer),
            },
          }));
        if (questions.length > 0) {
          schemas.push({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: questions,
          });
        }
      }
    }

    const schemaScripts = schemas
      .map((s) => `<script type="application/ld+json">${escapeJsonLd(JSON.stringify(s))}</script>`)
      .join("\n    ");

    const themeColors = snapshot.theme?.colors || {};
    const primaryColor = themeColors.primary || "#0f7b6c";
    const secondaryColor = themeColors.secondary || "#b4410f";
    const bgColor = themeColors.background || "#ffffff";
    const surfaceColor = themeColors.surface || "#f8fafc";
    const textColor = themeColors.text || "#0f172a";
    const mutedColor = themeColors.muted || "#64748b";

    const availableSlugs = new Set(snapshot.pages.map((p) => p.slug));

    // Generate Body Content
    const bodyContent = this.renderPageSectionsHtml(
      targetPage.sections,
      snapshot.header,
      snapshot.footer,
      businessName,
      targetPage.name,
      targetPage.slug,
      availableSlugs,
      {
        contactEmail,
        contactPhone,
        address,
      },
    );

    const siteLang =
      ((snapshot as unknown as Record<string, unknown>)?.site as Record<string, unknown> | undefined)?.language ||
      ((snapshot.theme as unknown as Record<string, unknown>)?.language as string | undefined) ||
      "en";

    const seoHead = `<meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

    ${faviconUrl ? `<link rel="icon" type="image/x-icon" href="${escapeHtml(faviconUrl)}" />` : ""}

    <!-- Open Graph / Social Sharing -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:site_name" content="${escapeHtml(businessName)}" />
    ${ogImageUrl ? `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />` : ""}

    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeHtml(pageUrl)}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImageUrl ? `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />` : ""}

    <!-- JSON-LD Structured Data for Google Rich Snippets -->
    ${schemaScripts}`;

    const htmlLang = escapeHtml(String(siteLang));

    const siteKitPage = await this.renderWithSiteKit(snapshot, targetPage.slug, identifier);
    if (siteKitPage) {
      const assetQuery = `?v=${encodeURIComponent(siteKitPage.assetsVersion)}`;
      const body = basePath
        ? siteKitPage.body.replace(/(\shref=")\/(?!\/)([^"]*)"/g, (_, attr: string, rest: string) => `${attr}${basePath}${rest && !rest.startsWith("#") && !rest.startsWith("?") ? `/${rest}` : rest}"`)
        : siteKitPage.body;
      const html = `<!DOCTYPE html>
<html lang="${htmlLang}">
  <head>
    ${seoHead}
    <link rel="stylesheet" href="/_wb/site.css${assetQuery}" />
    ${siteKitPage.head}
  </head>
  <body data-wb-contact="${escapeHtml(`${basePath}/contact`)}">
    ${body}
    <script src="/_wb/site.js${assetQuery}" defer></script>
  </body>
</html>`;
      return {
        html,
        statusCode: 200,
        contentType: "text/html; charset=utf-8",
        cachedAt: Date.now(),
      };
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="${htmlLang}">
  <head>
    ${seoHead}

    <style>
      :root {
        --color-primary: ${primaryColor};
        --color-secondary: ${secondaryColor};
        --color-background: ${bgColor};
        --color-surface: ${surfaceColor};
        --color-text: ${textColor};
        --color-muted: ${mutedColor};
        --radius: 8px;
        --container-max: 1200px;
        --font-body: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: var(--font-body);
        color: var(--color-text);
        background-color: var(--color-background);
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
        overflow-x: hidden;
      }
      a { color: inherit; text-decoration: none; }
      img { max-width: 100%; height: auto; display: block; }
      .container { width: 100%; max-width: var(--container-max); margin: 0 auto; padding: 0 1.5rem; }

      /* Sticky Responsive Header */
      header.site-header {
        position: sticky; top: 0; z-index: 100;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        padding: 1rem 0;
      }
      .nav-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
      .nav-brand { font-size: 1.25rem; font-weight: 700; color: var(--color-text); letter-spacing: -0.02em; display: flex; align-items: center; gap: 0.5rem; }
      .nav-links { display: flex; align-items: center; gap: 1.5rem; list-style: none; }
      .nav-links a { font-size: 0.9rem; font-weight: 500; color: var(--color-muted); transition: color 0.15s ease; }
      .nav-links a:hover { color: var(--color-primary); }

      /* Buttons */
      .btn-cta {
        display: inline-flex; align-items: center; justify-content: center;
        background-color: var(--color-primary); color: #ffffff !important;
        font-weight: 600; font-size: 0.9rem; padding: 0.65rem 1.4rem;
        border-radius: 9999px; transition: all 0.2s ease; border: none; cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      }
      .btn-cta:hover { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
      .btn-secondary {
        display: inline-flex; align-items: center; justify-content: center;
        background: transparent; color: var(--color-text) !important;
        font-weight: 600; font-size: 0.9rem; padding: 0.65rem 1.4rem;
        border-radius: 9999px; border: 1px solid rgba(0, 0, 0, 0.15); transition: all 0.2s ease;
      }
      .btn-secondary:hover { background: rgba(0, 0, 0, 0.04); }

      /* Section Common */
      section { padding: 4.5rem 0; position: relative; }
      .section-badge {
        display: inline-block; font-size: 0.75rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.08em;
        color: var(--color-primary); background: rgba(15, 123, 108, 0.08);
        padding: 0.25rem 0.8rem; border-radius: 9999px; margin-bottom: 0.85rem;
      }
      .hero-title {
        font-size: clamp(2.25rem, 5vw, 3.75rem);
        font-weight: 800; line-height: 1.15;
        letter-spacing: -0.03em; color: var(--color-text); margin-bottom: 1.25rem;
      }
      .section-title {
        font-size: clamp(1.8rem, 3.5vw, 2.5rem);
        font-weight: 700; line-height: 1.2;
        letter-spacing: -0.02em; color: var(--color-text); margin-bottom: 1rem;
      }
      .subtitle {
        font-size: clamp(1rem, 1.8vw, 1.15rem);
        color: var(--color-muted); line-height: 1.6; max-width: 680px; margin-bottom: 2rem;
      }

      /* Grids and Cards */
      .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; }
      .grid-4 { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; }
      .card {
        background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 0.85rem;
        padding: 1.75rem; transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px -6px rgba(0,0,0,0.07); }
      .card-title { font-size: 1.2rem; font-weight: 600; color: var(--color-text); margin-bottom: 0.5rem; }

      /* Pricing Tier */
      .pricing-card {
        background: #ffffff; border: 1px solid rgba(0,0,0,0.1); border-radius: 1rem;
        padding: 2.25rem; display: flex; flex-direction: column; justify-content: space-between;
        position: relative; transition: all 0.2s ease;
      }
      .pricing-card.featured {
        border-color: var(--color-primary); box-shadow: 0 10px 30px -5px rgba(15, 123, 108, 0.2);
      }
      .price-tag { font-size: 2.75rem; font-weight: 800; color: var(--color-text); margin: 1rem 0 0.5rem; }

      /* FAQ Accordion */
      details.faq-item {
        background: var(--color-surface); border: 1px solid rgba(0,0,0,0.08);
        border-radius: 0.75rem; padding: 1.1rem 1.35rem; margin-bottom: 0.85rem; cursor: pointer;
      }
      summary.faq-question { font-weight: 600; font-size: 1.05rem; color: var(--color-text); outline: none; list-style: none; display: flex; justify-content: space-between; align-items: center; }
      summary.faq-question::-webkit-details-marker { display: none; }
      summary.faq-question::after { content: "+"; font-size: 1.35rem; font-weight: 400; color: var(--color-muted); transition: transform 0.2s ease; }
      details[open] summary.faq-question::after { content: "−"; }
      .faq-answer { margin-top: 0.85rem; color: var(--color-muted); font-size: 0.98rem; line-height: 1.6; }

      /* Contact Form */
      .contact-input {
        width: 100%; padding: 0.8rem 1rem; border: 1px solid rgba(0,0,0,0.15);
        border-radius: 0.5rem; font-family: inherit; font-size: 0.95rem; margin-top: 0.35rem;
      }
      .contact-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px rgba(15, 123, 108, 0.12); }

      /* Footer */
      footer.site-footer {
        background: #0f172a; color: #94a3b8; padding: 4rem 0 2rem;
        border-top: 1px solid #1e293b;
      }
      .footer-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2.5rem; }
      .footer-copy {
        margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid #1e293b;
        font-size: 0.85rem; text-align: center; color: #64748b;
      }

      /* Blog Card Grid & Details */
      .blog-card {
        background: #ffffff; border: 1px solid rgba(0,0,0,0.08); border-radius: 0.85rem;
        overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .blog-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px -8px rgba(0,0,0,0.1); }
      .blog-card-media { width: 100%; aspect-ratio: 16/10; object-fit: cover; }
      .blog-card-body { padding: 1.5rem; display: flex; flex-direction: column; flex: 1; }
      .blog-badge {
        display: inline-block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
        letter-spacing: 0.08em; color: var(--color-primary); margin-bottom: 0.5rem;
      }
      .blog-card-title { font-size: 1.25rem; font-weight: 700; color: var(--color-text); margin-bottom: 0.6rem; line-height: 1.35; }
      .blog-card-excerpt { font-size: 0.92rem; color: var(--color-muted); line-height: 1.6; margin-bottom: 1.25rem; flex: 1; }
      .blog-card-footer {
        display: flex; align-items: center; justify-content: space-between; border-top: 1px solid rgba(0,0,0,0.06);
        padding-top: 0.85rem; font-size: 0.82rem; color: var(--color-muted);
      }
      .blog-read-more { color: var(--color-primary); font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
      .blog-prose { font-size: 1.1rem; line-height: 1.8; color: var(--color-text); max-width: 780px; margin: 0 auto; }
      .blog-prose h2 { font-size: 1.8rem; font-weight: 700; margin: 2rem 0 0.75rem; }
      .blog-prose h3 { font-size: 1.35rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
      .blog-prose p { margin-bottom: 1.5rem; }
      .blog-quote {
        border-left: 3px solid var(--color-primary); padding: 1rem 1.5rem; margin: 2rem 0;
        font-style: italic; font-size: 1.2rem; background: rgba(0,0,0,0.02); border-radius: 0 0.5rem 0.5rem 0;
      }
      .blog-callout {
        padding: 1.25rem 1.5rem; margin: 2rem 0; border-radius: 0.75rem;
        background: rgba(15, 123, 108, 0.06); border: 1px solid rgba(15, 123, 108, 0.2);
      }

      @media (max-width: 768px) {
        .nav-links { display: none; }
        section { padding: 3rem 0; }
      }
    </style>
  </head>
  <body data-wb-contact="${escapeHtml(`${basePath}/contact`)}">
    ${bodyContent}
    <script>
      document.addEventListener("submit", async (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || !form.classList.contains("wb-contact-form")) return;
        event.preventDefault();
        const url = document.body.getAttribute("data-wb-contact");
        if (!url) return;
        const data = new FormData(form);
        const button = form.querySelector('[type="submit"]');
        if (button) button.disabled = true;
        let status = form.querySelector(".wb-form-status");
        if (!status) {
          status = document.createElement("p");
          status.className = "wb-form-status";
          status.setAttribute("role", "status");
          status.style.margin = "0";
          status.style.fontSize = "0.9rem";
          status.style.fontWeight = "600";
          form.append(status);
        }
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: String(data.get("name") || "").trim(),
              email: String(data.get("email") || "").trim(),
              message: String(data.get("message") || "").trim(),
            }),
          });
          const result = await response.json().catch(() => ({}));
          const reason = typeof result.error === "string" ? result.error : result.error && result.error.message;
          if (!response.ok) throw new Error(reason || "Your message couldn't be sent. Please try again.");
          form.reset();
          status.style.color = "#047857";
          status.textContent = result.message || "Thank you! Your message has been received.";
        } catch (error) {
          status.style.color = "#b91c1c";
          status.textContent = error instanceof Error ? error.message : "Your message couldn't be sent. Please try again.";
        } finally {
          if (button) button.disabled = false;
        }
      });
    </script>
  </body>
</html>`;

    // Not cached: the next request retries the site-kit renderer.
    return { html: fullHtml, statusCode: 200, contentType: "text/html; charset=utf-8", cachedAt: Date.now(), transient: true };
  }

  /** The editor's own components, rendered by the site-renderer service. Null means use the legacy renderer. */
  private async renderWithSiteKit(snapshot: PublishSnapshot, slug: string, identifier: string): Promise<RenderedSitePage | null> {
    try {
      return await siteRendererClient.render(snapshot, slug);
    } catch (error) {
      logger.warn({ err: error, identifier, slug }, "Site renderer unavailable; serving the legacy page");
      return null;
    }
  }

  private renderPageSectionsHtml(
    sections: Section[],
    header: PublishSnapshot["header"],
    footer: PublishSnapshot["footer"],
    siteName: string,
    pageName: string,
    pageSlug: string,
    availableSlugs: Set<string>,
    contactInfo?: {
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
    },
  ): string {
    const menuItems = header?.menu || [];
    const headerCta = header?.cta;
    const headerCtaHref = headerCta?.href ? resolveSafeHref(headerCta.href, availableSlugs) : "#";

    const headerHtml = `
    <header class="site-header">
      <div class="container nav-row">
        <a href="/" class="nav-brand">${escapeHtml(header?.siteName || siteName)}</a>
        <nav aria-label="Main Navigation">
          <ul class="nav-links">
            ${menuItems
              .map((it) => {
                const safeHref = resolveSafeHref(it.href, availableSlugs);
                return `<li><a href="${escapeHtml(safeHref)}">${escapeHtml(it.label)}</a></li>`;
              })
              .join("")}
            ${
              headerCta?.label
                ? `<li><a href="${escapeHtml(headerCtaHref)}" class="btn-cta">${escapeHtml(headerCta.label)}</a></li>`
                : ""
            }
          </ul>
        </nav>
      </div>
    </header>
    <main>`;

    const sectionParts: string[] = [];
    let hasRenderedH1 = false;

    function getHeadingMarkup(effectiveHeading: string): { tag: string; cls: string } {
      if (!hasRenderedH1) {
        hasRenderedH1 = true;
        return { tag: "h1", cls: "hero-title" };
      }
      return { tag: "h2", cls: "section-title" };
    }

    // Inner page header fallback if first section is not hero
    const firstSection = sections.find((s) => !s.hidden);
    if (pageSlug !== "/" && (!firstSection || firstSection.type !== "hero")) {
      sectionParts.push(`
      <section class="section-page-intro" style="padding: 3rem 0 1.5rem; background: var(--color-surface); border-bottom: 1px solid rgba(0,0,0,0.06);">
        <div class="container">
          <h1 class="hero-title" style="font-size: clamp(2rem, 4vw, 2.75rem); margin-bottom: 0.5rem;">${escapeHtml(pageName)}</h1>
          <nav aria-label="Breadcrumb" style="font-size: 0.875rem; color: var(--color-muted);">
            <a href="/" style="color: var(--color-primary);">Home</a> <span style="margin: 0 0.5rem;">/</span> <span>${escapeHtml(pageName)}</span>
          </nav>
        </div>
      </section>`);
      hasRenderedH1 = true;
    }

    // Render Each Section
    for (const section of sections) {
      if (section.hidden) continue;
      const d = (section.data as Record<string, unknown>) || {};
      const badgeText = ([d.eyebrow, d.badge].find((v) => typeof v === "string" && v.trim()) as string) || "";
      const heading = ([d.heading, d.title].find((v) => typeof v === "string" && v.trim()) as string) || "";
      const subheading = ([d.subheading, d.subtitle].find((v) => typeof v === "string" && v.trim()) as string) || "";
      const text = ([d.intro, d.text, d.description, d.body].find((v) => typeof v === "string" && v.trim()) as string) || "";

      switch (section.type) {
        case "hero": {
          const heroImg =
            typeof d.imageUrl === "string" && d.imageUrl
              ? d.imageUrl
              : d.image && typeof d.image === "object" && "url" in d.image && typeof d.image.url === "string"
                ? d.image.url
                : "";
          const heroAlt =
            d.image && typeof d.image === "object" && "alt" in d.image && typeof d.image.alt === "string" && d.image.alt.trim()
              ? d.image.alt.trim()
              : heading || siteName;

          const btnPrimary =
            d.primaryCta && typeof d.primaryCta === "object"
              ? (d.primaryCta as Record<string, unknown>)
              : d.button && typeof d.button === "object"
                ? (d.button as Record<string, unknown>)
                : d.cta && typeof d.cta === "object"
                  ? (d.cta as Record<string, unknown>)
                  : null;

          const btnSecondary =
            d.secondaryCta && typeof d.secondaryCta === "object"
              ? (d.secondaryCta as Record<string, unknown>)
              : d.secondaryButton && typeof d.secondaryButton === "object"
                ? (d.secondaryButton as Record<string, unknown>)
                : null;

          const primaryHref = btnPrimary?.href ? resolveSafeHref(String(btnPrimary.href), availableSlugs) : "#";
          const secondaryHref = btnSecondary?.href ? resolveSafeHref(String(btnSecondary.href), availableSlugs) : "#";

          const effectiveHeading = heading || `Welcome to ${siteName}`;
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const heroParagraph = subheading || text;

          sectionParts.push(`
          <section class="section-hero" id="hero" style="padding: 5rem 0 4rem; text-align: center;">
            <div class="container" style="max-width: 960px;">
              ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
              <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
              ${heroParagraph ? `<p class="subtitle" style="margin: 0 auto 2.25rem;">${escapeHtml(heroParagraph)}</p>` : ""}
              <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                ${
                  btnPrimary?.label
                    ? `<a href="${escapeHtml(primaryHref)}" class="btn-cta" style="font-size: 1rem; padding: 0.8rem 2.2rem;">${escapeHtml(String(btnPrimary.label))}</a>`
                    : ""
                }
                ${
                  btnSecondary?.label
                    ? `<a href="${escapeHtml(secondaryHref)}" class="btn-secondary" style="font-size: 1rem; padding: 0.8rem 2.2rem;">${escapeHtml(String(btnSecondary.label))}</a>`
                    : ""
                }
              </div>
              ${
                heroImg
                  ? `
              <div style="margin-top: 3.5rem; border-radius: 1.25rem; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);">
                <img src="${escapeHtml(heroImg)}" alt="${escapeHtml(heroAlt)}" fetchpriority="high" decoding="async" style="width: 100%; height: auto; display: block;" />
              </div>`
                  : ""
              }
            </div>
          </section>`);
          break;
        }

        case "features":
        case "services": {
          const isServices = section.type === "services";
          const items = Array.isArray(d.items) ? d.items : [];
          const effectiveHeading = heading || (isServices ? "Our Services" : "Key Features");
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const introParagraph = text || subheading;

          sectionParts.push(`
          <section class="section-${section.type}" id="${isServices ? "services" : "features"}">
            <div class="container">
              <div style="text-align: center; margin-bottom: 3rem;">
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${introParagraph ? `<p class="subtitle" style="margin: 0 auto;">${escapeHtml(introParagraph)}</p>` : ""}
              </div>
              <div class="grid-3">
                ${items
                  .map(
                    (it: Record<string, unknown>) => `
                  <div class="card">
                    <h3 class="card-title">${escapeHtml(String(it.title || ""))}</h3>
                    <p style="color: var(--color-muted); font-size: 0.95rem; line-height: 1.6;">${escapeHtml(String(it.description || it.text || it.intro || ""))}</p>
                  </div>`,
                  )
                  .join("")}
              </div>
            </div>
          </section>`);
          break;
        }

        case "pricing": {
          const plans = Array.isArray(d.plans) ? d.plans : Array.isArray(d.items) ? d.items : [];
          const effectiveHeading = heading || "Pricing & Plans";
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const introParagraph = text || subheading;

          sectionParts.push(`
          <section class="section-pricing" id="pricing" style="background: var(--color-surface);">
            <div class="container">
              <div style="text-align: center; margin-bottom: 3.5rem;">
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${introParagraph ? `<p class="subtitle" style="margin: 0 auto;">${escapeHtml(introParagraph)}</p>` : ""}
              </div>
              <div class="grid-3">
                ${plans
                  .map((plan: Record<string, unknown>) => {
                    const planTitle = String(plan.name || plan.title || "Plan");
                    const price = String(plan.price || "");
                    const period = String(plan.period || plan.interval || "/ month");
                    const isPopular = Boolean(plan.featured || plan.popular || plan.highlight);
                    const features = Array.isArray(plan.features) ? plan.features : [];
                    const ctaObj =
                      plan.cta && typeof plan.cta === "object"
                        ? (plan.cta as Record<string, unknown>)
                        : plan.buttonHref
                          ? { href: plan.buttonHref, label: plan.buttonText || "Get Started" }
                          : null;
                    const planBtnHref = ctaObj?.href ? resolveSafeHref(String(ctaObj.href), availableSlugs) : "#contact";
                    const planBtnLabel = String(ctaObj?.label || plan.ctaText || "Get Started");

                    return `
                  <div class="pricing-card ${isPopular ? "featured" : ""}">
                    <div>
                      ${isPopular ? `<span style="position: absolute; top: -12px; right: 24px; background: var(--color-primary); color: #fff; font-size: 0.75rem; font-weight: 700; padding: 4px 12px; border-radius: 9999px;">MOST POPULAR</span>` : ""}
                      <h3 style="font-size: 1.35rem; font-weight: 700;">${escapeHtml(planTitle)}</h3>
                      ${plan.description ? `<p style="color: var(--color-muted); font-size: 0.9rem; margin-top: 0.25rem;">${escapeHtml(String(plan.description))}</p>` : ""}
                      <div class="price-tag">${escapeHtml(price)} <span style="font-size: 1rem; font-weight: 400; color: var(--color-muted);">${escapeHtml(period)}</span></div>
                      <ul style="list-style: none; margin: 1.5rem 0; display: flex; flex-direction: column; gap: 0.75rem;">
                        ${features.map((f) => `<li style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.92rem; color: var(--color-text);"><span style="color: var(--color-primary); font-weight: bold;">✓</span> ${escapeHtml(String(f))}</li>`).join("")}
                      </ul>
                    </div>
                    <a href="${escapeHtml(planBtnHref)}" class="${isPopular ? "btn-cta" : "btn-secondary"}" style="width: 100%; text-align: center; margin-top: 1.5rem;">${escapeHtml(planBtnLabel)}</a>
                  </div>`;
                  })
                  .join("")}
              </div>
            </div>
          </section>`);
          break;
        }

        case "team": {
          const members = Array.isArray(d.members) ? d.members : Array.isArray(d.items) ? d.items : [];
          const effectiveHeading = heading || "Meet Our Team";
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const introParagraph = text || subheading;

          sectionParts.push(`
          <section class="section-team" id="team">
            <div class="container">
              <div style="text-align: center; margin-bottom: 3.5rem;">
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${introParagraph ? `<p class="subtitle" style="margin: 0 auto;">${escapeHtml(introParagraph)}</p>` : ""}
              </div>
              <div class="grid-4">
                ${members
                  .map((m: Record<string, unknown>) => {
                    const photo =
                      m.photo && typeof m.photo === "object" && "url" in m.photo && typeof m.photo.url === "string"
                        ? m.photo.url
                        : typeof m.photo === "string"
                          ? m.photo
                          : typeof m.imageUrl === "string"
                            ? m.imageUrl
                            : m.image && typeof m.image === "object" && "url" in m.image
                              ? (m.image as { url: string }).url
                              : "";
                    const name = String(m.name || "Team Member");
                    const role = String(m.role || m.department || m.title || "");
                    const bio = String(m.bio || m.description || "");
                    return `
                  <div class="card" style="text-align: center;">
                    ${photo ? `<div style="width: 96px; height: 96px; border-radius: 9999px; overflow: hidden; margin: 0 auto 1rem;"><img src="${escapeHtml(photo)}" alt="${escapeHtml(name)}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover;" /></div>` : ""}
                    <h3 style="font-size: 1.15rem; font-weight: 700;">${escapeHtml(name)}</h3>
                    ${role ? `<p style="color: var(--color-primary); font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem;">${escapeHtml(role)}</p>` : ""}
                    ${bio ? `<p style="color: var(--color-muted); font-size: 0.88rem; line-height: 1.5;">${escapeHtml(bio)}</p>` : ""}
                  </div>`;
                  })
                  .join("")}
              </div>
            </div>
          </section>`);
          break;
        }

        case "text":
        case "split": {
          const splitImg =
            d.image && typeof d.image === "object" && "url" in d.image && typeof d.image.url === "string"
              ? d.image.url
              : typeof d.imageUrl === "string"
                ? d.imageUrl
                : "";
          const splitAlt =
            d.image && typeof d.image === "object" && "alt" in d.image && typeof d.image.alt === "string"
              ? d.image.alt
              : heading || `About ${siteName}`;

          const bullets = Array.isArray(d.bullets) ? d.bullets : [];
          const ctaBtn =
            d.cta && typeof d.cta === "object"
              ? (d.cta as Record<string, unknown>)
              : d.button && typeof d.button === "object"
                ? (d.button as Record<string, unknown>)
                : null;
          const ctaHref = ctaBtn?.href ? resolveSafeHref(String(ctaBtn.href), availableSlugs) : "#";
          const imgPos = d.imagePosition === "left" ? "left" : "right";

          const effectiveHeading = heading || `About ${siteName}`;
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const bodyContent = d.body || text || subheading;

          sectionParts.push(`
          <section class="section-about" id="about">
            <div class="container" style="display: grid; grid-template-columns: ${splitImg ? "repeat(auto-fit, minmax(320px, 1fr))" : "1fr"}; gap: 3.5rem; align-items: center;">
              <div style="${imgPos === "left" && splitImg ? "order: 2;" : ""}">
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${bodyContent ? `<p style="color: var(--color-muted); font-size: 1.05rem; line-height: 1.7; margin-bottom: 1.5rem;">${escapeHtml(String(bodyContent))}</p>` : ""}
                ${
                  bullets.length > 0
                    ? `<ul style="list-style: none; display: flex; flex-direction: column; gap: 0.6rem; margin-bottom: 1.75rem;">
                        ${bullets.map((b) => `<li style="display: flex; gap: 0.6rem; align-items: baseline; font-size: 0.98rem; color: var(--color-text);"><span style="color: var(--color-primary); font-weight: bold;">✓</span> ${escapeHtml(String(b))}</li>`).join("")}
                      </ul>`
                    : ""
                }
                ${
                  ctaBtn?.label
                    ? `<a href="${escapeHtml(ctaHref)}" class="btn-cta" style="margin-top: 0.5rem;">${escapeHtml(String(ctaBtn.label))}</a>`
                    : ""
                }
              </div>
              ${
                splitImg
                  ? `
              <div style="${imgPos === "left" ? "order: 1;" : ""}; border-radius: 1rem; overflow: hidden; box-shadow: 0 12px 24px -6px rgba(0, 0, 0, 0.1);">
                <img src="${escapeHtml(splitImg)}" alt="${escapeHtml(splitAlt)}" loading="lazy" decoding="async" style="width: 100%; height: auto;" />
              </div>`
                  : ""
              }
            </div>
          </section>`);
          break;
        }

        case "logos": {
          const logos = Array.isArray(d.logos) ? d.logos : [];
          if (logos.length > 0 || heading) {
            const effectiveHeading = heading || "Our Partners";
            const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);

            sectionParts.push(`
            <section class="section-logos" id="partners" style="padding: 3rem 0; border-top: 1px solid rgba(0,0,0,0.05); border-bottom: 1px solid rgba(0,0,0,0.05);">
              <div class="container" style="text-align: center;">
                ${heading ? `<${headingTag} class="${headingClass}" style="font-size: 1.15rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted); margin-bottom: 2rem;">${escapeHtml(heading)}</${headingTag}>` : ""}
                <div style="display: flex; justify-content: center; align-items: center; gap: 3rem; flex-wrap: wrap;">
                  ${logos
                    .map((logo: Record<string, unknown> | string) => {
                      const logoUrl = typeof logo === "string" ? logo : typeof logo === "object" && logo ? String((logo as Record<string, unknown>).url || (logo as Record<string, unknown>).imageUrl || "") : "";
                      const logoAlt = typeof logo === "object" && logo ? String((logo as Record<string, unknown>).alt || "Partner logo") : "Partner logo";
                      return logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(logoAlt)}" loading="lazy" decoding="async" style="max-height: 40px; width: auto; object-fit: contain; opacity: 0.75; transition: opacity 0.2s;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.75'" />` : "";
                    })
                    .join("")}
                </div>
              </div>
            </section>`);
          }
          break;
        }

        case "contact": {
          const effectiveHeading = heading || "Get In Touch";
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const introParagraph = text || subheading;
          const ownText = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
          const email = ownText(d.email) ?? contactInfo?.contactEmail;
          const phone = ownText(d.phone) ?? contactInfo?.contactPhone;
          const address = ownText(d.address) ?? contactInfo?.address;
          const showForm = d.showForm !== false;
          const submitLabel = ownText(d.submitLabel) ?? "Send message";
          const formHeading = ownText(d.formHeading) ?? "Send a message";

          sectionParts.push(`
          <section class="section-contact" id="contact" style="background: var(--color-surface); border-top: 1px solid rgba(0,0,0,0.06); border-bottom: 1px solid rgba(0,0,0,0.06);">
            <div class="container" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 3.5rem;">
              <div>
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${introParagraph ? `<p class="subtitle">${escapeHtml(introParagraph)}</p>` : ""}
                <div style="margin-top: 2rem; display: flex; flex-direction: column; gap: 1.25rem;">
                  ${email ? `<div><strong style="color: var(--color-text); display: block; font-size: 0.875rem;">Email</strong><a href="mailto:${escapeHtml(email)}" style="color: var(--color-primary);">${escapeHtml(email)}</a></div>` : ""}
                  ${phone ? `<div><strong style="color: var(--color-text); display: block; font-size: 0.875rem;">Phone</strong><a href="tel:${escapeHtml(phone.replace(/\s+/g, ""))}" style="color: var(--color-primary);">${escapeHtml(phone)}</a></div>` : ""}
                  ${address ? `<div><strong style="color: var(--color-text); display: block; font-size: 0.875rem;">Address</strong><p style="color: var(--color-muted); font-size: 0.95rem;">${escapeHtml(address)}</p></div>` : ""}
                </div>
              </div>
              ${
                showForm
                  ? `<form class="wb-contact-form card" style="background: #ffffff; border-radius: 1rem; padding: 2rem; align-self: start; display: flex; flex-direction: column; gap: 0.75rem;">
                <h3 class="card-title" style="margin-bottom: 0.25rem;">${escapeHtml(formHeading)}</h3>
                <p style="color: var(--color-muted); font-size: 0.9rem;">Tell us what you need. We usually reply within one business day.</p>
                <label style="display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.875rem;">Name<input name="name" required autocomplete="name" style="padding: 0.7rem 0.8rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 0.5rem; font: inherit;" /></label>
                <label style="display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.875rem;">Email<input name="email" type="email" required autocomplete="email" style="padding: 0.7rem 0.8rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 0.5rem; font: inherit;" /></label>
                <label style="display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.875rem;">Message<textarea name="message" required rows="4" style="padding: 0.7rem 0.8rem; border: 1px solid rgba(0,0,0,0.15); border-radius: 0.5rem; font: inherit; resize: vertical;"></textarea></label>
                <button type="submit" class="btn-cta" style="width: 100%; padding: 0.85rem; font-size: 0.95rem; border: 0; cursor: pointer;">${escapeHtml(submitLabel)}</button>
              </form>`
                  : ""
              }
            </div>
          </section>`);
          break;
        }

        case "testimonials": {
          const items = Array.isArray(d.items) ? d.items : [];
          const effectiveHeading = heading || "What Our Clients Say";
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const introParagraph = text || subheading;

          sectionParts.push(`
          <section class="section-testimonials" id="testimonials">
            <div class="container">
              <div style="text-align: center; margin-bottom: 3.5rem;">
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${introParagraph ? `<p class="subtitle" style="margin: 0 auto;">${escapeHtml(introParagraph)}</p>` : ""}
              </div>
              <div class="grid-3">
                ${items
                  .map(
                    (it: Record<string, unknown>) => {
                      const rating = typeof it.rating === "number" && it.rating >= 1 && it.rating <= 5 ? Math.round(it.rating) : null;
                      const quote = String(it.quote || it.content || it.text || "");
                      const author = String(it.author || it.name || "").trim();
                      const role = String(it.role || it.title || "").trim();

                      return `
                  <div class="card">
                    ${rating ? `<div style="color: #f59e0b; font-size: 1.1rem; margin-bottom: 0.75rem;">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</div>` : ""}
                    ${quote ? `<p style="color: var(--color-text); font-style: italic; margin-bottom: 1.25rem; line-height: 1.6;">“${escapeHtml(quote)}”</p>` : ""}
                    ${author ? `<strong style="color: var(--color-text); display: block; font-size: 0.95rem;">${escapeHtml(author)}</strong>` : ""}
                    ${role ? `<span style="color: var(--color-muted); font-size: 0.82rem;">${escapeHtml(role)}</span>` : ""}
                  </div>`;
                    },
                  )
                  .join("")}
              </div>
            </div>
          </section>`);
          break;
        }

        case "gallery": {
          const rawImages = Array.isArray(d.images) ? d.images : Array.isArray(d.items) ? d.items : Array.isArray(d.photos) ? d.photos : [];
          const effectiveHeading = heading || "Gallery";
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const introParagraph = text || subheading;

          sectionParts.push(`
          <section class="section-gallery" id="gallery">
            <div class="container">
              <div style="text-align: center; margin-bottom: 3rem;">
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${introParagraph ? `<p class="subtitle" style="margin: 0 auto;">${escapeHtml(introParagraph)}</p>` : ""}
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
                ${rawImages
                  .map((it: Record<string, unknown> | string) => {
                    const imgUrl = typeof it === "string" ? it : typeof it === "object" && it ? String((it as Record<string, unknown>).url || (it as Record<string, unknown>).imageUrl || "") : "";
                    const altText = typeof it === "object" && it ? String((it as Record<string, unknown>).alt || (it as Record<string, unknown>).caption || (it as Record<string, unknown>).title || `${effectiveHeading} image`) : `${effectiveHeading} image`;
                    return imgUrl
                      ? `
                    <div style="border-radius: 0.85rem; overflow: hidden; height: 240px; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
                      <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(altText)}" loading="lazy" decoding="async" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;" onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'" />
                    </div>`
                      : "";
                  })
                  .join("")}
              </div>
            </div>
          </section>`);
          break;
        }

        case "faq": {
          const items = Array.isArray(d.items) ? d.items : [];
          const effectiveHeading = heading || "Frequently Asked Questions";
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const introParagraph = text || subheading;

          sectionParts.push(`
          <section class="section-faq" id="faq">
            <div class="container" style="max-width: 840px;">
              <div style="text-align: center; margin-bottom: 3rem;">
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${introParagraph ? `<p class="subtitle" style="margin: 0 auto;">${escapeHtml(introParagraph)}</p>` : ""}
              </div>
              <div class="faq-list">
                ${items
                  .map(
                    (it: Record<string, unknown>) => `
                  <details class="faq-item">
                    <summary class="faq-question">${escapeHtml(String(it.question || ""))}</summary>
                    <div class="faq-answer">${escapeHtml(String(it.answer || ""))}</div>
                  </details>`,
                  )
                  .join("")}
              </div>
            </div>
          </section>`);
          break;
        }

        case "cta": {
          const ctaBtn =
            d.button && typeof d.button === "object"
              ? (d.button as Record<string, unknown>)
              : d.cta && typeof d.cta === "object"
                ? (d.cta as Record<string, unknown>)
                : null;
          const ctaBtnHref = ctaBtn?.href ? resolveSafeHref(String(ctaBtn.href), availableSlugs) : "#contact";
          const effectiveHeading = heading || "Ready to get started?";
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const introParagraph = text || subheading;

          sectionParts.push(`
          <section class="section-cta" id="cta" style="background: var(--color-surface); border-top: 1px solid rgba(0,0,0,0.06); border-bottom: 1px solid rgba(0,0,0,0.06); text-align: center; padding: 5rem 0;">
            <div class="container" style="max-width: 800px;">
              ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
              <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
              ${introParagraph ? `<p class="subtitle" style="margin: 0 auto 2.25rem;">${escapeHtml(introParagraph)}</p>` : ""}
              ${
                ctaBtn?.label
                  ? `<a href="${escapeHtml(ctaBtnHref)}" class="btn-cta" style="font-size: 1rem; padding: 0.85rem 2.4rem;">${escapeHtml(String(ctaBtn.label))}</a>`
                  : ""
              }
            </div>
          </section>`);
          break;
        }

        case "stats": {
          const stats = Array.isArray(d.items) ? d.items : Array.isArray(d.stats) ? d.stats : [];
          const validStats = stats.filter((st: Record<string, unknown>) => st && (st.value || st.number));
          if (validStats.length > 0) {
            const effectiveHeading = heading || "";
            if (effectiveHeading) {
              const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
              sectionParts.push(`
              <section class="section-stats" id="stats" style="background: var(--color-surface);">
                <div class="container">
                  <div style="text-align: center; margin-bottom: 2.5rem;">
                    ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                    <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                  </div>
                  <div class="grid-4" style="text-align: center;">
                    ${validStats
                      .map(
                        (st: Record<string, unknown>) => `
                      <div class="card" style="padding: 2rem 1.5rem;">
                        <div style="font-size: 2.75rem; font-weight: 800; color: var(--color-primary); line-height: 1;">${escapeHtml(String(st.value || st.number))}</div>
                        <div style="font-size: 0.95rem; font-weight: 600; color: var(--color-text); margin-top: 0.5rem;">${escapeHtml(String(st.label || st.title || ""))}</div>
                      </div>`,
                      )
                      .join("")}
                  </div>
                </div>
              </section>`);
            } else {
              sectionParts.push(`
              <section class="section-stats" id="stats" style="background: var(--color-surface);">
                <div class="container">
                  <div class="grid-4" style="text-align: center;">
                    ${validStats
                      .map(
                        (st: Record<string, unknown>) => `
                      <div class="card" style="padding: 2rem 1.5rem;">
                        <div style="font-size: 2.75rem; font-weight: 800; color: var(--color-primary); line-height: 1;">${escapeHtml(String(st.value || st.number))}</div>
                        <div style="font-size: 0.95rem; font-weight: 600; color: var(--color-text); margin-top: 0.5rem;">${escapeHtml(String(st.label || st.title || ""))}</div>
                      </div>`,
                      )
                      .join("")}
                  </div>
                </div>
              </section>`);
            }
          }
          break;
        }

        case "blog": {
          const rawPosts = Array.isArray(d.posts) ? (d.posts as Record<string, unknown>[]) : [];
          const effectiveHeading = heading || "Our Blog";
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);

          sectionParts.push(`
          <section class="section-blog" id="blog" style="padding: 4.5rem 0;">
            <div class="container">
              <div style="text-align: center; max-width: 720px; margin: 0 auto 3.5rem;">
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                <${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${subheading || text ? `<p class="subtitle" style="margin: 0 auto;">${escapeHtml(subheading || text)}</p>` : ""}
              </div>
              <div class="grid-3">
                ${rawPosts
                  .map((post) => {
                    const postTitle = String(post.title || "Blog Post");
                    const postSlug = resolveSafeHref(String(post.slug || "#"), availableSlugs);
                    const postExcerpt = String(post.excerpt || "");
                    const postCategory = String(post.category || "");
                    const postAuthor = String(post.authorName || "");
                    const postDate = String(post.date || "");
                    const postImg =
                      post.coverImage && typeof post.coverImage === "object" && "url" in post.coverImage
                        ? String((post.coverImage as Record<string, unknown>).url)
                        : "";

                    return `
                    <article class="blog-card">
                      ${
                        postImg
                          ? `<a href="${escapeHtml(postSlug)}"><img src="${escapeHtml(postImg)}" alt="${escapeHtml(postTitle)}" class="blog-card-media" loading="lazy" /></a>`
                          : ""
                      }
                      <div class="blog-card-body">
                        ${postCategory ? `<span class="blog-badge">${escapeHtml(postCategory)}</span>` : ""}
                        <a href="${escapeHtml(postSlug)}"><h3 class="blog-card-title">${escapeHtml(postTitle)}</h3></a>
                        ${postExcerpt ? `<p class="blog-card-excerpt">${escapeHtml(postExcerpt)}</p>` : ""}
                        <div class="blog-card-footer">
                          <span>${escapeHtml(postAuthor)}${postDate ? ` • ${escapeHtml(postDate)}` : ""}</span>
                          <a href="${escapeHtml(postSlug)}" class="blog-read-more">Read More →</a>
                        </div>
                      </div>
                    </article>`;
                  })
                  .join("")}
              </div>
            </div>
          </section>`);
          break;
        }

        case "blog_detail": {
          const effectiveHeading = heading || String(d.title || "Blog Post");
          const { tag: headingTag, cls: headingClass } = getHeadingMarkup(effectiveHeading);
          const category = String(d.category || "");
          const authorName = String(d.authorName || "");
          const date = String(d.date || "");
          const readTime = String(d.readTime || "");
          const rawSections = Array.isArray(d.content) ? (d.content as Record<string, unknown>[]) : [];
          const coverImg =
            d.coverImage && typeof d.coverImage === "object" && "url" in d.coverImage
              ? String((d.coverImage as Record<string, unknown>).url)
              : "";

          sectionParts.push(`
          <article class="section-blog-detail" style="padding: 4.5rem 0;">
            <div class="container" style="max-width: 900px;">
              <header style="text-align: center; margin-bottom: 2.5rem;">
                ${category ? `<span class="section-badge">${escapeHtml(category)}</span>` : ""}
                <${headingTag} class="${headingClass}" style="margin: 0.75rem 0 1rem;">${escapeHtml(effectiveHeading)}</${headingTag}>
                ${subheading || text ? `<p class="subtitle" style="margin: 0 auto 1.5rem;">${escapeHtml(subheading || text)}</p>` : ""}
                <div style="display: flex; gap: 1.5rem; justify-content: center; font-size: 0.9rem; color: var(--color-muted); border-top: 1px solid rgba(0,0,0,0.08); border-bottom: 1px solid rgba(0,0,0,0.08); padding: 0.75rem 0;">
                  <span><strong>Date:</strong> ${escapeHtml(date)}</span>
                  <span><strong>Author:</strong> ${escapeHtml(authorName)}</span>
                  <span><strong>Read:</strong> ${escapeHtml(readTime)}</span>
                </div>
              </header>

              ${
                coverImg
                  ? `<div style="border-radius: 1rem; overflow: hidden; margin-bottom: 3rem; box-shadow: 0 16px 36px -10px rgba(0,0,0,0.12);">
                      <img src="${escapeHtml(coverImg)}" alt="${escapeHtml(effectiveHeading)}" style="width: 100%; max-height: 520px; object-fit: cover;" />
                    </div>`
                  : ""
              }

              <div class="blog-prose">
                ${rawSections
                  .map((sec) => {
                    const secHeading = sec.heading ? `<h2>${escapeHtml(String(sec.heading))}</h2>` : "";
                    const secSubheading = sec.subheading ? `<h3>${escapeHtml(String(sec.subheading))}</h3>` : "";
                    const secParas = Array.isArray(sec.paragraphs)
                      ? (sec.paragraphs as string[]).map((p) => `<p>${escapeHtml(p)}</p>`).join("")
                      : "";
                    const secQuote = sec.quote
                      ? `<blockquote class="blog-quote">${escapeHtml(String(sec.quote))}</blockquote>`
                      : "";
                    const secCallout = sec.callout
                      ? `<div class="blog-callout"><p style="margin: 0;">${escapeHtml(String(sec.callout))}</p></div>`
                      : "";

                    return `${secHeading}${secSubheading}${secParas}${secQuote}${secCallout}`;
                  })
                  .join("")}
              </div>
            </div>
          </article>`);
          break;
        }

        default:
          if (heading || text) {
            const effectiveHeading = heading || "";
            const { tag: headingTag, cls: headingClass } = effectiveHeading ? getHeadingMarkup(effectiveHeading) : { tag: "h2", cls: "section-title" };

            sectionParts.push(`
            <section class="section-generic">
              <div class="container" style="max-width: 860px; text-align: center;">
                ${badgeText ? `<span class="section-badge">${escapeHtml(badgeText)}</span>` : ""}
                ${effectiveHeading ? `<${headingTag} class="${headingClass}">${escapeHtml(effectiveHeading)}</${headingTag}>` : ""}
                ${text ? `<p class="subtitle" style="margin: 0 auto;">${escapeHtml(text)}</p>` : ""}
              </div>
            </section>`);
          }
          break;
      }
    }

    // Fallback: If no section produced an H1 on the page, guarantee a single semantic H1 inside <main>
    if (!hasRenderedH1) {
      sectionParts.unshift(`
      <section class="section-page-title" style="padding: 2.5rem 0 1rem;">
        <div class="container">
          <h1 class="hero-title">${escapeHtml(pageSlug === "/" ? siteName : pageName)}</h1>
        </div>
      </section>`);
      hasRenderedH1 = true;
    }

    const footerHtml = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-row">
          <div>
            <h3 style="color: #ffffff; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">${escapeHtml(footer?.siteName || siteName)}</h3>
            <p style="max-width: 400px; font-size: 0.88rem; line-height: 1.6;">${escapeHtml(footer?.copyright || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`)}</p>
          </div>
          ${
            footer?.columns && Array.isArray(footer.columns)
              ? `<div style="display: flex; gap: 3rem; flex-wrap: wrap;">
                  ${footer.columns
                    .map(
                      (col) => `
                    <div>
                      <h4 style="color: #ffffff; font-size: 0.95rem; font-weight: 600; margin-bottom: 0.75rem;">${escapeHtml(col.title)}</h4>
                      <ul style="list-style: none; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem;">
                        ${(col.links || [])
                          .map((l) => `<li><a href="${escapeHtml(resolveSafeHref(l.href, availableSlugs))}" style="transition: color 0.15s;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#94a3b8'">${escapeHtml(l.label)}</a></li>`)
                          .join("")}
                      </ul>
                    </div>`,
                    )
                    .join("")}
                </div>`
              : ""
          }
        </div>
        <div class="footer-copy">
          Published with Bytezora Site Engine
        </div>
      </div>
    </footer>`;

    return [headerHtml, ...sectionParts, `</main>`, footerHtml].join("\n");
  }

  private renderNotFoundHtml(subdomain: string, siteName?: string): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>404 - Page Not Found</title>
    <meta name="robots" content="noindex, nofollow" />
    <style>
      body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
      .box { max-width: 480px; padding: 2rem; }
      h1 { font-size: 4rem; font-weight: 800; color: #3b82f6; margin: 0; }
      h2 { font-size: 1.5rem; margin: 1rem 0 0.5rem; }
      p { color: #94a3b8; font-size: 0.95rem; line-height: 1.6; }
      a { display: inline-block; margin-top: 1.5rem; padding: 0.6rem 1.5rem; background: #3b82f6; color: #fff; border-radius: 9999px; text-decoration: none; font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="box">
      <h1>404</h1>
      <h2>Page Not Found</h2>
      <p>The page you are looking for on ${escapeHtml(siteName || subdomain)} doesn't exist or hasn't been published yet.</p>
      <a href="/">Go to Home</a>
    </div>
  </body>
</html>`;
  }
}

export const liveSiteEngineService = new LiveSiteEngineService();
