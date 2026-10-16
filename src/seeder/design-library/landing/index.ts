import type { BusinessTemplate } from "../business/build.js";
import { EVENT_SUMMIT } from "./event-summit.js";
import { MOBILE_APP } from "./mobile-app.js";
import { SAAS_PLATFORM } from "./saas-platform.js";

/** Landing page flagship templates. */
export const LANDING_TEMPLATES: readonly BusinessTemplate[] = [
  SAAS_PLATFORM,
  MOBILE_APP,
  EVENT_SUMMIT,
];
