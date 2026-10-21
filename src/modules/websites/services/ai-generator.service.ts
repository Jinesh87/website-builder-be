import { prisma } from "../../../config/prisma.js";
import { logger } from "../../../config/logger.js";
import { AppError } from "../../../common/errors/AppError.js";
import crypto from "crypto";
import {
  AI_PLAN_RESPONSE_FORMAT,
  MAX_PAGES_PER_REQUEST,
  applyOps,
  parsePlan,
  previewLayout,
  type AiPlan,
  type CanvasOp,
  type LayoutSlot,
  type PlannedOp,
  type SectionEnvelope,
} from "../ai/ai-ops.js";
import { PLANNER_SYSTEM_PROMPT, buildPlannerInput, type SitePlannerContext } from "../ai/ai-planner.js";
import {
  planNavigation,
  readLink,
  readMenu,
  withNavigation,
  type MenuItem,
  type NavPage,
} from "../ai/navigation.js";
import { sanitizeCustomData } from "../ai/custom-section.js";
import { repairSection } from "../ai/repair-section.js";
import { CUSTOM_LIMITS, FEATURE_ICON_COLORS, HERO_VARIANTS, ICON_NAMES } from "../types/site-content.types.js";
import { aiSettingsService } from "../../admin-settings/services/ai-settings.service.js";
import { aiBillingService } from "../../wallet/services/ai-billing.service.js";
import {
  type AiClarification,
  type CreatedPageEdit,
  type NavigationPatchEdit,
  type ThemePatchEdit,
  type UpdatedPageEdit,
} from "../ai/section-edits.js";
import type { PageView, WebsiteDetail } from "../types/website.types.js";
import { isReasoningModel } from "../../../common/constants/ai-models.js";

export type { SectionEnvelope };

export type AiGenerateScope = "section" | "page";

export type AiSuggestionPayload = {
  id: string;
  prompt: string;
  summary: string;
  chatReply?: string;
  clarification?: AiClarification | null;
  target:
    | { scope: "chat" }
    | { scope: "section"; sectionId: string }
    | { scope: "page"; rebuild: boolean; focusSectionId?: string; pageId?: string }
    | { scope: "site"; affectedPageIds?: string[]; createdPageIds?: string[] };
  before: SectionEnvelope[];
  after: SectionEnvelope[];
  createdPages?: CreatedPageEdit[];
  updatedPages?: UpdatedPageEdit[];
  deletedPageIds?: string[];
  navigationPatch?: NavigationPatchEdit;
  themePatch?: ThemePatchEdit;
  /** Proposed SEO for the current page; applied together with the section changes. */
  seo?: { pageId: string; seoTitle: string; seoDescription: string };
};

export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type GenerateAiOptions = {
  prompt: string;
  scope: AiGenerateScope;
  sectionId?: string;
  currentSection?: SectionEnvelope;
  currentSections?: SectionEnvelope[];
  history?: ChatHistoryMessage[];
  /** Page open in the editor. */
  pageId?: string;
  website?: WebsiteDetail;
  clientId?: string;
  websiteId?: string;
  userId?: string;
  signal?: AbortSignal;
};

const COLOR_MAP: Record<string, string> = {
  red: "#dc2626",
  darkred: "#991b1b",
  lightred: "#f87171",
  blue: "#2563eb",
  darkblue: "#1e3a8a",
  lightblue: "#60a5fa",
  green: "#16a34a",
  darkgreen: "#14532d",
  emerald: "#059669",
  teal: "#0d9488",
  cyan: "#0891b2",
  purple: "#9333ea",
  violet: "#7c3aed",
  indigo: "#4f46e5",
  pink: "#db2777",
  yellow: "#ca8a04",
  orange: "#ea580c",
  amber: "#d97706",
  black: "#000000",
  white: "#ffffff",
  gray: "#4b5563",
  darkgray: "#1f2937",
  slate: "#0f172a",
  zinc: "#18181b",
};

export function sanitizeHexColor(val: unknown): string | undefined {
  if (typeof val !== "string") return undefined;
  const trimmed = val.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    const [, r, g, b] = trimmed.split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  const cleanKey = trimmed.replace(/[^a-z]/g, "");
  return COLOR_MAP[cleanKey];
}

export function sanitizeSectionSettings(
  rawSettings: Record<string, unknown> = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    background: "default",
    hideOnMobile: false,
    spacing: "default",
    align: "center",
    ...rawSettings,
  };

  const validBackgrounds = ["default", "surface", "primary", "dark"];
  if (typeof result.background === "string") {
    if (!validBackgrounds.includes(result.background)) {
      const hex = sanitizeHexColor(result.background);
      if (hex) {
        const existingCustom =
          typeof result.customColors === "object" &&
          result.customColors !== null
            ? (result.customColors as Record<string, unknown>)
            : {};
        result.customColors = {
          ...existingCustom,
          background: hex,
        };
      }
      result.background = "default";
    }
  } else {
    result.background = "default";
  }

  // Clean customColors
  if (typeof result.customColors === "object" && result.customColors !== null) {
    const rawCustom = result.customColors as Record<string, unknown>;
    const cleanCustom: Record<string, string> = {};
    for (const key of [
      "background",
      "text",
      "primary",
      "muted",
      "border",
    ] as const) {
      const hex = sanitizeHexColor(rawCustom[key]);
      if (hex) {
        cleanCustom[key] = hex;
      }
    }
    result.customColors =
      Object.keys(cleanCustom).length > 0 ? cleanCustom : undefined;
  } else {
    delete result.customColors;
  }

  return result;
}

function enrichImageAlt(
  altValue: unknown,
  context: {
    heading?: unknown;
    title?: unknown;
    name?: unknown;
    subheading?: unknown;
  },
  defaultKind = "Visual",
): string {
  const genericAltTerms = new Set([
    "image",
    "hero background",
    "team member",
    "product preview",
    "photo",
    "background",
    "thumbnail",
    "preview",
    "avatar",
    "icon",
    "placeholder",
    "",
  ]);

  if (typeof altValue === "string" && altValue.trim()) {
    const trimmed = altValue.trim();
    if (!genericAltTerms.has(trimmed.toLowerCase())) {
      return trimmed.slice(0, 200);
    }
  }

  const primaryTitle = [context.heading, context.title, context.name, context.subheading]
    .find((v) => typeof v === "string" && v.trim().length > 0) as string | undefined;

  if (primaryTitle) {
    const clean = primaryTitle.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 100);
    if (clean) {
      return `${clean} - ${defaultKind}`;
    }
  }

  return `${defaultKind} illustration`;
}

