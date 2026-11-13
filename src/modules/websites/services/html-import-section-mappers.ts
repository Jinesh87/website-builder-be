import { randomUUID } from "node:crypto";
import type * as cheerio from "cheerio";
import { AppError } from "../../../common/errors/AppError.js";
import type {
  HeroData,
  ImageRef,
  LinkRef,
  Section,
  SectionDataMap,
  SectionType,
} from "../types/site-content.types.js";
import type { ContactFieldType, ContactFormField } from "../types/site-content.types.js";
import { CONTACT_FIELD_TYPES } from "../types/site-content.types.js";
import { SAFE_IMAGE_URL, sectionSchema } from "../validators/site-content.validator.js";
import {
  IMPORTABLE_SECTION_TYPES,
  isImportableSectionType,
  type ImportableSectionType,
} from "./html-import-convention.js";

export { IMPORTABLE_SECTION_TYPES, type ImportableSectionType };

const DEFAULT_SETTINGS = { background: "default" as const, hideOnMobile: false };

type CheerioAPI = cheerio.CheerioAPI;
type CheerioEl = ReturnType<CheerioAPI>;

export type MapperContext = {
  htmlPath: string;
  uploaded: Map<string, string>;
  resolveUrl: (fromFile: string, href: string) => string | null;
};

function isImportableType(value: string): value is ImportableSectionType {
  return isImportableSectionType(value);
}

function field($root: CheerioEl, name: string): CheerioEl {
  return $root.find(`[data-wb-field="${name}"]`).first();
}

function fieldText($root: CheerioEl, name: string): string | undefined {
  const text = field($root, name).text().replace(/\s+/g, " ").trim();
  return text || undefined;
}

function fieldBody($root: CheerioEl, name: string): string | undefined {
  const node = field($root, name);
  if (!node.length) return undefined;
  const paragraphs: string[] = [];
  node.find("p").each((_, el) => {
    const t = cheerioText(node, el);
    if (t) paragraphs.push(t);
  });
  if (paragraphs.length > 0) return paragraphs.join("\n\n");
  const text = node.text().replace(/\s+/g, " ").trim();
  return text || undefined;
}

function cheerioText($ctx: CheerioEl, el: unknown): string {
  return $ctx.find(el as never).text().replace(/\s+/g, " ").trim();
}

function isSafeImageUrl(url: string): boolean {
  return SAFE_IMAGE_URL.test(url.trim());
}

function rewriteSrc(ctx: MapperContext, raw: string | undefined): string {
  if (!raw?.trim()) return "";
  const trimmed = raw.trim();
  const resolved = ctx.resolveUrl(ctx.htmlPath, trimmed);
  if (resolved) {
    const mediaUrl = ctx.uploaded.get(resolved.toLowerCase());
    if (mediaUrl) return mediaUrl;
  }
  // Absolute / root / data URIs are kept; unresolved relative files are dropped.
  if (isSafeImageUrl(trimmed)) return trimmed;
  return "";
}

function fieldImage($root: CheerioEl, name: string, ctx: MapperContext): ImageRef | undefined {
  const node = field($root, name);
  if (!node.length) return undefined;
  let src = "";
  let alt = "";
  if (node.is("img")) {
    src = node.attr("src") || "";
    alt = node.attr("alt") || "";
  } else {
    const img = node.find("img").first();
    src = img.attr("src") || node.attr("src") || "";
    alt = img.attr("alt") || node.attr("alt") || "";
  }
  const url = rewriteSrc(ctx, src);
  if (!url) return undefined;
  return { url, alt: alt.trim() };
}

function fieldLink($root: CheerioEl, name: string, fallbackLabel = "Learn more"): LinkRef | undefined {
  const node = field($root, name);
  if (!node.length) return undefined;
  const href = (node.attr("href") || node.find("a").first().attr("href") || "").trim();
  const label = node.text().replace(/\s+/g, " ").trim() || fallbackLabel;
  if (!href && !label) return undefined;
  return { label, href: href || "#" };
}

