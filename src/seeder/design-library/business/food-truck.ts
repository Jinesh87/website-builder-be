import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { FOOD_TRUCK_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "headline-ticker",
  siteName: NAME,
  logo: FOOD_TRUCK_LOGO,
  logoDisplay: "logo_only",
  announcement: "This week: Mission Market, Friday night tacos, Sunday brunch park-up",
  announcementLink: { label: "Find the truck", href: "/locations" },
  menu: [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "Locations", href: "/locations" },
    { label: "Catering", href: "/catering" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Order ahead", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  logo: FOOD_TRUCK_LOGO,
  tagline: "Street food with a sunny side",
  description: "A modern food truck serving grilled wraps, rice bowls, crispy sides and seasonal drinks across the city.",
  columns: [
    {
      title: "Truck menu",
      links: [
        { label: "Loaded wraps", href: "/menu" },
        { label: "Market bowls", href: "/menu" },
        { label: "Sides and sauces", href: "/menu" },
        { label: "Zero-proof drinks", href: "/menu" },
      ],
    },
    {
      title: "Book us",
      links: [
        { label: "Office lunches", href: "/catering" },
        { label: "Weddings and parties", href: "/catering" },
        { label: "Festivals", href: "/locations" },
        { label: "Private menu tasting", href: "/contact" },
      ],
    },
  ],
  contact: {
    email: "hello@sundaystreetkitchen.com",
    phone: "(415) 555-0136",
    address: "Rolling across San Francisco, CA",
    hours: "Wed-Sun 11:00am-9:00pm",
  },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "TikTok", href: "https://www.tiktok.com" },
  ],
  paymentMethods: { enabled: true, methods: ["visa", "mastercard", "applepay"] },
  legalLinks: [{ label: "Catering terms", href: "/catering" }],
  copyright: `(c) 2026 ${NAME} LLC`,
};

const menuMarquee = section(
  "marquee",
  {
    variant: "pill-badges",
    eyebrow: "Fresh off the griddle",
    items: [
      { text: "Charred chicken shawarma wrap", icon: "sparkles" },
      { text: "Crispy cauliflower rice bowl", icon: "heart" },
      { text: "Mango chili lemonade", icon: "bolt" },
      { text: "Coconut lime slaw", icon: "star" },
      { text: "Vegan harissa aioli", icon: "check" },
    ],
    speed: "normal",
    gradientFades: true,
    pauseOnHover: true,
  },
  { spacing: "compact" },
);

const signatureMenu = section(
  "services",
  {
    variant: "bento-grid",
    eyebrow: "Street menu",
    heading: "Big flavor, fast service, zero boring lunches",
    intro: "Everything is built to order from a tight menu that travels well, photographs beautifully and feeds a crowd.",
    columns: 3,
    mobileColumns: 1,
    cardStyle: "glow",
    iconStyle: "colored-circle",
    imageAspect: "4:3",
    showImages: true,
    showIcons: true,
    showPrices: true,
    showBadges: true,
    showBullets: true,
    items: [
      {
        title: "Sunbird chicken wrap",
        description: "Charred chicken, turmeric rice, pickled onion, herbed yogurt and hot honey.",
        image: photo("1606755962773-d324e0a13086", "Loaded street food wrap with grilled chicken", 1000),
        icon: "sparkles",
        badge: "Best seller",
        price: "$14",
        featured: true,
        features: ["Built in 4 minutes", "Gluten-free wrap available", "House hot sauce"],
        link: { label: "See full menu", href: "/menu" },
      },
      {
        title: "Market grain bowl",
        description: "Brown rice, smoky chickpeas, roasted veg, greens and lemon tahini.",
        image: photo("1512621776951-a57141f2eefd", "Colorful vegetarian grain bowl", 1000),
        icon: "heart",
        badge: "Vegan",
        price: "$13",
        features: ["Plant-based", "High protein", "Seasonal vegetables"],
        link: { label: "Order bowls", href: "/contact" },
      },
      {
        title: "Crispy street potatoes",
        description: "Double-cooked potatoes with lime salt, scallions and saffron aioli.",
        image: photo("1630383249896-424e482df921", "Crispy potatoes with sauce", 1000),
        icon: "bolt",
        price: "$7",
        features: ["Shareable", "Extra sauce optional", "Pairs with every wrap"],
        link: { label: "Add a side", href: "/menu" },
      },
      {
        title: "Mango chili lemonade",
        description: "Bright mango, fresh lemon, chili salt rim and sparkling water.",
        image: photo("1621263764928-df1444c5e859", "Fresh mango lemonade", 1000),
        icon: "star",
        price: "$5",
        features: ["House-made", "Zero proof", "Batch brewed daily"],
        link: { label: "See drinks", href: "/menu" },
      },
    ],
  },
  { background: "surface" },
);

