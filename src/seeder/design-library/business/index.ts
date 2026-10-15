import { ACCOUNTING_FIRM } from "./accounting-firm.js";
import { ARCHITECTURE_FIRM } from "./architecture-firm.js";
import type { BusinessTemplate } from "./build.js";
import { DAY_SPA } from "./day-spa.js";
import { DENTAL_CLINIC } from "./dental-clinic.js";
import { DESIGN_STUDIO } from "./design-studio.js";
import { ELECTRICIAN } from "./electrician.js";
import { LAW_FIRM } from "./law-firm.js";
import { MARKETING_AGENCY } from "./marketing-agency.js";
import { PLUMBING } from "./plumbing.js";
import { ROOFING } from "./roofing.js";
import { VIDEO_PRODUCTION } from "./video-production.js";
import { YOGA_STUDIO } from "./yoga-studio.js";

/** Full multi-page sites; the frontend gallery shows the same designs. */
export const BUSINESS_TEMPLATES: readonly BusinessTemplate[] = [
  ACCOUNTING_FIRM,
  ARCHITECTURE_FIRM,
  LAW_FIRM,
  DESIGN_STUDIO,
  MARKETING_AGENCY,
  VIDEO_PRODUCTION,
  ELECTRICIAN,
  ROOFING,
  PLUMBING,
  DENTAL_CLINIC,
  DAY_SPA,
  YOGA_STUDIO,
];

