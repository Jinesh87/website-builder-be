import type { ThemeSettings } from "../../../modules/websites/types/site-content.types.js";
import type {
  TemplateFooter,
  TemplateHeader,
  TemplatePage,
  TemplateSection,
} from "../../../modules/websites/types/template.types.js";
import type { ThemeSeed } from "../themes.js";
import type { WebsiteTemplateSeed } from "../templates.js";
import { PANNJHA_SAREE } from "./pannjha-saree.js";

/** Rose-and-cream boutique theme paired with the Premium template. */
export const PREMIUM_BOUTIQUE_THEME: ThemeSeed = {
  name: "Premium Boutique",
  settings: {
    fonts: { heading: "cormorant", body: "work-sans" },
    colors: {
      primary: "#7A2A3A",
      secondary: "#3E4A37",
      background: "#FBF7F2",
      surface: "#F3EBE2",
      text: "#2B2522",
      muted: "#6B625C",
    },
    radius: "lg",
    cardStyle: "flat",
    buttonStyle: "filled",
    containerWidth: 1180,
    sectionSpacing: "normal",
  } as ThemeSettings,
};

const WHATSAPP_HREF = "https://wa.me/919846122264";
const WHATSAPP_LABEL = "98461 22264";

const header = {
  design: "boutique",
  announcement: `Curated sarees for every occasion · Pre-book on WhatsApp ${WHATSAPP_LABEL}`,
  cta: { label: "Shop Now", href: "/shop" },
  shopHref: "/shop",
  showSearch: true,
  showAccount: true,
  showCart: true,
  position: "sticky",
  sticky: true,
  logoDisplay: "text_only",
  settings: { background: "default", hideOnMobile: false },
} as TemplateHeader;

