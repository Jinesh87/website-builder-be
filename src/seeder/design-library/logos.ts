import type { ImageRef } from "../../modules/websites/types/site-content.types.js";

function createSvgLogo(svgContent: string, alt: string): ImageRef {
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`,
    alt,
  };
}

/** 1. Accounting Firm · Classic (ID 2134) */
export const ACCOUNTING_FIRM_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="nw-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#2448C8"/>` +
    `<stop offset="100%" stop-color="#1A3699"/>` +
    `</linearGradient>` +
    `<linearGradient id="nw-accent" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#38BDF8"/>` +
    `<stop offset="100%" stop-color="#0284C7"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#nw-grad)"/>` +
    `<path d="M12 28V12L20 23V12H24V28L16 17V28H12Z" fill="#FFFFFF"/>` +
    `<circle cx="28" cy="12" r="3" fill="url(#nw-accent)"/>` +
    `<text x="46" y="21" font-family="'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#14213D" letter-spacing="-0.3">NORTHWIND</text>` +
    `<text x="47" y="32" font-family="'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="8.5" font-weight="700" fill="#2448C8" letter-spacing="2.4">ACCOUNTING</text>` +
    `</svg>`,
  "Northwind Accounting Logo",
);

/** 2. Electrician · Classic (ID 2135) */
export const ELECTRICIAN_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="el-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#2F6BFF"/>` +
    `<stop offset="100%" stop-color="#1A46C4"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#el-grad)"/>` +
    `<path d="M21 8L13 21H19L16 32L24 19H18L21 8Z" fill="#FACC15"/>` +
    `<circle cx="28" cy="12" r="2.5" fill="#FFFFFF"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="15" font-weight="800" fill="#0F172A" letter-spacing="-0.3">VOLTCRAFT</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="8.5" font-weight="700" fill="#2F6BFF" letter-spacing="2">ELECTRIC CO.</text>` +
    `</svg>`,
  "VoltCraft Electric Logo",
);

/** 3. Food Truck · Sunny (ID 2136) */
export const FOOD_TRUCK_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="ft-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#F59E0B"/>` +
    `<stop offset="100%" stop-color="#EA580C"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#ft-grad)"/>` +
    `<path d="M12 26C12 20 18 16 20 10C22 15 28 17 28 23C28 27.5 24.5 30 20 30C15.5 30 12 27.5 12 26Z" fill="#FFFFFF"/>` +
    `<path d="M16 26C16 23 18.5 21 20 17C21.5 20.5 24 21.5 24 25C24 27 22.2 28.5 20 28.5C17.8 28.5 16 27 16 26Z" fill="#F59E0B"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14.5" font-weight="800" fill="#241A05" letter-spacing="-0.2">FUEGO STREET</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="8.5" font-weight="700" fill="#EA580C" letter-spacing="2">TACOS &amp; BOWLS</text>` +
    `</svg>`,
  "Fuego Street Kitchen Logo",
);

/** 4. Event Summit · Coral (ID 2137) */
export const EVENT_SUMMIT_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="ev-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#FF5733"/>` +
    `<stop offset="100%" stop-color="#C026D3"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#ev-grad)"/>` +
    `<path d="M20 9L29 27H23.5L20 19L16.5 27H11L20 9Z" fill="#FFFFFF"/>` +
    `<circle cx="20" cy="14" r="2" fill="#FF5733"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="15.5" font-weight="900" fill="#FFF7F5" letter-spacing="-0.3">APEX SUMMIT</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="8" font-weight="700" fill="#FF5733" letter-spacing="2.5">GLOBAL FORUM 2026</text>` +
    `</svg>`,
  "Apex Summit Logo",
);

/** 5. Architecture Firm · Minimal (ID 2138) */
export const ARCHITECTURE_FIRM_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 40" width="210" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="at-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#18181B"/>` +
    `<stop offset="100%" stop-color="#27272A"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="7" fill="url(#at-grad)"/>` +
    `<path d="M10 11H17L22 25L27 11H30L23.5 29H20.5L10 11Z" fill="#FAFAFA"/>` +
    `<rect x="14" y="22" width="4" height="4" fill="#E4E4E7"/>` +
    `<text x="46" y="21" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="700" fill="#18181B" letter-spacing="0.5">ATELIER V</text>` +
    `<text x="47" y="32" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="600" fill="#71717A" letter-spacing="2.6">ARCHITECTURE</text>` +
    `</svg>`,
  "Atelier V Architecture Logo",
);

