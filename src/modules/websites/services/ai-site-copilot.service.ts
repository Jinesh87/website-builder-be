import { randomUUID } from "node:crypto";
import { PageType } from "../../../common/constants/website.js";
import { AppError } from "../../../common/errors/AppError.js";
import { prisma } from "../../../config/prisma.js";
import { MediaKind } from "../../../generated/prisma/enums.js";
import { aiSettingsService } from "../../admin-settings/services/ai-settings.service.js";
import { mediaService } from "../../media/services/media.service.js";
import { describeCatalog, describeSectionTypes } from "../ai/field-catalog.js";
import { describeNavLink, ensureNavLink, navIntent } from "../ai/nav-intent.js";
import type { NavPage } from "../ai/navigation.js";
import { ACCOUNT_SLUG, businessNameOf, findShopPage, shopPage } from "../ai/shop-pages.js";
import {
  MAX_PAGE_SECTIONS,
  compileEdits,
  parseEditReply,
  sectionIssues,
  type CompiledEdits,
  type EditOp,
  type EditReply,
  type ImageNeed,
  type ImageSource,
  type SectionDraft,
} from "../ai/section-edits.js";
import type { GenerationBrief } from "../types/website-generation.types.js";
import type { PageView, WebsiteDetail } from "../types/website.types.js";
import type { AiSuggestionPayload, GenerateAiOptions, SectionEnvelope } from "./ai-generator.service.js";
import { createOpenAiImageGenerator } from "./openai-image.client.js";
import { createOpenAiJsonCompletion, type ChatMessage } from "./openai-json.client.js";
import {
  GENERATED_SECTION_TYPES,
  describeFacts,
  isEditableSectionType,
  isGeneratedSectionType,
  type BriefImage,
  type CleanContext,
  type EditableSectionType,
  type SiteFacts,
} from "./site-generator.js";
import { loadImages, toBriefImage } from "./website-generation.service.js";

/**
 * Editor chat for AI-built websites: grounded in the business details and the original brief.
 * The AI answers with field-level operations (see `ai/section-edits.ts`) that are checked against
 * the section schemas; anything invalid goes back to the AI once to be fixed.
 */

const MAX_LIBRARY_IMAGES = 24;
/** Above this, page sections are summarized instead of sent in full. */
const MAX_PAGE_JSON_CHARS = 40_000;
/** New images per reply; each one takes several seconds and is billed. */
const MAX_GENERATED_IMAGES = 2;

export const IMAGE_SOURCE_QUESTION = "Should I use a photo from your media library or generate a new one with AI?";
const SAVED_IMAGE_NOTE = "The new image was saved to your media library.";
const SEO_NOTE = "Updated the page's SEO title and description.";

/** Creates one image in the owner's library and returns it. */
export type ImageCreator = (description: string, shape: ImageNeed["shape"]) => Promise<BriefImage>;
export type JsonAsk = (messages: ChatMessage[]) => Promise<unknown>;

export type SiteCopilotOptions = Omit<GenerateAiOptions, "clientId" | "websiteId" | "userId"> & {
  website: WebsiteDetail;
  userId: string | null;
};

export type CopilotContext = {
  facts: SiteFacts;
  clean: CleanContext;
  page: PageView | null;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Image URLs and hrefs already on the page, so edits may keep the owner's own media and links. */
function collectExisting(value: unknown, urls: Set<string>, hrefs: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectExisting(item, urls, hrefs);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "url" && typeof child === "string" && child.trim()) urls.add(child.trim());
    else if (key === "href" && typeof child === "string" && child.trim()) hrefs.add(child.trim());
    else collectExisting(child, urls, hrefs);
  }
}

async function loadLibrary(clientId: string, briefIds: string[]): Promise<BriefImage[]> {
  const [briefImages, recent] = await Promise.all([
    loadImages(clientId, briefIds),
    prisma.mediaFile.findMany({
      where: { clientId, kind: MediaKind.IMAGE, id: { notIn: briefIds } },
      orderBy: { createdAt: "desc" },
      take: Math.max(0, MAX_LIBRARY_IMAGES - briefIds.length),
      select: { id: true, fileName: true, altText: true, width: true, height: true },
    }),
  ]);
  return [...briefImages, ...recent.map(toBriefImage)];
}

function answeredImageSource(options: SiteCopilotOptions): boolean {
  const lastAnswer = [...(options.history ?? [])].reverse().find((message) => message.role === "assistant");
  return Boolean(lastAnswer?.content.includes(IMAGE_SOURCE_QUESTION));
}

/** Words that name each image source; a quote claiming a source has to contain one. */
const SOURCE_WORDS: Record<Exclude<ImageSource, "unspecified">, RegExp> = {
  generate: /\b(generat\w*|ai|a\.i\.?|creat\w*)\b/i,
  library: /\b(librar\w*|upload\w*|media|my (own )?(photos?|images?|pictures?|pics?))\b/i,
};

/** The AI's quote of the owner choosing an image source names that source and is in the owner's recent messages. */
function ownerSaid(options: SiteCopilotOptions, source: ImageSource, quote: string): boolean {
  if (source === "unspecified" || !SOURCE_WORDS[source].test(quote)) return false;
  const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();
  const needle = normalize(quote);
  if (needle.length < 3) return false;
  const ownerMessages = [options.prompt, ...(options.history ?? []).filter((m) => m.role === "user").slice(-3).map((m) => m.content)];
  return ownerMessages.some((message) => normalize(message).includes(needle));
}

/** First sentence of an image description, as alt text. */
function altFromDescription(description: string): string {
  const sentence = description.split(/(?<=[.!?])\s/)[0] ?? description;
  return sentence.length <= 125 ? sentence : `${sentence.slice(0, 122).trimEnd()}...`;
}

function describeLibrary(images: BriefImage[], onPage: ReadonlySet<string>): string {
  if (images.length === 0) return "The owner's media library has no photos yet, so new images use GENERATE.";
  return `Photos in the owner's media library:\n${images
    .map((image, index) => `- IMAGE_${index + 1}: ${image.alt || image.fileName}${onPage.has(image.url) ? " (already used on this page)" : ""}`)
    .join("\n")}`;
}

