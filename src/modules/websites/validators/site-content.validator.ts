import Joi from "joi";
import { hasRichText, sanitizeRichText, toPlainText } from "../../../common/utils/rich-text.js";
import {
  ACCOUNT_PREVIEWS,
  ACCOUNT_VARIANTS,
  AUTH_ANIMATIONS,
  AUTH_FIELD_TYPES,
  AUTH_SOCIAL_PROVIDERS,
  AUTH_VARIANTS,
  AUTH_VIEWS,
  BRAND_DISPLAY_MODES,
  BUTTON_STYLES,
  CARD_STYLES,
  CONTACT_BLOCK_TYPES,
  CONTACT_FIELD_TYPES,
  CONTACT_FIELD_WIDTHS,
  CONTACT_ID_PATTERN,
  CONTACT_INFO_KINDS,
  CONTACT_LAYOUT_ALIGNS,
  CONTACT_LAYOUT_GAPS,
  CONTACT_LIMITS,
  CONTACT_MAP_HEIGHTS,
  CONTACT_VARIANTS,
  type ContactLayout,
  CUSTOM_ALIGNS,
  CUSTOM_CARD_TONES,
  CUSTOM_GAPS,
  CUSTOM_IMAGE_ASPECTS,
  CUSTOM_LIMITS,
  type CustomBlock,
  FEATURE_ICON_COLORS,
  FONT_KEYS,
  FOOTER_DESIGNS,
  HEADER_DESIGNS,
  HERO_ALIGNS,
  HERO_BUTTON_RADIUS_MAX,
  HERO_BUTTON_SHAPES,
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
  BLOG_SHARE_PLATFORMS,
  BLOG_SOCIAL_PLATFORMS,
  CARDS_BUTTON_SIZES,
  CARDS_BUTTON_VARIANTS,
  CARDS_CARD_STYLES,
  CARDS_CORNERS,
  CARDS_DESCRIPTION_LINES_MAX,
  CARDS_HEADER_LAYOUTS,
  CARDS_HOVER_EFFECTS,
  CARDS_IMAGE_ASPECTS,
  CARDS_RADIUS_MAX,
  CARDS_VARIANTS,
  CARDS_ICON_PLACEMENTS,
  CARDS_ICON_ALIGNS,
  CARDS_ICON_VARIANTS,
  CARDS_ICON_SHAPES,
  CARDS_ICON_SIZES,
  CARDS_CHECKLIST_ICONS,
  CARDS_CHECKLIST_MAX,
  LINK_ACTION_TYPES,
  LINK_ICON_POSITIONS,
} from "../types/site-content.types.js";

/**
 * Content ends up in published HTML, so links and image URLs are limited to
 * schemes that can't execute script, and colors to plain hex values.
 */
export const SAFE_HREF = /^(https?:\/\/\S+|mailto:\S+|tel:[+0-9() -]+|\/(?!\/)\S*|#\S*)$/i;
export const SAFE_IMAGE_URL =
  /^(https?:\/\/\S+|\/(?!\/)\S*|data:image\/(?:png|jpe?g|webp|gif|svg\+xml|avif)(?:;[a-z0-9=_-]+)*;?(?:base64)?,[\s\S]*)$/i;
const SAFE_HREF_MESSAGE = "Enter a valid link, like /contact, https://example.com, #section, mailto: or tel:";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
/** Only these hosts are embedded, and only via an iframe src the renderer builds itself. */
export const SAFE_VIDEO_URL =
  /^https:\/\/(?:(?:www\.|m\.)?youtube\.com\/watch\?v=[\w-]{6,20}(?:&\S*)?|youtu\.be\/[\w-]{6,20}(?:\?\S*)?|(?:www\.)?vimeo\.com\/\d{6,12}(?:\?\S*)?)$/i;
/** Film cards: a YouTube link, an uploaded media file, or a direct mp4/webm/ogg file. */
export const UPLOAD_OR_YOUTUBE_VIDEO_URL =
  /^(?:https?:\/\/(?:(?:www\.|m\.)?youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)[\w-]{6,}(?:[^\s]*)?|youtu\.be\/[\w-]{6,}(?:\?\S*)?)|https?:\/\/\S+\/api\/media\/files\/[A-Za-z0-9_-]+(?:\?\S*)?|https?:\/\/\S+\.(?:mp4|webm|ogg)(?:\?\S*)?|\/(?!\/)\S+\.(?:mp4|webm|ogg)(?:\?\S*)?)$/i;
