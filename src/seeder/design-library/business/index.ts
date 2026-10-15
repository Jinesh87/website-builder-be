import { ACCOUNTING_FIRM } from "./accounting-firm.js";
import { ARCHITECTURE_FIRM } from "./architecture-firm.js";
import type { BusinessTemplate } from "./build.js";
import { LAW_FIRM } from "./law-firm.js";

/** Full multi-page business sites; the frontend gallery shows the same designs. */
export const BUSINESS_TEMPLATES: readonly BusinessTemplate[] = [ACCOUNTING_FIRM, ARCHITECTURE_FIRM, LAW_FIRM];