/** 6. Roofing · Velvet (ID 2139) */
export const ROOFING_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="rf-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#E0A96D"/>` +
    `<stop offset="100%" stop-color="#B45309"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#rf-grad)"/>` +
    `<path d="M20 9L9 20H13V29H27V20H31L20 9Z" fill="#1A1020"/>` +
    `<path d="M20 14L15 21H18V26H22V21H25L20 14Z" fill="#FFFFFF"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="15" font-weight="800" fill="#F6EEF9" letter-spacing="-0.3">VELVET ROOFING</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="8" font-weight="700" fill="#E0A96D" letter-spacing="2.2">CRAFTSMAN ROOF &amp; SLATE</text>` +
    `</svg>`,
  "Velvet Roofing Logo",
);

/** 7. Law Firm · Elegant (ID 2140) */
export const LAW_FIRM_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 225 40" width="225" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="lf-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#0F172A"/>` +
    `<stop offset="100%" stop-color="#1E293B"/>` +
    `</linearGradient>` +
    `<linearGradient id="lf-gold" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#FCD34D"/>` +
    `<stop offset="100%" stop-color="#D97706"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="8" fill="url(#lf-grad)" stroke="#D97706" stroke-width="1.2"/>` +
    `<path d="M20 8V29M13 14H27M13 14L10 22H16L13 14ZM27 14L24 22H30L27 14Z" stroke="url(#lf-gold)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<text x="46" y="21" font-family="'Cinzel', 'Playfair Display', Georgia, serif" font-size="14" font-weight="700" fill="#0F172A" letter-spacing="0.4">MERIDIAN &amp; VANCE</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#B45309" letter-spacing="2.2">ATTORNEYS AT LAW</text>` +
    `</svg>`,
  "Meridian & Vance Legal Partners Logo",
);

/** 8. Design Studio · Bold (ID 2141) */
export const DESIGN_STUDIO_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="ds-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#FF5A36"/>` +
    `<stop offset="100%" stop-color="#EA580C"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#ds-grad)"/>` +
    `<circle cx="16" cy="16" r="6" fill="#FFFFFF"/>` +
    `<rect x="21" y="14" width="9" height="9" fill="#0F0F12"/>` +
    `<path d="M12 28L20 20L28 28H12Z" fill="#FFFFFF"/>` +
    `<text x="46" y="21" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="800" fill="#F5F5F0" letter-spacing="-0.3">HALFTONE</text>` +
    `<text x="47" y="32" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8.5" font-weight="700" fill="#FF5A36" letter-spacing="2.8">DESIGN STUDIO</text>` +
    `</svg>`,
  "Halftone Design Studio Logo",
);

/** 9. Marketing Agency · Midnight (ID 2142) */
export const MARKETING_AGENCY_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="mkt-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#8B6CFF"/>` +
    `<stop offset="100%" stop-color="#4F46E5"/>` +
    `</linearGradient>` +
    `<linearGradient id="mkt-cyan" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#3DD9C1"/>` +
    `<stop offset="100%" stop-color="#06B6D4"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#mkt-grad)"/>` +
    `<ellipse cx="20" cy="20" rx="12" ry="5" transform="rotate(-28 20 20)" stroke="url(#mkt-cyan)" stroke-width="2"/>` +
    `<circle cx="20" cy="20" r="5" fill="#FFFFFF"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="16" font-weight="800" fill="#E9ECFF" letter-spacing="-0.3">ORBIT</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#3DD9C1" letter-spacing="2.4">GROWTH AGENCY</text>` +
    `</svg>`,
  "Orbit Marketing Agency Logo",
);

