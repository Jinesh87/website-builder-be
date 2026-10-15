/**
 * Website content stored in JSON columns. Mirrors frontend/src/site-kit/types.ts;
 * keep the two in sync until the kit moves into a shared package.
 */

export type ImageRef = { url: string; alt: string };
export type LinkRef = { label: string; href: string };

/** Mirrors FONTS in frontend/src/site-kit/fonts.ts. Keys are stored in site data; only ever append. */
export const FONT_KEYS = [
  "inter",
  "geist",
  "manrope",
  "plus-jakarta-sans",
  "dm-sans",
  "outfit",
  "sora",
  "figtree",
  "onest",
  "urbanist",
  "lexend",
  "rubik",
  "open-sans",
  "roboto",
  "montserrat",
  "raleway",
  "nunito",
  "work-sans",
  "mulish",
  "poppins",
  "plex-sans",
  "system",
  "space-grotesk",
  "bricolage-grotesque",
  "syne",
  "unbounded",
  "archivo",
  "playfair-display",
  "lora",
  "fraunces",
  "merriweather",
  "eb-garamond",
  "cormorant",
  "source-serif-4",
  "noto-serif",
  "serif",
  "jetbrains-mono",
  "fira-code",
  "roboto-mono",
  "mono",
] as const;
export const BUTTON_STYLES = ["filled", "outline"] as const;
export const CARD_STYLES = ["border", "shadow", "flat"] as const;
export const RADIUS_SIZES = ["none", "sm", "md", "lg"] as const;
export const SPACING_SIZES = ["compact", "normal", "relaxed"] as const;
export const HEADER_DESIGNS = [
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
] as const;
export const FOOTER_DESIGNS = [
  "columns",
  "simple",
  "mega",
  "newsletter",
  "split",
  "inline",
  "centered",
  "cta-banner",
] as const;
export const HERO_VARIANTS = [
  "centered",
  "split",
  "split-left",
  "background-image",
  "video-bg",
  "gradient",
  "curved-bottom",
  "soft-card",
  "minimal-typography",
  "floating-cards",
  "asymmetric",
  "curved-carousel",
  "campaign-banner",
] as const;
export const SECTION_BACKGROUNDS = ["default", "surface", "primary", "dark"] as const;
export const SECTION_SPACINGS = ["none", "compact", "default", "relaxed"] as const;
export const SECTION_ALIGNMENTS = ["center", "left"] as const;
export const ICON_NAMES = [
  "check",
  "star",
  "bolt",
  "shield",
  "heart",
  "chat",
  "gear",
  "user",
  "mail",
  "phone",
  "chart",
  "clock",
  "tools",
  "bell",
  "wallet",
  "pointer",
  "help",
  "sparkles",
  "rocket",
  "layers",
  "box",
  "lock",
  "cloud",
  "code",
] as const;
export const SECTION_TYPES = [
  "header",
  "footer",
  "hero",
  "features",
  "services",
  "testimonials",
  "faq",
  "cta",
  "contact",
  "text",
  "gallery",
  "logos",
  "split",
  "stats",
  "pricing",
  "media",
  "team",
  "carousel",
  "marquee",
  "auth",
  "custom",
  "blog",
  "blog_detail",
] as const;

export const AUTH_VARIANTS = [
  "diagonal-split",
  "gradient-spotlight",
  "illustration-frame",
  "glass-aurora",
  "dark-wave",
  "product-showcase",
  "minimal-editorial",
  "bento-grid",
  "fullbleed-sheet",
  "tabbed-compact",
] as const;
export const AUTH_VIEWS = ["login", "register", "forgot", "otp"] as const;
export const AUTH_FIELD_TYPES = [
  "text",
  "email",
  "password",
  "confirm-password",
  "tel",
  "number",
  "date",
  "select",
  "checkbox",
] as const;
export const AUTH_SOCIAL_PROVIDERS = ["google", "apple", "github", "facebook", "x", "linkedin", "microsoft"] as const;
export const AUTH_ANIMATIONS = ["none", "fade", "slide-up", "slide-side", "scale", "blur"] as const;