const footer = {
  design: "columns",
  tagline: "Drape your story in grace.",
  columns: [
    {
      title: "Pages",
      links: [
        { label: "Home", href: "/" },
        { label: "Catalog", href: "/shop" },
        { label: "Our Story", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Policies",
      links: [
        { label: "Refund Policy", href: "/refund-policy" },
        { label: "Privacy Policy", href: "/privacy-policy" },
        { label: "Shipping Policy", href: "/shipping-policy" },
        { label: "Terms of Service", href: "/terms-of-service" },
      ],
    },
    {
      title: "Contact us",
      links: [
        { label: `WhatsApp: ${WHATSAPP_LABEL}`, href: WHATSAPP_HREF, openInNewTab: true },
        { label: "Send a message", href: "/contact" },
      ],
    },
  ],
  social: [],
  legalLinks: [],
  paymentMethods: { enabled: false, methods: [] },
  settings: { background: "dark", hideOnMobile: false },
} as TemplateFooter;

function section(type: TemplateSection["type"], data: Record<string, unknown>, settings: Record<string, unknown> = {}): TemplateSection {
  return {
    type,
    hidden: false,
    settings: { background: "default", hideOnMobile: false, ...settings },
    data,
  } as TemplateSection;
}

const whatsappBar = section(
  "cta",
  {
    variant: "inline-bar",
    icon: "brand:whatsapp",
    heading: "Pre-book on WhatsApp",
    text: "Ask about a saree, check availability or reserve new arrivals before they're gone.",
    button: { label: `Chat on WhatsApp · ${WHATSAPP_LABEL}`, href: WHATSAPP_HREF, openInNewTab: true },
  },
  { spacing: "compact" },
);

const promises = section("features", {
  variant: "numbered-cards",
  heading: "Crafted with Care",
  intro: "Every piece reflects our promise of quality and grace.",
  columns: 4,
  mobileColumns: 1,
  items: [
    { title: "Made with love", description: "A dream brought to life with care." },
    { title: "Timeless elegance", description: "Grace that belongs in every wardrobe." },
    { title: "Inspired by tradition", description: "Rooted in the beauty of enduring style." },
    { title: "Crafted for you", description: "Designed to inspire elegance and confidence." },
  ],
});

const collection = (title: string, description: string) => ({
  title,
  description,
  link: { label: "Shop Now", href: "/shop" },
});

const home: TemplatePage = {
  name: "Home",
  slug: "/",
  pageType: "HOME",
  showInNav: true,
  sections: [
    section(
      "hero",
      {
        variant: "arch-collage",
        eyebrow: "Our story",
        heading: "Drape Your Story in Grace",
        subheading:
          "Curated sarees, kurtas and kaftans, chosen with love for every occasion, from everyday elegance to festive grace.",
        primaryCta: { label: "Shop the Collection", href: "/shop" },
        secondaryCta: { label: "Our Story", href: "/about" },
        buttonShape: "pill",
        collagePhotos: 3,
      },
      { spacing: "relaxed" },
    ),
    section(
      "services",
      {
        variant: "collection-cards",
        eyebrow: "Explore our collections",
        heading: "Shop by Collection",
        intro: "From everyday elegance to festive grace, find your perfect drape.",
        align: "center",
        columns: 4,
        mobileColumns: 2,
        items: [
          collection("Sarees", "Silk, satin, cotton and embroidered drapes"),
          collection("Onam Collection", "Kerala-inspired festive classics"),
          collection("Kurtas & Kaftans", "Easy, elegant everyday wear"),
          collection("Men's Wear", "Traditional wear for him"),
          collection("Kids' Wear", "Little ones in festive style"),
        ],
        bottomCta: { label: "View all categories", href: "/shop" },
      },
      { background: "surface", anchor: "collections" },
    ),
    section(
      "products",
      {
        design: "featured-grid",
        cardButton: "single",
        eyebrow: "New this season",
        title: "Latest arrivals",
        layout: "grid-4",
        limit: 8,
        badgeLabel: "NEW",
        badgeCount: 2,
        viewAllLink: { label: "View all products", href: "/shop" },
        detailBase: "/product",
        emptyMessage: "New arrivals are on their way.",
      },
      { anchor: "latest" },
    ),
    section(
      "cta",
      {
        variant: "split-banner",
        eyebrow: "Join the experience",
        heading: "Step into a World of Elegance",
        text: "Embroidered, floral and silk sarees, hand-picked for comfort and grace.",
        button: { label: "Shop Now", href: "/shop" },
        panelColor: "#3E4A37",
      },
      { spacing: "compact" },
    ),
    promises,
    section(
      "split",
      {
        eyebrow: "Our story",
        heading: "Every dream begins with a single step.",
        body:
          "Our boutique began as a quiet dream, rooted in love, strengthened by gratitude and inspired by the timeless grace of tradition.\n\nWith the support of family and friends, we took the leap. What started as a dream became a purpose: to bring elegance, confidence and timeless style to every wardrobe.",
        bullets: [],
        imagePosition: "left",
        imageStyle: "arch",
        signature: "— The Founder",
        cta: { label: "Read Our Story", href: "/about" },
      },
      { background: "surface", anchor: "story" },
    ),
    whatsappBar,
    section("cta", {
      variant: "newsletter",
      heading: "Join our email list",
      text: "Get exclusive deals and early access to new products.",
      button: { label: "Subscribe", href: "#" },
      placeholder: "Your email address",
      successText: "Subscribed. Welcome aboard!",
    }),
  ],
};

const shop: TemplatePage = {
  name: "Catalog",
  slug: "/shop",
  pageType: "CUSTOM",
  showInNav: true,
  sections: [
    section(
      "products",
      {
        design: "showcase",
        eyebrow: "Catalog",
        title: "Sarees, kurtas & more",
        subtitle: "Search by name or filter by collection.",
        layout: "grid-3",
        showSearch: true,
        showCategoryFilter: true,
        showSort: true,
        detailBase: "/product",
        emptyMessage: "New arrivals are on their way.",
      },
      { background: "surface" },
    ),
    whatsappBar,
  ],
};

const product: TemplatePage = {
  name: "Product",
  slug: "/product",
  pageType: "CUSTOM",
  showInNav: false,
  sections: [
    section("product_detail", {
      design: "split",
      backHref: "/shop",
      backLabel: "All products",
      showStock: true,
      showDescription: true,
      showReturnPolicy: true,
      showCancellationPolicy: true,
    }),
    whatsappBar,
  ],
};

const about: TemplatePage = {
  name: "Our Story",
  slug: "/about",
  pageType: "ABOUT",
  showInNav: true,
  sections: [
    section(
      "split",
      {
        eyebrow: "Our story",
        heading: "Every dream begins with a single step.",
        body:
          "Our boutique began as a quiet dream, rooted in love, strengthened by gratitude and inspired by the timeless grace of tradition.\n\nWith the support of family and friends, we took the leap. What started as a dream became a purpose: to bring elegance, confidence and timeless style to every wardrobe.\n\nEvery saree, kurta and kaftan in the collection is chosen by hand, for the way it drapes, the way it feels and the moments it is made for.",
        bullets: [],
        imagePosition: "left",
        imageStyle: "arch",
        signature: "— The Founder",
        cta: { label: "Shop the Collection", href: "/shop" },
      },
      { background: "surface", spacing: "relaxed" },
    ),
    promises,
    section(
      "cta",
      {
        variant: "split-banner",
        eyebrow: "New arrivals",
        heading: "Find the drape made for your moment",
        text: "From everyday cottons to festive silks, browse the latest pieces.",
        button: { label: "Browse the Catalog", href: "/shop" },
        panelColor: "#7A2A3A",
      },
      { spacing: "compact" },
    ),
  ],
};

const contact: TemplatePage = {
  name: "Contact",
  slug: "/contact",
  pageType: "CONTACT",
  showInNav: true,
  sections: [
    section("contact", {
      variant: "split-form",
      eyebrow: "Get in touch",
      heading: "We'd love to hear from you",
      text: "Questions about a saree, an order or a custom request? Send a message or reach us on WhatsApp.",
      showForm: true,
      formHeading: "Send a message",
      submitLabel: "Send Message",
      officeHours: "Monday to Saturday, 10 AM – 7 PM",
      responseTime: "We reply within one working day.",
      serviceOptions: ["Order enquiry", "Product availability", "Returns & exchanges"],
    }),
    whatsappBar,
  ],
};

function policy(name: string, slug: string, body: string): TemplatePage {
  return {
    name,
    slug,
    pageType: "CUSTOM",
    showInNav: false,
    sections: [section("text", { heading: name, body })],
  };
}

const policies: TemplatePage[] = [
  policy(
    "Refund Policy",
    "/refund-policy",
    "Every piece is checked before it is packed. If something isn't right, we're here to help.\n\n<strong>Returns:</strong> Request a return or exchange within 7 days of delivery if the item is damaged, defective, wrong or doesn't fit. Items must be unused, unwashed and have their original tags.\n\n<strong>Not returnable:</strong> Customised or stitched items, sale items and items damaged after use or washing.\n\n<strong>How to return:</strong> Message us on WhatsApp with your order number, photos and an unboxing video.\n\n<strong>Refunds:</strong> Approved refunds are processed within 5–7 working days to your original payment method.",
  ),
  policy(
    "Privacy Policy",
    "/privacy-policy",
    "We respect your privacy. This policy explains how we use your information.\n\n<strong>What we collect:</strong> Your name, phone, email, address and order details. Payments are handled by our payment partner; we never store your card or UPI details.\n\n<strong>How we use it:</strong> To process and deliver your orders, send order updates, handle returns and, only if you agree, share new arrivals and offers.\n\n<strong>Sharing:</strong> We share only what's needed with courier and payment partners. We never sell your data.\n\n<strong>Your rights:</strong> Ask us to view, update or delete your data, or stop marketing messages, at any time.",
  ),
  policy(
    "Shipping Policy",
    "/shipping-policy",
    "We ship across India. For international orders, please contact us.\n\n<strong>Processing:</strong> Ready-to-ship orders are dispatched within 1–3 working days.\n\n<strong>Delivery:</strong> Usually 3–7 working days after dispatch, depending on your location.\n\n<strong>Tracking:</strong> You'll receive a tracking link once your order ships.\n\n<strong>Damaged parcels:</strong> Please don't accept a parcel that looks opened or damaged. If already accepted, share an unboxing video with us within 48 hours.",
  ),
  policy(
    "Terms of Service",
    "/terms-of-service",
    "By using this website or placing an order, you agree to these terms.\n\n<strong>Products:</strong> We describe every piece as accurately as possible. Colours may vary slightly with lighting and screens, and handloom pieces may have natural variations.\n\n<strong>Prices:</strong> All prices are in Indian Rupees. Prices and offers may change without notice.\n\n<strong>Orders:</strong> Your order is confirmed once you receive a confirmation message. We may cancel an order if an item is out of stock or payment fails, with a full refund.\n\n<strong>Governing law:</strong> These terms follow Indian law.",
  ),
];

/** Shopper login and account pages share the Pannjha setup, with boutique copy. */
function shopperPage(slug: string, patch: (data: Record<string, unknown>) => Record<string, unknown>): TemplatePage {
  const source = PANNJHA_SAREE.pages.find((page) => page.slug === slug);
  if (!source) throw new Error(`Pannjha template has no ${slug} page`);
  const copy = structuredClone(source);
  copy.sections = copy.sections.map((item) => ({ ...item, data: patch(item.data as Record<string, unknown>) }) as TemplateSection);
  return copy;
}

const login = shopperPage("/login", (data) => ({
  ...data,
  panel: {
    heading: "New here?",
    text: "Create an account to save your details, track orders and check out faster.",
    highlights: ["Track every order", "Save your favourite pieces", "Faster checkout"],
    registerHeading: "Already have an account?",
    registerText: "Log in to see your orders, cart and saved pieces.",
  },
}));

const account = shopperPage("/account", (data) => ({
  ...data,
  subheading: "Your orders, cart and profile in one place.",
}));

/** Built-in "Premium" boutique e-commerce template. */
export const PREMIUM_BOUTIQUE: WebsiteTemplateSeed = {
  key: "premium-boutique",
  name: "Premium",
  category: "E-commerce",
  description:
    "Rose-and-cream saree boutique: arched hero, collection cards, latest-products strip, founder story, WhatsApp pre-booking and newsletter.",
  themeName: PREMIUM_BOUTIQUE_THEME.name,
  header,
  footer,
  pages: [home, shop, product, about, contact, login, account, ...policies],
};
