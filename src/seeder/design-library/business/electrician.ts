import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { ELECTRICIAN_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "split-stacked",
  siteName: NAME,
  logo: ELECTRICIAN_LOGO,
  logoDisplay: "logo_only",
  tagline: "Licensed master electricians",
  statusText: "Electricians available today across Chicagoland",
  statusColor: "green",
  utilityLinks: [
    { label: "Call (312) 555-0187", href: "tel:+13125550187" },
    { label: "Service areas", href: "/about" },
    { label: "Reviews", href: "/about" },
  ],
  menu: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Pricing", href: "/pricing" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Book online", href: "/contact" },
  secondaryCta: { label: "Emergency", href: "tel:+13125550187" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "mega",
  siteName: NAME,
  logo: ELECTRICIAN_LOGO,
  tagline: "Power done properly",
  description: "Residential and light-commercial electrical work across Chicagoland since 2009. Licensed, bonded and insured.",
  columns: [
    {
      title: "Services",
      links: [
        { label: "Panel upgrades", href: "/services" },
        { label: "EV chargers", href: "/services" },
        { label: "Smart lighting", href: "/services" },
        { label: "Rewiring", href: "/services" },
        { label: "Solar & batteries", href: "/services" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About us", href: "/about" },
        { label: "Pricing", href: "/pricing" },
        { label: "Careers", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Help",
      links: [
        { label: "Book a visit", href: "/contact" },
        { label: "Emergency call-out", href: "tel:+13125550187" },
        { label: "Warranty", href: "/pricing" },
      ],
    },
  ],
  contact: {
    email: "hello@northwindelectric.com",
    phone: "(312) 555-0187",
    address: "2140 W Fulton St, Chicago, IL",
    hours: "Mon–Sat 7am–7pm · 24/7 emergencies",
  },
  social: [
    { label: "Facebook", href: "https://www.facebook.com" },
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com" },
  ],
  paymentMethods: { enabled: true, methods: ["visa", "mastercard", "amex", "paypal"] },
  legalLinks: [
    { label: "Privacy", href: "/about" },
    { label: "Terms", href: "/services" },
  ],
  copyright: `© 2026 ${NAME} LLC · IL License #EC-48213`,
};

const credentials = section(
  "marquee",
  {
    variant: "pill-badges",
    eyebrow: "Licensed, certified and insured",
    items: [
      { text: "IL Master Electrician", icon: "shield" },
      { text: "Tesla Certified Installer", icon: "bolt" },
      { text: "ChargePoint Partner", icon: "bolt" },
      { text: "BBB A+ Rated", icon: "star" },
      { text: "$2M Liability Cover", icon: "lock" },
      { text: "Lutron Smart Lighting Pro", icon: "sparkles" },
    ],
    speed: "slow",
    gradientFades: true,
    pauseOnHover: true,
  },
  { spacing: "compact" },
);

const coreServices = section("services", {
  variant: "cards-grid",
  eyebrow: "What we do",
  heading: "Every job, done to code and on time",
  intro: "Fixed upfront prices, tidy work and a 5-year workmanship warranty on everything we install.",
  columns: 3,
  mobileColumns: 1,
  iconStyle: "colored-circle",
  cardStyle: "elevated",
  showPrices: true,
  items: [
    { icon: "bolt", iconColor: "blue", title: "Panel upgrades", description: "100A to 200A upgrades, permits and inspection handled for you.", price: "$2,450+", link: { label: "Details", href: "/services" } },
    { icon: "rocket", iconColor: "green", title: "EV charger install", description: "Level 2 chargers for Tesla, Rivian and every major brand.", price: "$890+", badge: "Popular", link: { label: "Details", href: "/services" } },
    { icon: "sparkles", iconColor: "yellow", title: "Smart lighting", description: "Recessed, landscape and app-controlled lighting design.", price: "$180+", link: { label: "Details", href: "/services" } },
    { icon: "tools", iconColor: "orange", title: "Troubleshooting", description: "Tripping breakers, dead outlets and flickering lights fixed fast.", price: "$129", link: { label: "Details", href: "/services" } },
    { icon: "shield", iconColor: "purple", title: "Safety inspections", description: "Full home inspections for buyers, sellers and landlords.", price: "$249", link: { label: "Details", href: "/services" } },
    { icon: "cloud", iconColor: "cyan", title: "Solar & batteries", description: "Battery backup and solar tie-ins that keep the lights on.", price: "Quote", link: { label: "Details", href: "/services" } },
  ],
});

const whyUs = section(
  "features",
  {
    variant: "split",
    eyebrow: "Why {{businessName}}",
    heading: "The electrician you only need to call once",
    intro: "Every visit is led by a licensed electrician — never an unsupervised apprentice.",
    columns: 2,
    mobileColumns: 1,
    splitPosition: "left",
    splitImage: photo("1513694203232-719a280e022f", "Bright living room with newly installed lighting", 1200),
    splitCta: { label: "Meet the team", href: "/about" },
    items: [
      { icon: "clock", title: "On-time arrival", description: "Two-hour windows and a text when we're on the way." },
      { icon: "wallet", title: "Upfront pricing", description: "You approve the price before any work starts." },
      { icon: "shield", title: "5-year warranty", description: "Workmanship guaranteed in writing." },
      { icon: "check", title: "Clean-up included", description: "Drop cloths, shoe covers and zero mess left behind." },
    ],
  },
  { background: "surface" },
);

const stats = section("stats", {
  heading: "Trusted across Chicagoland",
  items: [
    { value: "17 yrs", label: "Serving Chicago homes" },
    { value: "12,400+", label: "Jobs completed" },
    { value: "4.9★", label: "From 1,800+ reviews" },
    { value: "59 min", label: "Average emergency response" },
  ],
});

const process = section(
  "features",
  {
    variant: "pastel-icons",
    eyebrow: "How it works",
    heading: "Booked in 60 seconds, fixed the same day",
    columns: 4,
    mobileColumns: 1,
    iconStyle: "pastel-circle",
    items: [
      { icon: "pointer", iconColor: "blue", title: "1. Book online", description: "Pick a time that suits you — evenings and Saturdays included." },
      { icon: "chat", iconColor: "green", title: "2. Get a fixed price", description: "We diagnose on arrival and quote before we start." },
      { icon: "tools", iconColor: "orange", title: "3. We do the work", description: "Licensed, tidy and finished to code." },
      { icon: "check", iconColor: "purple", title: "4. Inspect & warranty", description: "Permit sign-off and your 5-year warranty by email." },
    ],
  },
  { background: "surface" },
);

const reviews = section("testimonials", {
  heading: "What homeowners say",
  items: [
    { quote: "They upgraded our panel and installed the EV charger in one day. Permit, inspection, done. Spotless work.", name: "Megan Torres", role: "Homeowner, Logan Square" },
    { quote: "Called at 9pm with no power. An electrician was here in 45 minutes and fixed it for exactly the quoted price.", name: "David Kim", role: "Homeowner, Evanston" },
    { quote: "We use {{businessName}} for all 40 of our rental units. Reliable, fast and the reports are excellent.", name: "Priya Raman", role: "Property Manager, Lakeview Rentals" },
  ],
});

const faq = section("faq", {
  variant: "split-sidebar",
  eyebrow: "FAQ",
  heading: "Questions before you book",
  intro: "Straight answers from our licensed team.",
  supportCta: {
    title: "Still not sure?",
    description: "Call and talk to an electrician — not a call center.",
    link: { label: "Call (312) 555-0187", href: "tel:+13125550187" },
  },
  items: [
    { question: "Do you charge for quotes?", answer: "On-site diagnosis is $129 and is waived if you go ahead with the repair." },
    { question: "Are you licensed and insured?", answer: "Yes. We are licensed master electricians in Illinois with $2M liability insurance." },
    { question: "Do you pull permits?", answer: "Always, when required. We book the city inspection and attend it for you." },
    { question: "Do you offer financing?", answer: "Yes — 0% financing for 12 months on panel upgrades and EV chargers over $1,000." },
  ],
});

const bookCta = section(
  "cta",
  {
    variant: "floating-card",
    eyebrow: "Same-day appointments available",
    heading: "Power problems? We'll be there today",
    text: "Book online in 60 seconds or call for 24/7 emergency service. Fixed prices, no surprises.",
    button: { label: "Book online", href: "/contact" },
    secondaryButton: { label: "Call (312) 555-0187", href: "tel:+13125550187" },
    trustBadges: ["Licensed & insured", "5-year warranty", "No call-out fee on repairs"],
    cardStyle: "elevated",
  },
  { background: "surface" },
);

export const ELECTRICIAN: BusinessTemplate = businessTemplate({
  key: "electrician-classic",
  name: "Electrician · Classic",
  category: "Services",
  description: "A licensed electrician site with upfront pricing, EV and panel services, care plans and online booking.",
  themeName: "Northwind Volt",
  theme: {
    colors: {
      primary: "#2F6BFF",
      secondary: "#FACC15",
      background: "#FFFFFF",
      surface: "#F2F5FF",
      text: "#0F172A",
      muted: "#556178",
    },
    fonts: { heading: "plus-jakarta-sans", body: "plus-jakarta-sans" },
    buttonStyle: "filled",
    cardStyle: "shadow",
    radius: "md",
    containerWidth: 1240,
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
            variant: "split",
            eyebrow: "Chicago's 5-star electricians",
            heading: "Safe, smart electrical work — done today",
            highlightText: "done today",
            subheading:
              "Panel upgrades, EV chargers and smart lighting from licensed master electricians. Upfront prices and a 5-year warranty on every job.",
            primaryCta: { label: "Book online", href: "/contact" },
            secondaryCta: { label: "See prices", href: "/pricing" },
            image: photo("1621905251189-08b45d6a269e", "{{businessName}} electrician working on a breaker panel", 1400),
            imageStyle: "rounded",
            rating: { stars: 5, text: "4.9 from 1,800+ Google reviews", avatarCount: 5 },
          },
          { customColors: { gradientFrom: "#2F6BFF", gradientTo: "#7C9CFF" } },
        ),
        credentials,
        coreServices,
        whyUs,
        stats,
        process,
        reviews,
        faq,
        bookCta,
      ],
    },
    {
      name: "Services",
      slug: "/services",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Services",
          heading: "Everything electrical, under one roof",
          subheading: "From a single outlet to a whole-home rewire — one licensed team, one fixed price.",
          primaryCta: { label: "Book online", href: "/contact" },
          secondaryCta: { label: "See pricing", href: "/pricing" },
        }),
        section(
          "services",
          {
            variant: "split-showcase",
            eyebrow: "Featured",
            heading: "Home EV charging, done right",
            intro: "We assess your panel, pull the permit and install a Level 2 charger — usually in a single visit.",
            columns: 2,
            mobileColumns: 1,
            splitPosition: "right",
            splitImage: photo("1593941707882-a5bba14938c7", "EV charging cable plugged into a car", 1200),
            splitTagline: "Tesla certified installer",
            splitCta: { label: "Get an EV quote", href: "/contact" },
            showBullets: true,
            items: [
              { icon: "bolt", title: "Panel check included", description: "We confirm capacity before quoting.", features: ["Load calculation", "Breaker sizing"] },
              { icon: "shield", title: "Permit & inspection", description: "Handled end to end by our office.", features: ["City permit", "Inspection attended"] },
              { icon: "wallet", title: "Rebates applied", description: "We help you claim utility rebates up to $500.", features: ["ComEd rebate", "Federal credit"] },
              { icon: "clock", title: "Installed in a day", description: "Most installs take 3–5 hours.", features: ["Same-week dates", "Clean finish"] },
            ],
          },
          { background: "surface" },
        ),
        section("services", {
          variant: "horizontal-cards",
          heading: "More services",
          columns: 2,
          mobileColumns: 1,
          showImages: true,
          items: [
            { title: "Panel upgrades & rewiring", description: "Replace aging panels and unsafe wiring with modern, code-compliant systems.", image: photo("1544724569-5f546fd6f2b5", "Modern breaker panel", 900) },
            { title: "Smart homes & lighting", description: "Smart switches, locks and scene lighting controlled from your phone.", image: photo("1558002038-1055907df827", "Smart lock controlled from a phone", 900) },
            { title: "Solar & battery backup", description: "Tie in solar arrays and whole-home batteries for outage protection.", image: photo("1509391366360-2e959784a276", "Solar panels on a sunny day", 900) },
            { title: "Inspections & troubleshooting", description: "Find faults fast with thermal imaging and full safety reports.", image: photo("1558618666-fcd25c85cd64", "Electrician testing wiring", 900) },
          ],
        }),
        process,
        bookCta,
      ],
    },
    {
      name: "Pricing",
      slug: "/pricing",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Pricing",
          heading: "Honest, upfront prices",
          subheading: "These are real starting prices. You'll always approve a fixed quote before work begins.",
        }),
        section(
          "pricing",
          {
            variant: "horizontal-rows",
            heading: "Popular jobs",
            intro: "Prices include labor, standard materials, permits and clean-up.",
            footerNote: "0% financing available for 12 months on jobs over $1,000.",
            plans: [
              { name: "Diagnostic visit", price: "$129", description: "Waived if you go ahead with the repair.", features: ["Licensed electrician", "Written report"], cta: { label: "Book", href: "/contact" }, featured: false },
              { name: "EV charger install", price: "$890", period: "from", badge: "Most booked", description: "Level 2 charger up to 30 ft from panel.", features: ["Permit & inspection", "Rebate paperwork"], cta: { label: "Book", href: "/contact" }, featured: true },
              { name: "200A panel upgrade", price: "$2,450", period: "from", description: "Full panel replacement with new breakers.", features: ["Utility coordination", "Same-day power back"], cta: { label: "Book", href: "/contact" }, featured: false },
              { name: "Home safety inspection", price: "$249", description: "Room-by-room inspection with thermal imaging.", features: ["PDF report", "Priority fixes list"], cta: { label: "Book", href: "/contact" }, featured: false },
            ],
          },
          { background: "surface" },
        ),
        section("pricing", {
          variant: "cards-grid",
          eyebrow: "Membership",
          heading: "{{businessName}} Care Plan",
          intro: "Annual check-ups and priority service for peace of mind.",
          billingCycleLabel: "Billed yearly",
          columns: 3,
          mobileColumns: 1,
          plans: [
            { name: "Essential", price: "$99", period: "/year", description: "For apartments and condos.", features: ["Annual safety check", "10% off repairs", "Priority booking"], cta: { label: "Join Essential", href: "/contact" }, featured: false },
            { name: "Home", price: "$179", period: "/year", badge: "Best value", description: "For family homes.", features: ["Annual safety check", "15% off repairs", "No call-out fees", "Same-day priority"], cta: { label: "Join Home", href: "/contact" }, featured: true, highlightNote: "Members save $320/year on average" },
            { name: "Landlord", price: "$399", period: "/year", description: "Up to 5 rental units.", features: ["Annual inspections", "Compliance certificates", "Tenant call handling"], cta: { label: "Join Landlord", href: "/contact" }, featured: false },
          ],
        }),
        faq,
        bookCta,
      ],
    },
    {
      name: "About",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "About {{businessName}}",
          heading: "A family business with 40 licensed electricians",
          subheading: "Founded in 2009 by master electrician Tom Walsh with one van and a simple rule: do it right the first time.",
          image: photo("1621905252507-b35492cc74b4", "{{businessName}} electrician on site", 1400),
          imageStyle: "rounded",
          primaryCta: { label: "Work with us", href: "/contact" },
        }),
        stats,
        section(
          "team",
          {
            variant: "spotlight-featured",
            eyebrow: "Leadership",
            heading: "The people behind every job",
            columns: 3,
            mobileColumns: 1,
            members: [
              { name: "Tom Walsh", role: "Founder & Master Electrician", bio: "30 years in the trade and still on the tools every Friday.", photo: photo("1621905252472-943afaa20e20", "Tom Walsh", 600) },
              { name: "Aisha Brooks", role: "Operations Director", bio: "Keeps 40 electricians on time, every time.", photo: photo("1573496359142-b8d87734a5a2", "Aisha Brooks", 600) },
              { name: "Marco Ruiz", role: "EV & Solar Lead", bio: "Tesla and ChargePoint certified installer.", photo: photo("1507003211169-0a1dd7228f2d", "Marco Ruiz", 600) },
            ],
          },
          { background: "surface" },
        ),
        reviews,
        bookCta,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "split-form",
          eyebrow: "Book an electrician",
          heading: "Tell us what's going on",
          text: "Book a visit in under a minute. For no power, burning smells or sparking, call us now.",
          email: "hello@northwindelectric.com",
          phone: "(312) 555-0187",
          address: "2140 W Fulton St, Chicago, IL",
          officeHours: "Mon–Sat 7am–7pm · 24/7 emergencies",
          responseTime: "Same-day slots available",
          showForm: true,
          formHeading: "Request a visit",
          serviceOptions: ["Troubleshooting", "EV charger", "Panel upgrade", "Lighting", "Inspection", "Other"],
          submitLabel: "Request my visit",
          cardStyle: "elevated",
        }),
        faq,
      ],
    },
  ],
});