export type AuthField = {
  name: string;
  label: string;
  type: (typeof AUTH_FIELD_TYPES)[number];
  placeholder?: string;
  required?: boolean;
  width?: "full" | "half";
  options?: string[];
};

/** Limits for free-form "custom" sections, which the AI composes from layout blocks. */
export const CUSTOM_LIMITS = {
  maxDepth: 4,
  maxBlocks: 60,
  maxChildren: 12,
  maxListItems: 12,
} as const;
export const CUSTOM_GAPS = ["sm", "md", "lg"] as const;
export const CUSTOM_ALIGNS = ["start", "center", "end"] as const;
export const CUSTOM_CARD_TONES = ["default", "muted", "primary", "glass"] as const;
export const CUSTOM_IMAGE_ASPECTS = ["auto", "square", "video", "portrait"] as const;

export type CustomGap = (typeof CUSTOM_GAPS)[number];
export type CustomAlign = (typeof CUSTOM_ALIGNS)[number];

export type CustomBlock =
  | { type: "stack"; direction?: "column" | "row"; gap?: CustomGap; align?: CustomAlign; children: CustomBlock[] }
  | { type: "grid"; columns: 1 | 2 | 3 | 4; gap?: CustomGap; align?: "start" | "center"; children: CustomBlock[] }
  | { type: "card"; tone?: (typeof CUSTOM_CARD_TONES)[number]; children: CustomBlock[] }
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "text"; text: string; size?: "sm" | "md" | "lg"; muted?: boolean }
  | { type: "badge"; text: string }
  | { type: "button"; label: string; href: string; tone?: "primary" | "secondary" }
  | { type: "image"; url: string; alt: string; aspect?: (typeof CUSTOM_IMAGE_ASPECTS)[number] }
  | { type: "icon"; name: IconName }
  | { type: "list"; items: string[] };

export type CustomContainerBlock = Extract<CustomBlock, { children: CustomBlock[] }>;

export type FontKey = (typeof FONT_KEYS)[number];
export type IconName = (typeof ICON_NAMES)[number];
export type SectionType = (typeof SECTION_TYPES)[number];
export type GridColumns = 1 | 2 | 3 | 4;

export type ThemeSettings = {
  language?: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
  };
  fonts: { heading: FontKey; body: FontKey };
  buttonStyle: (typeof BUTTON_STYLES)[number];
  cardStyle: (typeof CARD_STYLES)[number];
  radius: (typeof RADIUS_SIZES)[number];
  containerWidth: number;
  sectionSpacing: (typeof SPACING_SIZES)[number];
};

export type HeaderSubMenuItem = {
  label: string;
  href: string;
  description?: string;
  badge?: string;
  icon?: string;
};

export const BRAND_DISPLAY_MODES = [
  "auto",
  "logo_left",
  "logo_right",
  "logo_top",
  "logo_only",
  "text_only",
] as const;

export type BrandDisplayMode = (typeof BRAND_DISPLAY_MODES)[number];

export type HeaderMenuItem = {
  label: string;
  href: string;
  badge?: string;
  icon?: string;
  description?: string;
  children?: HeaderSubMenuItem[];
};

export type HeaderData = {
  design: (typeof HEADER_DESIGNS)[number];
  siteName: string;
  logo?: ImageRef;
  logoDisplay?: BrandDisplayMode;
  menu: HeaderMenuItem[];
  cta?: LinkRef;
  secondaryCta?: LinkRef;
  announcement?: string;
  announcementLink?: LinkRef;
  position?: "static" | "sticky" | "fixed" | "floating";
  sticky: boolean;
  overlay?: boolean;
  showSearch?: boolean;
  showAccount?: boolean;
  showCart?: boolean;
  cartCount?: number;
  currency?: string;
  mobileMenuType?: "drawer" | "fullscreen" | "dropdown";
  hidden?: boolean;
  badge?: string;
  searchPlaceholder?: string;
  utilityLinks?: LinkRef[];
  tagline?: string;
  statusText?: string;
  statusColor?: "green" | "blue" | "orange" | "purple" | string;
  menuLabel?: string;
  contactLabel?: string;
  contactEmail?: string;
  featured?: {
    badge?: string;
    title: string;
    description?: string;
    link?: LinkRef;
  };
};