const menuCarousel = section("carousel", {
  variant: "curved-banner",
  eyebrow: "Menu moments",
  heading: "A rolling kitchen built for camera-ready cravings",
  intro: "Use the curved banner to show the food, the truck, the line and the atmosphere like a real 2026 launch site.",
  badge: "This week",
  slides: [
    {
      title: "Lunch at Mission Market",
      subtitle: "Wednesday to Friday, 11:00am-2:30pm",
      badge: "Lunch",
      image: photo("1504674900247-0877df9cc836", "Colorful street food served from a market stall", 1400),
    },
    {
      title: "Night market tacos",
      subtitle: "Friday nights with salsa bar and agua frescas",
      badge: "Pop-up",
      image: photo("1551504734-5ee1c4a1479b", "Street tacos with fresh garnishes", 1400),
    },
    {
      title: "Office catering drop",
      subtitle: "Boxed wraps, sides and drinks for teams of 15-200",
      badge: "Catering",
      image: photo("1555244162-803834f70033", "Catering boxes with fresh food", 1400),
    },
  ],
  autoPlay: true,
  interval: 6,
  pauseOnHover: true,
});

const truckFeatures = section("features", {
  variant: "pastel-icons",
  eyebrow: "Why teams book us",
  heading: "Food-truck speed with restaurant-level systems",
  columns: 4,
  mobileColumns: 1,
  iconStyle: "pastel-circle",
  items: [
    { icon: "clock", title: "Fast service", description: "120 guest service window in under 45 minutes with pre-built lanes." },
    { icon: "shield", title: "Dietary clarity", description: "Vegan, gluten-free and nut guidance listed on every menu card." },
    { icon: "wallet", title: "Simple pricing", description: "Per-person catering packages, no surprise travel fees inside the city." },
    { icon: "star", title: "Brandable pop-ups", description: "Custom wraps, QR menus and co-branded signage for launches." },
  ],
});

const cateringPlans = section(
  "pricing",
  {
    variant: "cards-grid",
    eyebrow: "Catering packages",
    heading: "Feed the crew without making lunch complicated",
    intro: "All packages include setup, sauces, eco-friendly serviceware and a named event lead.",
    columns: 3,
    mobileColumns: 1,
    cardStyle: "elevated",
    plans: [
      { name: "Team Drop", price: "$22", period: "/person", description: "Individually boxed wraps or bowls.", features: ["15 guest minimum", "2 main options", "Side and drink add-ons"], cta: { label: "Plan a drop", href: "/contact" }, featured: false },
      { name: "Truck Service", price: "$29", period: "/person", badge: "Most booked", description: "The truck parks onsite and serves fresh.", features: ["50 guest minimum", "Live ordering window", "Custom menu board", "Event lead included"], cta: { label: "Book the truck", href: "/contact" }, featured: true, highlightNote: "Best for offices, breweries and neighborhood events" },
      { name: "Festival Build", price: "Quote", description: "High-volume event service.", features: ["300+ guests", "Multiple service lines", "Sponsor signage", "Staff meal options"], cta: { label: "Talk festivals", href: "/contact" }, featured: false },
    ],
  },
  { background: "default" },
);

