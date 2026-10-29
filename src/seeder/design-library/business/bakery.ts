import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { BAKERY_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "split-stacked",
  siteName: NAME,
  logo: BAKERY_LOGO,
  logoDisplay: "logo_only",
  tagline: "Naturally leavened bread, pastry and celebration cakes",
  statusText: "Pre-orders close daily at 3:00pm",
  statusColor: "orange",
  utilityLinks: [
    { label: "Today in the case", href: "/menu" },
    { label: "Cake orders", href: "/cakes" },
    { label: "Call (305) 555-0149", href: "tel:+13055550149" },
  ],
  menu: [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "Cakes", href: "/cakes" },
    { label: "Wholesale", href: "/wholesale" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Order ahead", href: "/contact" },
  secondaryCta: { label: "Cake quote", href: "/cakes" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  logo: BAKERY_LOGO,
  tagline: "Small-batch bakery and coffee counter",
  description: "A bright coastal bakery making sourdough, croissants, cakes and cafe boxes from a glass-fronted kitchen.",
  columns: [
    {
      title: "Bakery",
      links: [
        { label: "Morning pastry", href: "/menu" },
        { label: "Sourdough loaves", href: "/menu" },
        { label: "Celebration cakes", href: "/cakes" },
        { label: "Coffee and brunch", href: "/menu" },
      ],
    },
    {
      title: "Orders",
      links: [
        { label: "Cake quote", href: "/cakes" },
        { label: "Cafe boxes", href: "/wholesale" },
        { label: "Wholesale bread", href: "/wholesale" },
        { label: "Pickup details", href: "/contact" },
      ],
    },
  ],
  contact: {
    email: "orders@coralbaybakery.com",
    phone: "(305) 555-0149",
    address: "210 Ocean Drive, Miami, FL",
    hours: "Daily 7:00am-4:00pm · Cakes by pre-order",
  },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "Pinterest", href: "https://www.pinterest.com" },
  ],
  paymentMethods: { enabled: true, methods: ["visa", "mastercard", "amex", "applepay"] },
  legalLinks: [
    { label: "Cake policy", href: "/cakes" },
    { label: "Allergens", href: "/menu" },
  ],
  copyright: `(c) 2026 ${NAME} Bakehouse`,
};

const todayMarquee = section(
  "marquee",
  {
    variant: "cards-stream",
    eyebrow: "Today from the oven",
    items: [
      { text: "Miso caramel morning buns", badge: "8:00am", icon: "sparkles" },
      { text: "Sea-salt chocolate croissants", badge: "9:00am", icon: "heart" },
      { text: "Olive oil focaccia slabs", badge: "11:00am", icon: "star" },
      { text: "Guava cream cake slices", badge: "noon", icon: "bolt" },
    ],
    speed: "slow",
    gradientFades: true,
    pauseOnHover: true,
  },
  { spacing: "compact" },
);

const bakeryMenu = section(
  "services",
  {
    variant: "bento-grid",
    eyebrow: "Bakery case",
    heading: "Bread, pastry and cakes with a coastal glow",
    intro: "A clean menu system for everyday walk-ins, pre-orders, cake quotes and wholesale accounts.",
    columns: 3,
    mobileColumns: 1,
    cardStyle: "elevated",
    iconStyle: "colored-circle",
    imageAspect: "4:3",
    showImages: true,
    showIcons: true,
    showPrices: true,
    showBadges: true,
    showBullets: true,
    items: [
      {
        title: "Sourdough and focaccia",
        description: "Naturally leavened loaves, seeded tins and olive-oil focaccia slabs.",
        image: photo("1509440159596-0249088772ff", "Fresh artisan bread and sourdough loaves", 1000),
        icon: "layers",
        badge: "Daily bake",
        price: "$7-$14",
        featured: true,
        features: ["72-hour ferment", "Whole-grain options", "Wholesale trays available"],
        link: { label: "See breads", href: "/menu" },
      },
      {
        title: "Croissants and buns",
        description: "Buttery lamination, seasonal fillings and limited morning specials.",
        image: photo("1509365465985-25d11c17e812", "Fresh croissants in a bakery case", 1000),
        icon: "sparkles",
        badge: "Sells out",
        price: "$5-$8",
        features: ["Classic butter", "Chocolate", "Miso caramel bun"],
        link: { label: "Today's case", href: "/menu" },
      },
      {
        title: "Celebration cakes",
        description: "Layer cakes, sheet cakes and petite wedding cakes with modern finishes.",
        image: photo("1578985545062-69928b1d9587", "Modern celebration cake with clean frosting", 1000),
        icon: "heart",
        badge: "48h notice",
        price: "From $68",
        features: ["Custom flavors", "Florals and message cards", "Pickup windows"],
        link: { label: "Order a cake", href: "/cakes" },
      },
      {
        title: "Coffee and brunch boxes",
        description: "Espresso, iced drinks and boxes for shoots, meetings and beach mornings.",
        image: photo("1495474472287-4d71bcdd2085", "Coffee and pastry on a cafe table", 1000),
        icon: "star",
        price: "From $36",
        features: ["Six or twelve pastries", "Coffee traveler add-on", "Corporate invoices"],
        link: { label: "Plan a box", href: "/wholesale" },
      },
    ],
  },
  { background: "surface" },
);