export type FooterNewsletter = {
  enabled?: boolean;
  title?: string;
  description?: string;
  placeholder?: string;
  buttonText?: string;
};

export type FooterCtaBanner = {
  enabled?: boolean;
  heading?: string;
  subheading?: string;
  primaryCta?: LinkRef;
  secondaryCta?: LinkRef;
};

export type FooterPaymentMethods = {
  enabled?: boolean;
  methods?: string[];
};

export type FooterContact = {
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
  hours?: string;
};

export type FooterData = {
  design: (typeof FOOTER_DESIGNS)[number];
  siteName: string;
  logo?: ImageRef;
  logoDisplay?: BrandDisplayMode;
  tagline?: string;
  description?: string;
  columns: { title: string; links: LinkRef[] }[];
  menu?: LinkRef[];
  contact?: FooterContact;
  social: LinkRef[];
  newsletter?: FooterNewsletter;
  ctaBanner?: FooterCtaBanner;
  paymentMethods?: FooterPaymentMethods;
  legalLinks?: LinkRef[];
  copyright: string;
  themeMode?: "dark" | "light" | "auto";
  hidden?: boolean;
};

export type SectionCustomColors = {
  background?: string;
  text?: string;
  primary?: string;
  muted?: string;
  border?: string;
  /** Start and end colors of gradient text (e.g. the hero's highlighted words). */
  gradientFrom?: string;
  gradientTo?: string;
};

export type SectionSettings = {
  background: (typeof SECTION_BACKGROUNDS)[number];
  hideOnMobile: boolean;
  hideOnDesktop?: boolean;
  spacing?: (typeof SECTION_SPACINGS)[number];
  align?: (typeof SECTION_ALIGNMENTS)[number];
  /** In-page anchor (`#pricing`); lowercase words and hyphens only. */
  anchor?: string;
  customColors?: SectionCustomColors;
  /** Overrides the theme font for this section only. */
  font?: FontKey;
};

export type HeroFloatingCard = {
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: string;
};

export type HeroRating = {
  stars?: number;
  text?: string;
  avatarCount?: number;
};

export type HeroTrustedBy = {
  label?: string;
  logos?: { label: string; url?: string }[];
};

export type CarouselSlide = {
  title: string;
  subtitle?: string;
  description?: string;
  caption?: string;
  badge?: string;
  image?: ImageRef;
  button?: LinkRef;
  secondaryButton?: LinkRef;
};

export type HeroData = {
  variant: (typeof HERO_VARIANTS)[number];
  eyebrow?: string;
  badgeIcon?: string;
  heading: string;
  highlightText?: string;
  subheading?: string;
  description?: string;
  primaryCta?: LinkRef;
  secondaryCta?: LinkRef;
  tertiaryCta?: LinkRef;
  buttons?: LinkRef[];
  mediaType?: "image" | "video" | "both";
  videoUrl?: string;
  videoAutoplay?: boolean;
  videoControls?: boolean;
  videoLoop?: boolean;
  image?: ImageRef;
  secondaryImage?: ImageRef;
  backgroundImage?: ImageRef;
  bgImagePosition?: "bottom" | "center" | "top" | "cover";
  bgOverlayType?: "dark" | "light" | "gradient" | "none";
  backgroundVideoUrl?: string;
  imagePosition?: "right" | "left" | "bottom" | "background" | "card";
  imageStyle?: "mockup" | "rounded" | "glow" | "shadow" | "plain";
  overlayOpacity?: number;
  overlayBlur?: boolean;
  minHeight?: "auto" | "compact" | "screen" | "tall";
  contentAlign?: "center" | "left" | "right";
  bottomShape?: "none" | "wave" | "curve" | "curved" | "slant" | "tilt" | "arch" | "normal";
  rating?: HeroRating;
  floatingCards?: HeroFloatingCard[];
  trustedBy?: HeroTrustedBy;
  carouselSpeed?: number;
  carouselDirection?: "left-to-right" | "right-to-left";
  showDoodles?: boolean;
  curveIntensity?: "none" | "subtle" | "medium" | "dramatic";
  carouselSlides?: CarouselSlide[];
};