/** 10. Video Production · Vintage Reels (ID 2143) */
export const VINTAGE_REELS_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 44" width="240" height="44" fill="none">` +
    `<defs>` +
    `<linearGradient id="vr-gold" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#F3C878"/>` +
    `<stop offset="50%" stop-color="#DE9E2E"/>` +
    `<stop offset="100%" stop-color="#B87B18"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<circle cx="20" cy="22" r="17" stroke="url(#vr-gold)" stroke-width="2" fill="#14100E"/>` +
    `<circle cx="20" cy="22" r="6" stroke="url(#vr-gold)" stroke-width="1.6" fill="#14100E"/>` +
    `<circle cx="20" cy="11.5" r="2.2" fill="url(#vr-gold)"/>` +
    `<circle cx="29" cy="16.8" r="2.2" fill="url(#vr-gold)"/>` +
    `<circle cx="29" cy="27.2" r="2.2" fill="url(#vr-gold)"/>` +
    `<circle cx="20" cy="32.5" r="2.2" fill="url(#vr-gold)"/>` +
    `<circle cx="11" cy="27.2" r="2.2" fill="url(#vr-gold)"/>` +
    `<circle cx="11" cy="16.8" r="2.2" fill="url(#vr-gold)"/>` +
    `<line x1="20" y1="5" x2="20" y2="9" stroke="url(#vr-gold)" stroke-width="1.2"/>` +
    `<line x1="35" y1="22" x2="31" y2="22" stroke="url(#vr-gold)" stroke-width="1.2"/>` +
    `<line x1="20" y1="39" x2="20" y2="35" stroke="url(#vr-gold)" stroke-width="1.2"/>` +
    `<line x1="5" y1="22" x2="9" y2="22" stroke="url(#vr-gold)" stroke-width="1.2"/>` +
    `<text x="46" y="21" font-family="'Playfair Display', Georgia, serif" font-size="14.5" font-weight="700" fill="#FAF5EE" letter-spacing="1">VINTAGE REELS</text>` +
    `<text x="47" y="32" font-family="'Manrope', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#DE9E2E" letter-spacing="3.2">ENTERTAINMENT</text>` +
    `</svg>`,
  "Vintage Reels Entertainment Logo",
);

export const VIDEO_PRODUCTION_LOGO = VINTAGE_REELS_LOGO;

/** 11. Plumbing · Fresh (ID 2144) */
export const PLUMBING_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="pl-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#0E8A7A"/>` +
    `<stop offset="100%" stop-color="#0284C7"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#pl-grad)"/>` +
    `<path d="M20 9C15 17 12 21 12 25C12 29.5 15.5 32 20 32C24.5 32 28 29.5 28 25C28 21 25 17 20 9Z" fill="#FFFFFF"/>` +
    `<path d="M20 14C17 19.5 15.5 22.5 15.5 25C15.5 27.5 17.5 29 20 29C22.5 29 24.5 27.5 24.5 25C24.5 22.5 23 19.5 20 14Z" fill="#0E8A7A"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="800" fill="#0B2D3A" letter-spacing="-0.3">BRIGHTSIDE</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#0E8A7A" letter-spacing="2">PLUMBING CO.</text>` +
    `</svg>`,
  "Brightside Plumbing Logo",
);

/** 12. Dental Clinic · Fresh (ID 2145) */
export const DENTAL_CLINIC_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="dt-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#0E8A7A"/>` +
    `<stop offset="100%" stop-color="#18A999"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#dt-grad)"/>` +
    `<path d="M14 14C14 10 17 9 20 11C23 9 26 10 26 14C26 21 24 29 21.5 29C20.5 29 20.5 24 20 24C19.5 24 19.5 29 18.5 29C16 29 14 21 14 14Z" fill="#FFFFFF"/>` +
    `<circle cx="26" cy="11" r="2.5" fill="#38BDF8"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="800" fill="#0B2D3A" letter-spacing="-0.3">BRIGHTSIDE</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#0E8A7A" letter-spacing="2.2">DENTAL GROUP</text>` +
    `</svg>`,
  "Brightside Dental Logo",
);

/** 13. Day Spa · Bold (ID 2146) */
export const DAY_SPA_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="spa-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#E0A96D"/>` +
    `<stop offset="100%" stop-color="#C28343"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#spa-grad)"/>` +
    `<path d="M20 9C20 9 14 17 14 22C14 25.5 16.5 28 20 28C23.5 28 26 25.5 26 22C26 17 20 9 20 9Z" fill="#0F0F12"/>` +
    `<circle cx="20" cy="22" r="3" fill="#FFFFFF"/>` +
    `<text x="46" y="21" font-family="'Playfair Display', Georgia, serif" font-size="15" font-weight="700" fill="#F5F5F0" letter-spacing="0.5">SOLACE SPA</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#E0A96D" letter-spacing="2.4">WELLNESS SANCTUARY</text>` +
    `</svg>`,
  "Solace Spa Logo",
);