export function sanitizeSectionData(
  type: string,
  rawData: Record<string, unknown> = {},
): Record<string, unknown> {
  if (type === "custom") return sanitizeCustomData(rawData);
  const data = { ...rawData };

  // Normalize common top-level synonyms
  if (data.title && !data.heading) {
    data.heading = data.title;
  }
  if (data.subtitle && !data.subheading) {
    data.subheading = data.subtitle;
  }
  if (data.subtitle && !data.intro) {
    data.intro = data.subtitle;
  }
  if (data.description && !data.intro && type !== "hero") {
    data.intro = data.description;
  }

  const altContext = {
    heading: data.heading,
    title: data.title,
    name: data.name,
    subheading: data.subheading || data.intro,
  };

  // Normalize string image URLs to { url, alt } objects with SEO-rich alt text
  if (typeof data.backgroundImage === "string") {
    data.backgroundImage = data.backgroundImage.trim()
      ? { url: data.backgroundImage.trim(), alt: enrichImageAlt(undefined, altContext, "Hero background") }
      : undefined;
  }
  if (data.backgroundImage && typeof data.backgroundImage === "object") {
    const bg = data.backgroundImage as Record<string, unknown>;
    if (!bg.url || typeof bg.url !== "string" || !bg.url.trim()) {
      delete data.backgroundImage;
    } else {
      bg.url = (bg.url as string).trim();
      bg.alt = enrichImageAlt(bg.alt, altContext, "Hero background");
    }
  }

  if (typeof data.image === "string") {
    data.image = data.image.trim()
      ? { url: data.image.trim(), alt: enrichImageAlt(undefined, altContext, "Showcase feature") }
      : undefined;
  }
  if (data.image && typeof data.image === "object") {
    const img = data.image as Record<string, unknown>;
    if (!img.url || typeof img.url !== "string" || !img.url.trim()) {
      delete data.image;
    } else {
      img.url = (img.url as string).trim();
      img.alt = enrichImageAlt(img.alt, altContext, "Showcase feature");
    }
  }

  if (data.secondaryImage && typeof data.secondaryImage === "object") {
    const img = data.secondaryImage as Record<string, unknown>;
    if (!img.url || typeof img.url !== "string" || !img.url.trim()) {
      delete data.secondaryImage;
    } else {
      img.url = (img.url as string).trim();
      img.alt = enrichImageAlt(img.alt, altContext, "Supplementary detail");
    }
  }

  // Nested members (team)
  if (Array.isArray(data.members)) {
    for (const member of data.members) {
      if (member && typeof member === "object") {
        const m = member as Record<string, unknown>;
        if (m.avatar && typeof m.avatar === "object") {
          const av = m.avatar as Record<string, unknown>;
          av.alt = enrichImageAlt(av.alt, { name: m.name, title: m.role }, "Team member");
        }
      }
    }
  }

  // Nested gallery/service/feature items
  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (item && typeof item === "object") {
        const it = item as Record<string, unknown>;
        if (it.image && typeof it.image === "object") {
          const img = it.image as Record<string, unknown>;
          img.alt = enrichImageAlt(img.alt, { title: it.title || it.name, subheading: it.description }, "Preview");
        }
      }
    }
  }

  // Nested slides (carousel)
  if (Array.isArray(data.slides)) {
    for (const slide of data.slides) {
      if (slide && typeof slide === "object") {
        const sl = slide as Record<string, unknown>;
        if (sl.image && typeof sl.image === "object") {
          const img = sl.image as Record<string, unknown>;
          img.alt = enrichImageAlt(img.alt, { title: sl.title || sl.heading, subheading: sl.subtitle }, "Slide visual");
        }
      }
    }
  }

  // Sanitize links and cta - ensure high-value internal links
  if (data.primaryCta && typeof data.primaryCta === "object") {
    const cta = data.primaryCta as Record<string, unknown>;
    if (!cta.href || typeof cta.href !== "string" || !cta.href.trim() || cta.href === "#") {
      cta.href = type === "hero" ? "/services" : "/contact";
    }
    if (!cta.label || typeof cta.label !== "string" || !cta.label.trim()) {
      cta.label = type === "hero" ? "Explore Services" : "Get Started";
    }
  }
  if (data.secondaryCta && typeof data.secondaryCta === "object") {
    const cta = data.secondaryCta as Record<string, unknown>;
    if (
      !cta.href ||
      typeof cta.href !== "string" ||
      !cta.href.trim() ||
      !cta.label ||
      typeof cta.label !== "string" ||
      !cta.label.trim()
    ) {
      delete data.secondaryCta;
    } else if (cta.href === "#") {
      cta.href = "#features";
    }
  }

  switch (type) {
    case "pricing": {
      const validPricingVariants = [
        "cards-grid",
        "minimal-monochrome",
        "spotlight-tier",
        "horizontal-rows",
      ];
      if (
        typeof data.variant !== "string" ||
        !validPricingVariants.includes(data.variant)
      ) {
        data.variant = "cards-grid";
      }
      if (!data.heading) data.heading = "Transparent, flexible pricing";

      // AI might return tiers instead of plans
      const rawPlans = Array.isArray(data.plans)
        ? data.plans
        : Array.isArray(data.tiers)
          ? data.tiers
          : [];
      if (rawPlans.length > 0) {
        data.plans = rawPlans.map((p: any, idx: number) => ({
          name: typeof p?.name === "string" ? p.name : `Plan ${idx + 1}`,
          price: typeof p?.price === "string" ? p.price : "$29",
          period:
            typeof p?.period === "string"
              ? p.period
              : typeof p?.interval === "string"
                ? p.interval
                : "/mo",
          originalPrice:
            typeof p?.originalPrice === "string" ? p.originalPrice : undefined,
          badge: typeof p?.badge === "string" ? p.badge : undefined,
          description: typeof p?.description === "string" ? p.description : "",
          features: Array.isArray(p?.features)
            ? p.features.map(String)
            : ["All core features included"],
          excludedFeatures: Array.isArray(p?.excludedFeatures)
            ? p.excludedFeatures.map(String)
            : undefined,
          cta:
            p?.cta && typeof p.cta === "object"
              ? p.cta
              : p?.button && typeof p.button === "object"
                ? p.button
                : { label: "Get started", href: "/contact" },
          featured: Boolean(p?.featured ?? p?.highlighted ?? idx === 1),
          highlightNote:
            typeof p?.highlightNote === "string" ? p.highlightNote : undefined,
        }));
      } else {
        data.plans = [
          {
            name: "Starter",
            price: "$29",
            period: "/mo",
            description: "For individuals & emerging projects",
            features: [
              "Up to 5 team members",
              "Standard analytics",
              "Community support",
            ],
            featured: false,
            cta: { label: "Start Free Trial", href: "/contact" },
          },
          {
            name: "Professional",
            price: "$79",
            period: "/mo",
            badge: "Most Popular",
            description: "For fast-scaling teams & modern businesses",
            features: [
              "Unlimited projects",
              "Advanced AI tools",
              "24/7 Priority support",
              "Custom integrations",
            ],
            featured: true,
            cta: { label: "Get Started", href: "/contact" },
          },
          {
            name: "Enterprise",
            price: "$199",
            period: "/mo",
            description: "For established organizations with custom needs",
            features: [
              "Dedicated account manager",
              "Custom SLA & security",
              "SSO & SAML",
              "Unlimited capacity",
            ],
            featured: false,
            cta: { label: "Contact Sales", href: "/contact" },
          },
        ];
      }
      break;
    }

    case "cta": {
      const validCtaVariants = [
        "centered-card",
        "split-visual",
        "floating-card",
        "minimal-editorial",
      ];
      if (
        typeof data.variant !== "string" ||
        !validCtaVariants.includes(data.variant)
      ) {
        data.variant = "centered-card";
      }
      if (!data.heading) data.heading = "Ready to elevate your workflow?";
      if (!data.text && data.description) data.text = data.description;
      if (!data.text)
        data.text =
          "Join thousands of satisfied teams building better web experiences today.";
      const rawBtn = data.button || data.primaryButton || data.cta;
      if (
        !rawBtn ||
        typeof (rawBtn as Record<string, unknown>)?.label !== "string"
      ) {
        data.button = { label: "Get Started Today", href: "/contact" };
      } else {
        data.button = rawBtn;
      }
      break;
    }

    case "features": {
      const validFeaturesVariants = [
        "grid",
        "split",
        "pastel-icons",
        "minimal",
        "cards",
      ];
      if (
        typeof data.variant !== "string" ||
        !validFeaturesVariants.includes(data.variant)
      ) {
        data.variant = "pastel-icons";
      }
      if (!data.heading) data.heading = "Engineered for high performance";
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          {
            icon: "bolt",
            iconColor: "orange",
            title: "Blazing Fast Speed",
            description:
              "Optimized for lightning-quick interaction and responsiveness.",
          },
          {
            icon: "shield",
            iconColor: "green",
            title: "Enterprise Security",
            description:
              "End-to-end encryption with advanced privacy protocols.",
          },
          {
            icon: "sparkles",
            iconColor: "purple",
            title: "Next-Gen AI",
            description:
              "Built-in intelligent automation tailored to your exact needs.",
          },
        ];
      } else {
        data.items = (data.items as any[]).map((item, idx) => ({
          title:
            typeof item?.title === "string" ? item.title : `Feature ${idx + 1}`,
          description:
            typeof item?.description === "string"
              ? item.description
              : "High-impact capabilities designed for modern growth.",
          icon: typeof item?.icon === "string" ? item.icon : "sparkles",
          iconColor: (FEATURE_ICON_COLORS as readonly unknown[]).includes(item?.iconColor) ? item.iconColor : "purple",
          badge: typeof item?.badge === "string" ? item.badge : undefined,
        }));
      }
      if (!data.columns) data.columns = 3;
      if (!data.mobileColumns) data.mobileColumns = 1;
      break;
    }

    case "services": {
      const validServicesVariants = [
        "cards-grid",
        "bento-grid",
        "split-showcase",
        "interactive-list",
        "horizontal-cards",
        "minimal-numbered",
      ];
      if (
        typeof data.variant !== "string" ||
        !validServicesVariants.includes(data.variant)
      ) {
        data.variant = "cards-grid";
      }
      if (!data.heading) data.heading = "Our Core Solutions";
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          {
            title: "Strategic Architecture",
            description:
              "Comprehensive roadmap and blueprinting tailored to business scale.",
          },
          {
            title: "End-to-End Implementation",
            description:
              "Pixel-perfect delivery with clean, production-ready engineering.",
          },
          {
            title: "24/7 Managed Growth",
            description:
              "Continuous optimization, performance monitoring, and proactive support.",
          },
        ];
      }
      if (!data.columns) data.columns = 3;
      if (!data.mobileColumns) data.mobileColumns = 1;
      break;
    }

    case "hero": {
      const validHeroVariants = [
        ...HERO_VARIANTS,
        "split-left",
      ];
      if (
        typeof data.variant !== "string" ||
        !validHeroVariants.includes(data.variant as any)
      ) {
        data.variant = data.backgroundImage ? "background-image" : "centered";
      }
      if (
        data.variant === "background-image" ||
        data.imagePosition === "background"
      ) {
        const bg = data.backgroundImage as Record<string, unknown> | undefined;
        const text = `${data.heading ?? ""} ${data.subheading ?? ""}`;
        if (!bg || typeof bg.url !== "string" || !bg.url.trim() || bg.url.includes("example.com") || bg.url === "https://images.unsplash.com/...") {
          const isFood = /\b(dine|dining|restaurant|food|gourmet|culinary|bistro|cafe|taste)\b/i.test(text);
          data.backgroundImage = {
            url: isFood
              ? "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=85"
              : "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=2000&q=85",
            alt: enrichImageAlt(bg?.alt, altContext, isFood ? "Restaurant interior and dining ambiance" : "Hero Background"),
          };
        }
      }
      const validImagePositions = [
        "right",
        "left",
        "bottom",
        "background",
        "card",
      ];
      if (
        data.imagePosition &&
        !validImagePositions.includes(data.imagePosition as string)
      ) {
        delete data.imagePosition;
      }
      const validBgPositions = ["bottom", "center", "top", "cover"];
      if (
        data.bgImagePosition &&
        !validBgPositions.includes(data.bgImagePosition as string)
      ) {
        delete data.bgImagePosition;
      }
      const validBgOverlays = ["dark", "light", "gradient", "none"];
      if (
        data.bgOverlayType &&
        !validBgOverlays.includes(data.bgOverlayType as string)
      ) {
        delete data.bgOverlayType;
      }
      const validImageStyles = ["mockup", "rounded", "glow", "shadow", "plain"];
      if (
        data.imageStyle &&
        !validImageStyles.includes(data.imageStyle as string)
      ) {
        delete data.imageStyle;
      }
      const validMinHeights = ["auto", "compact", "screen", "tall"];
      if (
        data.minHeight &&
        !validMinHeights.includes(data.minHeight as string)
      ) {
        delete data.minHeight;
      }
      const validAligns = ["center", "left", "right"];
      if (
        data.contentAlign &&
        !validAligns.includes(data.contentAlign as string)
      ) {
        delete data.contentAlign;
      }
      const validBottomShapes = [
        "none",
        "wave",
        "curve",
        "curved",
        "slant",
        "tilt",
        "arch",
        "normal",
      ];
      if (
        data.bottomShape &&
        !validBottomShapes.includes(data.bottomShape as string)
      ) {
        delete data.bottomShape;
      }
      if (!data.heading) data.heading = "Transform Your Digital Vision";
      if (
        !data.primaryCta ||
        typeof (data.primaryCta as Record<string, unknown>)?.label !== "string"
      ) {
        data.primaryCta = { label: "Get Started", href: "/contact" };
      }
      break;
    }

    case "carousel": {
      const validCarouselVariants = [
        "cards",
        "hero-slider",
        "showcase",
        "minimal-editorial",
        "image-gallery",
        "image-strip",
        "image-coverflow",
      ];
      if (
        typeof data.variant !== "string" ||
        !validCarouselVariants.includes(data.variant)
      ) {
        data.variant = "cards";
      }
      if (typeof data.autoplay === "boolean" && data.autoPlay === undefined) {
        data.autoPlay = data.autoplay;
      }
      delete data.autoplay;
      break;
    }

    case "faq": {
      const validFaqVariants = [
        "accordion-classic",
        "two-column-grid",
        "split-sidebar",
        "minimal-numbered",
        "categorized-cards",
      ];
      if (
        typeof data.variant !== "string" ||
        !validFaqVariants.includes(data.variant)
      ) {
        data.variant = "accordion-classic";
      }
      if (!data.heading) data.heading = "Frequently Asked Questions";
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          {
            question: "How quickly can we get started?",
            answer:
              "You can start immediately with our intuitive builder and 1-click publishing.",
          },
          {
            question: "Can I customize the sections later?",
            answer:
              "Yes, every single block, color, and typography style is fully customizable.",
          },
          {
            question: "Is support included?",
            answer:
              "Our dedicated engineering support team is available 24/7 for all tiers.",
          },
        ];
      }
      break;
    }

    case "testimonials": {
      if (!data.heading) data.heading = "Loved by Industry Leaders";
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          {
            quote:
              "This platform completely revolutionized our digital presence in days.",
            name: "Sarah Jenkins",
            role: "VP of Product, Apex Digital",
          },
          {
            quote:
              "The speed, aesthetic quality, and precision are truly second to none.",
            name: "David Chen",
            role: "Founder & CTO, Nexus AI",
          },
        ];
      }
      break;
    }

    case "team": {
      const validTeamVariants = [
        "grid-cards",
        "spotlight-featured",
        "minimal-editorial",
        "glass-overlay",
      ];
      if (
        typeof data.variant !== "string" ||
        !validTeamVariants.includes(data.variant)
      ) {
        data.variant = "grid-cards";
      }
      if (!data.heading) data.heading = "Meet the Minds Behind the Platform";
      if (!data.columns) data.columns = 3;
      if (!data.mobileColumns) data.mobileColumns = 1;
      break;
    }

    case "header": {
      const validHeaderDesigns = [
        "logo-left",
        "centered",
        "classical",
        "minimalist",
        "comprehensive",
        "floating",
        "transparent",
        "glass-dock",
        "split-stacked",
        "mega-menu-grid",
        "side-drawer",
        "headline-ticker",
      ];
      if (
        typeof data.design !== "string" ||
        !validHeaderDesigns.includes(data.design)
      ) {
        data.design = "logo-left";
      }
      if (!data.siteName) {
        data.siteName = "Brand";
      }
      if (!Array.isArray(data.menu) || data.menu.length === 0) {
        data.menu = [
          { label: "Solutions", href: "#features" },
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "#pricing" },
          { label: "About", href: "#about" },
        ];
      } else {
        // Cap menu items at 5 to prevent header overflow and ensure clean spacing
        data.menu = (data.menu as Array<{ label?: string; href?: string }>)
          .slice(0, 5)
          .map((m, idx) => ({
            label:
              typeof m?.label === "string" && m.label.trim()
                ? m.label.trim()
                : `Link ${idx + 1}`,
            href:
              typeof m?.href === "string" && m.href.trim()
                ? m.href.trim()
                : "#",
          }));
      }
      if (
        !data.cta ||
        typeof (data.cta as Record<string, unknown>)?.label !== "string"
      ) {
        data.cta = { label: "Get Started", href: "/contact" };
      }
      data.sticky = Boolean(data.sticky);
      break;
    }

    case "footer": {
      const validFooterDesigns = [
        "columns",
        "simple",
        "mega",
        "newsletter",
        "split",
        "inline",
        "centered",
        "cta-banner",
      ];
      if (
        typeof data.design !== "string" ||
        !validFooterDesigns.includes(data.design)
      ) {
        data.design = "columns";
      }
      if (!data.siteName) {
        data.siteName = "Brand";
      }
      if (!Array.isArray(data.columns) || data.columns.length === 0) {
        data.columns = [
          {
            title: "Product",
            links: [
              { label: "Features", href: "#features" },
              { label: "Pricing", href: "#pricing" },
            ],
          },
          {
            title: "Company",
            links: [
              { label: "About", href: "#about" },
              { label: "Contact", href: "#contact" },
            ],
          },
        ];
      }
      if (!data.copyright) {
        data.copyright = `© ${new Date().getFullYear()} ${data.siteName || "Company"}. All rights reserved.`;
      }
      break;
    }

    case "marquee": {
      const validMarqueeVariants = [
        "ticker-text",
        "cards-stream",
        "pill-badges",
        "dual-directional",
      ];
      if (
        typeof data.variant !== "string" ||
        !validMarqueeVariants.includes(data.variant)
      ) {
        if (
          data.variant === "gradient-pill" ||
          data.variant === "pills" ||
          data.variant === "badges"
        ) {
          data.variant = "pill-badges";
        } else if (data.variant === "cards" || data.variant === "features") {
          data.variant = "cards-stream";
        } else if (data.variant === "dual" || data.variant === "two-way") {
          data.variant = "dual-directional";
        } else {
          data.variant = "ticker-text";
        }
      }
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          { text: "GLOBAL CLOUD SCALE" },
          { text: "ENTERPRISE SECURITY", badge: "SOC2 TYPE II" },
          { text: "AI & ML INTEGRATION" },
          { text: "99.99% UPTIME SLA", badge: "GUARANTEED" },
        ];
      } else {
        data.items = (data.items as any[]).map((item, idx) => ({
          text:
            typeof item?.text === "string" && item.text.trim()
              ? item.text.trim()
              : `Item ${idx + 1}`,
          badge:
            typeof item?.badge === "string" && item.badge.trim()
              ? item.badge.trim()
              : undefined,
          icon: typeof item?.icon === "string" ? item.icon : undefined,
          link: typeof item?.link === "string" ? item.link : undefined,
          subtext:
            typeof item?.subtext === "string" && item.subtext.trim()
              ? item.subtext.trim()
              : undefined,
        }));
      }
      if (data.secondaryItems && Array.isArray(data.secondaryItems)) {
        data.secondaryItems = (data.secondaryItems as any[]).map(
          (item, idx) => ({
            text:
              typeof item?.text === "string" && item.text.trim()
                ? item.text.trim()
                : `Item ${idx + 1}`,
            badge:
              typeof item?.badge === "string" && item.badge.trim()
                ? item.badge.trim()
                : undefined,
            icon: typeof item?.icon === "string" ? item.icon : undefined,
            link: typeof item?.link === "string" ? item.link : undefined,
            subtext:
              typeof item?.subtext === "string" && item.subtext.trim()
                ? item.subtext.trim()
                : undefined,
          }),
        );
      }
      const validSpeeds = ["slow", "normal", "fast"];
      if (data.speed && !validSpeeds.includes(data.speed as string)) {
        data.speed = "normal";
      }
      const validDirections = ["left", "right"];
      if (data.direction && !validDirections.includes(data.direction as string)) {
        data.direction = "left";
      }
      const validFontSizes = ["small", "medium", "large", "huge"];
      if (data.fontSize && !validFontSizes.includes(data.fontSize as string)) {
        delete data.fontSize;
      }
      data.pauseOnHover = Boolean(data.pauseOnHover ?? true);
      data.gradientFades = Boolean(data.gradientFades ?? true);
      break;
    }

    case "contact": {
      const validContactVariants = [
        "split-form",
        "cards-hub",
        "minimal-editorial",
        "floating-glass",
      ];
      if (
        typeof data.variant !== "string" ||
        !validContactVariants.includes(data.variant)
      ) {
        data.variant = "split-form";
      }
      if (!data.heading) data.heading = "Get in touch with us";
      if (typeof data.showForm !== "boolean") data.showForm = true;
      if (!data.submitLabel || typeof data.submitLabel !== "string") {
        data.submitLabel = "Send message";
      }
      const channelIcons = new Set(["mail", "phone", "chat", "user"]);
      if (Array.isArray(data.channels)) {
        data.channels = data.channels.flatMap((channel) => {
          if (!channel || typeof channel !== "object") return [];
          const item = channel as Record<string, unknown>;
          if (typeof item.label !== "string" || typeof item.value !== "string") return [];
          return [
            {
              label: item.label,
              value: item.value,
              ...(typeof item.description === "string" ? { description: item.description } : {}),
              ...(typeof item.icon === "string" && channelIcons.has(item.icon) ? { icon: item.icon } : {}),
            },
          ];
        }).slice(0, 6);
      }
      if (Array.isArray(data.serviceOptions)) {
        data.serviceOptions = data.serviceOptions.filter((option) => typeof option === "string").slice(0, 8);
      }
      break;
    }

    case "media": {
      if (data.kind !== "image" && data.kind !== "video") {
        data.kind = data.videoUrl ? "video" : "image";
      }
      const validAspects = ["16:9", "4:3", "1:1"];
      if (!validAspects.includes(data.aspect as string)) {
        data.aspect = "16:9";
      }
      const validWidths = ["contained", "wide"];
      if (!validWidths.includes(data.width as string)) {
        data.width = "contained";
      }
      break;
    }

    case "stats": {
      if (!data.heading) data.heading = "Proven Impact & Scale";
      if (!Array.isArray(data.items) || data.items.length === 0) {
        data.items = [
          { value: "99.99%", label: "Uptime Guaranteed" },
          { value: "50M+", label: "Requests Processed" },
          { value: "24/7", label: "Dedicated Support" },
        ];
      } else {
        data.items = (data.items as any[]).map((item, idx) => ({
          value:
            typeof item?.value === "string" && item.value.trim()
              ? item.value.trim()
              : "100%",
          label:
            typeof item?.label === "string" && item.label.trim()
              ? item.label.trim()
              : `Metric ${idx + 1}`,
        }));
      }
      break;
    }

    case "gallery": {
      if (!data.columns || typeof data.columns !== "number") data.columns = 3;
      if (!data.mobileColumns || typeof data.mobileColumns !== "number") {
        data.mobileColumns = 1;
      }
      if (!Array.isArray(data.images)) data.images = [];
      break;
    }

    case "logos": {
      if (typeof data.grayscale !== "boolean") data.grayscale = true;
      if (!Array.isArray(data.logos)) data.logos = [];
      break;
    }

    case "split": {
      if (!data.heading) data.heading = "Built for modern workflows";
      if (typeof data.body !== "string") data.body = "";
      if (!Array.isArray(data.bullets)) {
        data.bullets = ["High performance architecture", "Enterprise-grade security"];
      }
      if (data.imagePosition !== "left" && data.imagePosition !== "right") {
        data.imagePosition = "left";
      }
      break;
    }

    case "text": {
      if (typeof data.body !== "string") data.body = "";
      break;
    }
  }

  return data;
}