function describeContact(facts: SiteFacts): string {
  const known = [
    facts.contactEmail ? `email ${facts.contactEmail}` : null,
    facts.contactPhone ? `phone ${facts.contactPhone}` : null,
    facts.address ? `address ${facts.address}` : null,
  ].filter(Boolean);
  return known.length > 0 ? known.join(", ") : "none on file";
}

function describeSite(website: WebsiteDetail, page: PageView | null): string {
  const pages = website.draft.pages
    .map((p) => {
      const isCurrent = page && p.id === page.id ? " [CURRENT PAGE]" : "";
      const secSummary = p.sections
        .map((s) => {
          const d = s.data as Record<string, unknown>;
          const heading = (typeof d.heading === "string" ? d.heading : typeof d.siteName === "string" ? d.siteName : typeof d.title === "string" ? d.title : "") || "";
          return heading ? `${s.type}("${heading.slice(0, 30)}")` : s.type;
        })
        .join(", ");
      return `- "${p.name}" (${p.slug})${isCurrent}: sections: [${secSummary || "empty"}]`;
    })
    .join("\n");

  const headerMenu = website.draft.header.menu.map((m) => `${m.label} -> ${m.href}`).join(", ");
  const headerCta = website.draft.header.cta?.label
    ? `Header CTA button: "${website.draft.header.cta.label}" -> ${website.draft.header.cta.href}`
    : "No header CTA button";
  const theme = website.draft.theme;
  const themeSummary = `Theme: primary ${theme.colors.primary}, text ${theme.colors.text}, background ${theme.colors.background}, font ${theme.fonts.heading}`;

  const current = page
    ? `Current active page in editor: "${page.name}" (${page.slug}). SEO title: "${page.seoTitle ?? ""}". SEO description: "${page.seoDescription ?? ""}".`
    : "Current page: unknown.";

  return `SITE PAGES:
${pages}

NAVIGATION & HEADER:
Menu: ${headerMenu || "empty"}
${headerCta}

THEME & STYLE:
${themeSummary}

ACTIVE CONTEXT:
${current}`;
}

