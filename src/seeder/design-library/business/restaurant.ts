import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { RESTAURANT_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "side-drawer",
  siteName: NAME,
  logo: RESTAURANT_LOGO,
  logoDisplay: "logo_only",
  tagline: "Modern fire cooking and low-lit cocktails",
  menu: [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "Reservations", href: "/reservations" },
    { label: "Private Dining", href: "/private-dining" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Reserve a table", href: "/reservations" },
  contactLabel: "Host desk",
  contactEmail: "host@rosewoodkitchen.com",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "mega",
  siteName: NAME,
  logo: RESTAURANT_LOGO,
  tagline: "Seasonal plates, open fire, intimate rooms",
  description: "A modern neighborhood restaurant and cocktail bar built around live fire, local farms and warm hospitality.",
  columns: [
    {
      title: "Restaurant",
      links: [
        { label: "Dinner menu", href: "/menu" },
        { label: "Weekend brunch", href: "/menu" },
        { label: "Cocktail list", href: "/menu" },
        { label: "Reservations", href: "/reservations" },
      ],
    },
    {
      title: "Events",
      links: [
        { label: "Private dining", href: "/private-dining" },
        { label: "Chef's table", href: "/private-dining" },
        { label: "Holiday buyouts", href: "/contact" },
        { label: "Gift cards", href: "/contact" },
      ],
    },
  ],
  contact: {
    email: "host@rosewoodkitchen.com",
    phone: "(312) 555-0148",
    address: "84 W Randolph Street, Chicago, IL",
    hours: "Tue-Thu 5:00pm-10:00pm · Fri-Sat 5:00pm-midnight · Sun brunch",
  },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "OpenTable", href: "https://www.opentable.com" },
  ],
  paymentMethods: { enabled: true, methods: ["visa", "mastercard", "amex"] },
  legalLinks: [
    { label: "Reservation policy", href: "/reservations" },
    { label: "Accessibility", href: "/accessibility" },
  ],
  copyright: `(c) 2026 ${NAME} Hospitality`,
};

const menuTicker = section(
  "marquee",
  {
    variant: "ticker-text",
    eyebrow: "Tonight from the pass",
    items: [
      { text: "Charred carrots with tahini and pistachio", icon: "sparkles" },
      { text: "Dry-aged duck with cherry jus", icon: "star" },
      { text: "Coal-roasted oysters with chili butter", icon: "bolt" },
      { text: "Zero-proof yuzu spritz", icon: "heart" },
      { text: "Late-night bar menu until midnight", icon: "clock" },
    ],
    speed: "slow",
    fontSize: "large",
    gradientFades: true,
  },
  { spacing: "compact" },
);

const diningServices = section(
  "services",
  {
    variant: "minimal-numbered",
    eyebrow: "Experience",
    heading: "Choose your table, your pace and your mood",
    intro: "The site uses existing menu, service and booking sections to feel like a real hospitality brand, not a landing page.",
    columns: 3,
    mobileColumns: 1,
    showNumbers: true,
    showPrices: true,
    items: [
      {
        title: "Dining room",
        description: "Seasonal small plates, live-fire mains and a wine list built for sharing.",
        price: "Dinner Tue-Sat",
        link: { label: "View menu", href: "/menu" },
      },
      {
        title: "Bar and lounge",
        description: "Low-lit cocktails, raw bar snacks and a late menu for walk-ins.",
        price: "Open until midnight",
        link: { label: "See cocktails", href: "/menu" },
      },
      {
        title: "Private room",
        description: "A velvet-lined room for 12-32 guests with custom chef menus.",
        price: "From $95/person",
        link: { label: "Plan an event", href: "/private-dining" },
      },
    ],
  },
  { background: "default" },
);

const menuShowcase = section(
  "services",
  {
    variant: "split-showcase",
    eyebrow: "Seasonal menu",
    heading: "Fire, herbs, acid and a little theatre",
    intro: "A concise menu with sections for signature plates, drinks and private-dining packages.",
    columns: 3,
    mobileColumns: 1,
    cardStyle: "glass",
    imageAspect: "4:3",
    showImages: true,
    showPrices: true,
    showBadges: true,
    splitPosition: "right",
    splitImage: photo("1414235077428-338989a2e8c0", "Restaurant chef plating dinner at the pass", 1400),
    splitTagline: "Menu changes every three weeks",
    splitCta: { label: "Reserve dinner", href: "/reservations" },
    items: [
      {
        title: "Coal-roasted oysters",
        description: "Chili butter, parsley, toasted sourdough crumbs.",
        image: photo("1544025162-d76694265947", "Oysters and small plates", 1000),
        badge: "Raw bar",
        price: "$24",
      },
      {
        title: "Dry-aged duck",
        description: "Cherry jus, charred endive, black pepper honey.",
        image: photo("1543353071-087092ec393a", "Elegant restaurant main course", 1000),
        badge: "Signature",
        price: "$42",
      },
      {
        title: "Smoked mushroom tartine",
        description: "Whipped ricotta, rosemary oil, pickled shallot.",
        image: photo("1504674900247-0877df9cc836", "Seasonal restaurant plate", 1000),
        badge: "Vegetarian",
        price: "$18",
      },
    ],
  },
  { background: "surface" },
);

