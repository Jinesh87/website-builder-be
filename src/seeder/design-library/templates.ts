import type {
  TemplateFooter,
  TemplateHeader,
  TemplatePage,
} from "../../modules/websites/types/template.types.js";
import { BUSINESS_TEMPLATES } from "./business/index.js";
import { EDUCATION_TEMPLATES } from "./education/index.js";
import { LANDING_TEMPLATES } from "./landing/index.js";
import { PORTFOLIO_TEMPLATES } from "./portfolio/index.js";

export type WebsiteTemplateSeed = {
  key: string;
  name: string;
  category: string;
  description: string;
  themeName: string;
  header: TemplateHeader;
  footer: TemplateFooter;
  pages: TemplatePage[];
};

export const WEBSITE_TEMPLATE_SEEDS: WebsiteTemplateSeed[] = [
  ...BUSINESS_TEMPLATES.map((business) => business.template),
  ...EDUCATION_TEMPLATES.map((edu) => edu.template),
  ...LANDING_TEMPLATES.map((landing) => landing.template),
  ...PORTFOLIO_TEMPLATES.map((portfolio) => portfolio.template),
];