/** Instructions shared by every request; first in the prompt so the provider can cache them. */
const INSTRUCTIONS = `You are the AI copilot inside the website editor of a small business. The website was generated by AI from the owner's business details, so every answer and every change must fit THIS business (see BUSINESS): its offer, customers, location and tone of voice. Focus on content that sells the business (headings, descriptions, services, offers, calls to action, FAQs, SEO) as much as on design.

RESPOND IN JSON
{
  "intent": "chat" | "edit" | "look" | "clarify",
  "reply": string,
  "clarification": {
    "question": string,
    "options": [string, ...],
    "allowCustomInput": true
  } | null,
  "look": [sectionId, ...],
  "imageSource": "library" | "generate" | "unspecified",
  "imageSourceQuote": string,
  "ops": [operation, ...],
  "seo": { "title": up to 60 characters, "description": up to 155 characters } | null
}
- "chat": greetings, thanks, feedback, questions, advice, reviews or ideas. "reply" is your answer, in plain text without markdown (numbered lines are fine), with concrete suggestions specific to this business (you may propose exact copy). "ops" is empty.
- "clarify": when the owner's request is genuinely ambiguous or lacks key specifics (e.g. asking for custom pricing tiers without knowing what they are, or requesting complex unprompted features).
  DO NOT CLARIFY when the owner asks to build, create, or generate a landing page, homepage, or complete website (e.g. "build complete landing page", "create landing page", "build website", "design complete page"). For these requests, NEVER ask what sections to include; immediately generate a complete, high-converting page with ALL standard sections (Hero + Features + Services/Content + Testimonials + CTA + FAQ + Contact) using "replace_page".
  Do NOT clarify if the request is already clear, specific, or if the user is answering a previous question.
- "edit": the owner clearly asked for a change (or confirmed a choice after clarification). "reply" is "". Don't tell the owner anything is done: the editor applies and checks each operation, then reports the ones that worked using their "note".
- "look": you need the full content of sections you only have a summary of (e.g. to match, copy or compare with them) before you can answer or edit. List their ids in "look"; "reply" is "" and "ops" is empty. The editor sends their content and you answer again. Never describe, compare or match a section you've only seen summarized.
When unsure whether a change is wanted, use "chat".

OPERATIONS (each has "note": one short sentence for the owner describing exactly what this operation changes)
- { "op": "update", "note", "sectionId", "set": { "<path>": value }, "unset": ["<path>"] }
  Changes only the listed fields of an existing section; everything else stays as it is. A path starts with "data." or "settings." and uses dots for nested fields and list positions, e.g. "data.heading", "data.items.2.title", "settings.customColors.primary". Setting a list position equal to the list length appends an item.
  "unset" removes a field or a list item: removing a picture, button or item is an "unset" of its path (e.g. "unset": ["data.image"]). Never keep something the owner asked to remove.
- { "op": "add", "note", "position": index in the page or null (before the footer), "section": { "type", "settings"?, "data" } } with every required field.
- { "op": "remove", "note", "sectionIds": [...] }
- { "op": "move", "note", "sectionId", "toIndex" }
- { "op": "replace_page", "note", "sections": [{ "type", "settings"?, "data" }] } when the owner asks to build, create, generate, redesign, rebuild or start the page over (e.g. "build complete landing page", "build website", "generate landing page", "rebuild page"); creates 4 to ${MAX_PAGE_SECTIONS} complete, rich, compelling sections (Hero, Features, Services/Content, Testimonials, CTA, FAQ, Contact) between the existing header and footer. A contact section is one of split-form, cards-hub, minimal-editorial or floating-glass, with showForm true so visitors can send an inquiry.
- { "op": "create_page", "note", "page": { "name", "slug"?, "pageType"?, "showInNav"?, "seoTitle"?, "seoDescription"?, "sections": [{ "type", "settings"?, "data" }] } }
  Creates a new page with complete, polished sections matching the site's theme and business (e.g. hero + content/grid/split + cta).
- { "op": "update_page", "note", "pageIdOrSlug", "name"?, "slug"?, "showInNav"?, "seoTitle"?, "seoDescription"?, "sections"?: [...] }
  Updates another page on the website.
- { "op": "delete_page", "note", "pageIdOrSlug" } (except home page "/").
- { "op": "update_navigation", "note", "headerMenu"?: [{ "label", "href" }], "headerCta"?: { "label", "href" }, "footerColumns"?: [{ "title", "links": [{ "label", "href" }] }] }
- { "op": "update_theme", "note", "colors"?: { primary, text, background, accent }, "font"?: string }
Set "seo" when the page's main message changes, or when asked; otherwise null.
Section types that can be created, removed or moved: ${GENERATED_SECTION_TYPES.join(", ")}. The header (site name, logo, menu, button) and footer can only be updated. FIELDS lists the types shown; if you use another type, the editor sends you its fields.

IMAGES
An IMAGE value is one of:
- a library token, e.g. "IMAGE_1", or { "url": "IMAGE_1", "alt": "<alt text>" };
- "GENERATE: <detailed description of a realistic photo for this business, no text or logos>" to create a new image with AI (at most ${MAX_GENERATED_IMAGES} per reply; saved to the owner's library);
- an image URL already on the page.
Never invent image URLs.
"imageSource" records what the OWNER said, not your choice: "library" only if the owner's words pick the library or a library photo, "generate" only if the owner's words ask for a generated, AI-made or new image; otherwise "unspecified". "imageSourceQuote" is the owner's exact words that name the source, e.g. "generate one" or "from my library" ("" when unspecified). Still fill in the image with your best choice; the editor asks the owner where the image should come from when it's unspecified.

RULES & CROSS-PAGE REASONING
- Follow existing pages, design patterns, components, and project conventions by default unless the user specifies otherwise.
- Read each field's note: pick the field whose meaning matches the request (e.g. a picture behind the text is a different field from one beside it).
- Colors: "settings.background" is a preset; a color the owner names goes in "settings.customColors.<role>" as a 6-digit hex.
- To make a section match another, give it the other section's "settings.background" and the same "settings.customColors" (set the ones it has, unset the ones it doesn't). Over a photo background, a section matches by being transparent where its fields allow it.
- Only say something is already done after comparing the actual values on the page; if they differ, it isn't done.
- Write specific, credible, benefit-led copy for this business in its tone of voice. No lorem ipsum or generic filler.
- Don't invent awards, certifications, exact statistics or prices the owner didn't give; testimonials and team members are placeholders the owner will replace.
- Internal links: buttons and links must use valid page slugs (e.g. "/pricing", "/contact", "/about", "/services", "/") or anchors ("#..."). When creating or renaming pages, link them from hero CTAs, navigation menu, and footer as requested.
- The Home page (slug "/") is the website's primary landing page. When the owner asks to create, build, or redesign a "landing page", "homepage", "home", or "complete website", and the active page is Home (or has slug "/"), you MUST build directly on the active page using "replace_page" or "add" operations. NEVER create a separate page named "/landing-page" or "/home" when on the Home page.
- ACTIVE PAGE AWARENESS: If the current active page in the editor matches the requested page (e.g. active page is "Menu" or has slug "/menu", and the owner asks to "create menu page", "build menu page", "generate menu", etc.), you MUST build directly on the active page using "replace_page". NEVER use "create_page" for a page that is already the [CURRENT PAGE] or already exists in SITE PAGES.
- If the current active page has 0 content sections or only a single hero, and the owner asks to build or design a page/website, always build directly on the active page using "replace_page" so they can see and edit it immediately on their canvas.
- HEADER NAVIGATION: When the owner asks to add, link, show or put something in the header, nav, navbar or menu bar ("add a button in nav to this page", "in header i need login", "put About in the menu", "link the Menu item to the menu page"):
  You MUST answer with "edit" and one "update_navigation" operation. "this page" / "current page" means the [CURRENT PAGE] in SITE PAGES. A "button" is "headerCta": { "label", "href" }; anything else is a new item appended to "headerMenu" (send the full menu: every existing item unchanged plus the new one). The href is the target page's slug exactly as listed in SITE PAGES. If the page doesn't exist yet (e.g. a login or account page), add a "create_page" for it in the same reply, then link it. Never answer a header request with "chat" or "clarify".
- FULL COMPLETE PAGE & MULTI-PAGE GENERATION:
  When the owner asks to create, build, generate, redesign or complete a page (e.g. "creat complete matching menu page", "build landing page", "create about page", "generate complete page"):
  1. DO NOT use "clarify". DO NOT ask "What sections do you want?".
  2. ALWAYS use "replace_page" (when on the target page) or "create_page" (when creating a brand new page not in SITE PAGES) with 4-7 rich, complete sections tailored to that specific page type.
  3. RESTAURANT / CAFE / FOOD MENU PAGES ("menu", "menmu", "food menu", "restaurant menu", "dishes", "drink menu"):
     A menu page is NOT a generic homepage or landing page. It must showcase authentic culinary food and drink courses:
     - Culinary Hero / Menu Banner: Rich intro with headline (e.g. "Artisanal Seasonal Menu", "Handcrafted Culinary Offerings"), subtitle highlighting fresh local ingredients, and buttons linking to table reservations or dishes.
     - Course 1: Starters & Small Plates ("services" section, variant "cards-grid" or "split-showcase", showPrices: true, showBadges: true): 3-4 realistic fine-dining appetizers (e.g. Pan-Seared Diver Scallops $24, Burrata & Heirloom Beets $19, Truffle Beef Tartare $22), with rich culinary descriptions, prices, and dietary badges ("Chef's Signature", "Vegetarian", "Gluten-Free").
     - Course 2: Signature Mains & Entrées ("services" section, variant "cards-grid" or "bento-grid", showPrices: true, showBadges: true): 4-6 gourmet mains (e.g. Dry-Aged Prime Ribeye $58, Chilean Sea Bass $48, Truffle Ricotta Gnocchi $32, Duck Breast à l'Orange $42), with detailed ingredients, pricing, and badges ("House Specialty", "Locally Sourced").
     - Course 3: Desserts & Handcrafted Drinks ("services" or "features", showPrices: true): 3-4 artisan desserts & signature cocktails (e.g. Valrhona Dark Chocolate Ganache $16, Tahitian Vanilla Bean Crème Brûlée $14, Smoked Rosemary Old Fashioned $18).
     - Plated Culinary Showcase: A "gallery" or "split" section showcasing food artistry, chef craft, or dining ambiance.
     - Dining Information & FAQ ("faq" section): Answering dietary accommodations (vegan, gluten-free, allergies), table reservations, dress code, private dining.
     - Table Reservation CTA ("cta" section): "Reserve Your Table for an Unforgettable Culinary Experience" with button linking to "/contact" or "#reserve".
  4. LANDING / HOME PAGES:
     - Hero (strong headline, badge, subtitle, primary & secondary action buttons)
     - Features or Services (core benefits/offerings tailored to this business)
     - Content / Split / About (detailed narrative or product showcase)
     - Testimonials (customer quotes and reviews)
     - Call to Action (bold closing conversion banner with button)
     - FAQ (key questions answered)
     - Contact (variant "split-form", "cards-hub", "minimal-editorial" or "floating-glass"; showForm true; email, phone and address from the business facts)
  5. Never generate only a single section when the user asked for a complete page, website, or menu.
  6. SHOP / PRODUCT / ECOMMERCE PAGES ("product page", "shop page", "catalogue", "store"):
     Do NOT clarify and do NOT build a services or cards grid of made-up products. The catalogue is live.
     Create four pages when they are not already in SITE PAGES:
     - "Shop" slug "/shop", showInNav true: a short hero plus one "products" section. products data is only eyebrow, title, subtitle, layout "grid-3", showSearch true, showCategoryFilter true, detailBase "/product", emptyMessage. It lists the real products.
     - "Product" slug "/product", showInNav false: one "product_detail" section with backLabel "All products", backHref "/shop", showDescription true, showStock true. A product opens at /product/its-slug.
     - "Login" slug "/login", showInNav false: one "auth" section (shopper login / register / forgot password). Prefer variant "diagonal-split", social.enabled false, brandName from brand facts, successLink to "/account".
     - "Account" slug "/account", showInNav false: one "account" section (the signed-in customer's orders, cart and profile; visitors who aren't signed in see a sign-in prompt). Set loginHref "/login" and shopHref "/shop".
     Also emit "update_navigation" so the header menu includes { "label": "Shop", "href": "/shop" }, keeping the existing items.
     If the owner is already on the Shop page, use "replace_page" for that page instead of creating a duplicate.
  7. LOGIN / SIGN UP / ACCOUNT PAGES ("login page", "sign up", "register", "customer account", "account page", "my orders"):
     "Login" ("/login") holds one "auth" section; "Account" ("/account") holds one "account" section. Create whichever is missing (both showInNav false); when the owner is on one of them, use "replace_page" or "update" instead. Do not put auth or account sections on the home page.
     The "account" section is a template the owner configures: "variant" picks the layout (sidebar-tabs, top-tabs, overview-cards, minimal-list, dark-panel); showOrders/showCart/showProfile/showPassword choose the panels; the heading, tab labels, empty-state texts and the guest prompt (guestHeading, guestText, guestButtonLabel) are editable copy. It only ever shows a customer their own data, so never write orders or customer names into it.`;

