export {
  QuestionnaireActivityKind,
  QuestionnaireStatus,
  InquiryEmailStatus,
} from "../../generated/prisma/enums.js";

export const BUSINESS_TYPES = [
  "Restaurant / Café",
  "Shop / Store",
  "Clinic / Health",
  "Salon / Beauty",
  "School / Training",
  "Real estate",
  "Services / Agency",
  "Photo / Video / Events",
  "Portfolio",
  "Other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const WEBSITE_PAGES = [
  "Home",
  "About",
  "Services",
  "Products / Shop",
  "Gallery",
  "Our work",
  "Videos",
  "Blog",
  "Reviews",
  "FAQ",
  "Booking",
  "Contact",
] as const;
export type WebsitePage = (typeof WEBSITE_PAGES)[number];

export const LOOK_OPTIONS = ["Light", "Dark", "Colourful"] as const;
export type LookOption = (typeof LOOK_OPTIONS)[number];

export const STYLE_OPTIONS = [
  "Modern",
  "Classic",
  "Bold",
  "Vintage",
  "Corporate",
  "You choose",
] as const;
export type StyleOption = (typeof STYLE_OPTIONS)[number];

export const PALETTE_OPTIONS = [
  "Ocean",
  "Forest",
  "Sunset",
  "Royal",
  "Black & gold",
  "Pastel",
  "Red & white",
  "Logo colours",
] as const;
export type PaletteOption = (typeof PALETTE_OPTIONS)[number];

export const FEATURE_OPTIONS = [
  "Online payments",
  "Online store",
  "Booking",
  "Newsletter",
  "Gallery",
  "Home video",
  "Reviews",
  "Multi-language",
] as const;
export type FeatureOption = (typeof FEATURE_OPTIONS)[number];

export const LOGO_OPTIONS = ["I have one", "Design one", "Use my name"] as const;
export type LogoOption = (typeof LOGO_OPTIONS)[number];

export const TEXT_OPTIONS = ["I'll send it", "You write it"] as const;
export type TextOption = (typeof TEXT_OPTIONS)[number];

export const PHOTOS_OPTIONS = ["My own", "Stock", "Mix"] as const;
export type PhotosOption = (typeof PHOTOS_OPTIONS)[number];

export const DOMAIN_OPTIONS = ["I have one", "Help me buy", "Free"] as const;
export type DomainOption = (typeof DOMAIN_OPTIONS)[number];

export const NEEDED_OPTIONS = ["ASAP", "2 wks", "1 month", "No rush"] as const;
export type NeededOption = (typeof NEEDED_OPTIONS)[number];