const SECTION_SCHEMAS_GUIDE = `
SEO, ACCESSIBILITY & LINKING RULES:
- IMAGE ALT TEXT: Every image object MUST include a descriptive, keyword-rich "alt" property explaining what the image depicts with relevance to the brand (e.g. "Warm artisan sourdough loaves on wooden bakery counter at Dolce Bakehouse"). NEVER use generic words like "Image", "Hero Background", "Photo", "Preview", or "Team Member".
- INTERNAL LINKING: All CTA buttons and links must use meaningful internal routes (e.g. href: "/services", "/contact", or anchor links like "#features", "#faq", "#pricing"). Avoid dead ends or unlinked buttons.

VALID SECTION SCHEMAS & EXACT FIELD KEYS:
1. "hero":
   data: {
     "variant": "background-image"|"centered"|"split"|"split-left"|"gradient"|"soft-card"|"floating-cards"|"asymmetric"|"curved-carousel"|"curved-bottom"|"minimal-typography"|"video-bg",
     "heading": "...",
     "highlightText": "...",
     "subheading": "...",
     "description": "...",
     "eyebrow": "...",
     "badgeIcon": "...",
     "primaryCta": { "label": "Get Started", "href": "/contact" },
     "secondaryCta": { "label": "Learn More", "href": "#features" },
     "image": { "url": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80", "alt": "Product preview" },
     "backgroundImage": { "url": "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=2000&q=80", "alt": "Hero Background" },
     "imagePosition": "background"|"right"|"left"|"bottom"|"card",
     "bgImagePosition": "cover"|"center"|"top"|"bottom",
     "bgOverlayType": "dark"|"gradient"|"light"|"none",
     "overlayOpacity": 50,
     "overlayBlur": false,
     "minHeight": "screen"|"tall"|"compact"|"auto",
     "contentAlign": "center"|"left"|"right"
   }
2. "features":
   data: { "variant": "pastel-icons"|"grid"|"split"|"cards"|"minimal", "heading": "...", "intro": "...", "columns": 3, "items": [ { "icon": "bolt"|"star"|"shield"|"rocket"|"layers"|"sparkles"|"check", "iconColor": "orange"|"green"|"yellow"|"cyan"|"purple", "title": "...", "description": "...", "badge": "..." } ] }
3. "services":
   data: { "variant": "cards-grid"|"bento-grid"|"split-showcase"|"interactive-list"|"horizontal-cards"|"minimal-numbered", "heading": "...", "intro": "...", "columns": 3, "items": [ { "title": "...", "description": "...", "badge": "...", "features": ["..."] } ] }
4. "stats":
   data: { "heading": "...", "items": [ { "value": "99.9%", "label": "Uptime Guarantee" } ] }
5. "pricing":
   data: {
     "variant": "cards-grid"|"minimal-monochrome"|"spotlight-tier"|"horizontal-rows",
     "heading": "...",
     "intro": "...",
     "plans": [
       { "name": "Starter", "price": "$29", "period": "/mo", "badge": "Popular", "featured": true, "features": ["Feature 1", "Feature 2"], "cta": { "label": "Get started", "href": "/contact" } }
     ]
   }
6. "testimonials":
   data: { "heading": "...", "items": [ { "quote": "...", "name": "...", "role": "..." } ] }
7. "team":
   data: { "variant": "grid-cards"|"spotlight-featured"|"minimal-editorial"|"glass-overlay", "heading": "...", "intro": "...", "columns": 3, "members": [ { "name": "...", "role": "...", "bio": "...", "avatar": { "url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80", "alt": "Team Member" } } ] }
8. "marquee":
   data: { "variant": "ticker-text"|"cards-stream"|"pill-badges"|"dual-directional", "speed": "normal", "direction": "left", "items": [ { "text": "...", "badge": "..." } ] }
9. "carousel":
   data: {
     "variant": "hero-slider"|"cards"|"showcase"|"minimal-editorial"|"image-gallery"|"image-strip"|"image-coverflow",
     "heading": "...", "intro": "...", "autoPlay": true, "interval": 5,
     "slides": [ { "title": "...", "subtitle": "...", "description": "...", "badge": "...", "image": { "url": "https://images.unsplash.com/...", "alt": "..." }, "button": { "label": "Get started", "href": "/contact" } } ]
   }
   "hero-slider" is a full-width hero banner slider: give every slide a large background image, a punchy title, a description and a button.
10. "faq":
   data: { "variant": "accordion-classic"|"two-column-grid"|"split-sidebar"|"minimal-numbered"|"categorized-cards", "heading": "...", "intro": "...", "items": [ { "question": "...", "answer": "..." } ] }
11. "cta":
   data: { "variant": "centered-card"|"split-visual"|"floating-card"|"minimal-editorial", "heading": "...", "text": "...", "button": { "label": "Get started", "href": "/contact" } }
12. "header":
   data: { "design": "logo-left"|"centered"|"classical"|"minimalist"|"floating", "siteName": "...", "menu": [ { "label": "Home", "href": "/" }, { "label": "About", "href": "/about" } ], "sticky": false }
   settings: { "customColors": { "background": "#rrggbb" } }
13. "custom" (free-form layout composed from blocks; use it for designs no standard section can express):
   data: { "width": "contained"|"wide", "align": "start"|"center", "blocks": [Block, ...] }
   Block is exactly one of:
   { "type": "stack", "direction": "column"|"row", "gap": "sm"|"md"|"lg", "align": "start"|"center"|"end", "children": [Block] }
   { "type": "grid", "columns": 1|2|3|4, "gap": "sm"|"md"|"lg", "align": "start"|"center", "children": [Block] }
   { "type": "card", "tone": "default"|"muted"|"primary"|"glass", "children": [Block] }
   { "type": "heading", "text": "...", "level": 1|2|3 }
   { "type": "text", "text": "...", "size": "sm"|"md"|"lg", "muted": true|false }
   { "type": "badge", "text": "..." }
   { "type": "button", "label": "...", "href": "/contact", "tone": "primary"|"secondary" }
   { "type": "image", "url": "https://images.unsplash.com/...", "alt": "...", "aspect": "auto"|"square"|"video"|"portrait" }
   { "type": "icon", "name": ${ICON_NAMES.map((n) => `"${n}"`).join("|")} }
   { "type": "list", "items": ["..."] }
   Limits: at most ${CUSTOM_LIMITS.maxDepth} nesting levels, ${CUSTOM_LIMITS.maxBlocks} blocks in total and ${CUSTOM_LIMITS.maxChildren} children per container.
   Use "grid" for side-by-side columns (it collapses to one column on mobile), "stack" with direction "row" for button groups, and "card" for boxed content.
14. "contact" (a real inquiry form plus contact details; email and phone also render as mailto:/tel: links):
   data: { "variant": "split-form"|"cards-hub"|"minimal-editorial"|"floating-glass", "eyebrow": "...", "heading": "...", "text": "...", "email": "...", "phone": "...", "address": "...", "officeHours": "...", "responseTime": "...", "showForm": true, "formHeading": "Send us a message", "submitLabel": "Send message", "serviceOptions": ["..."], "channels": [{ "label": "Sales", "value": "<business email or phone>", "description": "...", "icon": "mail"|"phone"|"chat"|"user" }], "cardStyle": "default"|"bordered"|"flat"|"glass"|"elevated"|"contrast", "align": "left"|"center" }
   Pick a variant: "split-form" is the side-by-side inquiry form, "cards-hub" is department cards plus the form, "minimal-editorial" is a typographic split, "floating-glass" is a framed glass card.
   "showForm": true adds name, email and message fields. Submissions are emailed to the site owner. Use the brand's real email, phone and address from the brand facts; leave a field out if it is unknown instead of inventing one. Channel values must be that same email or phone.
   Never use "custom" blocks to imitate a contact or signup form.

STOCK / DUMMY IMAGE GUIDELINES:
- Tech / Dark Hero: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=2000&q=80"
- Modern Architecture / Living: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=80"
- Vibrant Gradient: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=2000&q=80"
- SaaS Dashboard / Analytics: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"
- Restaurant / Fine Dining / Gourmet: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2000&q=85"
- Food & Culinary Presentation: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=2000&q=85"
`;

