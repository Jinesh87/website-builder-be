import type { ImageRef, ThemeSettings } from "../../../modules/websites/types/site-content.types.js";
import type {
  TemplateFooter,
  TemplateHeader,
  TemplatePage,
  TemplateSection,
} from "../../../modules/websites/types/template.types.js";
import type { ThemeSeed } from "../themes.js";
import type { WebsiteTemplateSeed } from "../templates.js";
import { PANNJHA_SAREE } from "./pannjha-saree.js";

/** Deep-green grocery theme paired with the ARA Shops template. */
export const ARA_SHOPS_THEME: ThemeSeed = {
  name: "ARA Fresh",
  settings: {
    fonts: { heading: "plus-jakarta-sans", body: "plus-jakarta-sans" },
    colors: {
      primary: "#1F4D3A",
      secondary: "#E0663A",
      background: "#FFFFFF",
      surface: "#F3F6F2",
      text: "#16231D",
      muted: "#5E6B64",
    },
    radius: "lg",
    cardStyle: "border",
    buttonStyle: "filled",
    containerWidth: 1200,
    sectionSpacing: "normal",
  } as ThemeSettings,
};

/** Unsplash photo, cropped server-side to the requested width. */
function photo(id: string, alt: string, width = 900): ImageRef {
  return { url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`, alt };
}

function section(type: TemplateSection["type"], data: Record<string, unknown>, settings: Record<string, unknown> = {}): TemplateSection {
  return {
    type,
    hidden: false,
    settings: { background: "default", hideOnMobile: false, ...settings },
    data,
  } as TemplateSection;
}

const header = {
  design: "boutique",
  announcement: "Fresh meat & hot food in one cart · Deliveries at 8 AM, 1 PM and 7 PM",
  cta: { label: "Order Now", href: "/shop" },
  shopHref: "/shop",
  showSearch: true,
  showAccount: true,
  showCart: true,
  searchPlaceholder: "Search chicken, mutton, biryani…",
  position: "sticky",
  sticky: true,
  logoDisplay: "text_only",
  settings: { background: "default", hideOnMobile: false },
} as TemplateHeader;

const footer = {
  design: "columns",
  tagline: "Fresh meat and ready-to-eat food, delivered three times a day.",
  columns: [
    {
      title: "Shop",
      links: [
        { label: "Fresh meat", href: "/shop" },
        { label: "Ready to eat", href: "/shop" },
        { label: "All products", href: "/shop" },
      ],
    },
    {
      title: "Help",
      links: [
        { label: "About us", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Delivery Policy", href: "/delivery-policy" },
        { label: "Refund Policy", href: "/refund-policy" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms of Service", href: "/terms-of-service" },
        { label: "Privacy Policy", href: "/privacy-policy" },
      ],
    },
  ],
  social: [],
  legalLinks: [],
  paymentMethods: { enabled: false, methods: [] },
  settings: { background: "dark", hideOnMobile: false },
} as TemplateFooter;

const category = (title: string, description: string, image: ImageRef) => ({
  title,
  description,
  image,
  link: { label: "Shop", href: "/shop" },
});

const slots = section(
  "features",
  {
    variant: "cards",
    eyebrow: "Delivery slots",
    heading: "Three deliveries a day",
    intro: "Pick a slot at checkout. Fresh meat and hot food arrive together in one delivery.",
    align: "center",
    columns: 3,
    mobileColumns: 1,
    items: [
      { icon: "clock", badge: "Morning", title: "8:00 AM", description: "Breakfast and fresh cuts for the day's cooking." },
      { icon: "clock", badge: "Lunch", title: "1:00 PM", description: "Hot meals, biryani and fresh meat for dinner prep." },
      { icon: "clock", badge: "Dinner", title: "7:00 PM", description: "Biryani and fresh cuts for tonight and tomorrow." },
    ],
  },
  { background: "surface", anchor: "slots" },
);

const promises = section("features", {
  variant: "pastel-icons",
  heading: "Why order from us",
  align: "center",
  columns: 4,
  mobileColumns: 2,
  items: [
    { icon: "shield", title: "Fresh, never frozen", description: "Cut and packed the same day it reaches you." },
    { icon: "check", title: "Cleaned & cut to size", description: "Curry cut, boneless or keema, ready to cook." },
    { icon: "box", title: "Hygienic packing", description: "Sealed, chilled packs from our kitchen to your door." },
    { icon: "clock", title: "On-time slots", description: "Three fixed delivery times, every day." },
  ],
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
        variant: "split",
        eyebrow: "Next delivery · Today, 1:00 PM",
        heading: "Fresh meat & hot food, one delivery",
        subheading: "Chicken, mutton and beef cut fresh, plus breakfast, meals and biryani from our kitchen. We deliver three times a day.",
        primaryCta: { label: "Shop Fresh Meat", href: "/shop" },
        secondaryCta: { label: "See Delivery Slots", href: "#slots" },
        buttonShape: "pill",
        image: photo("1607623814075-e51df1bdc82f", "Fresh cuts of meat on a wooden board", 1400),
        imagePosition: "right",
        imageStyle: "rounded",
      },
      { spacing: "relaxed" },
    ),
    slots,
    section(
      "services",
      {
        variant: "collection-cards",
        eyebrow: "Cut fresh every morning",
        heading: "Fresh meat",
        align: "center",
        items: [
          category("Chicken", "Curry cut, boneless, breast, drumsticks", photo("1587593810167-a84920ea0781", "Whole fresh chicken")),
          category("Mutton", "Curry cut and keema", photo("1602470520998-f4a52199a3d6", "Fresh mutton cuts")),
          category("Beef", "Curry cut and steaks", photo("1603048297172-c92544798d5a", "Fresh beef steaks")),
        ],
      },
      { anchor: "fresh-meat" },
    ),
    section(
      "services",
      {
        variant: "collection-cards",
        eyebrow: "Hot from the kitchen",
        heading: "Ready to eat",
        align: "center",
        items: [
          category("Breakfast", "Idli, vada and more · 8:00 AM", photo("1630383249896-424e482df921", "Idli and vada with sambar")),
          category("Meals", "Rice, dal, sambar, curd · 1:00 PM", photo("1546833999-b9f581a1996d", "Indian meals platter")),
          category("Biryani", "Chicken and mutton · 1 PM & 7 PM", photo("1631515243349-e0cb75fb8d3a", "Chicken biryani bowl")),
        ],
      },
      { background: "surface", anchor: "ready-to-eat" },
    ),
    section(
      "products",
      {
        design: "featured-grid",
        cardButton: "single",
        eyebrow: "Most ordered",
        title: "Popular picks",
        layout: "grid-4",
        limit: 8,
        badgeLabel: "FRESH",
        badgeCount: 2,
        viewAllLink: { label: "See all products", href: "/shop" },
        detailBase: "/product",
        emptyMessage: "Fresh stock is on its way.",
      },
      { anchor: "popular" },
    ),
    section(
      "cta",
      {
        variant: "split-banner",
        eyebrow: "Plan ahead",
        heading: "Order by 11 AM for the 1 PM delivery",
        text: "Add fresh meat and lunch to one cart and get it all in a single delivery.",
        button: { label: "Start Your Order", href: "/shop" },
        image: photo("1589302168068-964664d93dc0", "Mutton biryani with raita", 1200),
        panelColor: "#1F4D3A",
      },
      { spacing: "compact" },
    ),
    promises,
  ],
};

const shop: TemplatePage = {
  name: "Shop",
  slug: "/shop",
  pageType: "CUSTOM",
  showInNav: true,
  sections: [
    section(
      "products",
      {
        design: "showcase",
        eyebrow: "Shop",
        title: "Fresh meat & ready to eat",
        subtitle: "Search by name or filter by category.",
        layout: "grid-4",
        showSearch: true,
        showCategoryFilter: true,
        showSort: true,
        detailBase: "/product",
        emptyMessage: "Fresh stock is on its way.",
      },
      { background: "surface" },
    ),
    slots,
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
    promises,
  ],
};

const about: TemplatePage = {
  name: "About",
  slug: "/about",
  pageType: "ABOUT",
  showInNav: true,
  sections: [
    section(
      "split",
      {
        eyebrow: "About us",
        heading: "Your neighbourhood butcher and kitchen, in one app.",
        body:
          "We started with a simple idea: fresh meat and a good hot meal should come to your door together, at times you can plan around.\n\nEvery morning we clean and cut chicken, mutton and beef to order, while our kitchen cooks breakfast, meals and biryani. Three fixed delivery slots keep everything fresh and on time.",
        bullets: ["Cut fresh every morning", "Home-style kitchen food", "Deliveries at 8 AM, 1 PM and 7 PM"],
        image: photo("1585937421612-70a008356fbe", "Home-style curries from the kitchen", 1200),
        imagePosition: "right",
        imageStyle: "plain",
        cta: { label: "Start Shopping", href: "/shop" },
      },
      { spacing: "relaxed" },
    ),
    promises,
    slots,
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
      heading: "Questions about an order?",
      text: "Ask about a delivery, a bulk order or a special cut. We're happy to help.",
      showForm: true,
      formHeading: "Send a message",
      submitLabel: "Send Message",
      officeHours: "Every day, 7 AM – 8 PM",
      responseTime: "We reply within a few hours.",
      serviceOptions: ["Order help", "Bulk or party order", "Special cut request", "Feedback"],
    }),
  ],
};

function policy(name: string, slug: string, body: string): TemplatePage {
  return { name, slug, pageType: "CUSTOM", showInNav: false, sections: [section("text", { heading: name, body })] };
}

const policies: TemplatePage[] = [
  policy(
    "Delivery Policy",
    "/delivery-policy",
    "<strong>Slots:</strong> We deliver every day at 8:00 AM, 1:00 PM and 7:00 PM. Choose your slot at checkout.\n\n<strong>Cut-off:</strong> Order at least two hours before a slot to make it. Later orders move to the next slot.\n\n<strong>Area:</strong> We deliver within our service area. Enter your address at checkout to confirm.\n\n<strong>Freshness:</strong> Meat is packed chilled. Please refrigerate it as soon as it arrives.",
  ),
  policy(
    "Refund Policy",
    "/refund-policy",
    "Fresh food can't be returned, but if something isn't right we'll make it right.\n\n<strong>Report within 2 hours:</strong> If an item is missing, wrong or not fresh, message us with your order number and a photo within 2 hours of delivery.\n\n<strong>Resolution:</strong> We'll send a replacement in the next slot or refund the item.\n\n<strong>Refunds:</strong> Approved refunds go back to your original payment method within 5–7 working days.\n\n<strong>Cancellations:</strong> Cancel any time before your order is packed for a full refund.",
  ),
  policy(
    "Privacy Policy",
    "/privacy-policy",
    "<strong>What we collect:</strong> Your name, phone, email, address and order details. Payments are handled by our payment partner; we never store your card or UPI details.\n\n<strong>How we use it:</strong> To deliver your orders, send order updates and, only if you agree, share offers.\n\n<strong>Sharing:</strong> We share only what's needed with delivery and payment partners. We never sell your data.\n\n<strong>Your rights:</strong> Ask us to view, update or delete your data at any time.",
  ),
  policy(
    "Terms of Service",
    "/terms-of-service",
    "By using this website or placing an order, you agree to these terms.\n\n<strong>Products:</strong> Weights are before cleaning and may vary slightly. Photos are for reference.\n\n<strong>Prices:</strong> All prices are in Indian Rupees and may change without notice.\n\n<strong>Orders:</strong> Your order is confirmed once you receive a confirmation message. We may cancel an order if an item is out of stock, with a full refund.\n\n<strong>Governing law:</strong> These terms follow Indian law.",
  ),
];

/** Shopper login and account pages share the Pannjha setup, with grocery copy. */
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
    text: "Create an account to save your address, track orders and check out faster.",
    highlights: ["Track every delivery", "Save your address", "Faster checkout"],
    registerHeading: "Already have an account?",
    registerText: "Log in to see your orders, cart and saved address.",
  },
}));

const account = shopperPage("/account", (data) => ({
  ...data,
  subheading: "Your orders, cart and delivery details in one place.",
}));

/** Built-in "ARA Shops" fresh meat and ready-to-eat delivery template. */
export const ARA_SHOPS: WebsiteTemplateSeed = {
  key: "ara-shops",
  name: "E-commerce",
  category: "E-commerce",
  description:
    "Deep-green fresh meat and ready-to-eat delivery shop: delivery-slot hero, fresh meat and kitchen category cards, popular products, why-us and slot-based policies.",
  themeName: ARA_SHOPS_THEME.name,
  header,
  footer,
  pages: [home, shop, product, about, contact, login, account, ...policies],
};