/** What the AI sees of the page: the section types whose fields it gets, and which sections it sees in full. */
export type PromptScope = { types: EditableSectionType[]; fullIds: Set<string>; pageJson: string };

export function promptScope(options: SiteCopilotOptions): PromptScope {
  const editable = pageSections(options).filter((section) => isEditableSectionType(section.type));
  const selected = selectedSection(options);
  const summary = (section: SectionEnvelope) => ({
    id: section.id,
    type: section.type,
    heading: [section.data.heading, section.data.siteName].find((value) => typeof value === "string") ?? "",
  });
  const full = ({ id, type, settings, data }: SectionEnvelope) => ({ id, type, settings, data });

  let shown = selected && isEditableSectionType(selected.type) ? editable.filter((section) => section.id === selected.id) : editable;
  const render = () => JSON.stringify(editable.map((section) => (shown.includes(section) ? full(section) : summary(section))));
  let pageJson = render();
  if (pageJson.length > MAX_PAGE_JSON_CHARS) {
    shown = [];
    pageJson = render();
  }
  return {
    types: [...GENERATED_SECTION_TYPES],
    fullIds: new Set(shown.map((section) => section.id)),
    pageJson,
  };
}

function systemPrompt(website: WebsiteDetail, brief: GenerationBrief | null, context: CopilotContext, scope: PromptScope): string {
  return `${INSTRUCTIONS}

BUSINESS
${describeFacts(context.facts, brief)}
Contact details on file: ${describeContact(context.facts)}.

SITE
${describeSite(website, context.page)}

LIBRARY
${describeLibrary(context.clean.images, context.clean.keepUrls ?? new Set())}

FIELDS (only these exist)
${describeCatalog(scope.types)}`;
}

function userPrompt(options: SiteCopilotOptions, scope: PromptScope): string {
  const selected = selectedSection(options);
  const others = pageSections(options)
    .filter((section) => !isEditableSectionType(section.type))
    .map((section) => section.type);
  const selection = selected
    ? `Selected section (the owner means this one unless they say otherwise): ${selected.id} (${selected.type})`
    : "Selected section: none (whole page)";
  const issues = pageSections(options)
    .filter((section) => scope.fullIds.has(section.id))
    .flatMap((section) => sectionIssues(section).map((issue) => `- ${section.id} (${section.type}): ${issue.message}`));
  return `Owner's request: ${options.prompt}

${selection}
Page sections you can change, in order (sections with only a heading are summarized): ${scope.pageJson}
Other sections on the page: ${others.length > 0 ? others.join(", ") : "none"}${
    issues.length > 0 ? `\nAlready on the page but not shown to visitors (fix when it matters for the request):\n${issues.join("\n")}` : ""
  }`;
}

function buildMessages(options: SiteCopilotOptions, system: string, user: string): ChatMessage[] {
  const past = options.history ?? [];
  // The editor's history already ends with this request, which is sent below with the page context.
  const last = past.at(-1);
  const earlier = last?.role === "user" && last.content.trim() === options.prompt.trim() ? past.slice(0, -1) : past;
  const history = earlier.slice(-10).map((item) => ({ role: item.role, content: item.content.slice(0, 3000) }));
  return [{ role: "system", content: system }, ...history, { role: "user", content: user }];
}

