import type { BusinessTemplate } from "../business/build.js";
import { DEVELOPER_PORTFOLIO } from "./developer-portfolio.js";
import { PHOTOGRAPHER } from "./photographer.js";
import { UX_DESIGNER } from "./ux-designer.js";

/** Portfolio & personal templates. */
export const PORTFOLIO_TEMPLATES: readonly BusinessTemplate[] = [
  PHOTOGRAPHER,
  UX_DESIGNER,
  DEVELOPER_PORTFOLIO,
];
