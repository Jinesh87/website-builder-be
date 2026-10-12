import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { env } from "../../../config/env.js";
import { aiSettingsService } from "../../admin-settings/services/ai-settings.service.js";

import { createOpenAiJsonCompletion } from "./openai-json.client.js";
import { liveSiteEngineService } from "./live-site-engine.service.js";
import { websiteService } from "./website.service.js";
import type { PageView, WebsiteDetail } from "../types/website.types.js";


export type GeneratePageSeoInput = {
  pageName?: string;
  pageSlug?: string;
  currentTitle?: string | null;
  currentDescription?: string | null;
  contentSummary?: string | null;
};

export type PageSeoResult = {
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
};

function extractTextSummary(page: PageView): string {
  const snippets: string[] = [];
  snippets.push(`Page Name: "${page.name}" (URL: ${page.slug})`);

  for (const section of page.sections) {
    if (section.hidden) continue;
    const data = section.data as Record<string, unknown>;
    const heading = [data.heading, data.title, data.siteName].find((v) => typeof v === "string");
    const subheading = [data.subheading, data.tagline, data.subtitle].find((v) => typeof v === "string");
    const text = [data.text, data.description, data.body, data.content].find((v) => typeof v === "string");

    if (heading) snippets.push(`Heading: ${heading}`);
    if (subheading) snippets.push(`Subheading: ${subheading}`);
    if (text) snippets.push(`Text: ${typeof text === "string" ? text.slice(0, 160) : ""}`);

    if (Array.isArray(data.items)) {
      const itemTitles = data.items
        .slice(0, 5)
        .map((it) => (it && typeof it === "object" && "title" in it ? String(it.title) : ""))
        .filter(Boolean);
      if (itemTitles.length > 0) snippets.push(`Features/Services: ${itemTitles.join(", ")}`);
    }
  }

  return snippets.slice(0, 12).join("\n");
}

function truncateAtWordBoundary(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > maxLen * 0.6) {
    return truncated.slice(0, lastSpace).replace(/[,;:.!?-]+$/, "").trim();
  }
  return truncated.trim();
}

const SEO_SYSTEM_PROMPT = `You are an elite, world-class SEO strategist and conversion copywriter.
Your goal is to generate accurate, high-CTR, Google-optimized SEO metadata for a specific webpage.

CRITICAL RULES:
1. "seoTitle":
   - Length: Strictly between 40 and 60 characters (never exceed 60 characters).
   - Format: "[Primary Keyword / Page Purpose] | [Business Name]" or "[High-Intent Benefit] - [Business Name]".
   - Must be unique. Never duplicate the titles of other pages in this website.
   - If a target location/city is provided, naturally weave it into the title (e.g. "Roofing in Austin, TX").

2. "seoDescription":
   - Length: Strictly between 120 and 155 characters (never exceed 160 characters).
   - Content: Compelling summary of what the user gets or why they should choose this business, ending with an enticing call to action.
   - Truthful to the page content and business services provided.

3. "keywords":
   - Array of 4 to 6 focused, high-relevance search terms (2-4 words each, e.g. ["emergency plumbing Austin", "residential drain cleaning", "certified local plumber"]).

Respond ONLY with valid JSON in this exact shape:
{
  "seoTitle": string,
  "seoDescription": string,
  "keywords": string[]
}`;

