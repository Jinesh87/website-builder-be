import type { ThemeSettings } from "../../modules/websites/types/site-content.types.js";
import { BUSINESS_TEMPLATES } from "./business/index.js";
import { PORTFOLIO_TEMPLATES } from "./portfolio/index.js";

export type ThemeSeed = { name: string; settings: ThemeSettings };

export const THEME_SEEDS: ThemeSeed[] = [
  {
    name: "Clean Professional",
    settings: {
      colors: {
        primary: "#2447c7",
        secondary: "#0f7b6c",
        background: "#ffffff",
        surface: "#f3f5fa",
        text: "#1a1d23",
        muted: "#5b6170",
      },
      fonts: { heading: "plex-sans", body: "plex-sans" },
      buttonStyle: "filled",
      cardStyle: "border",
      radius: "md",
      containerWidth: 1200,
      sectionSpacing: "normal",
    },
  },
  {
    name: "Fresh Green",
    settings: {
      colors: {
        primary: "#0f7b6c",
        secondary: "#b4410f",
        background: "#ffffff",
        surface: "#f1f7f5",
        text: "#1a1d23",
        muted: "#55616a",
      },
      fonts: { heading: "system", body: "system" },
      buttonStyle: "filled",
      cardStyle: "shadow",
      radius: "lg",
      containerWidth: 1200,
      sectionSpacing: "normal",
    },
  },
  {
    name: "Warm Studio",
    settings: {
      colors: {
        primary: "#b4410f",
        secondary: "#1a1d23",
        background: "#fffdf9",
        surface: "#f7efe6",
        text: "#2b2118",
        muted: "#6f6256",
      },
      fonts: { heading: "serif", body: "system" },
      buttonStyle: "filled",
      cardStyle: "flat",
      radius: "sm",
      containerWidth: 1120,
      sectionSpacing: "relaxed",
    },
  },
  {
    name: "Dark Bold",
    settings: {
      colors: {
        primary: "#f59e0b",
        secondary: "#38bdf8",
        background: "#111318",
        surface: "#1b1e25",
        text: "#f3f4f6",
        muted: "#a1a7b3",
      },
      fonts: { heading: "plex-sans", body: "plex-sans" },
      buttonStyle: "filled",
      cardStyle: "border",
      radius: "md",
      containerWidth: 1200,
      sectionSpacing: "normal",
    },
  },
  ...BUSINESS_TEMPLATES.map((business) => business.theme),
  ...PORTFOLIO_TEMPLATES.map((portfolio) => portfolio.theme),
];