const SYSTEM_PROMPT_ADD_SECTION = `You are a world-class AI website copywriter and UI designer.
Your job is to generate a single brand new, pixel-perfect website section based on user instructions.

CRITICAL RULES:
1. Always output ONLY valid JSON without Markdown code fences.
2. Provide rich, highly converting, realistic copy. Never use placeholder text. When brand facts are given, use them exactly and never invent another brand name, email, phone number or address.
${SECTION_SCHEMAS_GUIDE}
3. Output format must be:
{
  "summary": "Brief 1-sentence summary of the new section created",
  "type": "<the requested section type>",
  "settings": { "background": "default", "hideOnMobile": false, "spacing": "default" },
  "data": { ... }
}`;

const SYSTEM_PROMPT_SECTION_EDIT = `You are a world-class AI website copywriter and UI designer for a modern 2026 website builder.
Your job is to update content, images, background media, or styling for an existing single website section based on user instructions.

CRITICAL RULES:
1. Always output ONLY valid JSON without Markdown code fences, conforming strictly to the requested schema.
2. Provide compelling, conversion-focused, modern copy. Do NOT use placeholder text.
3. SECTION SETTINGS & COLOR RULES:
   - "settings.background" MUST only be one of: "default", "surface", "primary", "dark".
   - If the user specifies a specific custom color (e.g. "red", "purple", "navy", "green", "black"), put it in "settings.customColors.background" as a valid 6-digit hex string (e.g. "#dc2626", "#7c3aed", "#0f172a", "#16a34a", "#000000").
4. BACKGROUND IMAGES & DUMMY IMAGES:
   - If the user asks to add a background image, cover image, or dummy image to this section, supply a valid Unsplash photo URL in "data.backgroundImage" (or "data.image"), and set appropriate "imagePosition": "background", "variant": "background-image", "bgImagePosition": "cover", "bgOverlayType": "dark", "overlayOpacity": 50.
${SECTION_SCHEMAS_GUIDE}
5. Output format must be:
{
  "summary": "Brief 1-sentence summary of what was changed",
  "data": { ...updated section data object... },
  "settings": {
    "background": "default"|"surface"|"primary"|"dark",
    "customColors": {
      "background": "#rrggbb",
      "text": "#rrggbb"
    }
  }
}`;