export type SectionDataMap = {
  header: HeaderData;
  footer: FooterData;
  hero: HeroData;
  features: {
    heading: string;
    intro?: string;
    variant?: "grid" | "split" | "pastel-icons" | "minimal" | "cards";
    columns: GridColumns;
    mobileColumns: GridColumns;
    items: { icon?: IconName; title: string; description: string }[];
  };
  services: {
    heading: string;
    eyebrow?: string;
    intro?: string;
    variant?:
      | "cards-grid"
      | "bento-grid"
      | "split-showcase"
      | "interactive-list"
      | "horizontal-cards"
      | "minimal-numbered";
    cardStyle?: "surface" | "bordered" | "flat" | "glass" | "glow" | "elevated" | "gradient";
    iconStyle?: "pastel-circle" | "square-badge" | "minimal-accent" | "colored-circle" | "glow-icon" | "none";
    imageAspect?: "16:9" | "4:3" | "1:1" | "21:9" | "auto";
    align?: "left" | "center";
    columns: GridColumns;
    mobileColumns: GridColumns;
    items: {
      title: string;
      description: string;
      badge?: string;
      badgeColor?: string;
      icon?: IconName | string;
      iconColor?: string;
      image?: ImageRef;
      price?: string;
      duration?: string;
      features?: string[];
      link?: LinkRef;
      secondaryLink?: LinkRef;
      backgroundColor?: string;
      featured?: boolean;
    }[];
    splitPosition?: "left" | "right";
    splitImage?: ImageRef;
    splitTagline?: string;
    splitCta?: LinkRef;
    secondaryCta?: LinkRef;
    bottomCta?: LinkRef;
    bottomSecondaryCta?: LinkRef;
    showBadges?: boolean;
    showIcons?: boolean;
    showImages?: boolean;
    showPrices?: boolean;
    showBullets?: boolean;
    showNumbers?: boolean;
  };
  testimonials: {
    heading: string;
    items: { quote: string; name: string; role?: string }[];
  };
  faq: {
    variant?: "accordion-classic" | "two-column-grid" | "split-sidebar" | "minimal-numbered" | "categorized-cards";
    eyebrow?: string;
    heading: string;
    intro?: string;
    cardStyle?: "default" | "bordered" | "flat" | "glass" | "elevated";
    align?: "left" | "center";
    supportCta?: {
      title?: string;
      description?: string;
      link?: LinkRef;
    };
    items: {
      question: string;
      answer: string;
      category?: string;
      badge?: string;
      isOpenDefault?: boolean;
    }[];
  };
  cta: {
    variant?: "centered-card" | "split-visual" | "floating-card" | "minimal-editorial";
    eyebrow?: string;
    heading: string;
    text?: string;
    button: LinkRef;
    secondaryButton?: LinkRef;
    trustBadges?: string[];
    highlightMetric?: {
      value: string;
      label: string;
      subtext?: string;
    };
    cardStyle?: "default" | "bordered" | "flat" | "glass" | "elevated" | "contrast";
    align?: "left" | "center";
  };
  contact: {
    variant?: "split-form" | "cards-hub" | "minimal-editorial" | "floating-glass";
    eyebrow?: string;
    heading: string;
    text?: string;
    email?: string;
    phone?: string;
    address?: string;
    officeHours?: string;
    responseTime?: string;
    showForm: boolean;
    submitLabel: string;
    formHeading?: string;
    serviceOptions?: string[];
    channels?: {
      label: string;
      value: string;
      description?: string;
      icon?: "mail" | "phone" | "chat" | "user";
    }[];
    cardStyle?: "default" | "bordered" | "flat" | "glass" | "elevated" | "contrast";
    align?: "left" | "center";
  };
  text: { heading?: string; body: string };
  gallery: {
    heading?: string;
    columns: GridColumns;
    mobileColumns: GridColumns;
    images: ImageRef[];
  };
  logos: { heading?: string; grayscale: boolean; logos: ImageRef[] };
  split: {
    eyebrow?: string;
    heading: string;
    body: string;
    bullets: string[];
    image?: ImageRef;
    imagePosition: "left" | "right";
    cta?: LinkRef;
  };
  stats: { heading?: string; intro?: string; items: { value: string; label: string }[] };
  pricing: {
    variant?: "cards-grid" | "minimal-monochrome" | "spotlight-tier" | "horizontal-rows";
    eyebrow?: string;
    heading: string;
    intro?: string;
    billingCycleLabel?: string;
    discountBadge?: string;
    footerNote?: string;
    cardStyle?: "default" | "bordered" | "flat" | "glass" | "elevated" | "contrast";
    columns?: 1 | 2 | 3 | 4;
    mobileColumns?: 1 | 2;
    align?: "left" | "center";
    plans: {
      name: string;
      price: string;
      period?: string;
      originalPrice?: string;
      badge?: string;
      description?: string;
      features: string[];
      excludedFeatures?: string[];
      cta?: LinkRef;
      featured: boolean;
      highlightNote?: string;
    }[];
  };
  media: {
    heading?: string;
    caption?: string;
    kind: "image" | "video";
    image?: ImageRef;
    /** YouTube or Vimeo page URL; rendered only as a privacy-enhanced embed. */
    videoUrl?: string;
    aspect: "16:9" | "4:3" | "1:1";
    width: "contained" | "wide";
  };
  team: {
    variant?: "grid-cards" | "spotlight-featured" | "minimal-editorial" | "glass-overlay";
    eyebrow?: string;
    badge?: string;
    heading: string;
    intro?: string;
    cardStyle?: "default" | "bordered" | "flat" | "glass" | "elevated" | "contrast";
    align?: "left" | "center";
    columns: GridColumns;
    mobileColumns: GridColumns;
    members: {
      name: string;
      role?: string;
      department?: string;
      bio?: string;
      location?: string;
      photo?: ImageRef;
      tags?: string[];
      link?: LinkRef;
      socialLinks?: {
        platform: "linkedin" | "twitter" | "github" | "email" | "link";
        url: string;
      }[];
    }[];
  };
  carousel: {
    variant?:
      | "cards"
      | "hero-slider"
      | "showcase"
      | "minimal-editorial"
      | "image-gallery"
      | "image-strip"
      | "image-coverflow"
      | "curved-banner";
    eyebrow?: string;
    heading?: string;
    intro?: string;
    badge?: string;
    slides: CarouselSlide[];
    autoPlay?: boolean;
    interval?: number;
    showArrows?: boolean;
    showDots?: boolean;
    showThumbnails?: boolean;
    imageAspect?: "16:9" | "4:3" | "1:1" | "21:9" | "3:4";
    columns?: 1 | 2 | 3 | 4 | 5 | 6;
    pauseOnHover?: boolean;
    cardStyle?: "default" | "bordered" | "flat" | "glass" | "elevated" | "contrast";
    align?: "left" | "center";
  };
  marquee: {
    variant?: "ticker-text" | "cards-stream" | "pill-badges" | "dual-directional";
    eyebrow?: string;
    heading?: string;
    intro?: string;
    items: {
      text: string;
      badge?: string;
      icon?: IconName;
      link?: string;
      subtext?: string;
    }[];
    secondaryItems?: {
      text: string;
      badge?: string;
      icon?: IconName;
      link?: string;
      subtext?: string;
    }[];
    speed?: "slow" | "normal" | "fast";
    direction?: "left" | "right";
    pauseOnHover?: boolean;
    gradientFades?: boolean;
    fontSize?: "small" | "medium" | "large" | "huge";
  };
  auth: {
    variant: (typeof AUTH_VARIANTS)[number];
    defaultView?: (typeof AUTH_VIEWS)[number];
    brandName?: string;
    logo?: ImageRef;
    formPosition?: "left" | "right";
    minHeight?: "auto" | "screen";
    inputStyle?: "outline" | "filled" | "underline" | "pill";
    buttonShape?: "rounded" | "pill" | "square";
    headingSize?: "sm" | "md" | "lg";
    showLabels?: boolean;
    showFieldIcons?: boolean;
    showPasswordToggle?: boolean;
    animation?: (typeof AUTH_ANIMATIONS)[number];
    backgroundMotion?: boolean;
    colors?: { accent?: string; panel?: string; panelText?: string; card?: string };
    panel?: {
      eyebrow?: string;
      heading?: string;
      text?: string;
      registerHeading?: string;
      registerText?: string;
      image?: ImageRef;
      highlights?: string[];
      testimonial?: { quote: string; name: string; role?: string; avatar?: ImageRef };
      stats?: { value: string; label: string }[];
    };
    social: {
      enabled: boolean;
      label?: string;
      style?: "icons" | "full";
      position?: "top" | "bottom";
      showOnRegister?: boolean;
      providers: { provider: (typeof AUTH_SOCIAL_PROVIDERS)[number]; href: string }[];
    };
    login: {
      heading: string;
      subheading?: string;
      fields: AuthField[];
      submitLabel: string;
      showRemember?: boolean;
      rememberLabel?: string;
      forgotLabel?: string;
      switchPrompt?: string;
      switchLabel?: string;
    };
    register: {
      enabled: boolean;
      heading: string;
      subheading?: string;
      fields: AuthField[];
      submitLabel: string;
      showTerms?: boolean;
      termsText?: string;
      termsLink?: LinkRef;
      switchPrompt?: string;
      switchLabel?: string;
    };
    forgot: {
      enabled: boolean;
      heading: string;
      subheading?: string;
      fields: AuthField[];
      submitLabel: string;
      backLabel?: string;
      successHeading?: string;
      successText?: string;
    };
    otp: {
      enabled: boolean;
      heading: string;
      subheading?: string;
      length: 4 | 5 | 6;
      submitLabel: string;
      resendLabel?: string;
      resendSeconds?: number;
      requireOnLogin?: boolean;
      requireOnRegister?: boolean;
      requireOnForgot?: boolean;
    };
    successHeading?: string;
    successText?: string;
    successLink?: LinkRef;
    footerNote?: string;
  };
  custom: {
    width?: "contained" | "wide";
    align?: "start" | "center";
    blocks: CustomBlock[];
  };
  blog: BlogData;
  blog_detail: BlogDetailData;
};

