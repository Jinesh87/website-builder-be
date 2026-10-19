import Joi from "joi";
import {
  AUTH_ANIMATIONS,
  AUTH_FIELD_TYPES,
  AUTH_SOCIAL_PROVIDERS,
  AUTH_VARIANTS,
  AUTH_VIEWS,
  BUTTON_STYLES,
  CARD_STYLES,
  CUSTOM_ALIGNS,
  CUSTOM_CARD_TONES,
  CUSTOM_GAPS,
  CUSTOM_IMAGE_ASPECTS,
  CUSTOM_LIMITS,
  type CustomBlock,
  FONT_KEYS,
  FOOTER_DESIGNS,
  HEADER_DESIGNS,
  HERO_VARIANTS,
  ICON_NAMES,
  RADIUS_SIZES,
  SECTION_ALIGNMENTS,
  SECTION_BACKGROUNDS,
  SECTION_SPACINGS,
  SECTION_TYPES,
  SPACING_SIZES,
  type SectionType,
  BLOG_DETAIL_DESIGNS,
} from "../types/site-content.types.js";

/**
 * Content ends up in published HTML, so links and image URLs are limited to
 * schemes that can't execute script, and colors to plain hex values.
 */
export const SAFE_HREF = /^(https?:\/\/\S+|mailto:\S+|tel:[+0-9() -]+|\/(?!\/)\S*|#\S*)$/i;
export const SAFE_IMAGE_URL =
  /^(https?:\/\/\S+|\/(?!\/)\S*|data:image\/(?:png|jpe?g|webp|gif|svg\+xml|avif)(?:;[a-z0-9=_-]+)*;?(?:base64)?,[\s\S]*)$/i;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
/** Only these hosts are embedded, and only via an iframe src the renderer builds itself. */
export const SAFE_VIDEO_URL =
  /^https:\/\/(?:(?:www\.|m\.)?youtube\.com\/watch\?v=[\w-]{6,20}(?:&\S*)?|youtu\.be\/[\w-]{6,20}(?:\?\S*)?|(?:www\.)?vimeo\.com\/\d{6,12}(?:\?\S*)?)$/i;
const ANCHOR = /^[a-z][a-z0-9-]{0,39}$/;

const text = (max: number) => Joi.string().trim().max(max);
const optionalText = (max: number) => text(max).allow("").optional();

/**
 * Field metadata read by the AI field catalog (`ai/field-catalog.ts`):
 * - `kind`: "image" | "link" marks composite values the AI fills in a special way.
 * - `ai: "locked"`: the AI may not set it (third-party media, invented social proof).
 * - `fact`: the value must match this business fact (e.g. "contactEmail") or be left out.
 * - `shape`: aspect of new images for this field (default landscape).
 * - `partOf`: the value must be words taken from this sibling field, or it isn't shown.
 */
export type FieldMeta = {
  kind?: "image" | "link";
  ai?: "locked";
  fact?: string;
  shape?: "square" | "portrait";
  partOf?: string;
};
const meta = (value: FieldMeta) => value;
const locked = meta({ ai: "locked" });

const link = Joi.object({
  label: text(80).required(),
  href: text(2048)
    .pattern(SAFE_HREF)
    .required()
    .messages({ "string.pattern.base": "Links must be http(s), mailto:, tel:, a /path or a #anchor" }),
}).meta(meta({ kind: "link" }));

const subMenuItem = Joi.object({
  label: text(80).required(),
  href: text(2048)
    .pattern(SAFE_HREF)
    .required()
    .messages({ "string.pattern.base": "Links must be http(s), mailto:, tel:, a /path or a #anchor" }),
  description: optionalText(140),
  badge: optionalText(30),
  icon: optionalText(40),
});

const menuItem = Joi.object({
  label: text(80).required(),
  href: text(2048)
    .pattern(SAFE_HREF)
    .required()
    .messages({ "string.pattern.base": "Links must be http(s), mailto:, tel:, a /path or a #anchor" }),
  badge: optionalText(30),
  icon: optionalText(40),
  children: Joi.array().items(subMenuItem).max(24).optional(),
});

const image = Joi.object({
  url: text(65536)
    .pattern(SAFE_IMAGE_URL)
    .allow("")
    .optional()
    .messages({ "string.pattern.base": "Images must use an http(s) URL, a /path, or a valid image data URI" }),
  alt: text(300).allow("").optional().default(""),
})
  .allow(null)
  .meta(meta({ kind: "image" }));

const color = Joi.string().pattern(HEX_COLOR).required().messages({ "string.pattern.base": "Use a #rrggbb color" });

const carouselSlide = Joi.object({
  title: text(120).required(),
  subtitle: optionalText(120),
  description: optionalText(600),
  caption: optionalText(300),
  badge: optionalText(60),
  image: image.optional(),
  button: link.optional(),
  secondaryButton: link.optional(),
});

/** Deepest container nesting (1 = flat list of leaf blocks) and total block count. */
export function measureCustomBlocks(blocks: readonly CustomBlock[]): { depth: number; count: number } {
  let depth = 0;
  let count = 0;
  const walk = (list: readonly CustomBlock[], level: number) => {
    depth = Math.max(depth, level);
    for (const block of list) {
      count += 1;
      if ("children" in block && Array.isArray(block.children)) walk(block.children, level + 1);
    }
  };
  walk(blocks, 1);
  return { depth, count };
}

const customChildren = Joi.array().items(Joi.link("#customBlock")).max(CUSTOM_LIMITS.maxChildren).required();
const customGap = Joi.string().valid(...CUSTOM_GAPS).optional();
const customType = (type: CustomBlock["type"]) => Joi.string().valid(type).required();

const customBlockSchema = Joi.alternatives()
  .try(
    Joi.object({
      type: customType("stack"),
      direction: Joi.string().valid("column", "row").optional(),
      gap: customGap,
      align: Joi.string().valid(...CUSTOM_ALIGNS).optional(),
      children: customChildren,
    }),
    Joi.object({
      type: customType("grid"),
      columns: Joi.number().valid(1, 2, 3, 4).required(),
      gap: customGap,
      align: Joi.string().valid("start", "center").optional(),
      children: customChildren,
    }),
    Joi.object({
      type: customType("card"),
      tone: Joi.string().valid(...CUSTOM_CARD_TONES).optional(),
      children: customChildren,
    }),
    Joi.object({ type: customType("heading"), text: text(200).required(), level: Joi.number().valid(1, 2, 3).optional() }),
    Joi.object({
      type: customType("text"),
      text: text(1200).required(),
      size: Joi.string().valid("sm", "md", "lg").optional(),
      muted: Joi.boolean().optional(),
    }),
    Joi.object({ type: customType("badge"), text: text(60).required() }),
    Joi.object({
      type: customType("button"),
      label: text(80).required(),
      href: text(2048)
        .pattern(SAFE_HREF)
        .required()
        .messages({ "string.pattern.base": "Links must be http(s), mailto:, tel:, a /path or a #anchor" }),
      tone: Joi.string().valid("primary", "secondary").optional(),
    }),
    Joi.object({
      type: customType("image"),
      url: text(65536)
        .pattern(SAFE_IMAGE_URL)
        .required()
        .messages({ "string.pattern.base": "Images must use an http(s) URL, a /path, or a valid image data URI" }),
      alt: text(300).allow("").required(),
      aspect: Joi.string().valid(...CUSTOM_IMAGE_ASPECTS).optional(),
    }),
    Joi.object({ type: customType("icon"), name: Joi.string().valid(...ICON_NAMES).required() }),
    Joi.object({
      type: customType("list"),
      items: Joi.array().items(text(200).required()).min(1).max(CUSTOM_LIMITS.maxListItems).required(),
    }),
  )
  .id("customBlock");

export const customDataSchema = Joi.object({
  width: Joi.string().valid("contained", "wide").optional(),
  align: Joi.string().valid("start", "center").optional(),
  blocks: Joi.array().items(customBlockSchema).min(1).max(CUSTOM_LIMITS.maxChildren).required(),
})
  .custom((value: { blocks: CustomBlock[] }, helpers) => {
    const { depth, count } = measureCustomBlocks(value.blocks);
    if (depth > CUSTOM_LIMITS.maxDepth) return helpers.message({ custom: `Custom layouts can nest at most ${CUSTOM_LIMITS.maxDepth} levels` });
    if (count > CUSTOM_LIMITS.maxBlocks) return helpers.message({ custom: `Custom layouts can have at most ${CUSTOM_LIMITS.maxBlocks} blocks` });
    return value;
  });
const columns = Joi.number().valid(1, 2, 3, 4);

const authField = Joi.object({
  name: Joi.string()
    .pattern(/^[A-Za-z][\w-]{0,39}$/)
    .required()
    .messages({ "string.pattern.base": "Field names start with a letter and use letters, numbers, - or _" }),
  label: text(80).required(),
  type: Joi.string()
    .valid(...AUTH_FIELD_TYPES)
    .required(),
  placeholder: optionalText(120),
  required: Joi.boolean().optional(),
  width: Joi.string().valid("full", "half").optional(),
  options: Joi.array().items(text(80)).max(20).optional(),
});
const authFields = Joi.array().items(authField).max(12).required();

const authDataSchema = Joi.object({
  variant: flexibleVariant(AUTH_VARIANTS, "diagonal-split"),
  defaultView: Joi.string()
    .valid(...AUTH_VIEWS)
    .optional(),
  brandName: optionalText(60),
  logo: image.optional(),
  formPosition: Joi.string().valid("left", "right").optional(),
  minHeight: Joi.string().valid("auto", "screen").optional(),
  inputStyle: Joi.string().valid("outline", "filled", "underline", "pill").optional(),
  buttonShape: Joi.string().valid("rounded", "pill", "square").optional(),
  headingSize: Joi.string().valid("sm", "md", "lg").optional(),
  showLabels: Joi.boolean().optional(),
  showFieldIcons: Joi.boolean().optional(),
  showPasswordToggle: Joi.boolean().optional(),
  animation: Joi.string()
    .valid(...AUTH_ANIMATIONS)
    .optional(),
  backgroundMotion: Joi.boolean().optional(),
  colors: Joi.object({
    accent: color.optional(),
    panel: color.optional(),
    panelText: color.optional(),
    card: color.optional(),
  }).optional(),
  panel: Joi.object({
    eyebrow: optionalText(80),
    heading: optionalText(160),
    text: optionalText(400),
    registerHeading: optionalText(160),
    registerText: optionalText(400),
    image: image.optional(),
    highlights: Joi.array().items(text(120)).max(6).optional(),
    testimonial: Joi.object({
      quote: text(300).required(),
      name: text(80).required(),
      role: optionalText(120),
      avatar: image.optional(),
    }).optional(),
    stats: Joi.array()
      .items(Joi.object({ value: text(20).required(), label: text(80).required() }))
      .max(4)
      .optional(),
  }).optional(),
  social: Joi.object({
    enabled: Joi.boolean().required(),
    label: optionalText(60),
    style: Joi.string().valid("icons", "full").optional(),
    position: Joi.string().valid("top", "bottom").optional(),
    showOnRegister: Joi.boolean().optional(),
    providers: Joi.array()
      .items(
        Joi.object({
          provider: Joi.string()
            .valid(...AUTH_SOCIAL_PROVIDERS)
            .required(),
          href: text(2048)
            .pattern(SAFE_HREF)
            .required()
            .messages({ "string.pattern.base": "Links must be http(s), mailto:, tel:, a /path or a #anchor" }),
        }),
      )
      .max(AUTH_SOCIAL_PROVIDERS.length)
      .required(),
  }).required(),
  login: Joi.object({
    heading: text(120).required(),
    subheading: optionalText(300),
    fields: authFields,
    submitLabel: text(60).required(),
    showRemember: Joi.boolean().optional(),
    rememberLabel: optionalText(60),
    forgotLabel: optionalText(60),
    switchPrompt: optionalText(80),
    switchLabel: optionalText(40),
  }).required(),
  register: Joi.object({
    enabled: Joi.boolean().required(),
    heading: text(120).required(),
    subheading: optionalText(300),
    fields: authFields,
    submitLabel: text(60).required(),
    showTerms: Joi.boolean().optional(),
    termsText: optionalText(120),
    termsLink: link.optional(),
    switchPrompt: optionalText(80),
    switchLabel: optionalText(40),
  }).required(),
  forgot: Joi.object({
    enabled: Joi.boolean().required(),
    heading: text(120).required(),
    subheading: optionalText(300),
    fields: Joi.array().items(authField).max(4).required(),
    submitLabel: text(60).required(),
    backLabel: optionalText(60),
    successHeading: optionalText(120),
    successText: optionalText(300),
  }).required(),
  otp: Joi.object({
    enabled: Joi.boolean().required(),
    heading: text(120).required(),
    subheading: optionalText(300),
    length: Joi.number().valid(4, 5, 6).required(),
    submitLabel: text(60).required(),
    resendLabel: optionalText(40),
    resendSeconds: Joi.number().integer().min(0).max(300).optional(),
    requireOnLogin: Joi.boolean().optional(),
    requireOnRegister: Joi.boolean().optional(),
    requireOnForgot: Joi.boolean().optional(),
  }).required(),
  successHeading: optionalText(120),
  successText: optionalText(300),
  successLink: link.optional(),
  footerNote: optionalText(160),
});

function flexibleVariant<T extends string>(
  validVariants: readonly T[],
  defaultVariant: T,
  aliasMap: Record<string, T> = {},
) {
  return Joi.string()
    .custom((value) => {
      if (!value) return defaultVariant;
      if (aliasMap[value]) return aliasMap[value];
      if ((validVariants as readonly string[]).includes(value)) return value;
      return defaultVariant;
    })
    .default(defaultVariant)
    .optional();
}

export const themeSchema = Joi.object({
  language: Joi.string()
    .trim()
    .pattern(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
    .optional(),
  colors: Joi.object({
    primary: color,
    secondary: color,
    background: color,
    surface: color,
    text: color,
    muted: color,
  }).required(),
  fonts: Joi.object({
    heading: Joi.string()
      .valid(...FONT_KEYS)
      .required(),
    body: Joi.string()
      .valid(...FONT_KEYS)
      .required(),
  }).required(),
  buttonStyle: Joi.string()
    .valid(...BUTTON_STYLES)
    .required(),
  cardStyle: Joi.string()
    .valid(...CARD_STYLES)
    .required(),
  radius: Joi.string()
    .valid(...RADIUS_SIZES)
    .required(),
  containerWidth: Joi.number().integer().min(640).max(1600).required(),
  sectionSpacing: Joi.string()
    .valid(...SPACING_SIZES)
    .required(),
});

export const headerSchema = Joi.object({
  design: flexibleVariant(HEADER_DESIGNS, "logo-left", {
    "logo_left": "logo-left",
    "center": "centered",
    "dock": "glass-dock",
    "stacked": "split-stacked",
    "bento": "mega-menu-grid",
    "drawer": "side-drawer",
    "ticker": "headline-ticker",
  }).description('"transparent" = a see-through header laid over the top of the first section (e.g. its background photo); only when position is "static" and sticky is false'),
  siteName: text(120).default("Brand").optional(),
  logo: image.optional(),
  menu: Joi.array().items(menuItem).max(24).default([]).optional(),
  cta: link.optional(),
  secondaryCta: link.optional(),
  announcement: optionalText(200),
  announcementLink: link.optional(),
  position: Joi.string()
    .valid("static", "sticky", "fixed", "floating")
    .optional()
    .description("Sticky, fixed and floating headers are never see-through"),
  sticky: Joi.boolean().default(false).optional().description('Same as position "sticky" when position is not set'),
  overlay: Joi.boolean()
    .optional()
    .description('true = keep the design but make the header see-through over the first section, like design "transparent"; same position rules'),
  showSearch: Joi.boolean().optional(),
  showAccount: Joi.boolean().optional(),
  showCart: Joi.boolean().optional(),
  cartCount: Joi.number().integer().min(0).max(999).optional(),
  currency: optionalText(10),
  mobileMenuType: Joi.string().valid("drawer", "fullscreen", "dropdown").optional(),
  hidden: Joi.boolean().optional(),
  badge: optionalText(60),
  searchPlaceholder: optionalText(100),
  utilityLinks: Joi.array().items(link).max(8).optional(),
  tagline: optionalText(120),
  statusText: optionalText(80),
  statusColor: Joi.string().valid("green", "blue", "orange", "purple", "red").optional(),
  menuLabel: optionalText(40),
  contactLabel: optionalText(60),
  contactEmail: Joi.string().trim().email().max(255).allow("").optional(),
});

export const footerSchema = Joi.object({
  design: flexibleVariant(FOOTER_DESIGNS, "columns", {
    "col": "columns",
    "simple-footer": "simple",
  }),
  siteName: text(120).required(),
  logo: image.optional(),
  tagline: optionalText(200),
  description: optionalText(500),
  columns: Joi.array()
    .items(Joi.object({ title: text(60).required(), links: Joi.array().items(link).max(12).required() }))
    .max(6)
    .required(),
  menu: Joi.array().items(link).max(12).optional(),
  contact: Joi.object({
    title: optionalText(60),
    email: optionalText(255).meta(meta({ fact: "contactEmail" })),
    phone: optionalText(32).meta(meta({ fact: "contactPhone" })),
    address: optionalText(500).meta(meta({ fact: "address" })),
    hours: optionalText(200),
  }).optional(),
  social: Joi.array().items(link).max(12).required(),
  newsletter: Joi.object({
    enabled: Joi.boolean().optional(),
    title: optionalText(100),
    description: optionalText(200),
    placeholder: optionalText(100),
    buttonText: optionalText(50),
  }).optional(),
  ctaBanner: Joi.object({
    enabled: Joi.boolean().optional(),
    heading: optionalText(200),
    subheading: optionalText(500),
    primaryCta: link.optional(),
    secondaryCta: link.optional(),
  }).optional(),
  paymentMethods: Joi.object({
    enabled: Joi.boolean().optional(),
    methods: Joi.array().items(Joi.string().max(30)).max(10).optional(),
  }).optional(),
  legalLinks: Joi.array().items(link).max(6).optional(),
  copyright: text(200).allow("").required(),
  themeMode: Joi.string().valid("dark", "light", "auto").optional(),
  hidden: Joi.boolean().optional(),
});

export const heroSchema = Joi.object({
  variant: flexibleVariant(HERO_VARIANTS, "centered", {
    "split-screen": "split",
    "cards": "floating-cards",
    "campaign": "campaign-banner",
    "event-banner": "campaign-banner",
    "video-banner": "campaign-banner",
  }),
  eyebrow: optionalText(200),
  badgeIcon: optionalText(50),
  heading: optionalText(200),
  highlightText: optionalText(100)
    .description(
      "Words of the heading shown as gradient text (colors: settings.customColors.gradientFrom/gradientTo); use the whole heading for a fully gradient heading.",
    )
    .meta(meta({ partOf: "heading" })),
  subheading: optionalText(500),
  description: optionalText(1000),
  primaryCta: link.optional(),
  secondaryCta: link.optional(),
  tertiaryCta: link.optional(),
  buttons: Joi.array().items(link).max(6).optional(),
  mediaType: Joi.string().valid("image", "video", "both").optional().meta(locked),
  videoUrl: optionalText(500).meta(locked),
  videoAutoplay: Joi.boolean().optional(),
  videoControls: Joi.boolean().optional(),
  videoLoop: Joi.boolean().optional(),
  image: image.optional().description("Picture shown beside or below the text, positioned by imagePosition. Not the background."),
  secondaryImage: image.optional().description("Second picture used by some variants next to image."),
  backgroundImage: image
    .optional()
    .description("Photo covering the whole section behind the text; works with every variant."),
  bgImagePosition: Joi.string().valid("bottom", "center", "top", "cover").optional().description("Focus of backgroundImage."),
  bgOverlayType: Joi.string()
    .valid("dark", "light", "gradient", "none")
    .optional()
    .description("Tint over backgroundImage that keeps the text readable."),
  backgroundVideoUrl: optionalText(500).meta(locked),
  imagePosition: Joi.string()
    .valid("right", "left", "bottom", "background", "card", "center", "top", "none")
    .optional()
    .description('Where image is shown; "background" puts image behind the text.'),
  imageStyle: Joi.string().valid("mockup", "rounded", "glow", "shadow", "plain").optional(),
  overlayOpacity: Joi.number().min(0).max(100).optional().description("Strength of bgOverlayType, 0-100."),
  overlayBlur: Joi.boolean().optional(),
  minHeight: Joi.string().valid("auto", "compact", "screen", "tall").optional(),
  contentAlign: Joi.string().valid("center", "left", "right").optional(),
  bottomShape: Joi.string()
    .valid("none", "wave", "curve", "curved", "slant", "tilt", "arch", "normal")
    .optional(),
  rating: Joi.object({
    stars: Joi.number().min(1).max(5).optional(),
    text: optionalText(200),
    avatarCount: Joi.number().min(1).max(10).optional(),
  })
    .optional()
    .meta(locked),
  floatingCards: Joi.array()
    .items(
      Joi.object({
        title: text(60).required(),
        subtitle: optionalText(100),
        badge: optionalText(30),
        icon: optionalText(50),
      })
    )
    .max(4)
    .optional()
    .meta(locked),
  trustedBy: Joi.object({
    label: optionalText(100),
    logos: Joi.array()
      .items(
        Joi.object({
          label: text(60).required(),
          url: optionalText(500),
        })
      )
      .max(8)
      .optional(),
  })
    .optional()
    .meta(locked),
  carouselSpeed: Joi.number().min(5).max(200).optional(),
  carouselDirection: Joi.string().valid("left-to-right", "right-to-left").optional(),
  showDoodles: Joi.boolean().optional(),
  curveIntensity: Joi.string().valid("none", "subtle", "medium", "dramatic").optional(),
  carouselSlides: Joi.array().items(carouselSlide).max(20).optional(),
  campaignStats: Joi.array()
    .items(
      Joi.object({
        id: optionalText(50),
        label: text(60).required(),
        value: text(60).required(),
        icon: optionalText(50),
      })
    )
    .max(6)
    .optional(),
  campaignProgress: Joi.object({
    raisedAmount: Joi.alternatives().try(Joi.number(), Joi.string().max(60)).optional(),
    targetAmount: Joi.alternatives().try(Joi.number(), Joi.string().max(60)).optional(),
    currency: optionalText(10),
    raisedLabel: optionalText(60),
    targetLabel: optionalText(100),
    percentage: Joi.number().min(0).max(100).optional(),
    donateButton: link.optional(),
    registerButton: link.optional(),
  }).optional(),
  campaignTicker: Joi.array()
    .items(
      Joi.object({
        id: optionalText(50),
        name: text(60).required(),
        action: text(60).required(),
        amount: optionalText(30),
        avatarIcon: optionalText(50),
      })
    )
    .max(30)
    .optional(),
  showCampaignTicker: Joi.boolean().optional(),
  showCampaignCards: Joi.boolean().optional(),
  bannerBottomShape: Joi.string().valid("none", "curved", "wave", "normal", "slant", "tilt", "arch").optional(),
  bannerCurveDepth: Joi.number().min(0).max(300).optional(),
  bottomDividerColor: optionalText(50),
  bannerTopBar: Joi.object({
    enabled: Joi.boolean().optional(),
    logoText: optionalText(100),
    logoImage: image.optional(),
    primaryButton: link.optional(),
    secondaryButton: link.optional(),
  }).optional(),
});

const SECTION_DATA: Record<SectionType, Joi.ObjectSchema> = {
  header: headerSchema,
  footer: footerSchema,
  hero: heroSchema,
  features: Joi.object({
    eyebrow: optionalText(100),
    heading: text(200).required(),
    intro: optionalText(500),
    variant: flexibleVariant(
      ["grid", "split", "pastel-icons", "minimal", "cards"],
      "grid",
      { "cards-grid": "cards", "icons": "pastel-icons" },
    ),
    iconStyle: Joi.string().valid("pastel-circle", "square-badge", "minimal-accent", "colored-circle", "none").optional(),
    cardStyle: Joi.string().valid("transparent", "surface", "bordered", "glass").optional(),
    align: Joi.string().valid("left", "center").optional(),
    columns: columns.optional().default(3),
    mobileColumns: columns.optional().default(1),
    splitPosition: Joi.string().valid("left", "right").optional(),
    splitImage: image.optional(),
    splitCta: link.optional(),
    secondaryCta: link.optional(),
    bottomCta: link.optional(),
    items: Joi.array()
      .items(
        Joi.object({
          icon: Joi.string().max(50).optional(),
          iconColor: Joi.string().valid("orange", "green", "blue", "yellow", "purple", "pink", "cyan", "indigo", "red", "gray", "none", "default").optional(),
          backgroundColor: Joi.string().max(100).allow("").optional(),
          badge: optionalText(50),
          title: text(120).required(),
          description: text(600).allow("").required(),
          link: link.optional(),
          image: image.optional(),
        }),
      )
      .max(24)
      .required(),
  }),
  services: Joi.object({
    heading: text(200).required(),
    eyebrow: optionalText(100),
    intro: optionalText(500),
    variant: flexibleVariant(
      [
        "cards-grid",
        "bento-grid",
        "split-showcase",
        "interactive-list",
        "horizontal-cards",
        "minimal-numbered",
      ],
      "cards-grid",
      { "bento": "bento-grid", "cards": "cards-grid", "split": "split-showcase" },
    ),
    cardStyle: Joi.string()
      .valid("surface", "bordered", "flat", "glass", "glow", "elevated", "gradient")
      .optional(),
    iconStyle: Joi.string()
      .valid("pastel-circle", "square-badge", "minimal-accent", "colored-circle", "glow-icon", "none")
      .optional(),
    imageAspect: Joi.string().valid("16:9", "4:3", "1:1", "21:9", "auto").optional(),
    align: Joi.string().valid("left", "center").optional(),
    columns: columns.optional().default(3),
    mobileColumns: columns.optional().default(1),
    splitPosition: Joi.string().valid("left", "right").optional(),
    splitImage: image.optional(),
    splitTagline: optionalText(200),
    splitCta: link.optional(),
    secondaryCta: link.optional(),
    bottomCta: link.optional(),
    bottomSecondaryCta: link.optional(),
    showBadges: Joi.boolean().optional(),
    showIcons: Joi.boolean().optional(),
    showImages: Joi.boolean().optional(),
    showPrices: Joi.boolean().optional(),
    showBullets: Joi.boolean().optional(),
    showNumbers: Joi.boolean().optional(),
    items: Joi.array()
      .items(
        Joi.object({
          title: text(120).required(),
          description: text(1000).allow("").required(),
          badge: optionalText(60),
          badgeColor: Joi.string().max(30).optional(),
          icon: Joi.string().max(50).optional(),
          iconColor: Joi.string().max(30).optional(),
          image: image.optional(),
          price: optionalText(60),
          duration: optionalText(60),
          features: Joi.array().items(text(200)).max(12).optional(),
          link: link.optional(),
          secondaryLink: link.optional(),
          backgroundColor: Joi.string().max(100).allow("").optional(),
          featured: Joi.boolean().optional(),
        }),
      )
      .max(24)
      .required(),
  }),
  testimonials: Joi.object({
    variant: flexibleVariant(
      [
        "cards-grid",
        "carousel-slider",
        "marquee-wall",
        "spotlight-featured",
        "minimal-editorial",
      ],
      "cards-grid",
      {
        "grid": "cards-grid",
        "cards": "cards-grid",
        "carousel": "carousel-slider",
        "slider": "carousel-slider",
        "marquee": "marquee-wall",
        "ticker": "marquee-wall",
        "spotlight": "spotlight-featured",
        "featured": "spotlight-featured",
        "editorial": "minimal-editorial",
        "minimal": "minimal-editorial",
      },
    ),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    intro: optionalText(500),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
    columns: Joi.number().valid(1, 2, 3, 4).optional().default(3),
    showRatings: Joi.boolean().optional().default(true),
    showAvatars: Joi.boolean().optional().default(true),
    showBadges: Joi.boolean().optional().default(true),
    ratingMetric: Joi.object({
      score: optionalText(20),
      label: optionalText(80),
      count: optionalText(60),
    }).optional(),
    items: Joi.array()
      .items(
        Joi.object({
          quote: text(800).required(),
          name: text(120).required(),
          role: optionalText(120),
          company: optionalText(120),
          avatar: image.optional(),
          rating: Joi.number().min(1).max(5).optional().default(5),
          verified: Joi.boolean().optional().default(true),
          badge: optionalText(60),
          highlight: optionalText(80),
        }),
      )
      .max(24)
      .required(),
  }),
  faq: Joi.object({
    variant: flexibleVariant(
      [
        "accordion-classic",
        "two-column-grid",
        "split-sidebar",
        "minimal-numbered",
        "categorized-cards",
      ],
      "accordion-classic",
      { "accordion": "accordion-classic", "grid": "two-column-grid", "split": "split-sidebar", "minimal": "minimal-numbered" },
    ),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    intro: optionalText(500),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
    supportCta: Joi.object({
      title: optionalText(100),
      description: optionalText(300),
      link: link.optional(),
    }).optional(),
    items: Joi.array()
      .items(
        Joi.object({
          question: text(300).required(),
          answer: text(2000).required(),
          category: optionalText(50),
          badge: optionalText(40),
          isOpenDefault: Joi.boolean().optional(),
        }),
      )
      .max(40)
      .required(),
  }),
  cta: Joi.object({
    variant: flexibleVariant(
      ["centered-card", "split-visual", "floating-card", "minimal-editorial"],
      "centered-card",
      { "centered": "centered-card", "split": "split-visual", "floating": "floating-card", "minimal": "minimal-editorial" },
    ),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    text: optionalText(500),
    button: link.required(),
    secondaryButton: link.optional(),
    trustBadges: Joi.array().items(text(80)).max(6).optional(),
    highlightMetric: Joi.object({
      value: text(30).required(),
      label: text(80).required(),
      subtext: optionalText(120),
    }).optional(),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
  }),
  contact: Joi.object({
    variant: flexibleVariant(
      ["split-form", "cards-hub", "minimal-editorial", "floating-glass"],
      "split-form",
      { "split": "split-form", "cards": "cards-hub", "minimal": "minimal-editorial", "floating": "floating-glass" },
    ),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    text: optionalText(500),
    email: optionalText(255).meta(meta({ fact: "contactEmail" })),
    phone: optionalText(32).meta(meta({ fact: "contactPhone" })),
    address: optionalText(500).meta(meta({ fact: "address" })),
    officeHours: optionalText(100),
    responseTime: optionalText(100),
    showForm: Joi.boolean().required(),
    submitLabel: text(40).required(),
    formHeading: optionalText(120),
    serviceOptions: Joi.array().items(text(60)).max(8).optional(),
    channels: Joi.array()
      .items(
        Joi.object({
          label: text(80).required(),
          value: text(120).required(),
          description: optionalText(200),
          icon: Joi.string().valid("mail", "phone", "chat", "user").optional(),
        }),
      )
      .max(6)
      .optional()
      .meta(locked),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
  }),
  text: Joi.object({
    heading: optionalText(200),
    body: text(20000).allow("").required(),
  }),
  gallery: Joi.object({
    heading: optionalText(200),
    columns: columns.required(),
    mobileColumns: columns.required(),
    images: Joi.array().items(image).max(48).required(),
  }),
  logos: Joi.object({
    heading: optionalText(200),
    grayscale: Joi.boolean().required(),
    logos: Joi.array().items(image).max(24).required(),
  }),
  split: Joi.object({
    eyebrow: optionalText(200),
    heading: text(200).required(),
    body: text(4000).allow("").required(),
    bullets: Joi.array().items(text(200)).max(8).required(),
    image: image.optional(),
    imagePosition: Joi.string().valid("left", "right").required(),
    cta: link.optional(),
  }),
  stats: Joi.object({
    heading: optionalText(200),
    intro: optionalText(500),
    items: Joi.array()
      .items(Joi.object({ value: text(20).required(), label: text(80).required() }))
      .max(8)
      .required(),
  }),
  pricing: Joi.object({
    variant: flexibleVariant(
      ["cards-grid", "minimal-monochrome", "spotlight-tier", "horizontal-rows"],
      "cards-grid",
      { "cards": "cards-grid", "minimal": "minimal-monochrome", "spotlight": "spotlight-tier", "horizontal": "horizontal-rows" },
    ),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    intro: optionalText(500),
    billingCycleLabel: optionalText(80),
    discountBadge: optionalText(60),
    footerNote: optionalText(300),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    columns: Joi.number().integer().min(1).max(4).optional(),
    mobileColumns: Joi.number().integer().min(1).max(2).optional(),
    align: Joi.string().valid("left", "center").optional(),
    plans: Joi.array()
      .items(
        Joi.object({
          name: text(60).required(),
          price: text(30).required(),
          period: optionalText(30),
          originalPrice: optionalText(30),
          badge: optionalText(50),
          description: optionalText(300),
          features: Joi.array().items(text(160)).max(15).required(),
          excludedFeatures: Joi.array().items(text(160)).max(15).optional(),
          cta: link.optional(),
          featured: Joi.boolean().required(),
          highlightNote: optionalText(120),
        }),
      )
      .max(6)
      .required(),
  }),
  media: Joi.object({
    heading: optionalText(200),
    caption: optionalText(300),
    kind: Joi.string().valid("image", "video").required(),
    image: image.optional(),
    videoUrl: text(2048)
      .pattern(SAFE_VIDEO_URL)
      .allow("")
      .optional()
      .messages({ "string.pattern.base": "Use a YouTube or Vimeo video link" }),
    aspect: Joi.string().valid("16:9", "4:3", "1:1").required(),
    width: Joi.string().valid("contained", "wide").required(),
  }),
  team: Joi.object({
    variant: flexibleVariant(
      ["grid-cards", "spotlight-featured", "minimal-editorial", "glass-overlay"],
      "grid-cards",
      { "grid": "grid-cards", "spotlight": "spotlight-featured", "minimal": "minimal-editorial", "glass": "glass-overlay" },
    ),
    eyebrow: optionalText(80),
    badge: optionalText(80),
    heading: text(200).required(),
    intro: optionalText(500),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
    columns: columns.required(),
    mobileColumns: columns.required(),
    members: Joi.array()
      .items(
        Joi.object({
          name: text(120).required(),
          role: optionalText(120),
          department: optionalText(80),
          bio: optionalText(600),
          location: optionalText(100),
          photo: image.meta(meta({ shape: "square" })).optional(),
          tags: Joi.array().items(text(50)).max(6).optional(),
          link: link.optional(),
          socialLinks: Joi.array()
            .items(
              Joi.object({
                platform: Joi.string()
                  .valid("linkedin", "twitter", "github", "email", "link")
                  .required(),
                url: Joi.string()
                  .uri({ scheme: ["http", "https", "mailto"] })
                  .max(255)
                  .required(),
              }),
            )
            .max(5)
            .optional()
            .meta(locked),
        }),
      )
      .max(24)
      .required(),
  }),
  carousel: Joi.object({
    variant: flexibleVariant(
      [
        "cards",
        "hero-slider",
        "showcase",
        "minimal-editorial",
        "image-gallery",
        "image-strip",
        "image-coverflow",
        "curved-banner",
      ],
      "cards",
      { "hero": "hero-slider", "gallery": "image-gallery", "strip": "image-strip", "coverflow": "image-coverflow" },
    ),
    eyebrow: optionalText(80),
    heading: optionalText(200),
    intro: optionalText(500),
    badge: optionalText(80),
    slides: Joi.array()
      .items(carouselSlide)
      .min(1)
      .max(12)
      .required(),
    autoPlay: Joi.boolean().optional(),
    interval: Joi.number().min(2).max(30).optional(),
    showArrows: Joi.boolean().optional(),
    showDots: Joi.boolean().optional(),
    showThumbnails: Joi.boolean().optional(),
    imageAspect: Joi.string().valid("16:9", "4:3", "1:1", "21:9", "3:4").optional(),
    columns: columns.optional(),
    pauseOnHover: Joi.boolean().optional(),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
  }),
  marquee: Joi.object({
    variant: flexibleVariant(
      ["ticker-text", "cards-stream", "pill-badges", "dual-directional"],
      "ticker-text",
      {
        "gradient-pill": "pill-badges",
        "pills": "pill-badges",
        "badges": "pill-badges",
        "cards": "cards-stream",
        "features": "cards-stream",
        "dual": "dual-directional",
        "two-way": "dual-directional",
        "ticker": "ticker-text",
      },
    ),
    eyebrow: optionalText(80),
    heading: optionalText(200),
    intro: optionalText(500),
    items: Joi.array()
      .items(
        Joi.object({
          text: text(120).required(),
          badge: optionalText(60),
          icon: Joi.string().valid(...ICON_NAMES).optional(),
          link: Joi.string().max(255).optional(),
          subtext: optionalText(120),
        }),
      )
      .min(1)
      .max(24)
      .required(),
    secondaryItems: Joi.array()
      .items(
        Joi.object({
          text: text(120).required(),
          badge: optionalText(60),
          icon: Joi.string().valid(...ICON_NAMES).optional(),
          link: Joi.string().max(255).optional(),
          subtext: optionalText(120),
        }),
      )
      .max(24)
      .optional(),
    speed: Joi.string().valid("slow", "normal", "fast").optional(),
    direction: Joi.string().valid("left", "right").optional(),
    pauseOnHover: Joi.boolean().optional(),
    gradientFades: Joi.boolean().optional(),
    fontSize: Joi.string().valid("small", "medium", "large", "huge").optional(),
  }),
  auth: authDataSchema,
  custom: customDataSchema,
  blog: Joi.object({
    eyebrow: optionalText(120),
    title: text(160).required(),
    subtitle: optionalText(320),
    categories: Joi.array().items(text(60)).max(20).optional(),
    layout: Joi.string().valid("grid-3", "grid-2", "magazine").optional(),
    showNewsletterCard: Joi.boolean().optional(),
    newsletterTitle: optionalText(160),
    newsletterDescription: optionalText(320),
    newsletterPlaceholder: optionalText(120),
    newsletterButtonText: optionalText(60),
    posts: Joi.array()
      .items(
        Joi.object({
          id: text(64).required(),
          title: text(200).required(),
          slug: text(200).required(),
          excerpt: optionalText(500),
          coverImage: image.optional(),
          category: optionalText(60),
          authorName: optionalText(100),
          authorAvatar: image.optional(),
          date: optionalText(60),
          readTime: optionalText(40),
          featured: Joi.boolean().optional(),
          readMoreLabel: optionalText(60),
        }),
      )
      .max(50)
      .required(),
  }),
  blog_detail: Joi.object({
    design: Joi.string().valid(...BLOG_DETAIL_DESIGNS).required(),
    title: text(240).required(),
    subtitle: optionalText(400),
    category: text(80).required(),
    date: text(80).required(),
    authorName: text(120).required(),
    authorRole: optionalText(120),
    authorAvatar: image.optional(),
    authorBio: optionalText(500),
    readTime: text(60).required(),
    coverImage: image.required(),
    coverImageCaption: optionalText(200),
    content: Joi.array()
      .items(
        Joi.object({
          heading: optionalText(200),
          subheading: optionalText(200),
          paragraphs: Joi.array().items(Joi.string().allow("").max(2000)).max(20).required(),
          quote: optionalText(500),
          quoteAuthor: optionalText(100),
          callout: optionalText(500),
          image: image.optional(),
        }),
      )
      .max(30)
      .required(),
    tags: Joi.array().items(text(60)).max(20).optional(),
    showShareButtons: Joi.boolean().optional(),
    showAuthorBio: Joi.boolean().optional(),
    showNewsletter: Joi.boolean().optional(),
    newsletterTitle: optionalText(160),
    newsletterDescription: optionalText(320),
  }),
};

/** Content schema of each section type; the single source for validation and the AI field catalog. */
export const SECTION_DATA_SCHEMAS: Readonly<Record<SectionType, Joi.ObjectSchema>> = SECTION_DATA;

export const sectionSettingsSchema = Joi.object({
  background: Joi.string()
    .valid(...SECTION_BACKGROUNDS)
    .required()
    .description("Theme background preset. A custom color goes in customColors.background."),
  hideOnMobile: Joi.boolean().required(),
  hideOnDesktop: Joi.boolean().optional(),
  spacing: Joi.string()
    .valid(...SECTION_SPACINGS)
    .optional(),
  align: Joi.string()
    .valid(...SECTION_ALIGNMENTS)
    .optional(),
  anchor: Joi.string()
    .pattern(ANCHOR)
    .allow("")
    .optional()
    .messages({ "string.pattern.base": "Anchors use lowercase letters, numbers and hyphens" }),
  customColors: Joi.object({
    background: color.optional().description("Section background color."),
    text: color.optional().description("Text color."),
    primary: color.optional().description("Buttons, links and accents."),
    muted: color.optional().description("Secondary text."),
    border: color.optional(),
    gradientFrom: color
      .optional()
      .description("Start color of gradient text: the hero's highlightText, or its whole heading when nothing is highlighted."),
    gradientTo: color.optional().description("End color of gradient text."),
  }).optional(),
  font: Joi.string()
    .valid(...FONT_KEYS)
    .optional(),
});

export const sectionSchema = Joi.object({
  id: text(128).required(),
  type: Joi.string()
    .valid(...SECTION_TYPES)
    .required(),
  hidden: Joi.boolean().required(),
  settings: sectionSettingsSchema.required(),
  data: Joi.when("type", {
    switch: SECTION_TYPES.map((type) => ({ is: type, then: SECTION_DATA[type].required() })),
  }),
});

export const sectionsSchema = Joi.array()
  .items(sectionSchema)
  .max(60)
  .unique("id")
  .messages({ "array.unique": "Section ids must be unique within a page" });