const truckStory = section("split", {
  eyebrow: "From market stall to city favorite",
  heading: "A tiny menu tuned for massive flavor",
  body: `${NAME} started as a weekend stall with one grill, one sauce and a line that wrapped around the block.\n\nToday the truck still keeps the same discipline: a small menu, tight prep, bright produce and food that tastes good standing on a sidewalk.`,
  bullets: ["Produce sourced from Bay Area farmers markets", "Compostable packaging and low-waste prep", "Weekly pop-up menu collaborations"],
  image: photo("1565299624946-b28f40a0ae38", "Food truck serving customers on a sunny street", 1400),
  imagePosition: "left",
  cta: { label: "Meet the crew", href: "/locations" },
});

const testimonials = section("testimonials", {
  heading: "The line forms for a reason",
  items: [
    { quote: "We booked {{businessName}} for a 180-person launch and they served faster than our cafeteria.", name: "Mina Chen", role: "People Ops, Loomline" },
    { quote: "The wraps are bright, spicy and consistent. It is the only food truck our whole office agrees on.", name: "Jordan Miles", role: "Design Lead" },
    { quote: "They handled setup, signage and dietary labels without us chasing anything.", name: "Priya Raman", role: "Event Producer" },
  ],
});

const faq = section("faq", {
  variant: "split-sidebar",
  eyebrow: "Truck FAQ",
  heading: "Everything before you book",
  intro: "Need something special? We can shape the menu around your crowd.",
  cardStyle: "elevated",
  supportCta: { title: "Need this week?", description: "We keep a few rapid catering windows open for offices.", link: { label: "Ask availability", href: "/contact" } },
  items: [
    { question: "Can we pre-order?", answer: "Yes. Individual pickup orders and event pre-orders can be arranged through the contact form." },
    { question: "Do you handle vegan and gluten-free?", answer: "Yes. We mark dietary options clearly and can build fully plant-based catering menus." },
    { question: "What do you need for truck service?", answer: "A legal parking space, 30 feet of clearance and a short setup window. We bring the rest." },
  ],
});

const bookingCta = section(
  "cta",
  {
    variant: "floating-card",
    eyebrow: "Ready to feed people well?",
    heading: "Bring the truck to your next lunch, market or launch party",
    text: "Share your date, guest count and location. We will respond with a clean menu proposal.",
    button: { label: "Book the truck", href: "/contact" },
    secondaryButton: { label: "View menu", href: "/menu" },
    trustBadges: ["48-hour quotes", "Dietary labels", "Eco packaging"],
    highlightMetric: { value: "4.9", label: "average event rating" },
    cardStyle: "elevated",
  },
  { background: "surface" },
);

const contact = section("contact", {
  variant: "cards-hub",
  eyebrow: "Order, book or collaborate",
  heading: "Tell us where to roll",
  text: "Send the date, location, headcount and vibe. We will send menus, logistics and pricing.",
  email: "hello@sundaystreetkitchen.com",
  phone: "(415) 555-0136",
  address: "San Francisco, CA",
  officeHours: "Wed-Sun 9:00am-6:00pm",
  responseTime: "Usually replies same day",
  showForm: true,
  submitLabel: "Send catering request",
  serviceOptions: ["Truck catering", "Office lunch drop", "Festival service", "Private tasting"],
  channels: [
    { label: "Catering", value: "hello@sundaystreetkitchen.com", icon: "mail", description: "Menu proposals and event logistics" },
    { label: "Day-of truck", value: "(415) 555-0136", icon: "phone", description: "Running late or need directions?" },
  ],
});