export const BLOG_DETAIL_DESIGNS = [
  "minimalist-editorial",
  "split-hero",
  "immersive-dark",
  "magazine-classic",
  "newsletter-tech",
  "floating-card",
  "sticky-sidebar",
  "swiss-brutalist",
  "visual-story",
  "glassmorphism-deck",
] as const;

export type BlogDetailDesign = (typeof BLOG_DETAIL_DESIGNS)[number];

export type BlogPostItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: ImageRef;
  category: string;
  authorName: string;
  authorAvatar?: ImageRef;
  date: string;
  readTime: string;
  featured?: boolean;
  readMoreLabel?: string;
};

export type BlogData = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  categories: string[];
  layout?: "grid-3" | "grid-2" | "magazine";
  showNewsletterCard?: boolean;
  newsletterTitle?: string;
  newsletterDescription?: string;
  newsletterPlaceholder?: string;
  newsletterButtonText?: string;
  posts: BlogPostItem[];
};

export type BlogContentSection = {
  heading?: string;
  subheading?: string;
  paragraphs: string[];
  quote?: string;
  quoteAuthor?: string;
  callout?: string;
  image?: ImageRef;
};

export type BlogDetailData = {
  design: BlogDetailDesign;
  title: string;
  subtitle?: string;
  category: string;
  date: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: ImageRef;
  authorBio?: string;
  readTime: string;
  coverImage: ImageRef;
  coverImageCaption?: string;
  content: BlogContentSection[];
  tags: string[];
  showShareButtons?: boolean;
  showAuthorBio?: boolean;
  showNewsletter?: boolean;
  newsletterTitle?: string;
  newsletterDescription?: string;
};

export type SectionOf<T extends SectionType> = T extends SectionType
  ? { id: string; type: T; hidden: boolean; settings: SectionSettings; data: SectionDataMap[T] }
  : never;

export type Section = SectionOf<SectionType>;
