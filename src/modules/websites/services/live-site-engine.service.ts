import { prisma } from "../../../config/prisma.js";
import { DomainStatus, WebsiteStatus } from "../../../common/constants/website.js";
import type { PublishSnapshot } from "../types/website.types.js";
import type { Section } from "../types/site-content.types.js";

type CachedPage = {
  html: string;
  statusCode: number;
  contentType: string;
  cachedAt: number;
};

// In-memory cache with 10-minute TTL, purged instantly upon publish
const pageCache = new Map<string, CachedPage>();
const CACHE_TTL_MS = 10 * 60 * 1000;

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
  return String(str).replace(/<\/script>/gi, "<\\/script>");
}

export class LiveSiteEngineService {
  purgeCache(subdomain?: string | null): void {
    if (!subdomain) {
      pageCache.clear();
      return;
    }
    const prefix = subdomain.toLowerCase();
    for (const key of pageCache.keys()) {
      if (key.startsWith(prefix)) {
        pageCache.delete(key);
      }
    }
  }

  async resolveWebsite(identifier: string) {
    const clean = identifier.toLowerCase().trim();
    return prisma.website.findFirst({
      where: {
        OR: [
          { subdomain: clean },
          { domains: { some: { hostname: clean, status: DomainStatus.ACTIVE } } },
        ],
        status: WebsiteStatus.PUBLISHED,
        liveVersionId: { not: null },
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        businessName: true,
        description: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        publishedAt: true,
        domains: {
          where: { status: DomainStatus.ACTIVE },
          orderBy: { isPrimary: "desc" },
          select: { hostname: true },
          take: 1,
        },
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
    return `https://${website.subdomain}.bytezora.site`;
  }

  async renderSitemap(identifier: string): Promise<{ xml: string; statusCode: number }> {
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
      return `  <url>
    <loc>${domain}${slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return { xml, statusCode: 200 };
  }

  async renderRobots(identifier: string): Promise<string> {
    const website = await this.resolveWebsite(identifier);
    const domain = website ? this.getPublicDomain(website) : "https://bytezora.site";

    return `# Robots.txt generated automatically by Bytezora Engine
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
  }

  async renderPage(identifier: string, pathSlug: string): Promise<CachedPage> {
    const cleanSlug = pathSlug === "" || pathSlug === "/" ? "/" : pathSlug.startsWith("/") ? pathSlug : `/${pathSlug}`;
    const cacheKey = `${identifier.toLowerCase()}:${cleanSlug}`;

    const cached = pageCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached;
    }

    const website = await this.resolveWebsite(identifier);
    if (!website || !website.liveVersion) {
      const notFoundHtml = this.renderNotFoundHtml(identifier);
      return { html: notFoundHtml, statusCode: 404, contentType: "text/html; charset=utf-8", cachedAt: Date.now() };
    }

    const snapshot = website.liveVersion.snapshot as unknown as PublishSnapshot;
    const targetPage = snapshot.pages.find((p) => p.slug === cleanSlug) ||
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


    const title = targetPage.seoTitle ||
      (targetPage.slug === "/" ? `${businessName} — Official Website` : `${targetPage.name} | ${businessName}`);
    const description = targetPage.seoDescription || businessDesc || `Welcome to ${businessName}. Discover our services and offers.`;

    // Find prominent image for OG tag
    let ogImageUrl = "";
    for (const sec of targetPage.sections) {
      const d = sec.data as Record<string, unknown>;
      if (d.image && typeof d.image === "object" && "url" in d.image && typeof d.image.url === "string") {
        ogImageUrl = d.image.url;
        break;
      }
      if (typeof d.imageUrl === "string") {
        ogImageUrl = d.imageUrl;
        break;
      }
    }

    // JSON-LD Schemas
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
        description: businessDesc,
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

    // Primary font & colors
    const primaryColor = snapshot.theme?.colors?.primary || "#3b82f6";


    // Generate Body Content with Semantic HTML (Single H1 on page!)
    const bodyContent = this.renderPageSectionsHtml(targetPage.sections, snapshot.header, snapshot.footer, businessName);

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(pageUrl)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:site_name" content="${escapeHtml(businessName)}" />
    ${ogImageUrl ? `<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />` : ""}

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="${escapeHtml(pageUrl)}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${ogImageUrl ? `<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />` : ""}

    <!-- JSON-LD Structured Data for Google Ranking -->
    ${schemaScripts}

    <style>
      :root {
        --color-primary: ${primaryColor};
        --font-body: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: var(--font-body);
        color: #0f172a;
        background-color: #ffffff;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
      }
      a { color: inherit; text-decoration: none; }
      img { max-width: 100%; height: auto; display: block; }
      .container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
      
      /* Navigation Header */
      header.site-header {
        position: sticky; top: 0; z-index: 50;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(8px);
        border-bottom: 1px solid #f1f5f9;
        padding: 1rem 0;
      }
      .nav-row { display: flex; align-items: center; justify-content: space-between; }
      .nav-brand { font-size: 1.25rem; font-weight: 700; color: #0f172a; }
      .nav-links { display: flex; align-items: center; gap: 1.5rem; list-style: none; }
      .nav-links a { font-size: 0.875rem; font-weight: 500; color: #475569; transition: color 0.15s; }
      .nav-links a:hover { color: var(--color-primary); }
      .btn-cta {
        display: inline-flex; align-items: center; justify-content: center;
        background-color: var(--color-primary); color: #ffffff;
        font-weight: 600; font-size: 0.875rem;
        padding: 0.625rem 1.25rem; border-radius: 9999px;
        transition: opacity 0.15s;
      }
      .btn-cta:hover { opacity: 0.9; }

      /* Section Layouts */
      section { padding: 4.5rem 0; }
      .section-badge {
        display: inline-block; font-size: 0.75rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.05em;
        color: var(--color-primary); background: rgba(59, 130, 246, 0.1);
        padding: 0.25rem 0.75rem; border-radius: 9999px; margin-bottom: 1rem;
      }
      h1.hero-title {
        font-size: clamp(2.25rem, 5vw, 3.75rem); font-weight: 800;
        line-height: 1.15; color: #0f172a; margin-bottom: 1.25rem;
      }
      h2.section-title {
        font-size: clamp(1.75rem, 3.5vw, 2.5rem); font-weight: 700;
        line-height: 1.2; color: #0f172a; margin-bottom: 1rem;
      }
      h3.card-title {
        font-size: 1.125rem; font-weight: 600; color: #0f172a; margin-bottom: 0.5rem;
      }
      p.subtitle { font-size: 1.125rem; color: #64748b; max-width: 650px; margin-bottom: 2rem; }
      
      /* Grid Cards */
      .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }
      .card {
        background: #f8fafc; border: 1px solid #e2e8f0;
        border-radius: 1rem; padding: 2rem; transition: transform 0.2s, box-shadow 0.2s;
      }
      .card:hover { transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05); }

      /* FAQ Accordion */
      details.faq-item {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem;
        padding: 1rem 1.25rem; margin-bottom: 0.75rem; cursor: pointer;
      }
      summary.faq-question { font-weight: 600; color: #0f172a; outline: none; }
      .faq-answer { margin-top: 0.75rem; color: #475569; font-size: 0.95rem; }

      /* Footer */
      footer.site-footer {
        background: #0f172a; color: #94a3b8; padding: 3.5rem 0 2rem;
        border-top: 1px solid #1e293b;
      }
      .footer-row { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2rem; }
      .footer-copy { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #1e293b; font-size: 0.8125rem; text-align: center; }
    </style>
  </head>
  <body>
    ${bodyContent}
  </body>
</html>`;

    const result: CachedPage = {
      html: fullHtml,
      statusCode: 200,
      contentType: "text/html; charset=utf-8",
      cachedAt: Date.now(),
    };

    pageCache.set(cacheKey, result);
    return result;
  }

  private renderPageSectionsHtml(
    sections: Section[],
    header: PublishSnapshot["header"],
    footer: PublishSnapshot["footer"],
    siteName: string,
  ): string {
    const parts: string[] = [];

    // Header
    parts.push(`
    <header class="site-header">
      <div class="container nav-row">
        <a href="/" class="nav-brand">${escapeHtml(header?.siteName || siteName)}</a>
        <nav>
          <ul class="nav-links">
            ${(header?.menu || [])
              .map((it) => `<li><a href="${escapeHtml(it.href)}">${escapeHtml(it.label)}</a></li>`)
              .join("")}
            ${
              header?.cta?.label
                ? `<li><a href="${escapeHtml(header.cta.href)}" class="btn-cta">${escapeHtml(header.cta.label)}</a></li>`
                : ""
            }
          </ul>
        </nav>
      </div>
    </header>
    <main>`);

    let hasRenderedH1 = false;

    // Render Each Section
    for (const section of sections) {
      if (section.hidden) continue;
      const d = section.data as Record<string, unknown>;
      const heading = [d.heading, d.title].find((v) => typeof v === "string") as string || "";
      const subheading = [d.subheading, d.subtitle, d.tagline].find((v) => typeof v === "string") as string || "";
      const text = [d.text, d.description, d.body].find((v) => typeof v === "string") as string || "";

      const headingTag = !hasRenderedH1 ? "h1" : "h2";
      const headingClass = !hasRenderedH1 ? "hero-title" : "section-title";
      if (!hasRenderedH1 && heading) hasRenderedH1 = true;

      switch (section.type) {
        case "hero":
          parts.push(`
          <section class="section-hero">
            <div class="container" style="text-align: center; max-width: 900px;">
              ${subheading ? `<span class="section-badge">${escapeHtml(subheading)}</span>` : ""}
              <${headingTag} class="${headingClass}">${escapeHtml(heading || `Welcome to ${siteName}`)}</${headingTag}>
              ${text ? `<p class="subtitle" style="margin: 0 auto 2rem;">${escapeHtml(text)}</p>` : ""}
              ${
                d.button && typeof d.button === "object" && "label" in d.button
                  ? `<a href="${escapeHtml(String((d.button as Record<string, unknown>).href || "#"))}" class="btn-cta" style="font-size: 1rem; padding: 0.8rem 2rem;">${escapeHtml(String((d.button as Record<string, unknown>).label))}</a>`
                  : ""
              }
            </div>
          </section>`);
          break;

        case "features":
        case "services": {
          const items = Array.isArray(d.items) ? d.items : [];
          parts.push(`
          <section class="section-${section.type}">
            <div class="container">
              ${subheading ? `<span class="section-badge">${escapeHtml(subheading)}</span>` : ""}
              <${headingTag} class="${headingClass}">${escapeHtml(heading || (section.type === "services" ? "Our Services" : "Key Features"))}</${headingTag}>
              ${text ? `<p class="subtitle">${escapeHtml(text)}</p>` : ""}
              <div class="grid-3">
                ${items
                  .map((it: Record<string, unknown>) => `
                  <div class="card">
                    <h3 class="card-title">${escapeHtml(String(it.title || ""))}</h3>
                    <p style="color: #64748b; font-size: 0.95rem;">${escapeHtml(String(it.description || it.text || ""))}</p>
                  </div>`)
                  .join("")}
              </div>
            </div>
          </section>`);
          break;
        }

        case "faq": {
          const items = Array.isArray(d.items) ? d.items : [];
          parts.push(`
          <section class="section-faq">
            <div class="container" style="max-width: 800px;">
              ${subheading ? `<span class="section-badge">${escapeHtml(subheading)}</span>` : ""}
              <${headingTag} class="${headingClass}">${escapeHtml(heading || "Frequently Asked Questions")}</${headingTag}>
              ${text ? `<p class="subtitle">${escapeHtml(text)}</p>` : ""}
              <div class="faq-list">
                ${items
                  .map((it: Record<string, unknown>) => `
                  <details class="faq-item">
                    <summary class="faq-question">${escapeHtml(String(it.question || ""))}</summary>
                    <div class="faq-answer">${escapeHtml(String(it.answer || ""))}</div>
                  </details>`)
                  .join("")}
              </div>
            </div>
          </section>`);
          break;
        }

        case "cta":
          parts.push(`
          <section class="section-cta" style="background: #f8fafc; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <div class="container" style="max-width: 750px;">
              <${headingTag} class="${headingClass}">${escapeHtml(heading || "Ready to get started?")}</${headingTag}>
              ${text ? `<p class="subtitle" style="margin: 0 auto 2rem;">${escapeHtml(text)}</p>` : ""}
              ${
                d.button && typeof d.button === "object" && "label" in d.button
                  ? `<a href="${escapeHtml(String((d.button as Record<string, unknown>).href || "#"))}" class="btn-cta">${escapeHtml(String((d.button as Record<string, unknown>).label))}</a>`
                  : ""
              }
            </div>
          </section>`);
          break;

        default:
          if (heading || text) {
            parts.push(`
            <section class="section-generic">
              <div class="container">
                ${heading ? `<${headingTag} class="${headingClass}">${escapeHtml(heading)}</${headingTag}>` : ""}
                ${text ? `<p class="subtitle">${escapeHtml(text)}</p>` : ""}
              </div>
            </section>`);
          }
          break;
      }
    }

    parts.push(`</main>`);

    // Footer
    parts.push(`
    <footer class="site-footer">
      <div class="container">
        <div class="footer-row">
          <div>
            <h3 style="color: #ffffff; font-size: 1.125rem; font-weight: 700; margin-bottom: 0.5rem;">${escapeHtml(footer?.siteName || siteName)}</h3>
            <p style="max-width: 350px; font-size: 0.875rem;">${escapeHtml(footer?.copyright || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`)}</p>
          </div>
        </div>
        <div class="footer-copy">
          Powered by Bytezora Engine
        </div>
      </div>
    </footer>`);

    return parts.join("\n");
  }

  private renderNotFoundHtml(subdomain: string, siteName?: string): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>404 - Page Not Found</title>
    <meta name="robots" content="noindex, follow" />
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