/** Problems to fix, plus the fields and content of any section types or sections the AI hadn't seen yet. */
function repairPrompt(errors: string[], reply: EditReply, options: SiteCopilotOptions, scope: PromptScope): string {
  const sections = pageSections(options);
  const types = new Set<EditableSectionType>();
  const unseen: SectionEnvelope[] = [];
  for (const op of reply.ops) {
    if (op.op === "update") {
      const section = sections.find((candidate) => candidate.id === op.sectionId);
      if (section && isEditableSectionType(section.type)) {
        types.add(section.type);
        if (!scope.fullIds.has(section.id) && !unseen.includes(section)) unseen.push(section);
      }
    } else if (op.op === "add" && isGeneratedSectionType(op.section.type)) {
      types.add(op.section.type);
    } else if (op.op === "replace_page") {
      for (const draft of op.sections) if (isGeneratedSectionType(draft.type)) types.add(draft.type);
    } else if (op.op === "create_page" && op.page?.sections) {
      for (const draft of op.page.sections) if (isGeneratedSectionType(draft.type)) types.add(draft.type);
    }
  }
  const newTypes = [...types].filter((type) => !scope.types.includes(type));
  const extra = [
    newTypes.length > 0 ? `Fields of the other section types you used:\n${describeSectionTypes(newTypes)}` : "",
    unseen.length > 0
      ? `Current content of the sections you changed: ${JSON.stringify(unseen.map(({ id, type, settings, data }) => ({ id, type, settings, data })))}`
      : "",
  ].filter(Boolean);
  return `These parts of your reply can't be applied:
${errors.slice(0, 20).map((error) => `- ${error}`).join("\n")}
${extra.length > 0 ? `\n${extra.join("\n\n")}\n` : ""}
Return the complete corrected JSON reply (all operations, not only the fixed ones). Use only paths and values that exist in the fields.`;
}

/** The full content (and fields) of sections the AI asked to see, and the scope that now includes them. */
function lookPrompt(ids: string[], options: SiteCopilotOptions, scope: PromptScope): { prompt: string; scope: PromptScope } {
  const sections = pageSections(options).filter((section) => ids.includes(section.id) && isEditableSectionType(section.type));
  const newTypes = [...new Set(sections.map((section) => section.type as EditableSectionType))].filter((type) => !scope.types.includes(type));
  const content = JSON.stringify(sections.map(({ id, type, settings, data }) => ({ id, type, settings, data })));
  return {
    prompt: `${sections.length > 0 ? `Full content of the sections you asked for: ${content}` : "None of those ids are sections on this page."}${
      newTypes.length > 0 ? `\n\nTheir fields:\n${describeSectionTypes(newTypes)}` : ""
    }

Now answer the owner's request with "chat" or "edit" (not "look").`,
    scope: {
      ...scope,
      types: [...scope.types, ...newTypes],
      fullIds: new Set([...scope.fullIds, ...sections.map((section) => section.id)]),
    },
  };
}