const roomCarousel = section("carousel", {
  variant: "curved-banner",
  eyebrow: "Inside Rosewood",
  heading: "A cinematic restaurant gallery for reservations and private dining",
  intro: "Large curved imagery makes the template feel current, tactile and premium.",
  badge: "Rooms",
  slides: [
    {
      title: "Main dining room",
      subtitle: "Warm wood, banquettes and a glowing open kitchen",
      badge: "Dinner",
      image: photo("1517248135467-4c7edcad34c4", "Warm modern restaurant dining room", 1400),
    },
    {
      title: "The bar",
      subtitle: "Low-lit cocktails, oyster hour and late-night plates",
      badge: "Cocktails",
      image: photo("1514933651103-005eec06c04b", "Elegant restaurant bar with bottles", 1400),
    },
    {
      title: "Private dining",
      subtitle: "A velvet room for celebrations and chef-led dinners",
      badge: "Events",
      image: photo("1559329007-40df8a9345d8", "Private dining table with candles", 1400),
    },
  ],
  autoPlay: true,
  interval: 6,
  pauseOnHover: true,
});

const restaurantStats = section("stats", {
  heading: "Built for busy service",
  intro: "A site structure that supports real restaurant operations: reservations, menus, events and direct contact.",
  items: [
    { value: "72", label: "seats plus bar" },
    { value: "4.8", label: "guest rating" },
    { value: "3", label: "private dining formats" },
    { value: "12", label: "seasonal farms" },
  ],
});

const privatePackages = section(
  "pricing",
  {
    variant: "spotlight-tier",
    eyebrow: "Private dining",
    heading: "Host dinner without feeling like you planned a production",
    intro: "Simple packages for birthdays, founders dinners and holiday gatherings.",
    columns: 3,
    mobileColumns: 1,
    cardStyle: "contrast",
    plans: [
      { name: "Chef's Table", price: "$95", period: "/person", description: "Shared dinner around the kitchen pass.", features: ["6-10 guests", "Five-course menu", "Wine pairing optional"], cta: { label: "Ask dates", href: "/contact" }, featured: false },
      { name: "Velvet Room", price: "$125", period: "/person", badge: "Most requested", description: "Private room with dedicated server.", features: ["12-32 guests", "Custom printed menus", "Cocktail reception", "AV for speeches"], cta: { label: "Plan room", href: "/contact" }, featured: true, highlightNote: "Best for birthdays, client dinners and team celebrations" },
      { name: "Full Buyout", price: "Quote", description: "Restaurant takeover with bar and custom flow.", features: ["70-110 guests", "Open bar options", "Late-night snack pass", "Event captain"], cta: { label: "Discuss buyout", href: "/contact" }, featured: false },
    ],
  },
  { background: "dark" },
);

const chefStory = section("split", {
  eyebrow: "The kitchen",
  heading: "A local restaurant with a polished reservation funnel",
  body: `Chef Mara Rose built ${NAME} around the feeling of a perfect neighborhood dinner: a room that hums, plates with restraint and service that reads the table.\n\nThe template keeps that feeling across every page with dark surfaces, soft rose accents and direct paths to booking.`,
  bullets: ["Live-fire cooking and seasonal farms", "Cocktail list with zero-proof pairings", "Private room menus planned by the chef"],
  image: photo("1551218808-94e220e084d2", "Chef working in a restaurant kitchen", 1400),
  imagePosition: "right",
  cta: { label: "Read our story", href: "/private-dining" },
});

const testimonials = section("testimonials", {
  heading: "Guests remember the room",
  items: [
    { quote: "The site feels exactly like the restaurant: warm, confident and a little dramatic.", name: "Evan Brooks", role: "Food editor" },
    { quote: "We booked the private room in two emails. Clear packages, beautiful menus and no guessing.", name: "Leah Ortiz", role: "Host" },
    { quote: "Every plate looked intentional. The reservation flow made the night easy.", name: "Sam Patel", role: "Guest" },
  ],
});

const faq = section("faq", {
  variant: "categorized-cards",
  eyebrow: "Reservations FAQ",
  heading: "Before you book",
  cardStyle: "glass",
  items: [
    { category: "Reservations", question: "Do you accept walk-ins?", answer: "Yes. The bar and lounge hold space for walk-ins every night." },
    { category: "Reservations", question: "How far ahead can we book?", answer: "Dining room reservations open 30 days ahead. Private dining can be booked up to six months ahead." },
    { category: "Events", question: "Can menus be customized?", answer: "Yes. Private dining menus can be tailored for dietary needs, beverage pairings and pacing." },
  ],
});