function itemNodes($root: CheerioEl, listField: string): CheerioEl {
  const container = field($root, listField);
  if (container.length) {
    const nested = container.find("[data-wb-item]");
    if (nested.length) return nested;
    return container.children();
  }
  return $root.find("[data-wb-item]");
}

function bulletList($root: CheerioEl, name: string): string[] {
  const node = field($root, name);
  if (!node.length) return [];
  const items: string[] = [];
  node.find("li").each((_, el) => {
    const t = cheerioText(node, el);
    if (t) items.push(t);
  });
  if (items.length) return items;
  const text = node.text().replace(/\s+/g, " ").trim();
  return text ? text.split(/[|;•]/).map((s) => s.trim()).filter(Boolean) : [];
}

function pickDefined<T extends object>(patch: Partial<T>): Partial<T> {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function merge<T extends object>(defaults: T, patch: Partial<T>): T {
  return { ...defaults, ...pickDefined(patch) };
}

type FeaturesData = SectionDataMap["features"];
type ServicesData = SectionDataMap["services"];
type TextData = SectionDataMap["text"];
type CtaData = SectionDataMap["cta"];
type FaqData = SectionDataMap["faq"];
type TestimonialsData = SectionDataMap["testimonials"];
type GalleryData = SectionDataMap["gallery"];
type SplitData = SectionDataMap["split"];
type StatsData = SectionDataMap["stats"];
type PricingData = SectionDataMap["pricing"];
type TeamData = SectionDataMap["team"];
type MediaData = SectionDataMap["media"];
type LogosData = SectionDataMap["logos"];
type ContactData = SectionDataMap["contact"];

function defaultHero(): HeroData {
  return {
    variant: "centered",
    heading: "Your headline goes here",
    subheading: "Explain in one or two sentences what you offer and who it is for.",
    primaryCta: { label: "Get started", href: "/contact" },
  };
}

function defaultFeatures(): FeaturesData {
  return {
    variant: "pastel-icons",
    heading: "Our Features",
    intro: "Unleash your creativity with a visual collaboration platform.",
    columns: 4,
    mobileColumns: 2,
    items: [
      { icon: "gear", title: "Feature one", description: "Describe this feature." },
      { icon: "user", title: "Feature two", description: "Describe this feature." },
      { icon: "mail", title: "Feature three", description: "Describe this feature." },
    ],
  };
}

function defaultServices(): ServicesData {
  return {
    variant: "cards-grid",
    heading: "Our services",
    columns: 3,
    mobileColumns: 1,
    items: [{ title: "Service", description: "Describe this service." }],
  };
}

function defaultText(): TextData {
  return { heading: "About us", body: "Write a few paragraphs here." };
}

function defaultCta(): CtaData {
  return {
    heading: "Ready to get started?",
    text: "Tell visitors what to do next.",
    button: { label: "Contact us", href: "/contact" },
  };
}

function defaultFaq(): FaqData {
  return {
    heading: "Frequently asked questions",
    items: [{ question: "Add a common question?", answer: "Answer it clearly." }],
  };
}

function defaultTestimonials(): TestimonialsData {
  return {
    heading: "What customers say",
    columns: 3,
    items: [{ quote: "A short customer quote.", name: "Customer", role: "Role" }],
  };
}

function defaultGallery(): GalleryData {
  return {
    heading: "Gallery",
    columns: 3,
    mobileColumns: 1,
    images: [],
  };
}

function defaultSplit(): SplitData {
  return {
    heading: "Explain one key idea",
    body: "Use a short paragraph to describe what makes this part of your offer valuable.",
    bullets: [],
    imagePosition: "right",
  };
}

function defaultStats(): StatsData {
  return {
    items: [
      { value: "10+", label: "Years" },
      { value: "500", label: "Customers" },
    ],
  };
}

function defaultPricing(): PricingData {
  return {
    heading: "Pricing",
    plans: [
      {
        name: "Starter",
        price: "$19",
        period: "/ month",
        features: ["Feature one"],
        cta: { label: "Choose plan", href: "/contact" },
        featured: false,
      },
    ],
  };
}

function defaultTeam(): TeamData {
  return {
    heading: "Meet the team",
    columns: 3,
    mobileColumns: 1,
    members: [{ name: "Team member", role: "Role" }],
  };
}

function defaultMedia(): MediaData {
  return { kind: "image", aspect: "16:9", width: "contained" };
}

function defaultLogos(): LogosData {
  return { heading: "Trusted by", grayscale: true, logos: [] };
}

function defaultContact(): ContactData {
  return {
    heading: "Get in touch",
    text: "We usually reply within one business day.",
    showForm: true,
    submitLabel: "Send message",
  };
}

function mapHero($root: CheerioEl, ctx: MapperContext): HeroData {
  const image = fieldImage($root, "image", ctx);
  return merge(defaultHero(), {
    heading: fieldText($root, "heading"),
    subheading: fieldText($root, "subheading") || fieldText($root, "subtitle"),
    eyebrow: fieldText($root, "eyebrow"),
    primaryCta: fieldLink($root, "primaryCta", "Get started"),
    secondaryCta: fieldLink($root, "secondaryCta", "Learn more"),
    image,
    ...(image ? { variant: "split" as const } : {}),
  });
}

function mapFeatures($root: CheerioEl): FeaturesData {
  const items: FeaturesData["items"] = [];
  const nodes = itemNodes($root, "items");
  nodes.each((i) => {
    const item = nodes.eq(i);
    const title =
      fieldText(item, "title") || item.find("h3,h4,strong").first().text().replace(/\s+/g, " ").trim();
    const description =
      fieldText(item, "description") || item.find("p").first().text().replace(/\s+/g, " ").trim() || "";
    if (!title && !description) return;
    items.push({
      icon: fieldText(item, "icon") || "gear",
      title: title || `Feature ${items.length + 1}`,
      description: description || " ",
    });
  });
  return merge(defaultFeatures(), {
    heading: fieldText($root, "heading"),
    intro: fieldText($root, "intro") || fieldText($root, "subtitle"),
    eyebrow: fieldText($root, "eyebrow"),
    bottomCta: fieldLink($root, "bottomCta"),
    ...(items.length ? { items } : {}),
  });
}

function mapServices($root: CheerioEl): ServicesData {
  const items: ServicesData["items"] = [];
  const nodes = itemNodes($root, "items");
  nodes.each((i) => {
    const item = nodes.eq(i);
    const title = fieldText(item, "title") || item.find("h3,h4").first().text().replace(/\s+/g, " ").trim();
    const description =
      fieldText(item, "description") || item.find("p").first().text().replace(/\s+/g, " ").trim() || "";
    if (!title && !description) return;
    items.push({
      title: title || `Service ${items.length + 1}`,
      description: description || " ",
      badge: fieldText(item, "badge"),
      price: fieldText(item, "price"),
      features: bulletList(item, "features"),
      link: fieldLink(item, "link") || fieldLink(item, "cta"),
    });
  });
  return merge(defaultServices(), {
    heading: fieldText($root, "heading"),
    intro: fieldText($root, "intro"),
    eyebrow: fieldText($root, "eyebrow"),
    bottomCta: fieldLink($root, "bottomCta"),
    ...(items.length ? { items } : {}),
  });
}

function mapText($root: CheerioEl): TextData {
  return merge(defaultText(), {
    heading: fieldText($root, "heading"),
    body: fieldBody($root, "body") || fieldText($root, "body"),
  });
}

function mapCta($root: CheerioEl): CtaData {
  return merge(defaultCta(), {
    heading: fieldText($root, "heading"),
    text: fieldText($root, "text") || fieldText($root, "subheading"),
    button: fieldLink($root, "button", "Contact us") || fieldLink($root, "primaryCta", "Contact us"),
  });
}

function mapFaq($root: CheerioEl): FaqData {
  const items: FaqData["items"] = [];
  const nodes = itemNodes($root, "items");
  if (nodes.length) {
    nodes.each((i) => {
      const item = nodes.eq(i);
      const question =
        fieldText(item, "question") ||
        item.find("h3,h4,summary,strong").first().text().replace(/\s+/g, " ").trim();
      const answer = fieldText(item, "answer") || item.find("p").first().text().replace(/\s+/g, " ").trim() || "";
      if (!question) return;
      items.push({ question, answer: answer || " " });
    });
  } else {
    // <details>/<summary> FAQ markup without data-wb-item wrappers
    const details = $root.find("details");
    details.each((i) => {
      const item = details.eq(i);
      const question =
        fieldText(item, "question") || item.find("summary").first().text().replace(/\s+/g, " ").trim();
      const answer =
        fieldText(item, "answer") || item.find("p").first().text().replace(/\s+/g, " ").trim() || "";
      if (!question) return;
      items.push({ question, answer: answer || " " });
    });
  }
  return merge(defaultFaq(), {
    heading: fieldText($root, "heading"),
    ...(items.length ? { items } : {}),
  });
}

function looksLikeFaq($root: CheerioEl): boolean {
  if ($root.find("[data-wb-field='question'], [data-wb-field=\"question\"]").length) return true;
  return $root.find("details summary").length >= 2;
}

function mapTestimonials($root: CheerioEl, ctx: MapperContext): TestimonialsData {
  const items: TestimonialsData["items"] = [];
  const nodes = itemNodes($root, "items");
  nodes.each((i) => {
    const item = nodes.eq(i);
    const quote =
      fieldText(item, "quote") || item.find("blockquote,p").first().text().replace(/\s+/g, " ").trim();
    const name = fieldText(item, "name") || "Customer";
    if (!quote) return;
    items.push({
      quote,
      name,
      role: fieldText(item, "role"),
      company: fieldText(item, "company"),
      avatar: fieldImage(item, "avatar", ctx),
    });
  });
  return merge(defaultTestimonials(), {
    heading: fieldText($root, "heading"),
    intro: fieldText($root, "intro"),
    eyebrow: fieldText($root, "eyebrow"),
    ...(items.length ? { items } : {}),
  });
}

function mapGallery($root: CheerioEl, ctx: MapperContext): GalleryData {
  // Restrictive: only images marked with data-wb-field="image" (inside data-wb-item when listed).
  const images: GalleryData["images"] = [];
  const nodes = itemNodes($root, "images");
  if (nodes.length) {
    nodes.each((i) => {
      const item = nodes.eq(i);
      const image = fieldImage(item, "image", ctx);
      if (!image) return;
      images.push({
        ...image,
        title: fieldText(item, "title"),
        description: fieldText(item, "caption") || fieldText(item, "description"),
      });
    });
  } else {
    const marked = $root.find('[data-wb-field="image"]');
    marked.each((i) => {
      const node = marked.eq(i);
      const image = fieldImage(node.parent().length ? node.parent() : $root, "image", ctx);
      // fieldImage looks for descendant field; for the node itself:
      const src = node.is("img") ? node.attr("src") : node.find("img").first().attr("src");
      const alt = node.is("img") ? node.attr("alt") : node.find("img").first().attr("alt");
      const url = rewriteSrc(ctx, src || image?.url);
      if (url) images.push({ url, alt: (alt || image?.alt || "").trim() });
    });
  }
  return merge(defaultGallery(), {
    heading: fieldText($root, "heading"),
    intro: fieldText($root, "intro"),
    eyebrow: fieldText($root, "eyebrow"),
    cta: fieldLink($root, "cta") || fieldLink($root, "primaryCta"),
    ...(images.length ? { images } : {}),
  });
}

function mapSplit($root: CheerioEl, ctx: MapperContext): SplitData {
  const position = fieldText($root, "imagePosition");
  const bullets = bulletList($root, "bullets");
  return merge(defaultSplit(), {
    eyebrow: fieldText($root, "eyebrow"),
    heading: fieldText($root, "heading"),
    body: fieldBody($root, "body") || fieldText($root, "body"),
    ...(bullets.length ? { bullets } : {}),
    image: fieldImage($root, "image", ctx),
    imagePosition: position === "left" || position === "right" ? position : undefined,
    cta: fieldLink($root, "cta") || fieldLink($root, "primaryCta"),
  });
}

function mapStats($root: CheerioEl): StatsData {
  const items: StatsData["items"] = [];
  const nodes = itemNodes($root, "items");
  nodes.each((i) => {
    const item = nodes.eq(i);
    const value =
      fieldText(item, "value") || item.find("strong,.value,h3,h4").first().text().replace(/\s+/g, " ").trim();
    const label =
      fieldText(item, "label") || item.find("p,span,small").first().text().replace(/\s+/g, " ").trim();
    if (!value) return;
    items.push({ value, label: label || " " });
  });
  return merge(defaultStats(), items.length ? { items } : {});
}

function mapPricing($root: CheerioEl): PricingData {
  const plans: PricingData["plans"] = [];
  const nodes = itemNodes($root, "plans");
  nodes.each((i) => {
    const item = nodes.eq(i);
    const name = fieldText(item, "name") || item.find("h3,h4").first().text().replace(/\s+/g, " ").trim();
    const price = fieldText(item, "price") || "";
    if (!name) return;
    plans.push({
      name,
      price: price || "—",
      period: fieldText(item, "period"),
      description: fieldText(item, "description"),
      features: bulletList(item, "features"),
      cta: fieldLink(item, "cta") || fieldLink(item, "button"),
      featured: fieldText(item, "featured") === "true" || item.attr("data-featured") === "true",
    });
  });
  return merge(defaultPricing(), {
    heading: fieldText($root, "heading"),
    intro: fieldText($root, "intro"),
    ...(plans.length ? { plans } : {}),
  });
}

function mapTeam($root: CheerioEl, ctx: MapperContext): TeamData {
  const members: TeamData["members"] = [];
  const nodes = itemNodes($root, "members");
  nodes.each((i) => {
    const item = nodes.eq(i);
    const name = fieldText(item, "name") || item.find("h3,h4").first().text().replace(/\s+/g, " ").trim();
    if (!name) return;
    members.push({
      name,
      role: fieldText(item, "role") || " ",
      bio: fieldText(item, "bio"),
      photo: fieldImage(item, "photo", ctx) || fieldImage(item, "image", ctx),
    });
  });
  return merge(defaultTeam(), {
    heading: fieldText($root, "heading"),
    intro: fieldText($root, "intro"),
    ...(members.length ? { members } : {}),
  });
}

function mapMedia($root: CheerioEl, ctx: MapperContext): MediaData {
  const image = fieldImage($root, "image", ctx);
  const rawVideo = fieldText($root, "videoUrl") || field($root, "video").attr("src") || undefined;
  const videoUrl = rawVideo ? rewriteSrc(ctx, rawVideo) : undefined;
  const kind = fieldText($root, "kind") === "video" || videoUrl ? "video" : "image";
  return merge(defaultMedia(), {
    kind,
    image,
    videoUrl,
    caption: fieldText($root, "caption"),
  });
}

function mapLogos($root: CheerioEl, ctx: MapperContext): LogosData {
  // Restrictive: only marked images (data-wb-field=image|logo).
  const logos: ImageRef[] = [];
  const nodes = itemNodes($root, "logos");
  if (nodes.length) {
    nodes.each((i) => {
      const item = nodes.eq(i);
      const image = fieldImage(item, "image", ctx) || fieldImage(item, "logo", ctx);
      if (image) logos.push(image);
    });
  } else {
    const marked = $root.find('[data-wb-field="image"], [data-wb-field="logo"]');
    marked.each((i) => {
      const node = marked.eq(i);
      const src = node.is("img") ? node.attr("src") : node.find("img").first().attr("src");
      const alt = node.is("img") ? node.attr("alt") : node.find("img").first().attr("alt");
      const url = rewriteSrc(ctx, src);
      if (url) logos.push({ url, alt: (alt || "").trim() });
    });
  }
  return merge(defaultLogos(), {
    heading: fieldText($root, "heading"),
    ...(logos.length ? { logos } : {}),
  });
}

function normalizeFormType(raw: string | undefined, inputType: string | undefined): ContactFieldType {
  const candidate = (raw || inputType || "text").toLowerCase();
  if ((CONTACT_FIELD_TYPES as readonly string[]).includes(candidate)) {
    return candidate as ContactFieldType;
  }
  if (candidate === "phone") return "tel";
  if (candidate === "textbox") return "textarea";
  return "text";
}

function mapContactFormFields($root: CheerioEl): ContactFormField[] {
  const form = field($root, "form");
  const scope = form.length ? form : $root;
  const fields: ContactFormField[] = [];
  const marked = scope.find("[data-wb-form-field]");
  marked.each((i) => {
    const node = marked.eq(i);
    const idRaw = (node.attr("data-wb-form-field") || "").trim().toLowerCase();
    const id = idRaw.replace(/[^a-z0-9_-]/g, "").replace(/^[^a-z]+/, "").slice(0, 40);
    if (!id || fields.some((f) => f.id === id)) return;

    const control = node.is("input,textarea,select") ? node : node.find("input,textarea,select").first();
    const formType = normalizeFormType(
      node.attr("data-wb-form-type") || control.attr("data-wb-form-type"),
      control.attr("type"),
    );
    const labelAttr = node.attr("data-wb-form-label") || control.attr("aria-label") || "";
    const nestedLabel = node.find("label").first().text().replace(/\s+/g, " ").trim();
    const ownText = node
      .contents()
      .filter((_, child) => (child as { type?: string }).type === "text")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const label = (labelAttr || nestedLabel || ownText || id).replace(/\s+/g, " ").trim() || id;
    const required =
      node.attr("data-wb-required") === "true" ||
      control.attr("required") !== undefined ||
      control.attr("aria-required") === "true";
    const placeholder = control.attr("placeholder") || undefined;
    let options: string[] | undefined;
    const optionsAttr = node.attr("data-wb-form-options") || control.attr("data-wb-form-options");
    if (optionsAttr) {
      options = optionsAttr.split("|").map((s) => s.trim()).filter(Boolean);
    } else if (control.is("select") || formType === "select") {
      const select = control.is("select") ? control : node.find("select").first();
      options = [];
      select.find("option").each((_, opt) => {
        const text = select.find(opt).text().replace(/\s+/g, " ").trim();
        if (text) options!.push(text);
      });
      if (!options.length) options = undefined;
    }

    fields.push({
      id,
      type: formType,
      label,
      ...(placeholder ? { placeholder } : {}),
      ...(required ? { required: true } : {}),
      ...(options ? { options } : {}),
      width: formType === "textarea" ? "full" : "half",
    });
  });
  return fields.slice(0, 20);
}

function mapContactChannels($root: CheerioEl): ContactData["channels"] {
  const channels: NonNullable<ContactData["channels"]> = [];
  const nodes = itemNodes($root, "channels");
  nodes.each((i) => {
    const item = nodes.eq(i);
    const label = fieldText(item, "label");
    const value = fieldText(item, "value");
    if (!label && !value) return;
    const iconRaw = (item.attr("data-wb-channel-icon") || fieldText(item, "icon") || "").toLowerCase();
    const icon =
      iconRaw === "mail" || iconRaw === "phone" || iconRaw === "chat" || iconRaw === "user" ? iconRaw : undefined;
    channels.push({
      label: label || "Contact",
      value: value || " ",
      ...(icon ? { icon } : {}),
    });
  });
  return channels.length ? channels : undefined;
}

function mapContact($root: CheerioEl): ContactData {
  const showFormAttr = fieldText($root, "showForm");
  const formFields = mapContactFormFields($root);
  const hasForm = field($root, "form").length > 0 || formFields.length > 0;
  const submitFromButton =
    fieldText($root, "submitLabel") ||
    field($root, "form").find("button[type='submit'], button").first().text().replace(/\s+/g, " ").trim();

  return merge(defaultContact(), {
    heading: fieldText($root, "heading"),
    text: fieldText($root, "text") || fieldText($root, "subheading"),
    email: fieldText($root, "email"),
    phone: fieldText($root, "phone"),
    address: fieldText($root, "address"),
    submitLabel: submitFromButton || undefined,
    channels: mapContactChannels($root),
    ...(formFields.length ? { formFields, showForm: true } : {}),
    ...(showFormAttr === "false" ? { showForm: false } : {}),
    ...(showFormAttr === "true" || (hasForm && showFormAttr !== "false") ? { showForm: true } : {}),
  });
}

function mapSectionData(type: ImportableSectionType, $root: CheerioEl, ctx: MapperContext): Section["data"] {
  switch (type) {
    case "hero":
      return mapHero($root, ctx);
    case "features":
      return mapFeatures($root);
    case "services":
      return mapServices($root);
    case "text":
      return mapText($root);
    case "cta":
      return mapCta($root);
    case "faq":
      return mapFaq($root);
    case "testimonials":
      return mapTestimonials($root, ctx);
    case "gallery":
      return mapGallery($root, ctx);
    case "split":
      return mapSplit($root, ctx);
    case "stats":
      return mapStats($root);
    case "pricing":
      return mapPricing($root);
    case "team":
      return mapTeam($root, ctx);
    case "media":
      return mapMedia($root, ctx);
    case "logos":
      return mapLogos($root, ctx);
    case "contact":
      return mapContact($root);
    default: {
      const _exhaustive: never = type;
      throw new AppError(400, `Unsupported section type: ${_exhaustive}`, "IMPORT_SECTION_UNSUPPORTED");
    }
  }
}

function isChromeOnlySection($root: CheerioEl): boolean {
  // Header/footer wrappers tagged as logos/text, or floating WhatsApp-only contact chips.
  if ($root.children("header, footer").length > 0) return true;
  if ($root.find("> header, > footer").length > 0) return true;
  const type = ($root.attr("data-wb-section") || "").trim().toLowerCase();
  if (type === "contact" && !$root.find("[data-wb-field='heading'], form, input, textarea").length) {
    return true;
  }
  if (type === "text" && $root.find(".topbar, .ph").length && !fieldText($root, "heading") && !fieldText($root, "body")) {
    return true;
  }
  return false;
}

function resolveEffectiveType($root: CheerioEl, rawType: ImportableSectionType): ImportableSectionType {
  if ((rawType === "gallery" || rawType === "text" || rawType === "services") && looksLikeFaq($root)) {
    return "faq";
  }
  return rawType;
}

export type MapTaggedOptions = {
  /** Limit mapping to descendants of this root (e.g. one data-view). */
  scope?: CheerioEl;
  /** When true, skip invalid sections instead of failing the whole page. */
  softFail?: boolean;
};

/** Maps `[data-wb-section]` nodes into native builder sections. */
export function mapTaggedSections(
  $: CheerioAPI,
  ctx: MapperContext,
  pageLabel: string,
  options: MapTaggedOptions = {},
): Section[] {
  const scope = options.scope;
  const nodes = scope ? scope.find("[data-wb-section]") : $("[data-wb-section]");
  if (!nodes.length) {
    throw new AppError(
      400,
      `${pageLabel}: no sections found. Mark blocks with data-wb-section="hero" (or features, text, …).`,
      "IMPORT_NO_SECTIONS",
    );
  }

  const sections: Section[] = [];
  nodes.each((index, el) => {
    const $root = $(el);
    // Nested tagged sections are mapped individually; skip outer wrappers that only contain nested ones? keep both if they have fields.
    const rawType = ($root.attr("data-wb-section") || "").trim().toLowerCase();
    if (!rawType) {
      if (options.softFail) return;
      throw new AppError(
        400,
        `${pageLabel}: section #${index + 1} is missing a data-wb-section type.`,
        "IMPORT_SECTION_TYPE_MISSING",
      );
    }
    if (rawType === "header" || rawType === "footer") return;
    if (isChromeOnlySection($root)) return;
    if (!isImportableType(rawType)) {
      if (options.softFail) return;
      throw new AppError(
        400,
        `${pageLabel}: unsupported section type "${rawType}". Supported: ${IMPORTABLE_SECTION_TYPES.join(", ")}.`,
        "IMPORT_SECTION_UNSUPPORTED",
      );
    }

    const effectiveType = resolveEffectiveType($root, rawType);
    const data = mapSectionData(effectiveType, $root, ctx);
    const candidate = {
      id: randomUUID(),
      type: effectiveType as SectionType,
      hidden: false,
      settings: { ...DEFAULT_SETTINGS },
      data,
    };

    const { error, value } = sectionSchema.validate(candidate, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      if (options.softFail) return;
      const detail = error.details.map((d) => d.message).join("; ");
      throw new AppError(
        400,
        `${pageLabel}: ${effectiveType} section #${index + 1} is invalid — ${detail}`,
        "IMPORT_SECTION_INVALID",
      );
    }
    sections.push(value as Section);
  });

  if (sections.length === 0) {
    throw new AppError(
      400,
      `${pageLabel}: no importable sections found (header/footer alone are not enough).`,
      "IMPORT_NO_SECTIONS",
    );
  }

  return sections;
}

/** Pull site header chrome from a logos/header wrapper outside page views. */
export function extractHeaderFromChrome(
  $: CheerioAPI,
  siteName: string,
  ctx: MapperContext,
): HeaderDataLike | null {
  const header = $("header").first();
  if (!header.length) return null;
  const brand = header.find(".brand, [data-wb-field='image']").first();
  const logo =
    fieldImage(header as unknown as CheerioEl, "image", ctx) ||
    (() => {
      const img = header.find("img").first();
      const url = rewriteSrc(ctx, img.attr("src"));
      return url ? { url, alt: img.attr("alt") || siteName } : undefined;
    })();
  const menu: { label: string; href: string }[] = [];
  header.find("nav a, ul a").each((_, el) => {
    const a = $(el);
    const href = (a.attr("href") || "").trim();
    const label = a.text().replace(/\s+/g, " ").trim();
    if (!label || !href || href.startsWith("javascript:")) return;
    // Convert #products SPA hashes into /products page slugs when possible
    const pageHref = href.startsWith("#") && href.length > 1 ? `/${href.slice(1)}` : href;
    if (menu.some((m) => m.href === pageHref || m.label === label)) return;
    menu.push({ label, href: pageHref === "/home" ? "/" : pageHref });
  });
  const cta = fieldLink(header as unknown as CheerioEl, "primaryCta", "Contact");
  void brand;
  return {
    design: "logo-left",
    siteName,
    ...(logo ? { logo } : {}),
    menu: menu.length
      ? menu
      : [
          { label: "Home", href: "/" },
        ],
    sticky: true,
    hidden: false,
    ...(cta ? { cta } : {}),
  };
}

export type HeaderDataLike = {
  design: "logo-left";
  siteName: string;
  logo?: ImageRef;
  menu: { label: string; href: string }[];
  sticky: boolean;
  hidden: boolean;
  cta?: LinkRef;
};

/** Inject catalog items into empty services/gallery sections (from SPA script data). */
export function enrichEmptyCatalogSections(
  sections: Section[],
  catalog: { products?: { title: string; description: string }[]; furniture?: { title: string }[] },
): Section[] {
  return sections.map((section) => {
    if (section.type === "services") {
      const data = section.data as ServicesData;
      if ((!data.items || data.items.length === 0 || data.items.every((i) => i.title === "Service")) && catalog.products?.length) {
        return {
          ...section,
          data: {
            ...data,
            items: catalog.products.map((p) => ({
              title: p.title,
              description: p.description,
            })),
          },
        };
      }
    }
    if (section.type === "gallery") {
      const data = section.data as GalleryData;
      if ((!data.images || data.images.length === 0) && catalog.furniture?.length) {
        // Keep as gallery heading + use services-style text via empty images — convert to services instead
        return {
          ...section,
          type: "services" as SectionType,
          data: {
            ...defaultServices(),
            heading: data.heading || "Furniture",
            intro: data.intro,
            items: catalog.furniture.map((f) => ({
              title: f.title,
              description: "View details or ask for a custom piece.",
            })),
          },
        } as Section;
      }
    }
    return section;
  });
}