export const FOOD_TRUCK: BusinessTemplate = businessTemplate({
  key: "food-truck-sunny",
  name: "Food Truck · Sunny",
  category: "Food",
  description: "A sunny modern food truck site with video hero, weekly locations, catering packages and curved menu gallery.",
  themeName: "Sunday Street",
  theme: {
    colors: {
      primary: "#F59E0B",
      secondary: "#12B886",
      background: "#FFFDF5",
      surface: "#FFF3CC",
      text: "#241A05",
      muted: "#6F5A20",
    },
    fonts: { heading: "bricolage-grotesque", body: "sora" },
    buttonStyle: "filled",
    cardStyle: "shadow",
    radius: "lg",
    containerWidth: 1220,
    sectionSpacing: "normal",
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
            variant: "campaign-banner",
            eyebrow: "Street food, live this week",
            heading: "Fresh from the truck, served with sunshine",
            highlightText: "sunshine",
            subheading: "Follow the weekly route, order ahead, or book the truck for events that need fast, colorful food.",
            primaryCta: { label: "Find this week", href: "/locations" },
            secondaryCta: { label: "Book catering", href: "/catering" },
            backgroundImage: photo("1565299624946-b28f40a0ae38", "Food truck at a sunny street market", 1800),
            backgroundVideoUrl: "/bannervid.mp4",
            bgOverlayType: "gradient",
            overlayOpacity: 44,
            minHeight: "tall",
            contentAlign: "left",
            bannerBottomShape: "wave",
            bannerCurveDepth: 90,
            bottomDividerColor: "#FFF3CC",
            showCampaignCards: true,
            campaignStats: [
              { label: "Weekly stops", value: "8", icon: "pin" },
              { label: "Avg. rating", value: "4.9", icon: "star" },
            ],
            campaignProgress: {
              raisedAmount: "120",
              targetAmount: "140",
              currency: "",
              raisedLabel: "lunch slots",
              targetLabel: "served daily",
              percentage: 86,
              donateButton: { label: "See menu", href: "/menu" },
              registerButton: { label: "Order ahead", href: "/contact" },
            },
          }
        ),
        menuMarquee,
        signatureMenu,
        menuCarousel,
        truckFeatures,
        truckStory,
        testimonials,
        faq,
        bookingCta,
      ],
    },
    {
      name: "Menu",
      slug: "/menu",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Menu",
          heading: "Small menu, loud flavor",
          subheading: "A flexible core menu with seasonal specials, dietary options and fast service windows.",
          primaryCta: { label: "Order ahead", href: "/contact" },
        }),
        signatureMenu,
        section("gallery", {
          heading: "Food that travels well",
          columns: 4,
          mobileColumns: 2,
          images: [
            photo("1606755962773-d324e0a13086", "Loaded chicken wrap", 1000),
            photo("1512621776951-a57141f2eefd", "Vegetable rice bowl", 1000),
            photo("1551504734-5ee1c4a1479b", "Street tacos with garnish", 1000),
            photo("1621263764928-df1444c5e859", "Mango lemonade", 1000),
          ],
        }),
        faq,
        bookingCta,
      ],
    },
    {
      name: "Locations",
      slug: "/locations",
      sections: [
        section("hero", {
          variant: "soft-card",
          eyebrow: "Weekly route",
          heading: "Catch the truck around the city",
          subheading: "We post weekly locations every Monday morning. Follow along or book a private stop.",
          primaryCta: { label: "Book a stop", href: "/contact" },
        }),
        menuCarousel,
        truckFeatures,
        bookingCta,
      ],
    },
    {
      name: "Catering",
      slug: "/catering",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "Catering",
          heading: "Food-truck catering that runs on rails",
          subheading: "Office lunches, launch parties, breweries, weddings and markets with clear pricing and tight setup.",
          primaryCta: { label: "Request quote", href: "/contact" },
          image: photo("1555244162-803834f70033", "Fresh catering boxes ready for a team lunch", 1400),
        }),
        cateringPlans,
        truckFeatures,
        testimonials,
        faq,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        contact,
        faq,
      ],
    },
  ],
});
