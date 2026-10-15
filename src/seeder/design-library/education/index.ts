import type { BusinessTemplate } from "../business/build.js";
import { COMMUNITY_HUB } from "./community-hub.js";
import { DESIGN_INSTITUTE } from "./design-institute.js";
import { TECH_ACADEMY } from "./tech-academy.js";

/** Education & Community templates. */
export const EDUCATION_TEMPLATES: readonly BusinessTemplate[] = [
  TECH_ACADEMY,
  DESIGN_INSTITUTE,
  COMMUNITY_HUB,
];