function sentence(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

/** The owner-facing line for one operation: the AI's note, or a plain description of the operation. */
function describeOp(op: EditOp, sections: SectionEnvelope[]): string {
  if (op.note?.trim()) return sentence(op.note);
  const typeOf = (id: string) => sections.find((section) => section.id === id)?.type ?? "a";
  switch (op.op) {
    case "update":
      return `Updated the ${typeOf(op.sectionId)} section.`;
    case "add":
      return `Added a ${op.section.type} section.`;
    case "remove":
      return op.sectionIds.length === 1 ? `Removed the ${typeOf(op.sectionIds[0]!)} section.` : `Removed ${op.sectionIds.length} sections.`;
    case "move":
      return `Moved the ${typeOf(op.sectionId)} section.`;
    case "replace_page":
      return `Rebuilt the page with ${op.sections.length} sections.`;
    case "create_page":
      return `Created the "${op.page.name}" page.`;
    case "update_page":
      return `Updated the "${op.name || op.pageIdOrSlug}" page.`;
    case "delete_page":
      return `Removed page "${op.pageIdOrSlug}".`;
    case "update_navigation":
      return `Updated navigation menu and links.`;
    case "update_theme":
      return `Updated website theme styling.`;
  }
}

/**
 * What the suggestion really does, written after the operations were applied and checked:
 * only applied operations are reported as done, and the ones that failed are named.
 */
function describeResult(attempt: Attempt, sections: SectionEnvelope[], seo: boolean, generatedImages: number, navNotes: string[] = []): string {
  const done = attempt.compiled.outcomes.filter((outcome) => outcome.applied).map((outcome) => describeOp(outcome.op, sections));
  const createdByNav = new Set(navNotes.filter((note) => note.startsWith("Created the")).map((note) => note));
  if (attempt.compiled.createdPages.length > 0) {
    done.push(
      ...attempt.compiled.createdPages
        .map((p) => `Created the "${p.name}" page (${p.slug}).`)
        .filter((line) => !createdByNav.has(line)),
    );
  }
  if (attempt.compiled.updatedPages.length > 0) {
    done.push(`Updated ${attempt.compiled.updatedPages.length} other page(s).`);
  }
  const describedNav = attempt.compiled.outcomes.some((outcome) => outcome.applied && outcome.op.op === "update_navigation");
  if (attempt.compiled.navigationPatch?.headerMenu && navNotes.length === 0 && !describedNav) {
    done.push(`Updated header navigation menu.`);
  }
  const failed = [
    ...attempt.compiled.outcomes.filter((outcome) => !outcome.applied).map((outcome) => describeOp(outcome.op, sections)),
    ...attempt.droppedNotes.map(sentence),
  ].map((text) => `"${text.replace(/[.!?]$/, "")}"`);
  return [
    ...done,
    seo ? SEO_NOTE : "",
    generatedImages > 0 ? SAVED_IMAGE_NOTE : "",
    failed.length > 0 ? `I couldn't apply ${failed.length === 1 ? "this change" : "these changes"}: ${failed.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** The page the edits apply to; the selected section is always part of it. */
function pageSections(options: SiteCopilotOptions): SectionEnvelope[] {
  const sections = options.currentSections ?? [];
  const selected = selectedSection(options);
  return selected && !sections.some((section) => section.id === selected.id) ? [...sections, selected] : sections;
}

function selectedSection(options: SiteCopilotOptions): SectionEnvelope | null {
  return options.scope === "section" && options.currentSection ? options.currentSection : null;
}

function parseSeo(seo: EditReply["seo"], page: PageView | null): AiSuggestionPayload["seo"] {
  if (!page || !seo) return undefined;
  const seoTitle = seo.title.trim();
  const seoDescription = seo.description.trim();
  if (!seoTitle && !seoDescription) return undefined;
  const next = { seoTitle: seoTitle || page.seoTitle || "", seoDescription: seoDescription || page.seoDescription || "" };
  if (next.seoTitle === (page.seoTitle ?? "") && next.seoDescription === (page.seoDescription ?? "")) return undefined;
  return { pageId: page.id, ...next };
}

export function buildCopilotContext(options: SiteCopilotOptions, images: BriefImage[]): CopilotContext {
  const { website } = options;
  const keepUrls = new Set<string>();
  const keepHrefs = new Set<string>();
  collectExisting(pageSections(options), keepUrls, keepHrefs);

  const pages = website.draft.pages;
  const contactPage = pages.find((candidate) => candidate.pageType === PageType.CONTACT);
  return {
    facts: { name: website.name, ...website.info },
    clean: {
      images,
      slugs: new Set(pages.map((candidate) => candidate.slug)),
      fallbackHref: contactPage?.slug ?? "/",
      keepUrls,
      keepHrefs,
    },
    page: pages.find((candidate) => candidate.id === options.pageId) ?? null,
  };
}

type Attempt = { reply: EditReply; compiled: CompiledEdits; errors: string[]; droppedNotes: string[] };

function check(raw: unknown, options: SiteCopilotOptions, context: CopilotContext, generated?: Map<string, BriefImage>): Attempt {
  const { reply, errors, droppedNotes } = parseEditReply(raw);
  const compiled = compileEdits(reply.ops, {
    sections: pageSections(options),
    facts: context.facts,
    clean: context.clean,
    generated,
    maxGeneratedImages: MAX_GENERATED_IMAGES,
    pages: options.website.draft.pages,
    theme: options.website.draft.theme,
    currentPageId: options.pageId,
    currentPageSlug: context.page?.slug ?? "/",
    headerMenu: options.website.draft.header.menu,
  });
  const problems = [...errors, ...compiled.errors];
  if (reply.intent === "edit" && reply.ops.length === 0 && !reply.seo) {
    problems.push('"intent" is "edit" but "ops" is empty: add the operations that make the change');
  }
  const claimedSource = reply.imageSource !== "unspecified" && !answeredImageSource(options);
  if (compiled.newImages && claimedSource && !ownerSaid(options, reply.imageSource, reply.imageSourceQuote)) {
    problems.push(
      `"imageSource" is "${reply.imageSource}" but "imageSourceQuote" isn't the owner's exact words; copy the words where the owner chose it, or use "unspecified"`,
    );
  }
  return { reply, compiled, errors: problems, droppedNotes };
}

function chatPayload(options: SiteCopilotOptions, text: string): AiSuggestionPayload {
  const reply = text.trim() || "I'm not sure what to change. Could you tell me a bit more?";
  return { id: randomUUID(), prompt: options.prompt, summary: reply, chatReply: reply, target: { scope: "chat" }, before: [], after: [] };
}

/** With photos in the library, the owner picks between a library photo and a new AI image first. */
function imageSourceQuestion(options: SiteCopilotOptions, attempt: Attempt, context: CopilotContext): AiSuggestionPayload | null {
  const library = context.clean.images;
  if (library.length === 0 || !attempt.compiled.newImages) return null;
  const { imageSource, imageSourceQuote } = attempt.reply;
  if (ownerSaid(options, imageSource, imageSourceQuote) || answeredImageSource(options)) return null;
  const suggestions = library.slice(0, 3).map((image) => `- ${image.alt || image.fileName}`);
  return {
    ...chatPayload(options, IMAGE_SOURCE_QUESTION),
    chatReply: `${IMAGE_SOURCE_QUESTION}\n\nPhotos in your library that could work:\n${suggestions.join("\n")}\n\nReply "library" (or name a photo) or "generate".`,
  };
}

/** Pages the header can link to: the site's pages plus the ones this reply creates. */
function navPages(options: SiteCopilotOptions, compiled: CompiledEdits): NavPage[] {
  return [
    ...options.website.draft.pages.map((page) => ({ name: page.name, slug: page.slug })),
    ...compiled.createdPages.map((page) => ({ name: page.name, slug: page.slug })),
  ];
}

/**
 * Makes sure a header request ("add a button in nav to this page", "in header i need login") ends
 * with that link in the header, creating the login/account page when the owner asks for one that
 * doesn't exist yet. Returns the owner-facing lines for what was added.
 */
function applyNavIntent(options: SiteCopilotOptions, compiled: CompiledEdits): string[] {
  const current = options.website.draft.pages.find((page) => page.id === options.pageId);
  const intent = navIntent(options.prompt, navPages(options, compiled), current ? { name: current.name, slug: current.slug } : null);
  if (!intent) return [];

  const notes: string[] = [];
  let link: { label: string; href: string };
  if (intent.target.kind === "page") {
    link = { label: intent.target.page.name, href: intent.target.page.slug };
  } else {
    const business = businessNameOf(options.website);
    const page = shopPage(intent.target.shopPage, business);
    compiled.createdPages.push(page);
    if (intent.target.shopPage === "login" && !findShopPage("account", options.website.draft.pages) && !compiled.createdPages.some((p) => p.slug === ACCOUNT_SLUG)) {
      compiled.createdPages.push(shopPage("account", business));
    }
    link = { label: page.name, href: page.slug };
    notes.push(`Created the "${page.name}" page (${page.slug}).`);
  }

  const header = options.website.draft.header;
  const before = compiled.navigationPatch;
  const menu = header.menu ?? options.website.draft.pages.filter((p) => p.showInNav).map((p) => ({ label: p.name, href: p.slug }));
  compiled.navigationPatch = ensureNavLink(intent, { menu, cta: header.cta?.href ? header.cta : undefined }, before, link);
  if (compiled.navigationPatch !== before) notes.push(describeNavLink(intent, link));
  return notes;
}

/** Whether the prompt is a header request this editor can carry out without the model's help. */
export function hasResolvableNavIntent(options: SiteCopilotOptions): boolean {
  const current = options.website.draft.pages.find((page) => page.id === options.pageId);
  const pages = options.website.draft.pages.map((page) => ({ name: page.name, slug: page.slug }));
  return navIntent(options.prompt, pages, current ? { name: current.name, slug: current.slug } : null) !== null;
}

/** Turns checked edits into a reviewable suggestion. */
export function toCopilotSuggestion(
  options: SiteCopilotOptions,
  attempt: Attempt,
  context: CopilotContext,
  generatedImages = 0,
): AiSuggestionPayload {
  const { reply, compiled } = attempt;
  const seo = parseSeo(reply.seo, context.page);
  const sections = pageSections(options);

  // Header navigation requests always end with the link the owner asked for, whatever the model planned.
  const navNotes = applyNavIntent(options, compiled);

  const hasCrossPage =
    compiled.createdPages.length > 0 ||
    compiled.updatedPages.length > 0 ||
    compiled.deletedPageIds.length > 0 ||
    Boolean(compiled.navigationPatch) ||
    Boolean(compiled.themePatch);

  if (reply.intent === "clarify" && reply.clarification) {
    return {
      id: randomUUID(),
      prompt: options.prompt,
      summary: reply.clarification.question || reply.reply,
      chatReply: reply.reply || reply.clarification.question,
      clarification: reply.clarification,
      target: { scope: "chat" },
      before: [],
      after: [],
    };
  }

  if (compiled.ops.length === 0 && !seo && !hasCrossPage) {
    const failed = describeResult(attempt, sections, false, 0);
    return chatPayload(
      options,
      failed ? `${failed} Try describing it differently.` : "I couldn't make that change on this page. Try describing it differently.",
    );
  }

  const base = {
    id: randomUUID(),
    prompt: options.prompt,
    summary: [...navNotes, describeResult(attempt, sections, Boolean(seo), generatedImages, navNotes)].filter(Boolean).join(" "),
    seo,
    createdPages: compiled.createdPages,
    updatedPages: compiled.updatedPages,
    deletedPageIds: compiled.deletedPageIds,
    navigationPatch: compiled.navigationPatch,
    themePatch: compiled.themePatch,
  };

  const selected = selectedSection(options);
  const onlySelected =
    !hasCrossPage &&
    selected !== null &&
    compiled.ops.length > 0 &&
    compiled.ops.every((op) => op.op === "update" && op.section.id === selected.id);

  if (onlySelected) {
    const updated = compiled.after.find((section) => section.id === selected.id)!;
    return { ...base, target: { scope: "section", sectionId: selected.id }, before: [selected], after: [updated] };
  }

  const target = hasCrossPage
    ? {
        scope: "site" as const,
        createdPageIds: compiled.createdPages.map((p) => p.id),
        affectedPageIds: [options.pageId ?? "", ...compiled.updatedPages.map((p) => p.pageId)].filter(Boolean),
      }
    : compiled.rebuild
      ? { scope: "page" as const, rebuild: true }
      : { scope: "page" as const, rebuild: false, focusSectionId: compiled.changedIds[0] };

  return {
    ...base,
    target,
    before: sections,
    after: compiled.after,
  };
}

/**
 * One copilot turn: ask, check the edits (one repair round with the problems found), confirm the
 * image source, create requested images, and build the suggestion.
 */
export async function runCopilot(
  options: SiteCopilotOptions,
  context: CopilotContext,
  messages: ChatMessage[],
  ask: JsonAsk,
  createImage: ImageCreator,
  scope: PromptScope = promptScope(options),
): Promise<AiSuggestionPayload> {
  let raw = await ask(messages);
  let attempt = check(raw, options, context);
  // A header/menu-bar request is a navigation edit, not a restaurant menu or a page build.
  const isNavRequest = hasResolvableNavIntent(options);
  const isMenuRequest = !isNavRequest && /\b(men\w*|food|dish\w*|dining|restaurant|culinary|cafe|bar|bistro|bakery)\b/i.test(options.prompt);
  const isCompletePageRequest =
    !isNavRequest &&
    (isMenuRequest ||
      /\b(compl\w*|creat\w*|build\w*|make\w*|generat\w*|redesign\w*|rebuild\w*|all\s+sections?|full\s+page|full\s+website|whole\s+page|landing\s*page|website|about|contact|services?|pricing)\b/i.test(
        options.prompt,
      ));

  if (attempt.reply.intent === "clarify" && attempt.reply.clarification) {
    if (isCompletePageRequest) {
      const directive = isMenuRequest
        ? `The owner wants a complete, authentic RESTAURANT MENU page with real culinary dishes, starters, main courses, desserts/drinks, realistic prices ($14-$65), badges (Chef's Signature, Gluten-Free, Vegan), dining FAQ, table reservation CTA, and header navigation linking "Menu" to "/menu". Do NOT create a generic landing page or ask what sections they want. Generate the complete menu page now using "replace_page" and "update_navigation".`
        : `The owner wants a complete page with ALL standard sections matching the requested page type in one shot. Do NOT clarify or ask what sections they want. Generate all sections now using "replace_page".`;
      raw = await ask([
        ...messages,
        { role: "assistant", content: JSON.stringify(raw) },
        {
          role: "user",
          content: directive,
        },
      ]);
      attempt = check(raw, options, context);
    }
  }
  if (attempt.reply.intent === "clarify" && attempt.reply.clarification) {
    return {
      id: randomUUID(),
      prompt: options.prompt,
      summary: attempt.reply.clarification.question || attempt.reply.reply,
      chatReply: attempt.reply.reply || attempt.reply.clarification.question,
      clarification: attempt.reply.clarification,
      target: { scope: "chat" },
      before: [],
      after: [],
    };
  }
  if (attempt.reply.intent === "look") {
    const looked = lookPrompt(attempt.reply.look, options, scope);
    messages = [...messages, { role: "assistant", content: JSON.stringify(raw) }, { role: "user", content: looked.prompt }];
    scope = looked.scope;
    raw = await ask(messages);
    attempt = check(raw, options, context);
    if (attempt.reply.intent === "clarify" && attempt.reply.clarification) {
      return {
        id: randomUUID(),
        prompt: options.prompt,
        summary: attempt.reply.clarification.question || attempt.reply.reply,
        chatReply: attempt.reply.reply || attempt.reply.clarification.question,
        clarification: attempt.reply.clarification,
        target: { scope: "chat" },
        before: [],
        after: [],
      };
    }
    if (attempt.reply.intent === "look") return chatPayload(options, attempt.reply.reply);
  }
  if (attempt.reply.intent === "edit" && attempt.errors.length > 0) {
    raw = await ask([
      ...messages,
      { role: "assistant", content: JSON.stringify(raw) },
      { role: "user", content: repairPrompt(attempt.errors, attempt.reply, options, scope) },
    ]);
    const repaired = check(raw, options, context);
    if (repaired.reply.intent === "chat" || repaired.errors.length <= attempt.errors.length) attempt = repaired;
  }

  // Hallucination Guardrail: ensure menu requests actually generate authentic menu courses and not just a landing hero
  const isBuildRequest = /\b(compl\w*|creat\w*|build\w*|make\w*|generat\w*|redesign\w*|rebuild\w*|matching)\b/i.test(options.prompt);
  if (isMenuRequest && isBuildRequest && attempt.reply.intent === "edit") {
    const allGeneratedSections: SectionDraft[] = [];
    for (const op of attempt.reply.ops) {
      if (op.op === "replace_page") allGeneratedSections.push(...op.sections);
      else if (op.op === "create_page" && op.page?.sections) allGeneratedSections.push(...op.page.sections);
      else if (op.op === "add" && op.section) allGeneratedSections.push(op.section);
    }
    const hasMenuCourses = allGeneratedSections.some((s) => s.type === "services" || s.type === "pricing" || s.type === "features");
    const isTooShort = allGeneratedSections.length <= 1;

    if (isTooShort || !hasMenuCourses) {
      raw = await ask([
        ...messages,
        { role: "assistant", content: JSON.stringify(raw) },
        {
          role: "user",
          content: `You only generated a single generic hero section without any food menu courses. The owner asked for a complete matching RESTAURANT MENU page with authentic menu design (not a generic landing page).
A menu page MUST have 4-6 rich sections:
1. "hero" (Menu Hero Banner: culinary intro, subtitle, button to reserve or view dishes)
2. "services" (Starters & Small Plates with variant "cards-grid", showPrices: true, showBadges: true, and dishes like Pan-Seared Scallops, Burrata, Tartare with prices and culinary descriptions)
3. "services" (Signature Mains & Entrées with variant "cards-grid", showPrices: true, showBadges: true, and dishes like Dry-Aged Ribeye, Chilean Sea Bass, Duck Confit, Truffle Gnocchi with prices)
4. "services" (Artisan Desserts & Handcrafted Drinks with showPrices: true)
5. "faq" (Dining FAQ covering dietary accommodations, reservation policy, dress code)
6. "cta" (Table Reservation CTA: "Reserve Your Table Tonight" with link to /contact or #reserve)
And an "update_navigation" operation linking "Menu" in the header to "/menu".
Generate all sections now using "replace_page" and "update_navigation".`,
        },
      ]);
      attempt = check(raw, options, context);
    }
  }

  // A header link the editor can add itself is never answered with a question or a chat reply.
  if (attempt.reply.intent !== "edit" && hasResolvableNavIntent(options)) {
    attempt = check({ intent: "edit", reply: "", ops: [] }, options, context);
  }

  if (attempt.reply.intent === "clarify" && attempt.reply.clarification) {
    return {
      id: randomUUID(),
      prompt: options.prompt,
      summary: attempt.reply.clarification.question || attempt.reply.reply,
      chatReply: attempt.reply.reply || attempt.reply.clarification.question,
      clarification: attempt.reply.clarification,
      target: { scope: "chat" },
      before: [],
      after: [],
    };
  }
  if (attempt.reply.intent === "chat") return chatPayload(options, attempt.reply.reply);

  const question = imageSourceQuestion(options, attempt, context);
  if (question) return question;

  const needs = attempt.compiled.imageNeeds.slice(0, MAX_GENERATED_IMAGES);
  if (needs.length === 0) return toCopilotSuggestion(options, attempt, context);

  const created = await Promise.all(needs.map((need) => createImage(need.description, need.shape)));
  context.clean.images.push(...created);
  const generated = new Map(needs.map((need, index) => [need.description, created[index]!]));
  return toCopilotSuggestion(options, check(raw, options, context, generated), context, created.length);
}

export class AiSiteCopilotService {
  async generate(options: SiteCopilotOptions): Promise<AiSuggestionPayload> {
    const { website } = options;

    const [generation, { apiKey, model }] = await Promise.all([
      prisma.websiteGeneration.findUnique({ where: { websiteId: website.id }, select: { input: true } }),
      aiSettingsService.getCredentials(website.clientId, options.userId),
    ]);
    if (!apiKey) {
      throw new AppError(503, "The AI assistant isn't available yet. Ask the administrator to set it up.", "AI_NOT_CONFIGURED");
    }
    const run = createOpenAiJsonCompletion({ apiKey, model, clientId: website.clientId, websiteId: website.id, userId: options.userId });
    const generateImage = createOpenAiImageGenerator(
      { apiKey, clientId: website.clientId, websiteId: website.id, userId: options.userId },
      "site_copilot_image",
    );

    const brief = (generation?.input as unknown as GenerationBrief | undefined) ?? null;
    const images = await loadLibrary(website.clientId, brief?.mediaIds ?? []);
    const context = buildCopilotContext(options, images);
    const scope = promptScope(options);
    const messages = buildMessages(options, systemPrompt(website, brief, context, scope), userPrompt(options, scope));

    return runCopilot(
      options,
      context,
      messages,
      (conversation) =>
        run({ messages: conversation, maxTokens: 8000, temperature: 0.4, scope: "site_copilot", signal: options.signal }),
      async (description, shape) => {
        const buffer = await generateImage({ description, shape, signal: options.signal });
        const file = await mediaService.storeGeneratedImage({
          clientId: website.clientId,
          websiteId: website.id,
          userId: options.userId,
          buffer,
          fileName: `ai-${description.slice(0, 60).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "image"}.jpg`,
          altText: altFromDescription(description),
        });
        return toBriefImage(file);
      },
      scope,
    );
  }
}

export const aiSiteCopilotService = new AiSiteCopilotService();