const ANCHOR = /^[a-z][a-z0-9-]{0,39}$/;
/** Blog social profiles: a full http(s)/mailto link, a bare domain, @handle, email or phone (no other schemes). */
const BLOG_SOCIAL_URL = /^(https?:\/\/\S+|mailto:\S+|\+?[0-9][0-9 ()-]{5,}|[^\s:]+)$/i;

/** Rich text markup never counts towards a field's limit, but its total size is still capped. */
const RICH_TEXT_MARKUP_ALLOWANCE = (limit: number) => limit * 8 + 512;

/**
 * Joi strings whose `max` counts visible characters, so inline formatting
 * (see common/utils/rich-text.ts) doesn't eat into the limit. Formatting is
 * normalized on the way in. The AI field catalog reads `richMax` as `max`.
 */
const RichJoi = Joi.extend((joi) => ({
  type: "string",
  base: joi.string(),
  rules: {
    richMax: {
      method(limit: number) {
        return this.$_addRule({ name: "richMax", args: { limit } });
      },
      args: [{ name: "limit", assert: (value: unknown) => typeof value === "number" && value >= 0, message: "must be a positive number" }],
      validate(value: string, helpers, { limit }: { limit: number }) {
        if (!hasRichText(value) || value.startsWith("data:")) {
          return value.length <= limit ? value : helpers.error("string.max", { limit, value });
        }
        const clean = sanitizeRichText(value);
        if (toPlainText(clean, "").length > limit || clean.length > RICH_TEXT_MARKUP_ALLOWANCE(limit)) {
          return helpers.error("string.max", { limit, value });
        }
        return clean;
      },
    },
  },
}));

const text = (max: number) => RichJoi.string().trim().richMax(max);
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

const subMenuItem = Joi.object({
  label: text(80).required(),
  href: text(2048)
    .pattern(SAFE_HREF)
    .required()
    .messages({ "string.pattern.base": SAFE_HREF_MESSAGE }),
  description: optionalText(140),
  badge: optionalText(30),
  icon: optionalText(40),
});

