import { ACCOUNTING_FIRM } from "./accounting-firm.js";
import { ARCHITECTURE_FIRM } from "./architecture-firm.js";
import type { BusinessTemplate } from "./build.js";
import { DESIGN_STUDIO } from "./design-studio.js";
import { LAW_FIRM } from "./law-firm.js";
import { MARKETING_AGENCY } from "./marketing-agency.js";
import { VIDEO_PRODUCTION } from "./video-production.js";

/** Full multi-page sites; the frontend gallery shows the same designs. */
export const BUSINESS_TEMPLATES: readonly BusinessTemplate[] = [
  ACCOUNTING_FIRM,
  ARCHITECTURE_FIRM,
  LAW_FIRM,
  DESIGN_STUDIO,
  MARKETING_AGENCY,
  VIDEO_PRODUCTION,
];