/** 14. Yoga Studio · Forest (ID 2147) */
export const YOGA_STUDIO_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="yg-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#2D5A3D"/>` +
    `<stop offset="100%" stop-color="#1B3A26"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#yg-grad)"/>` +
    `<path d="M20 10C20 10 15 18 15 22C15 25 17 27 20 27C23 27 25 25 25 22C25 18 20 10 20 10Z" fill="#E4ECE0"/>` +
    `<circle cx="20" cy="18" r="2.5" fill="#C97A52"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="800" fill="#16261A" letter-spacing="-0.2">EVERGREEN</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#2D5A3D" letter-spacing="2.4">YOGA SANCTUARY</text>` +
    `</svg>`,
  "Evergreen Yoga Logo",
);

/** 15. Restaurant · Rose (ID 2148) */
export const RESTAURANT_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="rest-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#C2416B"/>` +
    `<stop offset="100%" stop-color="#881337"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#rest-grad)"/>` +
    `<path d="M20 9V29M14 13C14 18 17 20 20 20C23 20 26 18 26 13M17 11V15M23 11V15" stroke="#FFF7F8" stroke-width="1.8" stroke-linecap="round"/>` +
    `<text x="46" y="21" font-family="'Playfair Display', Georgia, serif" font-size="15" font-weight="700" fill="#FFF7F8" letter-spacing="0.8">ROSEWOOD</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#F6D3A5" letter-spacing="2.4">OSTERIA &amp; KITCHEN</text>` +
    `</svg>`,
  "Rosewood Kitchen Logo",
);

/** 16. Bakery · Coral (ID 2149) */
export const BAKERY_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="bk-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#E4512F"/>` +
    `<stop offset="100%" stop-color="#C2410C"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#bk-grad)"/>` +
    `<path d="M12 24C12 18 16 13 20 13C24 13 28 18 28 24H12Z" fill="#FFFFFF"/>` +
    `<path d="M16 24V28H24V24" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="20" cy="18" r="2" fill="#E4512F"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="800" fill="#2A1A16" letter-spacing="-0.2">CORAL BAY</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#E4512F" letter-spacing="2.2">ARTISAN BAKERY</text>` +
    `</svg>`,
  "Coral Bay Bakery Logo",
);

/** 17. Photographer · Mono (ID 2150) */
export const PHOTOGRAPHER_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<rect x="2" y="2" width="36" height="36" rx="8" fill="#111111"/>` +
    `<circle cx="20" cy="20" r="9" stroke="#FFFFFF" stroke-width="2"/>` +
    `<circle cx="20" cy="20" r="4" fill="#FFFFFF"/>` +
    `<circle cx="26" cy="14" r="1.5" fill="#706E6B"/>` +
    `<text x="46" y="21" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" font-size="14.5" font-weight="800" fill="#141414" letter-spacing="1.2">ELENA VANCE</text>` +
    `<text x="47" y="32" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="600" fill="#706E6B" letter-spacing="3.2">PHOTOGRAPHY</text>` +
    `</svg>`,
  "Elena Vance Photography Logo",
);

/** 18. UX Designer · Midnight (ID 2151) */
export const UX_DESIGNER_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="ux-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#8B6CFF"/>` +
    `<stop offset="100%" stop-color="#4F46E5"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#ux-grad)"/>` +
    `<path d="M12 26L20 12L28 26H22L20 22L18 26H12Z" fill="#FFFFFF"/>` +
    `<circle cx="20" cy="17" r="2.5" fill="#38BDF8"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="800" fill="#F1F4FD" letter-spacing="-0.2">ALEX RIVERA</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#8B6CFF" letter-spacing="2.2">PRODUCT DESIGN</text>` +
    `</svg>`,
  "Alex Rivera UX Logo",
);

/** 19. Developer Portfolio · Ocean (ID 2152) */
export const DEVELOPER_PORTFOLIO_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="dev-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#0066FF"/>` +
    `<stop offset="100%" stop-color="#0284C7"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#dev-grad)"/>` +
    `<path d="M16 15L11 20L16 25M24 15L29 20L24 25M21 13L19 27" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<text x="46" y="21" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, monospace" font-size="15" font-weight="800" fill="#091E3A" letter-spacing="-0.3">MARCUS CHEN</text>` +
    `<text x="47" y="32" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, monospace" font-size="8.5" font-weight="700" fill="#0066FF" letter-spacing="1.8">// SYSTEMS DEV</text>` +
    `</svg>`,
  "Marcus Chen Dev Logo",
);