const caseCarousel = section("carousel", {
  variant: "curved-banner",
  eyebrow: "From the case",
  heading: "A soft, editorial carousel for a modern bakery brand",
  intro: "Use it to showcase the morning case, cake finishes and wholesale trays.",
  badge: "Fresh today",
  slides: [
    {
      title: "Morning pastry case",
      subtitle: "Croissants, buns, cookies and seasonal fruit galettes",
      badge: "Pastry",
      image: photo("1509365465985-25d11c17e812", "Fresh pastries in a bakery case", 1400),
    },
    {
      title: "Celebration cakes",
      subtitle: "Modern buttercream, clean piping and playful color",
      badge: "Cakes",
      image: photo("1578985545062-69928b1d9587", "Elegant celebration cake", 1400),
    },
    {
      title: "Wholesale bread",
      subtitle: "Cafe loaves, focaccia slabs and pastry boxes",
      badge: "Wholesale",
      image: photo("1509440159596-0249088772ff", "Artisan bread loaves on a table", 1400),
    },
  ],
  autoPlay: true,
  interval: 5,
  pauseOnHover: true,
});

const bakeryFeatures = section("features", {
  variant: "cards",
  eyebrow: "Bakehouse systems",
  heading: "A pretty site that still handles real bakery operations",
  columns: 3,
  mobileColumns: 1,
  cardStyle: "surface",
  items: [
    { icon: "clock", title: "Daily bake schedule", description: "Clear pickup windows, pre-order deadlines and limited-run specials." },
    { icon: "shield", title: "Allergen clarity", description: "Nut, dairy, gluten and vegan guidance can live inside every menu card." },
    { icon: "wallet", title: "Wholesale paths", description: "Separate routes for cafes, offices, events and recurring bread accounts." },
  ],
});

const cakePlans = section(
  "pricing",
  {
    variant: "horizontal-rows",
    eyebrow: "Cake ordering",
    heading: "Clean packages for cakes and cafe boxes",
    intro: "Give customers enough choice without making the order flow messy.",
    cardStyle: "elevated",
    plans: [
      { name: "Mini Celebration", price: "$68", description: "6-inch layer cake for small gatherings.", features: ["Serves 6-8", "Two flavor choices", "Message card included"], cta: { label: "Order mini", href: "/contact" }, featured: false },
      { name: "Signature Party Cake", price: "$145", badge: "Most ordered", description: "Two-tier look without wedding complexity.", features: ["Serves 18-24", "Custom color palette", "Florals available"], cta: { label: "Start quote", href: "/contact" }, featured: true, highlightNote: "48-hour notice recommended" },
      { name: "Cafe Box", price: "$42", description: "A polished box for teams, shoots and brunch.", features: ["6 pastries", "Seasonal mix", "Coffee traveler add-on"], cta: { label: "Build box", href: "/wholesale" }, featured: false },
    ],
  },
  { background: "default" },
);

const bakeryStory = section("split", {
  eyebrow: "The bakehouse",
  heading: "A glass-fronted kitchen with a calm ordering flow",
  body: `${NAME} is built around the daily rhythm of flour, butter, fruit and coffee.\n\nThe site translates that same rhythm into a clean customer journey: see today's bake, order cake, plan a cafe box, or start a wholesale account.`,
  bullets: ["Naturally leavened bread and long fermentation", "Seasonal Florida citrus, guava and tropical fruit", "Small team, visible kitchen and warm pickup experience"],
  image: photo("1554118811-1e0d58224f24", "Baker shaping dough in a bright kitchen", 1400),
  imagePosition: "left",
  cta: { label: "Visit the bakery", href: "/contact" },
});

const testimonials = section("testimonials", {
  heading: "Customers come back before noon",
  items: [
    { quote: "Their cake order page would save our team ten phone calls a day. It is beautiful and practical.", name: "Rosa Martinez", role: "Cafe owner" },
    { quote: "The pastry photos, colors and ordering flow feel premium without losing warmth.", name: "Maya Brooks", role: "Bride" },
    { quote: "We use Coral Bay for every shoot. The boxes arrive labeled, pretty and exactly on time.", name: "Nina Shah", role: "Creative producer" },
  ],
});

const faq = section("faq", {
  variant: "two-column-grid",
  eyebrow: "Bakery FAQ",
  heading: "Ordering without confusion",
  cardStyle: "elevated",
  items: [
    { question: "How far ahead should I order cakes?", answer: "Most cakes need 48 hours. Larger celebration cakes and custom colors are best booked one week ahead." },
    { question: "Can I reserve pastries?", answer: "Yes. Same-day pastry holds are available until 3:00pm, subject to sellout." },
    { question: "Do you offer wholesale?", answer: "Yes. Cafes can order recurring bread, focaccia and pastry boxes with weekly invoicing." },
    { question: "Do you list allergens?", answer: "Yes. Each menu item can include allergen notes and dietary labels." },
  ],
});

