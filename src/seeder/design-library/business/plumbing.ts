import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { PLUMBING_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "headline-ticker",
  siteName: NAME,
  logo: PLUMBING_LOGO,
  logoDisplay: "logo_only",
  announcement: "Plumbers available today in Austin • No call-out fee on repairs • 12-month guarantee on every job",
  announcementLink: { label: "Book now", href: "/contact" },
  menu: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Care Club", href: "/care-club" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Book a plumber", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  logo: PLUMBING_LOGO,
  tagline: "Plumbing with a smile",
  description: "Friendly, licensed plumbers serving Austin and Round Rock. Upfront prices, tidy work and a 12-month guarantee.",
  columns: [
    {
      title: "Services",
      links: [
        { label: "Leak repairs", href: "/services" },
        { label: "Drain cleaning", href: "/services" },
        { label: "Water heaters", href: "/services" },
        { label: "Bathroom upgrades", href: "/services" },
      ],
    },
    {
      title: "{{businessName}}",
      links: [
        { label: "Care Club", href: "/care-club" },
        { label: "About us", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ],
  contact: {
    email: "hello@brightsideplumbing.com",
    phone: "(512) 555-0163",
    address: "905 E 6th St, Austin, TX",
    hours: "7 days · 7am–9pm",
  },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "Facebook", href: "https://www.facebook.com" },
    { label: "TikTok", href: "https://www.tiktok.com" },
  ],
  paymentMethods: { enabled: true, methods: ["visa", "mastercard", "amex", "discover"] },
  copyright: `© 2026 ${NAME} · TX License M-40917`,
};

const liveJobs = section(
  "marquee",
  {
    variant: "cards-stream",
    eyebrow: "Happening right now",
    items: [
      { text: "Burst pipe fixed", subtext: "Mueller · 42 min ago", icon: "check" },
      { text: "Water heater installed", subtext: "Round Rock · 1 hr ago", icon: "bolt" },
      { text: "Kitchen drain cleared", subtext: "East Austin · 2 hrs ago", icon: "check" },
      { text: "New shower fitted", subtext: "Zilker · today", icon: "sparkles" },
      { text: "Leak found & sealed", subtext: "Hyde Park · today", icon: "shield" },
      { text: "Toilet replaced", subtext: "Cedar Park · today", icon: "check" },
    ],
    speed: "slow",
    gradientFades: true,
    pauseOnHover: true,
  },
  { background: "surface", spacing: "compact" },
);

const services = section("services", {
  variant: "bento-grid",
  eyebrow: "How we help",
  heading: "From drips to full bathroom makeovers",
  intro: "Every job comes with a fixed price before we start and a 12-month guarantee after we finish.",
  columns: 3,
  mobileColumns: 1,
  showImages: true,
  items: [
    {
      title: "Emergency repairs",
      description: "Burst pipes, leaks and no hot water — a plumber at your door in about an hour, 7 days a week.",
      badge: "Same day",
      badgeColor: "green",
      image: photo("1676210134188-4c05dd172f89", "Plumber fixing pipes under a sink", 1000),
      featured: true,
      link: { label: "Book a repair", href: "/contact" },
    },
    {
      title: "Drains & sewer",
      description: "Camera inspections and hydro-jetting for stubborn blockages.",
      image: photo("1607472586893-edb57bdc0e39", "Copper pipes on a brick wall", 1000),
      link: { label: "Learn more", href: "/services" },
    },
    {
      title: "Water heaters",
      description: "Tank and tankless installs, usually same or next day.",
      image: photo("1606676539940-12768ce0e762", "Plumbing tools ready for a job", 1000),
      link: { label: "Learn more", href: "/services" },
    },
    {
      title: "Bathrooms & kitchens",
      description: "Taps, showers, sinks and full fixture upgrades.",
      image: photo("1552321554-5fefe8c9ef14", "Bright modern bathroom", 1000),
      link: { label: "Learn more", href: "/services" },
    },
  ],
});

const promise = section(
  "features",
  {
    variant: "pastel-icons",
    eyebrow: "The {{businessName}} promise",
    heading: "Plumbing, minus the stress",
    columns: 4,
    mobileColumns: 1,
    iconStyle: "pastel-circle",
    items: [
      { icon: "clock", iconColor: "green", title: "On time, or $50 off", description: "We text when we're on the way. Late? You save." },
      { icon: "wallet", iconColor: "blue", title: "Fixed upfront prices", description: "Approve the price before we pick up a wrench." },
      { icon: "shield", iconColor: "purple", title: "12-month guarantee", description: "Parts and labor covered for a full year." },
      { icon: "heart", iconColor: "pink", title: "Spotless finish", description: "Shoe covers, floor mats and a tidy-up every time." },
    ],
  },
  { background: "default" },
);

const reviews = section(
  "testimonials",
  {
    heading: "Austin loves {{businessName}}",
    items: [
      { quote: "Water was pouring through our ceiling on a Sunday. Jess was here in 50 minutes and fixed it for exactly the quoted price.", name: "Hannah Lee", role: "Mueller" },
      { quote: "They swapped our old tank for a tankless heater in one morning. Endless hot water and a lower gas bill.", name: "Carlos Mendes", role: "Round Rock" },
      { quote: "Friendly, punctual and they actually explained what was wrong. Our go-to plumbers now.", name: "Grace Whitfield", role: "Hyde Park" },
    ],
  },
  { background: "surface" },
);

const carePlans = section("pricing", {
  variant: "cards-grid",
  eyebrow: "{{businessName}} Care Club",
  heading: "Never pay a call-out fee again",
  intro: "Annual check-ups, priority booking and member discounts. Cancel any time.",
  billingCycleLabel: "Billed monthly",
  columns: 3,
  mobileColumns: 1,
  cardStyle: "elevated",
  plans: [
    { name: "Basic", price: "$9", period: "/month", description: "For apartments.", features: ["Yearly plumbing check", "10% off repairs", "Priority booking"], cta: { label: "Join Basic", href: "/contact" }, featured: false },
    { name: "Home", price: "$19", period: "/month", badge: "Most popular", description: "For family homes.", features: ["Yearly check + water heater flush", "15% off repairs", "No call-out fees", "Same-day priority"], cta: { label: "Join Home", href: "/contact" }, featured: true, highlightNote: "Members save $280/year on average" },
    { name: "Home+", price: "$29", period: "/month", description: "For larger and older homes.", features: ["Twice-yearly checks", "20% off repairs", "Free drain cleaning", "Leak sensor kit included"], cta: { label: "Join Home+", href: "/contact" }, featured: false },
  ],
});

const faq = section(
  "faq",
  {
    variant: "accordion-classic",
    heading: "Good questions",
    cardStyle: "elevated",
    supportCta: {
      title: "Have a leak right now?",
      description: "Turn off the stop valve and call us — we'll talk you through it.",
      link: { label: "Call (512) 555-0163", href: "tel:+15125550163" },
    },
    items: [
      { question: "How fast can you get here?", answer: "Our average arrival time is 58 minutes for emergencies and same-day for most repairs." },
      { question: "Do you charge a call-out fee?", answer: "There's a $79 diagnostic fee, waived if you go ahead with the repair." },
      { question: "Are your plumbers licensed?", answer: "Yes. Every {{businessName}} plumber is Texas-licensed, background-checked and insured." },
      { question: "Do you work weekends?", answer: "Yes — 7 days a week, 7am to 9pm, at the same prices." },
    ],
  },
  { background: "default" },
);

const bookCta = section(
  "cta",
  {
    variant: "centered-card",
    eyebrow: "Plumbers available today",
    heading: "Book a plumber in 60 seconds",
    text: "Choose a time that suits you. We'll text when we're on the way and quote before we start.",
    button: { label: "Book a plumber", href: "/contact" },
    secondaryButton: { label: "Call (512) 555-0163", href: "tel:+15125550163" },
    trustBadges: ["No call-out fee on repairs", "12-month guarantee", "5,000+ 5-star reviews"],
    cardStyle: "elevated",
  },
  { background: "surface" },
);

export const PLUMBING: BusinessTemplate = businessTemplate({
  key: "plumbing-fresh",
  name: "Plumbing · Fresh",
  category: "Services",
  description: "A friendly plumbing company site with same-day booking, fixed prices, a membership club and FAQs.",
  themeName: "Brightside Fresh",
  theme: {
    colors: {
      primary: "#0E8A7A",
      secondary: "#FF8A5B",
      background: "#FFFFFF",
      surface: "#E9F6F3",
      text: "#0B2D3A",
      muted: "#4E6B75",
    },
    fonts: { heading: "figtree", body: "figtree" },
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
            eyebrow: "Licensed & insured · Austin, TX",
            heading: "Same-day plumbing, with a smile",
            highlightText: "with a smile",
            subheading:
              "Leaks, drains and water heaters fixed fast by friendly local plumbers. Upfront prices and a 12-month guarantee.",
            primaryCta: { label: "Book a plumber", href: "/contact" },
            secondaryCta: { label: "See services", href: "/services" },
            image: photo("1676210134188-4c05dd172f89", "{{businessName}} plumber fixing pipes under a sink", 1600),
            floatingCards: [
              { title: "58 min", subtitle: "Average arrival", icon: "clock" },
              { title: "4.9 ★", subtitle: "5,000+ reviews", icon: "star" },
              { title: "12-month", subtitle: "Guarantee", icon: "shield" },
            ],
          },
          { customColors: { gradientFrom: "#0E8A7A", gradientTo: "#3CC6A8" } },
        ),
        liveJobs,
        services,
        promise,
        section(
          "split",
          {
            eyebrow: "Meet your plumber",
            heading: "Real people, not a call center",
            body: "Every visit is handled by a {{businessName}} plumber who lives in Austin, wears a uniform and shows up in a marked van.\n\nYou'll get their name and photo by text before they arrive.",
            bullets: ["Background-checked and Texas-licensed", "Fully stocked vans — most jobs done in one visit", "Clear explanations, no jargon"],
            image: photo("1649769069590-268b0b994462", "Smiling {{businessName}} technician in uniform", 1200),
            imagePosition: "left",
            cta: { label: "Book a visit", href: "/contact" },
          },
          { background: "surface" },
        ),
        reviews,
        carePlans,
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
          heading: "Whatever the drip, we've got it",
          subheading: "Repairs, installs and upgrades for homes across Austin — all with fixed upfront prices.",
          primaryCta: { label: "Book a plumber", href: "/contact" },
        }),
        section(
          "services",
          {
            variant: "cards-grid",
            heading: "Popular services",
            columns: 3,
            mobileColumns: 1,
            iconStyle: "pastel-circle",
            cardStyle: "elevated",
            showPrices: true,
            items: [
              { icon: "tools", iconColor: "green", title: "Leak detection & repair", description: "Acoustic leak detection with no unnecessary wall damage.", price: "From $149" },
              { icon: "layers", iconColor: "blue", title: "Drain cleaning", description: "Kitchen, bath and main-line drains cleared fast.", price: "From $129" },
              { icon: "bolt", iconColor: "orange", title: "Water heaters", description: "Tank and tankless repair or replacement.", price: "From $1,450" },
              { icon: "sparkles", iconColor: "purple", title: "Fixture upgrades", description: "Taps, toilets, showers and garbage disposals.", price: "From $189" },
              { icon: "shield", iconColor: "cyan", title: "Water filtration", description: "Whole-home softeners and drinking water filters.", price: "From $890" },
              { icon: "gear", iconColor: "pink", title: "Sewer camera inspection", description: "See exactly what's in your pipes, on video.", price: "$199" },
            ],
          },
          { background: "surface" },
        ),
        section("split", {
          eyebrow: "Bathroom upgrades",
          heading: "Your dream bathroom, plumbed perfectly",
          body: "From a new rainfall shower to a full fixture refresh, we work with your designer or recommend trusted local tilers.",
          bullets: ["Free design consultation", "Premium fixtures from Kohler and Grohe", "Most upgrades done in 1–2 days"],
          image: photo("1620626011761-996317b8d101", "Modern bathroom with freestanding tub", 1200),
          imagePosition: "right",
          cta: { label: "Plan my bathroom", href: "/contact" },
        }),
        promise,
        bookCta,
      ],
    },
    {
      name: "Care Club",
      slug: "/care-club",
      sections: [
        section("hero", {
          variant: "soft-card",
          eyebrow: "{{businessName}} Care Club",
          heading: "Plumbing peace of mind for $9 a month",
          subheading: "Annual check-ups catch small problems before they become big, expensive ones.",
          primaryCta: { label: "Join the club", href: "/contact" },
          image: photo("1584622650111-993a426fbf0a", "Clean modern bathroom", 1400),
        }),
        carePlans,
        section(
          "stats",
          {
            heading: "Members, by the numbers",
            items: [
              { value: "3,100+", label: "Care Club members" },
              { value: "$280", label: "Average yearly saving" },
              { value: "0", label: "Call-out fees paid" },
              { value: "97%", label: "Renew every year" },
            ],
          },
          { background: "surface" },
        ),
        faq,
      ],
    },
    {
      name: "About",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "About us",
          heading: "Started by two plumbers who hated waiting",
          subheading: "Jess and Sam founded {{businessName}} in 2016 to build the plumbing company they wanted to call: punctual, upfront and kind.",
          image: photo("1649769069590-268b0b994462", "{{businessName}} plumber smiling", 1400),
          imageStyle: "rounded",
          primaryCta: { label: "Book a plumber", href: "/contact" },
        }),
        section(
          "team",
          {
            variant: "grid-cards",
            heading: "Say hello to the team",
            columns: 4,
            mobileColumns: 1,
            members: [
              { name: "Jess Carter", role: "Co-founder & Master Plumber", photo: photo("1534528741775-53994a69daeb", "Jess Carter", 600) },
              { name: "Sam Okafor", role: "Co-founder & Operations", photo: photo("1539571696357-5a69c17a67c6", "Sam Okafor", 600) },
              { name: "Lena Cho", role: "Customer Happiness Lead", photo: photo("1517841905240-472988babdf9", "Lena Cho", 600) },
              { name: "Diego Vargas", role: "Senior Plumber", photo: photo("1506794778202-cad84cf45f1d", "Diego Vargas", 600) },
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
          variant: "cards-hub",
          eyebrow: "Contact",
          heading: "How can we help today?",
          text: "Book online, call or text. For active leaks, shut off your main valve and call us right away.",
          email: "hello@brightsideplumbing.com",
          phone: "(512) 555-0163",
          address: "905 E 6th St, Austin, TX",
          officeHours: "7 days · 7am–9pm",
          responseTime: "Average arrival 58 minutes",
          showForm: true,
          formHeading: "Book a plumber",
          serviceOptions: ["Leak or burst pipe", "Blocked drain", "Water heater", "Fixture install", "Care Club", "Other"],
          submitLabel: "Book my plumber",
          cardStyle: "elevated",
        }),
        faq,
      ],
    },
  ],
});