/** 20. SaaS Platform · Cyber (ID 2153) */
export const SAAS_PLATFORM_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="saas-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#6366F1"/>` +
    `<stop offset="100%" stop-color="#4F46E5"/>` +
    `</linearGradient>` +
    `<linearGradient id="saas-cyan" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="#06B6D4"/>` +
    `<stop offset="100%" stop-color="#38BDF8"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#saas-grad)"/>` +
    `<polygon points="20,10 29,15 29,25 20,30 11,25 11,15" stroke="url(#saas-cyan)" stroke-width="2" fill="none"/>` +
    `<circle cx="20" cy="20" r="3.5" fill="#FFFFFF"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15.5" font-weight="900" fill="#F8FAFC" letter-spacing="-0.3">NEXUS AI</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="7.8" font-weight="700" fill="#06B6D4" letter-spacing="2.2">INTELLIGENCE PLATFORM</text>` +
    `</svg>`,
  "Nexus AI Platform Logo",
);

/** 21. Mobile App · Fresh (ID 2154) */
export const MOBILE_APP_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="mb-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#10B981"/>` +
    `<stop offset="100%" stop-color="#059669"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#mb-grad)"/>` +
    `<circle cx="20" cy="20" r="10" stroke="#FFFFFF" stroke-width="2.5"/>` +
    `<circle cx="20" cy="20" r="5" fill="#FFFFFF"/>` +
    `<circle cx="25" cy="15" r="2" fill="#0EA5E9"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15.5" font-weight="900" fill="#F0FDF4" letter-spacing="-0.3">AURA PAY</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#10B981" letter-spacing="2.2">SMART FINANCE</text>` +
    `</svg>`,
  "Aura Pay Mobile Logo",
);

/** 22. Tech Academy · Indigo (ID 2155) */
export const TECH_ACADEMY_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="ta-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#6366F1"/>` +
    `<stop offset="100%" stop-color="#312E81"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#ta-grad)"/>` +
    `<path d="M20 11L10 16L20 21L30 16L20 11Z" fill="#FFFFFF"/>` +
    `<path d="M13 18.5V24.5C13 24.5 16 27 20 27C24 27 27 24.5 27 24.5V18.5" stroke="#38BDF8" stroke-width="2" fill="none"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="900" fill="#F3F4F6" letter-spacing="-0.2">QUANTUM</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#38BDF8" letter-spacing="2.4">TECH ACADEMY</text>` +
    `</svg>`,
  "Quantum Tech Academy Logo",
);

/** 23. Design Institute · Editorial (ID 2156) */
export const DESIGN_INSTITUTE_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="di-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#C2410C"/>` +
    `<stop offset="100%" stop-color="#9A3412"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="8" fill="url(#di-grad)"/>` +
    `<circle cx="16" cy="17" r="5" fill="#FFFFFF"/>` +
    `<rect x="21" y="16" width="9" height="9" fill="#18181B"/>` +
    `<polygon points="13,29 20,20 27,29" fill="#FFFFFF"/>` +
    `<text x="46" y="21" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="800" fill="#18181B" letter-spacing="0.5">ATELIER</text>` +
    `<text x="47" y="32" font-family="'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif" font-size="7.8" font-weight="700" fill="#C2410C" letter-spacing="2.2">DESIGN INSTITUTE</text>` +
    `</svg>`,
  "Atelier Design Institute Logo",
);

/** 24. Community Hub · Emerald (ID 2157) */
export const COMMUNITY_HUB_LOGO = createSvgLogo(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 40" width="220" height="40" fill="none">` +
    `<defs>` +
    `<linearGradient id="ch-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0%" stop-color="#059669"/>` +
    `<stop offset="100%" stop-color="#047857"/>` +
    `</linearGradient>` +
    `</defs>` +
    `<rect x="2" y="2" width="36" height="36" rx="9" fill="url(#ch-grad)"/>` +
    `<path d="M20 10C20 10 14 16 14 22C14 25.5 16.5 28 20 28C23.5 28 26 25.5 26 22C26 16 20 10 20 10Z" fill="#FFFFFF"/>` +
    `<circle cx="20" cy="20" r="3" fill="#D97706"/>` +
    `<text x="46" y="21" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="15" font-weight="800" fill="#0F172A" letter-spacing="-0.2">SOLARIA</text>` +
    `<text x="47" y="32" font-family="'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8" font-weight="700" fill="#059669" letter-spacing="2.2">CIVIC COLLECTIVE</text>` +
    `</svg>`,
  "Solaria Community Hub Logo",
);