const menuItem = Joi.object({
  label: text(80).required(),
  href: text(2048)
    .pattern(SAFE_HREF)
    .required()
    .messages({ "string.pattern.base": SAFE_HREF_MESSAGE }),
  description: optionalText(140),
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

const galleryImage = image.keys({
  name: optionalText(200),
  title: optionalText(200),
  badge: optionalText(80),
  description: optionalText(1000),
  link: Joi.string().trim().max(2048).allow("").optional(),
});

const blogSocialLinks = Joi.array()
  .items(
    Joi.object({
      platform: Joi.string()
        .valid(...BLOG_SOCIAL_PLATFORMS)
        .required(),
      url: text(255)
        .pattern(BLOG_SOCIAL_URL)
        .allow("")
        .required()
        .messages({ "string.pattern.base": "Social links must be a web address, @handle, phone number or email" }),
    }),
  )
  .max(16)
  .optional()
  .meta(locked);

const link = Joi.object({
  label: text(80).required(),
  href: text(2048)
    .pattern(SAFE_HREF)
    .required()
    .messages({ "string.pattern.base": SAFE_HREF_MESSAGE }),
  actionType: Joi.string()
    .valid(...LINK_ACTION_TYPES)
    .optional(),
  downloadFileName: optionalText(100),
  videoUrl: optionalText(2048),
  videoTitle: optionalText(200),
  icon: Joi.string().max(100).allow("").optional(),
  iconImage: image.optional(),
  iconPosition: Joi.string()
    .valid(...LINK_ICON_POSITIONS)
    .optional(),
  openInNewTab: Joi.boolean().optional(),
}).meta(meta({ kind: "link" }));

/** How the header/footer combines the logo and the site name. */
const logoDisplay = Joi.string()
  .valid(...BRAND_DISPLAY_MODES)
  .optional()
  .description('"logo_only" hides the site name; "text_only" hides the logo');

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
        .messages({ "string.pattern.base": SAFE_HREF_MESSAGE }),
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

const contactId = Joi.string()
  .pattern(CONTACT_ID_PATTERN)
  .required()
  .messages({ "string.pattern.base": "Ids use lowercase letters, digits, - and _" });

export const contactFormFieldSchema = Joi.object({
  id: contactId,
  type: Joi.string().valid(...CONTACT_FIELD_TYPES).required(),
  label: optionalText(80),
  placeholder: optionalText(120),
  required: Joi.boolean().optional(),
  width: Joi.string().valid(...CONTACT_FIELD_WIDTHS).optional(),
  options: Joi.array().items(optionalText(80)).max(CONTACT_LIMITS.maxOptions).optional(),
});

const contactBlockType = (type: (typeof CONTACT_BLOCK_TYPES)[number]) => Joi.string().valid(type).required();
const contactBlockBase = { id: contactId, boxed: Joi.boolean().optional() };

const contactBlockSchema = Joi.alternatives().try(
  Joi.object({ ...contactBlockBase, type: contactBlockType("heading"), text: optionalText(200), level: Joi.number().valid(2, 3).optional() }),
  Joi.object({ ...contactBlockBase, type: contactBlockType("text"), text: optionalText(1200) }),
  Joi.object({ ...contactBlockBase, type: contactBlockType("badge"), text: optionalText(80) }),
  Joi.object({
    ...contactBlockBase,
    type: contactBlockType("info"),
    kind: Joi.string().valid(...CONTACT_INFO_KINDS).required(),
    label: optionalText(80),
    value: optionalText(500),
    icon: Joi.string().valid(...ICON_NAMES).optional(),
  }),
  Joi.object({ ...contactBlockBase, type: contactBlockType("form") }),
  Joi.object({
    ...contactBlockBase,
    type: contactBlockType("map"),
    query: optionalText(200),
    height: Joi.string().valid(...CONTACT_MAP_HEIGHTS).optional(),
  }),
  Joi.object({
    ...contactBlockBase,
    type: contactBlockType("button"),
    label: optionalText(80),
    href: text(2048).pattern(SAFE_HREF).allow("").optional().messages({ "string.pattern.base": SAFE_HREF_MESSAGE }),
    tone: Joi.string().valid("primary", "secondary").optional(),
  }),
  Joi.object({ ...contactBlockBase, type: contactBlockType("image"), image: image.required() }),
  Joi.object({ ...contactBlockBase, type: contactBlockType("divider") }),
);

const contactColumnSchema = Joi.object({
  id: contactId,
  width: Joi.number().integer().min(1).max(12).required(),
  boxed: Joi.boolean().optional(),
  blocks: Joi.array().items(contactBlockSchema).max(CONTACT_LIMITS.maxBlocksPerColumn).required(),
});

export const contactLayoutSchema = Joi.object({
  columns: Joi.array().items(contactColumnSchema).min(1).max(CONTACT_LIMITS.maxColumns).required(),
  gap: Joi.string().valid(...CONTACT_LAYOUT_GAPS).optional(),
  align: Joi.string().valid(...CONTACT_LAYOUT_ALIGNS).optional(),
  mobileReverse: Joi.boolean().optional(),
}).custom((value: ContactLayout, helpers) => {
  const blocks = value.columns.flatMap((column) => column.blocks);
  if (blocks.length > CONTACT_LIMITS.maxBlocks) {
    return helpers.message({ custom: `A contact layout can have at most ${CONTACT_LIMITS.maxBlocks} blocks` });
  }
  if (blocks.filter((block) => block.type === "form").length > 1) {
    return helpers.message({ custom: "A contact layout can have only one form" });
  }
  const ids = [...value.columns.map((column) => column.id), ...blocks.map((block) => block.id)];
  if (new Set(ids).size !== ids.length) return helpers.message({ custom: "Contact layout ids must be unique" });
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
            .messages({ "string.pattern.base": SAFE_HREF_MESSAGE }),
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
  fontSize: Joi.string()
    .max(30)
    .optional(),
  headingSize: Joi.string()
    .max(30)
    .optional(),
  bodySize: Joi.string()
    .max(30)
    .optional(),
  containerWidth: Joi.string()
    .max(30)
    .optional(),
  headingWeight: Joi.string()
    .max(30)
    .optional(),
  headingItalic: Joi.boolean()
    .optional(),
  bodyWeight: Joi.string()
    .max(30)
    .optional(),
  bodyItalic: Joi.boolean()
    .optional(),
});

/** Style of the site-wide header/footer; the editor writes it from the shared header/footer section. */
const chromeSettings = sectionSettingsSchema.optional().meta(locked);

export const headerSchema = Joi.object({
  settings: chromeSettings,
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
  logoDisplay,
  logoHeight: Joi.number().integer().min(16).max(200).optional().description("Logo height in px; default is 38px"),
  logoSize: Joi.number().integer().min(16).max(200).optional().description("Alias for logoHeight in px"),
  menu: Joi.array().items(menuItem).max(24).default([]).optional(),
  navAlign: Joi.string()
    .valid(...SECTION_ALIGNMENTS)
    .optional()
    .description("Desktop position of the main navigation. Omit to keep the design's own layout."),
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
  settings: chromeSettings,
  design: flexibleVariant(FOOTER_DESIGNS, "columns", {
    "col": "columns",
    "simple-footer": "simple",
  }),
  siteName: text(120).required(),
  logo: image.optional(),
  logoDisplay,
  logoHeight: Joi.number().integer().min(16).max(200).optional().description("Logo height in px; default is 38px"),
  logoSize: Joi.number().integer().min(16).max(200).optional().description("Alias for logoHeight in px"),
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
  contentAlign: Joi.string().valid(...HERO_ALIGNS).optional(),
  alignment: Joi.object({
    all: Joi.string().valid(...HERO_ALIGNS).optional(),
    badge: Joi.string().valid(...HERO_ALIGNS).optional(),
    heading: Joi.string().valid(...HERO_ALIGNS).optional(),
    subheading: Joi.string().valid(...HERO_ALIGNS).optional(),
    description: Joi.string().valid(...HERO_ALIGNS).optional(),
    actions: Joi.string().valid(...HERO_ALIGNS).optional(),
    trustedBy: Joi.string().valid(...HERO_ALIGNS).optional(),
  })
    .optional()
    .description("Hero content alignment: `all` aligns every element; per-element keys override it."),
  buttonShape: Joi.string()
    .valid(...HERO_BUTTON_SHAPES)
    .optional()
    .description("Corner shape of all hero buttons; unset follows the theme radius."),
  buttonRadius: Joi.number()
    .integer()
    .min(0)
    .max(HERO_BUTTON_RADIUS_MAX)
    .optional()
    .description('Button corner radius in px; only used when buttonShape is "custom".'),
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
  vintagePolaroids: Joi.array()
    .items(
      Joi.object({
        image: image.required(),
        caption: optionalText(120),
        rotation: Joi.number().min(-15).max(15).optional(),
      }),
    )
    .max(2)
    .optional(),
  topStrip: Joi.object({
    left: optionalText(120),
    center: optionalText(120),
    right: optionalText(120),
  }).optional(),
  sunburstTitleWhite: optionalText(100),
  circularPortrait: image.optional(),
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
    heading: optionalText(200),
    intro: optionalText(500),
    variant: flexibleVariant(
      ["grid", "split", "pastel-icons", "minimal", "cards", "editorial-process", "colored-pillars", "polaroid-grid"],
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
    iconBackgroundColor: Joi.string().max(100).allow("").optional(),
    showDividers: Joi.boolean().optional(),
    dividerStyle: Joi.string().valid("inset", "full").optional(),
    dividerColor: Joi.string().max(100).allow("").optional(),
    items: Joi.array()
      .items(
        Joi.object({
          icon: Joi.string().max(100).allow("").optional(),
          iconImage: image.optional(),
          iconColor: Joi.string().max(40).allow("").optional(),
          iconBackgroundColor: Joi.string().max(100).allow("").optional(),
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
        "editorial-specs",
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
          icon: Joi.string().max(100).allow("").optional(),
          iconImage: image.optional(),
          iconColor: Joi.string().max(30).optional(),
          image: image.optional(),
          price: optionalText(60),
          duration: optionalText(60),
          features: Joi.array().items(text(200)).max(12).optional(),
          link: link.optional(),
          secondaryLink: link.optional(),
          backgroundColor: Joi.string().max(100).allow("").optional(),
          featured: Joi.boolean().optional(),
          stampHighlight: Joi.boolean().optional(),
        }),
      )
      .max(24)
      .required(),
  }),
  cards: Joi.object({
    variant: flexibleVariant(CARDS_VARIANTS, "product-classic", {
      product: "product-classic",
      classic: "product-classic",
      overlay: "image-overlay",
      horizontal: "horizontal-split",
      split: "horizontal-split",
      minimal: "minimal-accent",
      accent: "minimal-accent",
      floating: "floating-panel",
      "floating-icon": "floating-icon",
      "icon-badge": "floating-icon",
      "seam-icon": "floating-icon",
    }),
    eyebrow: optionalText(100),
    heading: text(200).allow("").required(),
    intro: optionalText(500),
    headerLayout: Joi.string().valid(...CARDS_HEADER_LAYOUTS).optional(),
    headerLink: link.optional(),
    bottomCta: link.optional(),
    columns: columns.optional().default(3),
    tabletColumns: columns.optional(),
    mobileColumns: columns.optional().default(1),
    mobileLayout: Joi.string().valid("stack", "scroll").optional(),
    gap: Joi.string().valid("sm", "md", "lg").optional(),
    cardStyle: Joi.string().valid(...CARDS_CARD_STYLES).optional(),
    cardCorners: Joi.string().valid(...CARDS_CORNERS).optional(),
    cardRadius: Joi.number().integer().min(0).max(CARDS_RADIUS_MAX).optional(),
    imageAspect: Joi.string().valid(...CARDS_IMAGE_ASPECTS).optional(),
    imageFit: Joi.string().valid("cover", "contain").optional(),
    imagePosition: Joi.string().valid("left", "right").optional(),
    contentAlign: Joi.string().valid("left", "center").optional(),
    hoverEffect: Joi.string().valid(...CARDS_HOVER_EFFECTS).optional(),
    descriptionLines: Joi.number().integer().min(0).max(CARDS_DESCRIPTION_LINES_MAX).optional(),
    clickableCards: Joi.boolean().optional(),
    showImages: Joi.boolean().optional(),
    showIcons: Joi.boolean().optional(),
    showBadges: Joi.boolean().optional(),
    showTags: Joi.boolean().optional(),
    showDescription: Joi.boolean().optional(),
    showPrices: Joi.boolean().optional(),
    showNumbers: Joi.boolean().optional(),
    defaultIcon: Joi.string().max(100).allow("").optional(),
    iconPlacement: Joi.string().valid(...CARDS_ICON_PLACEMENTS).optional(),
    iconAlign: Joi.string().valid(...CARDS_ICON_ALIGNS).optional(),
    iconVariant: Joi.string().valid(...CARDS_ICON_VARIANTS).optional(),
    iconShape: Joi.string().valid(...CARDS_ICON_SHAPES).optional(),
    iconRadius: Joi.number().integer().min(0).max(48).optional(),
    iconSize: Joi.string().valid(...CARDS_ICON_SIZES).optional(),
    iconBgColor: color.optional(),
    iconColor: color.optional(),
    iconOffsetY: Joi.number().integer().min(-50).max(50).optional(),
    button: Joi.object({
      variant: Joi.string().valid(...CARDS_BUTTON_VARIANTS).optional(),
      secondaryVariant: Joi.string().valid(...CARDS_BUTTON_VARIANTS).optional(),
      shape: Joi.string().valid(...HERO_BUTTON_SHAPES).optional(),
      radius: Joi.number().integer().min(0).max(HERO_BUTTON_RADIUS_MAX).optional(),
      size: Joi.string().valid(...CARDS_BUTTON_SIZES).optional(),
      fullWidth: Joi.boolean().optional(),
      showArrow: Joi.boolean().optional(),
    }).optional(),
    items: Joi.array()
      .items(
        Joi.object({
          title: text(120).required(),
          subtitle: optionalText(120),
          description: optionalText(800),
          image: image.optional(),
          icon: Joi.string().max(100).allow("").optional(),
          iconImage: image.optional(),
          badge: optionalText(30),
          tags: Joi.array().items(text(40)).max(8).optional(),
          price: optionalText(50),
          link: link.optional(),
          secondaryLink: link.optional(),
          backgroundColor: color.optional(),
          accentColor: color.optional(),
          iconBgColor: color.optional(),
          iconColor: color.optional(),
          featured: Joi.boolean().optional(),
          videoUrl: optionalText(2048)
            .pattern(UPLOAD_OR_YOUTUBE_VIDEO_URL)
            .messages({
              "string.pattern.base": "Upload a video or paste a YouTube link",
            }),
          checklist: Joi.array()
            .items(
              Joi.alternatives().try(
                text(500),
                Joi.object({
                  text: text(500).required(),
                  icon: Joi.string()
                    .valid(...CARDS_CHECKLIST_ICONS)
                    .optional(),
                }),
              ),
            )
            .max(CARDS_CHECKLIST_MAX)
            .optional()
            .description("Do's & Don'ts points; each gets a check or cross mark."),
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
      ["centered-card", "split-visual", "floating-card", "minimal-editorial", "vintage-story", "vintage-banner"],
      "centered-card",
      { "centered": "centered-card", "split": "split-visual", "floating": "floating-card", "minimal": "minimal-editorial" },
    ),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    italicText: optionalText(120),
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
      CONTACT_VARIANTS,
      "split-form",
      { "split": "split-form", "cards": "cards-hub", "minimal": "minimal-editorial", "floating": "floating-glass", "clapper": "clapper-slate" },
    ),
    eyebrow: optionalText(80),
    heading: text(200).required(),
    solidHeading: optionalText(100),
    outlineHeading: optionalText(100),
    recText: optionalText(100),
    timecode: optionalText(50),
    timecodeMode: Joi.string().valid("live", "static").optional(),
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
    budgetOptions: Joi.array().items(text(60)).max(10).optional(),
    sceneTakeLabel: optionalText(100),
    socialLinksText: optionalText(200),
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
      .description("Department cards. Each value must be the business email or phone, never an invented address."),
    cardStyle: Joi.string()
      .valid("default", "bordered", "flat", "glass", "elevated", "contrast")
      .optional(),
    align: Joi.string().valid("left", "center").optional(),
    formFields: Joi.array()
      .items(contactFormFieldSchema)
      .max(CONTACT_LIMITS.maxFields)
      .unique("id")
      .optional()
      .meta(locked),
    layout: contactLayoutSchema.optional().meta(locked),
    showHeader: Joi.boolean().optional().meta(locked),
  }),
  text: Joi.object({
    variant: Joi.string().valid("default", "pull-quote").optional(),
    heading: optionalText(200),
    body: text(20000).allow("").required(),
  }),
  gallery: Joi.object({
    eyebrow: optionalText(100),
    heading: optionalText(200),
    intro: optionalText(1000),
    description: optionalText(1000),
    columns: columns.required(),
    mobileColumns: columns.required(),
    images: Joi.array().items(galleryImage).max(48).required(),
    align: Joi.string().valid("left", "center", "right").optional(),
    imageAspect: Joi.string().valid("4:3", "1:1", "16:9", "3:4", "auto").optional(),
    cardStyle: Joi.string().valid("default", "surface", "overlay").optional(),
    imageRadius: Joi.string().valid("default", "soft", "pill", "sharp").optional(),
    cta: link.optional(),
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
    imageStyle: Joi.string().valid("plain", "polaroid").optional(),
    imageTapeLabel: optionalText(80),
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
          icon: Joi.string().max(100).allow("").optional(),
          iconImage: image.optional(),
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
          icon: Joi.string().max(100).allow("").optional(),
          iconImage: image.optional(),
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
    variant: Joi.string().valid("default", "vintage-journal").optional(),
    eyebrow: optionalText(120),
    title: text(160).required(),
    italicTitle: optionalText(100),
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
  products: Joi.object({
    design: Joi.string().valid("classic-grid", "editorial", "compact", "showcase").optional(),
    eyebrow: optionalText(120),
    title: text(160).required(),
    subtitle: optionalText(320),
    layout: Joi.string().valid("grid-3", "grid-2").optional(),
    showSearch: Joi.boolean().optional(),
    showCategoryFilter: Joi.boolean().optional(),
    showSort: Joi.boolean().optional(),
    detailBase: Joi.string().trim().max(80).pattern(/^\/[A-Za-z0-9/_-]*$/).optional(),
    emptyMessage: optionalText(200),
  }),
  product_detail: Joi.object({
    design: Joi.string().valid("split", "gallery-focus", "editorial", "compact").optional(),
    backLabel: optionalText(80),
    backHref: Joi.string().trim().max(200).allow("").optional(),
    showDescription: Joi.boolean().optional(),
    showStock: Joi.boolean().optional(),
    showCancellationPolicy: Joi.boolean().optional(),
  }),
  account: Joi.object({
    variant: flexibleVariant(ACCOUNT_VARIANTS, "sidebar-tabs"),
    preview: Joi.string()
      .valid(...ACCOUNT_PREVIEWS)
      .optional()
      .meta({ ai: "locked" } satisfies FieldMeta),
    heading: optionalText(160),
    subheading: optionalText(320),
    showOrders: Joi.boolean().optional(),
    showCart: Joi.boolean().optional(),
    showProfile: Joi.boolean().optional(),
    showPassword: Joi.boolean().optional(),
    ordersLabel: optionalText(40),
    cartLabel: optionalText(40),
    profileLabel: optionalText(40),
    passwordLabel: optionalText(40),
    logoutLabel: optionalText(40),
    saveLabel: optionalText(40),
    emptyOrdersText: optionalText(200),
    emptyCartText: optionalText(200),
    loginHref: Joi.string().trim().max(200).pattern(SAFE_HREF).allow("").optional().description("Page with the login section, such as /login"),
    shopHref: Joi.string().trim().max(200).pattern(SAFE_HREF).allow("").optional().description("Page that lists the products, such as /shop"),
    redirectWhenLoggedOut: Joi.boolean().optional(),
    guestHeading: optionalText(160),
    guestText: optionalText(320),
    guestButtonLabel: optionalText(60),
  }),
  blog_detail: Joi.object({
    design: Joi.string().valid(...BLOG_DETAIL_DESIGNS).required(),
    title: text(240).allow("").required(),
    subtitle: optionalText(400),
    category: optionalText(80),
    date: optionalText(80),
    authorName: optionalText(120),
    authorRole: optionalText(120),
    authorAvatar: image.optional(),
    authorBio: optionalText(500),
    authorSocialLinks: blogSocialLinks,
    readTime: optionalText(60),
    coverImage: image.optional(),
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
    sharePlatforms: Joi.array()
      .items(Joi.string().valid(...BLOG_SHARE_PLATFORMS))
      .unique()
      .optional(),
    socialLinks: blogSocialLinks,
    socialLinksTitle: optionalText(60),
    showAuthorBio: Joi.boolean().optional(),
    showNewsletter: Joi.boolean().optional(),
    newsletterTitle: optionalText(160),
    newsletterDescription: optionalText(320),
  }),
};

/** Content schema of each section type; the single source for validation and the AI field catalog. */
export const SECTION_DATA_SCHEMAS: Readonly<Record<SectionType, Joi.ObjectSchema>> = SECTION_DATA;

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