export class AiSeoService {
  async generatePageSeo(
    websiteId: string,
    pageId: string,
    input: GeneratePageSeoInput,
    actor: AuthUser,
  ): Promise<PageSeoResult> {
    const website = await websiteService.get(websiteId, actor);
    const targetPage = website.draft.pages.find((p) => p.id === pageId);

    if (!targetPage) {
      throw new AppError(404, "Page not found", "PAGE_NOT_FOUND");
    }

    const { apiKey, model } = await aiSettingsService.getCredentials(website.clientId);
    if (!apiKey) {
      throw new AppError(
        503,
        "The AI assistant isn't available yet. Ask the administrator to configure AI settings.",
        "AI_NOT_CONFIGURED",
      );
    }

    const run = createOpenAiJsonCompletion({
      apiKey,
      model,
      clientId: website.clientId,
      websiteId: website.id,
      userId: actor.id ?? null,
    });

    const pageSummary = input.contentSummary?.trim() || extractTextSummary(targetPage);
    const businessName = website.info?.businessName || website.name;
    const businessDesc = website.info?.description || "";
    const industry = website.info?.industry || website.info?.websiteType || "";
    const location = website.info?.address || "";

    const otherPages = website.draft.pages
      .filter((p) => p.id !== pageId)
      .map((p) => `"${p.name}" (Slug: ${p.slug}, Title: ${p.seoTitle || "None"})`)
      .slice(0, 10);

    const userPrompt = `Generate optimized Google SEO for this webpage:

BUSINESS:
- Name: "${businessName}"
- Industry / Type: "${industry || "Business"}"
- Target Location / Address: "${location || "Global / Online"}"
- About: "${businessDesc}"

EXISTING OTHER PAGES (DO NOT DUPLICATE THESE TITLES):
${otherPages.length > 0 ? otherPages.join("\n") : "None"}

CURRENT PAGE DETAILS:
- Page Name: "${input.pageName || targetPage.name}"
- URL Path: "${input.pageSlug || targetPage.slug}"
- Current SEO Title: "${input.currentTitle || targetPage.seoTitle || "None"}"
- Current SEO Description: "${input.currentDescription || targetPage.seoDescription || "None"}"
- Owner's target keywords: ${targetPage.seoKeywords.length > 0 ? targetPage.seoKeywords.map((k) => `"${k}"`).join(", ") : "None"}

PAGE CONTENT EXTRACT:
${pageSummary}

Generate the JSON with optimal, non-duplicate "seoTitle", "seoDescription", and "keywords".`;

    const raw = (await run({
      messages: [
        { role: "system", content: SEO_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      maxTokens: 500,
      temperature: 0.3,
      scope: "page_seo",
    })) as Record<string, unknown>;

    let seoTitle = typeof raw.seoTitle === "string" ? raw.seoTitle.trim() : "";
    let seoDescription = typeof raw.seoDescription === "string" ? raw.seoDescription.trim() : "";
    const keywords = Array.isArray(raw.keywords)
      ? raw.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 8)
      : [];

    // Fallback if AI response was empty or too long
    if (!seoTitle) {
      seoTitle = truncateAtWordBoundary(`${targetPage.name} | ${businessName}`, 60);
    } else if (seoTitle.length > 60) {
      seoTitle = truncateAtWordBoundary(seoTitle, 60);
    }

    if (!seoDescription) {
      seoDescription = truncateAtWordBoundary(
        `${businessName} - ${businessDesc || "Professional solutions tailored for your business."}`,
        155,
      );
    } else if (seoDescription.length > 160) {
      seoDescription = truncateAtWordBoundary(seoDescription, 155);
    }

    return { seoTitle, seoDescription, keywords };
  }

  buildSitemapXml(website: Pick<WebsiteDetail, "subdomain" | "customDomain" | "publishedAt" | "draft">): string {
    const domain = website.customDomain
      ? `https://${website.customDomain}`
      : `https://${website.subdomain}.${env.PUBLIC_SITE_DOMAIN}`;

    const visiblePages = website.draft.pages.filter((p) => p.visible);
    const lastMod = (website.publishedAt ?? website.draft.draftUpdatedAt).split("T")[0];

    const urls = visiblePages.map((page) => {
      const cleanSlug = page.slug === "/" ? "" : page.slug.startsWith("/") ? page.slug : `/${page.slug}`;
      const isHome = page.slug === "/";
      const priority = isHome ? "1.0" : "0.8";
      const changefreq = isHome ? "daily" : "weekly";

      return `  <url>
    <loc>${domain}${cleanSlug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`.trim();
  }

  buildRobotsTxt(website: { subdomain: string; customDomain?: string | null }): string {
    const domain = website.customDomain
      ? `https://${website.customDomain}`
      : `https://${website.subdomain}.${env.PUBLIC_SITE_DOMAIN}`;

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

# Sitemap
Sitemap: ${domain}/sitemap.xml
`.trim();
  }

  async getSitemapXml(websiteId: string, actor: AuthUser): Promise<string> {
    const website = await websiteService.get(websiteId, actor);
    return this.buildSitemapXml(website);
  }

  async getRobotsTxt(websiteId: string, actor: AuthUser): Promise<string> {
    const website = await websiteService.get(websiteId, actor);
    return this.buildRobotsTxt(website);
  }

  async getPublicRobotsTxt(subdomain: string): Promise<string> {
    return liveSiteEngineService.renderRobots(subdomain);
  }
}

export const aiSeoService = new AiSeoService();