const SYSTEM_PROMPT_PAGE = `You are a world-class AI website designer and conversion copywriter for a modern website builder.
Your job is to generate a complete page as an ordered list of sections, matching exactly the requested section types and order.

CRITICAL RULES:
1. Always output ONLY valid JSON without Markdown code fences.
2. Provide rich, realistic, high-converting copy. Never use placeholder text.
3. Keep the brand name, tone and visual style consistent across all sections. When brand facts are given, use them exactly and never invent another brand name, email, phone number or address.
4. Write for the page named in the brief. A menu page lists real dishes with descriptions and prices, an about page tells the brand story, a contact page shows the real contact details. Never fill another page with generic home-page copy.
${SECTION_SCHEMAS_GUIDE}
5. Output format must be:
{
  "summary": "Brief 1-sentence summary of the page generated",
  "sections": [
    {
      "type": "<requested section type>",
      "settings": { "background": "default"|"surface"|"primary"|"dark", "hideOnMobile": false, "spacing": "default"|"relaxed" },
      "data": { ... }
    }
  ]
}`;

type OpenAiMessage = { role: "system" | "user" | "assistant"; content: string };

type LoggingContext = {
  clientId?: string;
  websiteId?: string;
  userId?: string;
};

type OpenAiCallOptions = {
  scope: string;
  logging: LoggingContext;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: Record<string, unknown>;
  signal?: AbortSignal;
};

const PLANNER_HISTORY_TURNS = 6;
const PLANNER_MAX_TOKENS = 4000;
/** One corrective retry when the planner's JSON is cut off or invalid. */
const PLANNER_ATTEMPTS = 2;
/** Pages generated at the same time; more risks OpenAI rate limits and timeouts. */
const PAGE_CONCURRENCY = 3;
/** Sections generated per page call, so long pages are not cut off by the token limit. */
const PAGE_SECTION_CHUNK = 5;
const FALLBACK_CLARIFY_REPLY =
  "I couldn't work out what to change. Tell me which section or page you mean, or describe the result you want.";

const AI_TRUNCATED_CODE = "AI_TRUNCATED";
const AI_TRUNCATED = () =>
  new AppError(502, "The AI response was cut off before it finished.", AI_TRUNCATED_CODE);

function trimmed(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizePath(value: string): string {
  const path = `/${value.trim().replace(/^\/+|\/+$/g, "")}`.toLowerCase();
  return path === "/" ? "/" : path;
}

/** Facts the copywriter must reuse verbatim, so every page keeps the same brand instead of inventing one. */
export function describeBrand(website: WebsiteDetail | undefined): string {
  if (!website) return "";
  const { info, draft } = website;
  const home = draft.pages.find((p) => p.pageType === "HOME" || p.slug === "/");
  const hero = asRecord(home?.sections.find((s) => s.type === "hero")?.data);
  const facts: Array<[string, string | undefined]> = [
    ["Brand name", trimmed(info.businessName) ?? trimmed(draft.header.siteName)],
    ["Business", [trimmed(info.industry), trimmed(info.websiteType)].filter(Boolean).join(" / ") || undefined],
    ["About", trimmed(info.description)?.slice(0, 400)],
    ["Home page headline", trimmed(hero.heading)],
    ["Home page tagline", (trimmed(hero.subheading) ?? trimmed(hero.description))?.slice(0, 240)],
    ["Email", trimmed(info.contactEmail)],
    ["Phone", trimmed(info.contactPhone)],
    ["Address", trimmed(info.address)],
    ["Primary color", trimmed(draft.theme.colors.primary)],
  ];
  const lines = facts.flatMap(([label, value]) => (value ? [`- ${label}: ${value}`] : []));
  if (lines.length === 0) return "";
  return `Brand facts. Use the brand name and contact details exactly, never invent different ones, and leave out contact fields that are not listed. The home page lines show the existing tone; follow the brief when it asks for something new:\n${lines.join("\n")}`;
}

function inferPageType(name: string, slug: string): string {
  const key = `${name} ${slug}`.toLowerCase();
  if (/\babout\b/.test(key)) return "ABOUT";
  if (/\bservices?\b/.test(key)) return "SERVICES";
  if (/\bcontact\b/.test(key)) return "CONTACT";
  if (/\b(blog|news)\b/.test(key)) return "BLOG";
  return "CUSTOM";
}

/** Runs `fn` over `items` with at most `limit` in flight; one failure does not cancel the others. */
async function settleWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { status: "fulfilled", value: await fn(items[index]!) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    return asRecord(JSON.parse(raw));
  } catch {
    throw new AppError(
      502,
      "Failed to parse structured JSON response from AI.",
    );
  }
}

const UNUSABLE_AI_SECTION = () =>
  new AppError(502, "The AI returned content that couldn't be used. Try rephrasing your request.", "AI_INVALID_SECTION");