const orderCta = section(
  "cta",
  {
    variant: "centered-card",
    eyebrow: "Order before the case sells out",
    heading: "Reserve pastries, quote a cake or start wholesale",
    text: "A clean call-to-action section for bakery ordering that works on mobile and desktop.",
    button: { label: "Order ahead", href: "/contact" },
    secondaryButton: { label: "Cake quote", href: "/cakes" },
    trustBadges: ["48-hour cakes", "Daily pastry", "Wholesale accounts"],
    cardStyle: "elevated",
  },
  { background: "surface" },
);

const contact = section("contact", {
  variant: "split-form",
  eyebrow: "Orders and questions",
  heading: "Tell us what to bake",
  text: "Send pickup date, servings, flavors, allergens and inspiration. We will confirm options and pricing.",
  email: "orders@coralbaybakery.com",
  phone: "(305) 555-0149",
  address: "210 Ocean Drive, Miami, FL",
  officeHours: "Daily 7:00am-4:00pm",
  responseTime: "Same day before 3:00pm",
  showForm: true,
  submitLabel: "Send order request",
  serviceOptions: ["Pastry hold", "Cake quote", "Cafe box", "Wholesale inquiry"],
});

export const BAKERY: BusinessTemplate = businessTemplate({
  key: "bakery-coral",
  name: "Bakery · Coral",
  category: "Food",
  description: "A bright bakery and cafe site with daily menu, cake ordering, wholesale flows and curved pastry showcase.",
  themeName: "Coral Bay",
  theme: {
    colors: {
      primary: "#E4512F",
      secondary: "#0EA5A3",
      background: "#FFFFFF",
      surface: "#FFEDE7",
      text: "#2A1A16",
      muted: "#73544B",
    },
    fonts: { heading: "bricolage-grotesque", body: "manrope" },
    buttonStyle: "filled",
    cardStyle: "shadow",
    radius: "lg",
    containerWidth: 1200,
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
            variant: "floating-cards",
            eyebrow: "Miami bakehouse and coffee counter",
            heading: "Fresh bread, bright pastry and cakes made to celebrate",
            highlightText: "made to celebrate",
            subheading: "A clean, modern bakery site for daily menus, cake orders, wholesale bread and sunny cafe visits.",
            primaryCta: { label: "Order ahead", href: "/contact" },
            secondaryCta: { label: "See menu", href: "/menu" },
            image: photo("1509440159596-0249088772ff", "Fresh artisan bread and pastries on a bakery table", 1600),
            floatingCards: [
              { title: "7am", subtitle: "First bake", icon: "clock" },
              { title: "48h", subtitle: "Cake notice", icon: "heart" },
              { title: "4.9", subtitle: "Customer rating", icon: "star" },
            ],
          }
        ),
        todayMarquee,
        bakeryMenu,
        caseCarousel,
        bakeryFeatures,
        bakeryStory,
        testimonials,
        faq,
        orderCta,
      ],
    },
    {
      name: "Menu",
      slug: "/menu",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Menu",
          heading: "Today's case, breads and coffee",
          subheading: "A daily menu page for walk-ins, pre-orders and dietary details.",
          primaryCta: { label: "Hold pastries", href: "/contact" },
        }),
        bakeryMenu,
        caseCarousel,
        faq,
      ],
    },
    {
      name: "Cakes",
      slug: "/cakes",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "Celebration cakes",
          heading: "Modern cakes without the messy quote process",
          subheading: "Pick a size, flavor, palette and pickup window. We will confirm the design and invoice.",
          primaryCta: { label: "Start cake quote", href: "/contact" },
          image: photo("1578985545062-69928b1d9587", "Modern celebration cake with coral frosting", 1400),
        }),
        cakePlans,
        section("gallery", {
          heading: "Cake finishes",
          columns: 4,
          mobileColumns: 2,
          images: [
            photo("1578985545062-69928b1d9587", "Modern frosted celebration cake", 1000),
            photo("1565958011703-44f9829ba187", "Colorful cake slice", 1000),
            photo("1464349095431-e9a21285b5f3", "Birthday cake with candles", 1000),
            photo("1519869325930-281384150729", "Decorated cake on table", 1000),
          ],
        }),
        faq,
        orderCta,
      ],
    },
    {
      name: "Wholesale",
      slug: "/wholesale",
      sections: [
        section("hero", {
          variant: "soft-card",
          eyebrow: "Wholesale",
          heading: "Bread and pastry boxes for cafes, offices and shoots",
          subheading: "Recurring wholesale bread, focaccia trays, pastry boxes and coffee travelers.",
          primaryCta: { label: "Start wholesale", href: "/contact" },
        }),
        bakeryFeatures,
        cakePlans,
        testimonials,
        orderCta,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [contact, faq],
    },
  ],
});