const reservationCta = section(
  "cta",
  {
    variant: "floating-card",
    eyebrow: "Dinner tonight?",
    heading: "Reserve the dining room, bar or private room",
    text: "Choose a date, tell us the group size and we will guide you to the best room.",
    button: { label: "Reserve now", href: "/reservations" },
    secondaryButton: { label: "Private dining", href: "/private-dining" },
    trustBadges: ["Walk-ins welcome", "Private room", "Zero-proof pairings"],
    cardStyle: "contrast",
  },
  { background: "default" },
);

const contact = section("contact", {
  variant: "minimal-editorial",
  eyebrow: "Host desk",
  heading: "Reservations, events and table notes",
  text: "Send us dietary notes, celebration details or private-room requests. The host team replies daily.",
  email: "host@rosewoodkitchen.com",
  phone: "(312) 555-0148",
  address: "84 W Randolph Street, Chicago, IL",
  officeHours: "Tue-Sun 12:00pm-10:00pm",
  responseTime: "Same day",
  showForm: true,
  submitLabel: "Send request",
  serviceOptions: ["Dinner reservation", "Private dining", "Full buyout", "Gift card"],
});

export const RESTAURANT: BusinessTemplate = businessTemplate({
  key: "restaurant-rose",
  name: "Restaurant · Rose",
  category: "Food",
  description: "A premium restaurant and bar site with reservations, seasonal menu, private dining and cinematic curved gallery.",
  themeName: "Rosewood Noir",
  theme: {
    colors: {
      primary: "#C2416B",
      secondary: "#F6D3A5",
      background: "#160D12",
      surface: "#24131B",
      text: "#FFF7F8",
      muted: "#D4B6C1",
    },
    fonts: { heading: "playfair-display", body: "manrope" },
    buttonStyle: "filled",
    cardStyle: "shadow",
    radius: "lg",
    containerWidth: 1180,
    sectionSpacing: "relaxed",
  },
  header,
  footer,
  pages: [
    {
      name: "Home",
      slug: "/",
      sections: [
        section(
          "hero",
          {
            variant: "background-image",
            eyebrow: "Chicago restaurant and cocktail bar",
            heading: "A low-lit room for plates worth slowing down for",
            highlightText: "slowing down",
            subheading: "Modern fire cooking, seasonal farms and a bar that makes weeknights feel like occasions.",
            primaryCta: { label: "Reserve a table", href: "/reservations" },
            secondaryCta: { label: "Explore menu", href: "/menu" },
            backgroundImage: photo("1517248135467-4c7edcad34c4", "Warm modern restaurant dining room", 1800),
            bgOverlayType: "dark",
            overlayOpacity: 64,
            minHeight: "tall",
            contentAlign: "left",
            bottomShape: "curve",
          }
        ),
        menuTicker,
        diningServices,
        menuShowcase,
        roomCarousel,
        restaurantStats,
        testimonials,
        reservationCta,
      ],
    },
    {
      name: "Menu",
      slug: "/menu",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Menu",
          heading: "Seasonal dishes with a little smoke and shine",
          subheading: "A menu page that can hold dinner, brunch, cocktails and late-night snacks.",
          primaryCta: { label: "Book dinner", href: "/reservations" },
        }),
        menuShowcase,
        section("gallery", {
          heading: "From the pass",
          columns: 4,
          mobileColumns: 2,
          images: [
            photo("1544025162-d76694265947", "Oysters and small plates", 1000),
            photo("1543353071-087092ec393a", "Restaurant main course", 1000),
            photo("1514933651103-005eec06c04b", "Cocktail bar", 1000),
            photo("1559329007-40df8a9345d8", "Candlelit dining table", 1000),
          ],
        }),
        faq,
        reservationCta,
      ],
    },
    {
      name: "Reservations",
      slug: "/reservations",
      sections: [
        section("hero", {
          variant: "soft-card",
          eyebrow: "Reservations",
          heading: "Book the dining room or save a seat at the bar",
          subheading: "Reserve online for dinner, brunch and special occasions.",
          primaryCta: { label: "Reserve now", href: "/contact" },
        }),
        diningServices,
        faq,
        contact,
      ],
    },
    {
      name: "Private Dining",
      slug: "/private-dining",
      sections: [
        section("hero", {
          variant: "split-left",
          eyebrow: "Private dining",
          heading: "A private room that feels like your own restaurant",
          subheading: "Chef-led dinners, client hosting, birthdays and holiday buyouts with polished service.",
          primaryCta: { label: "Ask dates", href: "/contact" },
          image: photo("1559329007-40df8a9345d8", "Private dining table with candles", 1400),
        }),
        privatePackages,
        chefStory,
        testimonials,
        faq,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [contact, faq],
    },
  ],
});