/** AI-built sections never ship input boxes, so a newsletter footer becomes the standard columns footer. */
function withoutInputForms(type: string, data: Record<string, unknown>): Record<string, unknown> {
  if (type !== "footer") return data;
  const { newsletter: _newsletter, ...rest } = data;
  return rest.design === "newsletter" ? { ...rest, design: "columns" } : rest;
}

function buildSection(
  type: string,
  raw: Record<string, unknown>,
  id: string = crypto.randomUUID(),
): SectionEnvelope {
  return {
    id,
    type,
    hidden: false,
    settings: sanitizeSectionSettings(asRecord(raw.settings)),
    data: withoutInputForms(type, sanitizeSectionData(type, asRecord(raw.data))),
  };
}

function focusSectionId(ops: readonly CanvasOp[]): string | undefined {
  for (const op of ops) {
    if (op.op === "add" || op.op === "update") return op.section.id;
  }
  return undefined;
}

type CanvasPlanOp = Exclude<PlannedOp, { op: "create_page" } | { op: "update_navigation" }>;
type CreatePageOp = Extract<PlannedOp, { op: "create_page" }>;
type PageJob = { op: CreatePageOp; slug: string; existing?: PageView };
/** What the copywriter needs to know about the page being written, beyond the planner's instruction. */
type PageContext = { brand: string; page?: { name: string; slug: string } };

function isChromeSection(section: SectionEnvelope): boolean {
  return section.type === "header" || section.type === "footer";
}

function slugFor(op: CreatePageOp): string {
  const raw =
    op.slug?.trim() ||
    `/${op.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "page"}`;
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function findExistingPage(pages: readonly PageView[], op: CreatePageOp): PageView | undefined {
  const slug = op.slug ? normalizePath(op.slug) : undefined;
  const name = op.name.trim().toLowerCase();
  return pages.find(
    (p) => (slug !== undefined && normalizePath(p.slug) === slug) || p.name.trim().toLowerCase() === name,
  );
}

function pageBrief(instruction: string, context: PageContext): string {
  const parts: string[] = [];
  if (context.page) {
    parts.push(
      context.page.slug === "/"
        ? `Page: "${context.page.name}" (the home page).`
        : `Page: "${context.page.name}" (${context.page.slug}). This is NOT the home page: every section must serve this page's own purpose, and must not reuse the home page headline or hero copy.`,
    );
  }
  parts.push(`Brief: ${instruction}`);
  if (context.brand) parts.push(context.brand);
  return parts.join("\n\n");
}

/** The editor's history already ends with this request, which is sent separately with the page context. */
function plannerHistory(history: readonly ChatHistoryMessage[], prompt: string): OpenAiMessage[] {
  const turns = [...history];
  const last = turns.at(-1);
  const lastContent = last?.content.trim() ?? "";
  if (last?.role === "user" && lastContent && prompt.trim().startsWith(lastContent)) turns.pop();
  return turns.slice(-PLANNER_HISTORY_TURNS).map((m) => ({ role: m.role, content: m.content }));
}

export class AiGeneratorService {
  /**
   * Runs free OpenAI Moderation check on user input to filter toxic, illegal or harmful content.
   */
  private async checkModeration(
    text: string,
    apiKey: string,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!text || !text.trim()) return;
    try {
      const timeoutSignal = AbortSignal.timeout(10_000);
      const combinedSignal = signal
        ? AbortSignal.any([signal, timeoutSignal])
        : timeoutSignal;

      const res = await fetch("https://api.openai.com/v1/moderations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ input: text }),
        signal: combinedSignal,
      });

      if (!res.ok) return; // Fail-open so moderation transient error doesn't block legit requests
      const json = (await res.json()) as {
        results?: Array<{ flagged: boolean }>;
      };
      if (json.results?.[0]?.flagged) {
        throw new AppError(
          400,
          "Your prompt was flagged by content safety moderation as potentially violating usage policies.",
        );
      }
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      if (signal?.aborted) {
        throw new AppError(499, "AI generation was cancelled.");
      }
      logger.warn(
        { err },
        "OpenAI moderation check encountered a non-fatal warning",
      );
    }
  }

  private async callOpenAi(
    messages: OpenAiMessage[],
    options: OpenAiCallOptions,
  ): Promise<string> {
    const {
      scope,
      logging,
      temperature = 0.7,
      maxTokens = 3000,
      responseFormat = { type: "json_object" },
      signal,
    } = options;
    const { apiKey, model } = await aiSettingsService.getCredentials(logging.clientId, logging.userId);
    if (!apiKey) {
      throw new AppError(
        400,
        "OpenAI API key is not configured. Please add your OpenAI API key in Super Admin Settings > AI Settings.",
      );
    }

    // OpenAI json_object mode requires the word "json" somewhere in the messages.
    const needsJsonHint =
      responseFormat.type === "json_object" &&
      !messages.some((m) => m.content.toLowerCase().includes("json"));
    const safeMessages = needsJsonHint
      ? messages.map((m, idx) =>
          idx === 0
            ? {
                ...m,
                content: `${m.content}\n\nIMPORTANT: Respond strictly in valid JSON format.`,
              }
            : m,
        )
      : messages;

    const startMs = Date.now();
    const primaryModel = model || "gpt-4o-mini";
    const fallbackModel = primaryModel === "gpt-4o" ? "gpt-4o-mini" : null;

    const executeCallWithRetry = async (
      targetModel: string,
    ): Promise<{
      content: string;
      modelUsed: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    }> => {
      const maxRetries = 2;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (signal?.aborted) {
          throw new AppError(499, "AI generation was cancelled.");
        }

        const timeoutSignal = AbortSignal.timeout(60_000);
        const combinedSignal = signal
          ? AbortSignal.any([signal, timeoutSignal])
          : timeoutSignal;

        const reasoning = isReasoningModel(targetModel);

        try {
          const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: targetModel,
                messages: safeMessages,
                response_format: responseFormat,
                // Reasoning models reject temperature, and their hidden reasoning tokens count against the completion budget.
                ...(reasoning
                  ? { max_completion_tokens: maxTokens * 4 }
                  : { temperature, max_tokens: maxTokens }),
              }),
              signal: combinedSignal,
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            let errorMsg = `OpenAI API returned status ${response.status}`;
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error?.message) {
                errorMsg = errorJson.error.message;
              }
            } catch {
              // use default errorMsg
            }

            if (response.status === 401) {
              throw new AppError(
                401,
                `Invalid OpenAI API Key (${errorMsg}). Please paste your valid OpenAI API key in Super Admin > Settings > AI Settings.`,
              );
            }

            // Retry on 429 rate limit or 5xx server issues
            if (
              (response.status === 429 || response.status >= 500) &&
              attempt < maxRetries
            ) {
              const delay = Math.pow(2, attempt) * 1000;
              logger.warn(
                { status: response.status, attempt, delay, targetModel },
                "OpenAI rate-limited or error encountered, retrying...",
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }

            if (response.status === 429) {
              throw new AppError(
                429,
                `OpenAI Rate Limit or Quota Exceeded (${errorMsg}). Please check your OpenAI account credits or update your key in Super Admin > Settings > AI Settings.`,
              );
            }

            throw new AppError(502, `AI Generation Failed: ${errorMsg}`);
          }

          const json = (await response.json()) as {
            model?: string;
            choices?: Array<{ message?: { content?: string | null }; finish_reason?: string }>;
            usage?: {
              prompt_tokens?: number;
              completion_tokens?: number;
              total_tokens?: number;
            };
          };

          const choice = json.choices?.[0];
          if (choice?.finish_reason === "length") {
            throw AI_TRUNCATED();
          }
          const content = choice?.message?.content;
          if (!content) {
            throw new AppError(502, "OpenAI returned an empty response");
          }

          return {
            content,
            modelUsed: json.model || targetModel,
            usage: json.usage,
          };
        } catch (err: unknown) {
          if (signal?.aborted || (err as Error)?.name === "AbortError") {
            throw new AppError(499, "AI generation was cancelled.");
          }
          if (
            err instanceof AppError &&
            (err.statusCode === 401 ||
              err.statusCode === 429 ||
              err.statusCode === 400 ||
              err.code === AI_TRUNCATED_CODE)
          ) {
            throw err;
          }
          lastError = err as Error;
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000;
            logger.warn(
              { err, attempt, delay },
              "OpenAI call failed, retrying...",
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      throw (
        lastError ||
        new AppError(502, "Failed to reach OpenAI service after retries.")
      );
    };

    let callResult: {
      content: string;
      modelUsed: string;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    try {
      callResult = await executeCallWithRetry(primaryModel);
    } catch (primaryErr) {
      if (
        fallbackModel &&
        !(
          primaryErr instanceof AppError &&
          (primaryErr.statusCode === 401 || primaryErr.code === AI_TRUNCATED_CODE)
        )
      ) {
        logger.warn(
          { primaryErr, fallbackModel },
          "Primary model failed. Attempting fallback model.",
        );
        callResult = await executeCallWithRetry(fallbackModel);
      } else {
        throw primaryErr;
      }
    }

    if (logging.clientId) {
      await aiBillingService.recordUsage({
        clientId: logging.clientId,
        websiteId: logging.websiteId || null,
        userId: logging.userId || null,
        model: callResult.modelUsed,
        scope,
        promptTokens: callResult.usage?.prompt_tokens ?? 0,
        completionTokens: callResult.usage?.completion_tokens ?? 0,
        totalTokens: callResult.usage?.total_tokens ?? 0,
        durationMs: Date.now() - startMs,
      });
    }

    return callResult.content;
  }

  /**
   * Understands the prompt via a structured-output planner, generates content only for the
   * ops that need it (in parallel), then applies all ops deterministically to the canvas.
   * `onPlan` receives the planned layout before content generation, so the editor can show placeholders.
   */
  async generate(
    options: GenerateAiOptions,
    onPlan?: (layout: LayoutSlot[]) => void,
  ): Promise<AiSuggestionPayload> {
    const {
      prompt,
      sectionId,
      currentSection,
      currentSections = [],
      history = [],
      clientId,
      websiteId,
      userId,
      signal,
    } = options;
    const logging: LoggingContext = { clientId, websiteId, userId };

    const { apiKey } = await aiSettingsService.getCredentials(clientId, userId);
    if (apiKey) {
      await this.checkModeration(prompt, apiKey, signal);
    }

    const website = options.website;
    const brand = describeBrand(website);
    const sitePages = website?.draft.pages ?? [];
    const currentPage = sitePages.find((p) => p.id === options.pageId);
    // The open page's own header section is what visitors see, so it is the menu to start from.
    const headerData = currentSections.find((s) => s.type === "header")?.data;
    const currentMenu: MenuItem[] =
      readMenu(headerData?.menu) ??
      readMenu(website?.draft.header.menu) ??
      sitePages.filter((p) => p.showInNav).map((p) => ({ label: p.name, href: p.slug }));
    const currentCta = readLink(headerData?.cta) ?? readLink(website?.draft.header.cta);
    const siteContext: SitePlannerContext | undefined = website
      ? {
          brand: {
            name: trimmed(website.info.businessName) ?? trimmed(website.draft.header.siteName),
            business:
              [trimmed(website.info.industry), trimmed(website.info.websiteType)].filter(Boolean).join(" / ") ||
              undefined,
            description: trimmed(website.info.description)?.slice(0, 300),
          },
          ...(currentPage ? { currentPage: { name: currentPage.name, slug: currentPage.slug } } : {}),
          pages: sitePages.map((p) => ({
            name: p.name,
            slug: p.slug,
            sectionSummary: p.sections.map((s) => s.type).join(", "),
          })),
          headerMenu: currentMenu.map(({ label, href }) => ({ label, href })),
          ...(currentCta ? { headerCta: currentCta } : {}),
          theme: { primaryColor: website.draft.theme.colors.primary },
        }
      : undefined;

    const plan = await this.plan(
      prompt,
      currentSections,
      currentSection?.id ?? sectionId,
      history,
      logging,
      signal,
      siteContext,
    );

    if (plan.intent === "clarify" && plan.clarification) {
      return {
        id: crypto.randomUUID(),
        prompt,
        summary: plan.clarification.question || plan.reply,
        chatReply: plan.reply || plan.clarification.question,
        clarification: plan.clarification,
        target: { scope: "chat" },
        before: [],
        after: [],
      };
    }

    if (plan.intent !== "edit" || plan.ops.length === 0) {
      const reply =
        plan.intent === "edit" || !plan.reply
          ? FALLBACK_CLARIFY_REPLY
          : plan.reply;
      return {
        id: crypto.randomUUID(),
        prompt,
        summary: reply,
        chatReply: reply,
        target: { scope: "chat" },
        before: [],
        after: [],
      };
    }

    const navOps = plan.ops.filter(
      (op): op is Extract<PlannedOp, { op: "update_navigation" }> => op.op === "update_navigation",
    );

    // A requested page that already exists is rebuilt in place: the open page on the canvas, others via updatedPages.
    const rebuildCurrent: CanvasPlanOp[] = [];
    const pageJobs: PageJob[] = [];
    const plannedSlugs = new Set<string>();
    for (const op of plan.ops) {
      if (op.op !== "create_page") continue;
      const existing = findExistingPage(sitePages, op);
      if (existing && existing.id === currentPage?.id) {
        if (rebuildCurrent.length === 0) {
          rebuildCurrent.push({ op: "replace_page", sectionTypes: op.sectionTypes, instruction: op.instruction });
        }
        continue;
      }
      const slug = existing ? existing.slug : slugFor(op);
      if (plannedSlugs.has(normalizePath(slug))) continue;
      plannedSlugs.add(normalizePath(slug));
      pageJobs.push({ op, slug, existing });
    }

    const canvasPlanOps: CanvasPlanOp[] = [
      ...rebuildCurrent,
      ...plan.ops.filter(
        (op): op is CanvasPlanOp => op.op !== "create_page" && op.op !== "update_navigation",
      ),
    ];

    const addIds = canvasPlanOps.map((op) =>
      op.op === "add" ? crypto.randomUUID() : undefined,
    );
    if (canvasPlanOps.length > 0) {
      onPlan?.(previewLayout(currentSections, canvasPlanOps, addIds));
    }

    const pageContext = (job: PageJob): PageContext => ({
      brand,
      page: { name: job.existing?.name ?? job.op.name, slug: job.slug },
    });
    const currentPageContext: PageContext = {
      brand,
      ...(currentPage ? { page: { name: currentPage.name, slug: currentPage.slug } } : {}),
    };

    const [canvasOps, pageResults] = await Promise.all([
      Promise.all(
        canvasPlanOps.map((op, i) =>
          this.materialize(op, currentSections, logging, currentPageContext, addIds[i], signal),
        ),
      ),
      // Other pages show the site-wide header and footer, so only their body sections are built.
      settleWithConcurrency(pageJobs, PAGE_CONCURRENCY, async (job) =>
        (
          await this.createPage(
            job.op.sectionTypes.filter((type) => type !== "header" && type !== "footer"),
            job.op.instruction,
            [],
            logging,
            pageContext(job),
            signal,
          )
        ).filter((section) => !isChromeSection(section)),
      ),
    ]);
    if (signal?.aborted) {
      throw new AppError(499, "AI generation was cancelled.");
    }

    const createdPages: CreatedPageEdit[] = [];
    const updatedPages: UpdatedPageEdit[] = [];
    const failedPages: string[] = [];
    pageResults.forEach((result, i) => {
      const job = pageJobs[i]!;
      if (result.status === "rejected") {
        logger.warn({ err: result.reason, page: job.op.name }, "AI page generation failed");
        failedPages.push(job.op.name);
        return;
      }
      if (job.existing) {
        updatedPages.push({ pageId: job.existing.id, sections: result.value });
        return;
      }
      createdPages.push({
        id: crypto.randomUUID(),
        name: job.op.name,
        slug: job.slug,
        pageType: inferPageType(job.op.name, job.slug),
        showInNav: job.op.showInNav ?? true,
        sections: result.value,
      });
    });

    const firstFailure = pageResults.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (firstFailure && failedPages.length === pageJobs.length && canvasOps.length === 0) {
      throw firstFailure.reason;
    }

    // A menu edited directly on the header section is a navigation change too, so it reaches every page.
    const editedHeader = canvasOps
      .flatMap((op) => (op.op === "update" && op.section.type === "header" ? [op.section] : []))
      .at(-1);
    const plannedMenu =
      navOps.flatMap((op) => (op.headerMenu ? [op.headerMenu] : [])).at(-1) ??
      (editedHeader ? readMenu(editedHeader.data.menu) : undefined) ??
      null;
    const plannedCta =
      navOps.flatMap((op) => (op.headerCta ? [op.headerCta] : [])).at(-1) ??
      (editedHeader ? readLink(editedHeader.data.cta) : undefined) ??
      null;
    const toNavPage = (p: { name: string; slug: string }): NavPage => ({ name: p.name, slug: p.slug });
    const nav = planNavigation({
      currentMenu,
      currentCta,
      plannedMenu,
      plannedCta,
      newNavPages: createdPages.filter((p) => p.showInNav).map(toNavPage),
      pages: [...sitePages.map(toNavPage), ...createdPages.map(toNavPage)],
    });
    const navigationPatch: NavigationPatchEdit | undefined =
      nav.headerMenu || nav.headerCta
        ? {
            ...(nav.headerMenu ? { headerMenu: nav.headerMenu } : {}),
            ...(nav.headerCta ? { headerCta: nav.headerCta } : {}),
          }
        : undefined;
    const syncHeaders = (sections: SectionEnvelope[]): SectionEnvelope[] =>
      navigationPatch ? sections.map((s) => withNavigation(s, nav)) : sections;

    const unresolvedNote =
      nav.unresolved.length > 0
        ? `I couldn't find a page for ${nav.unresolved.join(", ")}, so I left that link out. Create the page first or tell me which page it should open.`
        : "";

    const changed =
      canvasOps.length > 0 || createdPages.length > 0 || updatedPages.length > 0 || Boolean(navigationPatch);
    if (!changed) {
      const labels = currentMenu.map((m) => m.label).join(", ");
      const reply =
        unresolvedNote ||
        (navOps.length > 0
          ? `The header menu already has ${labels || "no links"}, so nothing needed to change. Tell me what to add, rename or remove.`
          : FALLBACK_CLARIFY_REPLY);
      return {
        id: crypto.randomUUID(),
        prompt,
        summary: reply,
        chatReply: reply,
        target: { scope: "chat" },
        before: [],
        after: [],
      };
    }

    const notes = [
      failedPages.length > 0 ? `I couldn't build ${failedPages.join(", ")} this time; ask me again to retry.` : "",
      plan.deferredPages?.length ? `Ask me to continue to build ${plan.deferredPages.join(", ")}.` : "",
      unresolvedNote,
    ].filter(Boolean);
    const baseSummary =
      plan.reply ||
      (createdPages.length > 0 ? `Created ${createdPages.map((p) => p.name).join(", ")}` : "Updated the page");
    const summary = [baseSummary, ...notes].join(" ");

    const hasCrossPage = createdPages.length > 0 || updatedPages.length > 0 || Boolean(navigationPatch);
    const afterSections = syncHeaders(canvasOps.length > 0 ? applyOps(currentSections, canvasOps) : currentSections);

    const [onlyOp] = canvasOps;
    if (!hasCrossPage && canvasOps.length === 1 && onlyOp?.op === "update") {
      const before = currentSections.filter((s) => s.id === onlyOp.section.id);
      return {
        id: crypto.randomUUID(),
        prompt,
        summary,
        target: { scope: "section", sectionId: onlyOp.section.id },
        before,
        after: [onlyOp.section],
      };
    }

    return {
      id: crypto.randomUUID(),
      prompt,
      summary,
      target: hasCrossPage
        ? {
            scope: "site",
            createdPageIds: createdPages.map((p) => p.id),
            affectedPageIds: [options.pageId ?? "", ...updatedPages.map((p) => p.pageId)].filter(Boolean),
          }
        : {
            scope: "page",
            rebuild: canvasOps.some((op) => op.op === "replace_page"),
            focusSectionId: focusSectionId(canvasOps),
          },
      before: currentSections,
      after: afterSections,
      createdPages: createdPages.length > 0 ? createdPages : undefined,
      updatedPages: updatedPages.length > 0 ? updatedPages : undefined,
      navigationPatch,
    };
  }

  private async plan(
    prompt: string,
    sections: SectionEnvelope[],
    selectedSectionId: string | undefined,
    history: ChatHistoryMessage[],
    logging: LoggingContext,
    signal?: AbortSignal,
    siteContext?: SitePlannerContext,
  ): Promise<AiPlan> {
    const messages: OpenAiMessage[] = [
      { role: "system", content: PLANNER_SYSTEM_PROMPT },
      ...plannerHistory(history, prompt),
      {
        role: "user",
        content: buildPlannerInput(prompt, sections, selectedSectionId, siteContext),
      },
    ];

    let lastError: unknown;
    for (let attempt = 1; attempt <= PLANNER_ATTEMPTS; attempt++) {
      let raw: string | undefined;
      try {
        raw = await this.callOpenAi(messages, {
          scope: "plan",
          logging,
          temperature: 0,
          maxTokens: PLANNER_MAX_TOKENS,
          responseFormat: AI_PLAN_RESPONSE_FORMAT,
          signal,
        });
        return parsePlan(JSON.parse(raw), sections);
      } catch (err) {
        const truncated = err instanceof AppError && err.code === AI_TRUNCATED_CODE;
        if (err instanceof AppError && !truncated) throw err;
        lastError = err;
        logger.warn({ err, attempt, raw: raw?.slice(0, 2000) }, "Rejected invalid AI plan");
        messages.push(
          ...(raw ? [{ role: "assistant" as const, content: raw.slice(0, 4000) }] : []),
          {
            role: "user",
            content: truncated
              ? `Your plan was cut off because it was too long. Return the complete plan again as valid JSON, keeping every "instruction" under 300 characters and at most ${MAX_PAGES_PER_REQUEST} create_page operations.`
              : `Your plan was rejected: ${(err as Error).message.slice(0, 500)}. Return a corrected, complete plan as valid JSON that follows the schema and rules.`,
          },
        );
      }
    }

    logger.error({ err: lastError }, "AI planner failed after retries");
    throw new AppError(
      502,
      "AI couldn't plan that request. Try asking for fewer changes at once, or describe one page or section at a time.",
    );
  }

  private async materialize(
    op: CanvasPlanOp,
    sections: SectionEnvelope[],
    logging: LoggingContext,
    pageContext: PageContext,
    reservedId?: string,
    signal?: AbortSignal,
  ): Promise<CanvasOp> {
    switch (op.op) {
      case "add":
        return {
          op: "add",
          position: op.position,
          section: await this.createSection(
            op.sectionType,
            op.instruction,
            logging,
            pageContext,
            reservedId,
            signal,
          ),
        };
      case "update": {
        const target = sections.find((s) => s.id === op.sectionId);
        if (!target)
          throw new AppError(
            422,
            "AI referenced a section that is not on the page.",
          );
        return {
          op: "update",
          section: await this.editSection(
            target,
            op.instruction,
            logging,
            signal,
          ),
        };
      }
      case "replace_page":
        return {
          op: "replace_page",
          sections: await this.createPage(
            op.sectionTypes,
            op.instruction,
            sections,
            logging,
            pageContext,
            signal,
          ),
        };
      case "remove":
      case "move":
      case "clear":
        return op;
    }
  }

  private async createSection(
    type: string,
    instruction: string,
    logging: LoggingContext,
    context: PageContext,
    id?: string,
    signal?: AbortSignal,
  ): Promise<SectionEnvelope> {
    const raw = await this.callOpenAi(
      [
        { role: "system", content: SYSTEM_PROMPT_ADD_SECTION },
        {
          role: "user",
          content: `Section type to create: "${type}"\n${pageBrief(instruction, context)}\n\nReturn the complete section JSON.`,
        },
      ],
      { scope: "section_add", logging, signal },
    );
    const parsed = parseJsonObject(raw);
    const section = asRecord(parsed.section);
    const repaired = repairSection(
      buildSection(type, Object.keys(section).length > 0 ? section : parsed, id),
      "section_add",
    );
    if (!repaired) throw UNUSABLE_AI_SECTION();
    return repaired;
  }

  private async editSection(
    target: SectionEnvelope,
    instruction: string,
    logging: LoggingContext,
    signal?: AbortSignal,
  ): Promise<SectionEnvelope> {
    const raw = await this.callOpenAi(
      [
        { role: "system", content: SYSTEM_PROMPT_SECTION_EDIT },
        {
          role: "user",
          content: `Current Section Type: "${target.type}"
Current Section Settings: ${JSON.stringify(target.settings)}
Current Section Data: ${JSON.stringify(target.data)}

Change to make: ${instruction}

Return the updated section JSON. If changing color/background, use a valid 6-digit hex in settings.customColors.`,
        },
      ],
      { scope: "section", logging, signal },
    );
    const parsed = parseJsonObject(raw);

    const repaired = repairSection(
      {
        ...target,
        settings: sanitizeSectionSettings({
          ...target.settings,
          ...asRecord(parsed.settings),
        }),
        data: sanitizeSectionData(target.type, {
          ...target.data,
          ...asRecord(parsed.data),
        }),
      },
      "section_edit",
    );
    if (!repaired) throw UNUSABLE_AI_SECTION();
    return repaired;
  }

  /** Existing header/footer are reused and always kept, so every page shares the site's branding and navigation. */
  private async createPage(
    types: string[],
    instruction: string,
    existing: SectionEnvelope[],
    logging: LoggingContext,
    context: PageContext,
    signal?: AbortSignal,
  ): Promise<SectionEnvelope[]> {
    const reusable = new Map(
      existing.filter(isChromeSection).map((s) => [s.type, s] as const),
    );
    const ordered = [
      ...(reusable.has("header") && !types.includes("header") ? ["header"] : []),
      ...types,
      ...(reusable.has("footer") && !types.includes("footer") ? ["footer"] : []),
    ];
    const toGenerate = ordered.filter((type) => !reusable.has(type));
    const brief = pageBrief(instruction, context);

    const parts = chunk(toGenerate, PAGE_SECTION_CHUNK);
    const generated = (
      await Promise.all(
        parts.map((part, i) =>
          this.generatePageSections(
            part,
            parts.length > 1
              ? `This is part ${i + 1} of ${parts.length} of one page whose full section order is ${JSON.stringify(toGenerate)}. The other parts are written separately: keep the same voice and do not repeat their topics.\n${brief}`
              : brief,
            logging,
            signal,
          ),
        ),
      )
    ).flat();

    const page = ordered.flatMap((type): SectionEnvelope[] => {
      const reused = reusable.get(type);
      if (reused) return [reused];
      const index = generated.findIndex((s) => s.type === type);
      if (index === -1) return [];
      const [match] = generated.splice(index, 1);
      const repaired = repairSection(buildSection(type, match!), "page");
      return repaired ? [repaired] : [];
    });

    if (page.length === 0) {
      throw new AppError(
        502,
        "AI did not generate any page sections. Please try a more specific prompt.",
      );
    }
    return page;
  }

  private async generatePageSections(
    types: string[],
    brief: string,
    logging: LoggingContext,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>[]> {
    const raw = await this.callOpenAi(
      [
        { role: "system", content: SYSTEM_PROMPT_PAGE },
        {
          role: "user",
          content: `Section types in order: ${JSON.stringify(types)}\n${brief}`,
        },
      ],
      { scope: "page", logging, maxTokens: 6000, signal },
    );
    const sections = parseJsonObject(raw).sections;
    return Array.isArray(sections) ? sections.map(asRecord) : [];
  }
}

export const aiGeneratorService = new AiGeneratorService();
