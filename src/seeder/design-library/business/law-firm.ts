import type { FooterData, HeaderData, ImageRef, SectionDataMap } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";

const NAME = "{{businessName}}";

export const MERIDIAN_LOGO: ImageRef = {
  url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 40" width="210" height="40" fill="none">` +
      `<defs>` +
      `<linearGradient id="ml-grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0%" stop-color="#A63D10"/>` +
      `<stop offset="100%" stop-color="#802804"/>` +
      `</linearGradient>` +
      `</defs>` +
      `<rect x="2" y="2" width="36" height="36" rx="7" fill="url(#ml-grad)"/>` +
      `<path d="M20 9V29" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M11 14H29" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M11 14L8 20H14L11 14Z" stroke="#FFFFFF" stroke-width="1.5" fill="none" stroke-linejoin="round"/>` +
      `<path d="M29 14L26 20H32L29 14Z" stroke="#FFFFFF" stroke-width="1.5" fill="none" stroke-linejoin="round"/>` +
      `<path d="M16 29H24" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>` +
      `<circle cx="20" cy="9" r="2" fill="#FDE68A"/>` +
      `<text x="46" y="21" font-family="'Libre Baskerville', Georgia, serif" font-size="15.5" font-weight="700" fill="#2B2118" letter-spacing="-0.2">MERIDIAN</text>` +
      `<text x="47" y="32" font-family="'Manrope', -apple-system, BlinkMacSystemFont, sans-serif" font-size="8.5" font-weight="700" fill="#A63D10" letter-spacing="2.8">LEGAL</text>` +
      `</svg>`,
  )}`,
  alt: "Meridian Legal Logo",
};

const header: HeaderData = {
  design: "classical",
  siteName: NAME,
  logo: MERIDIAN_LOGO,
  logoDisplay: "logo_only",
  tagline: "Solicitors since 1998",
  menu: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    {
      label: "Services",
      href: "/services",
      children: [
        { label: "Business law", href: "/services", description: "Contracts, disputes and company setup" },
        { label: "Family law", href: "/services", description: "Separation, custody and wills" },
        { label: "Property", href: "/services", description: "Leases, purchases and landlord issues" },
      ],
    },
    { label: "Team", href: "/team" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Request a consultation", href: "/contact" },
  utilityLinks: [
    { label: "+1 (555) 600-4410", href: "tel:+15556004410" },
    { label: "info@meridianlegal.com", href: "mailto:info@meridianlegal.com" },
  ],
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "mega",
  siteName: NAME,
  logo: MERIDIAN_LOGO,
  logoDisplay: "logo_only",
  description: "Practical legal advice for families and growing companies. Fixed fees where we can.",
  columns: [
    {
      title: "Practice areas",
      links: [
        { label: "Business law", href: "/services" },
        { label: "Family law", href: "/services" },
        { label: "Property", href: "/services" },
        { label: "Wills and estates", href: "/services" },
      ],
    },
    {
      title: "Firm",
      links: [
        { label: "Home", href: "/" },
        { label: "About", href: "/about" },
        { label: "Our team", href: "/team" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ],
  menu: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Team", href: "/team" },
    { label: "Contact", href: "/contact" },
  ],
  contact: {
    email: "info@meridianlegal.com",
    phone: "+1 (555) 600-4410",
    address: "200 Court Square, 5th Floor, Boston, MA",
    hours: "Mon–Fri, 9am–6pm",
  },
  social: [{ label: "LinkedIn", href: "https://www.linkedin.com" }],
  legalLinks: [
    { label: "Privacy Policy", href: "/contact" },
    { label: "Terms of Engagement", href: "/contact" },
    { label: "Attorney Advertising", href: "/contact" },
  ],
  copyright: `© 2026 ${NAME} LLP. Attorney advertising. Prior results do not guarantee a similar outcome.`,
};

const attorneys: SectionDataMap["team"]["members"] = [
  {
    name: "Eleanor Grant",
    role: "Managing Partner",
    department: "Business law",
    bio: "Advises founders and boards on contracts, investment and disputes.",
    photo: photo("1573496359142-b8d87734a5a2", "Eleanor Grant", 600),
    tags: ["Corporate", "Litigation"],
    socialLinks: [{ platform: "linkedin", url: "https://www.linkedin.com" }],
  },
  {
    name: "James Whitfield",
    role: "Partner",
    department: "Family law",
    bio: "Calm, practical guidance through separation and custody.",
    photo: photo("1519085360753-af0119f7cbe7", "James Whitfield", 600),
    tags: ["Divorce", "Mediation"],
    socialLinks: [{ platform: "linkedin", url: "https://www.linkedin.com" }],
  },
  {
    name: "Sofia Alvarez",
    role: "Senior Associate",
    department: "Property",
    bio: "Handles commercial leases and residential purchases.",
    photo: photo("1438761681033-6461ffad8d80", "Sofia Alvarez", 600),
    tags: ["Real estate", "Leasing"],
    socialLinks: [{ platform: "email", url: "mailto:info@meridianlegal.com" }],
  },
  {
    name: "Robert Chen",
    role: "Associate",
    department: "Wills and estates",
    bio: "Helps families plan ahead with wills, trusts and probate.",
    photo: photo("1507003211169-0a1dd7228f2d", "Robert Chen", 600),
    tags: ["Estates", "Trusts"],
    socialLinks: [{ platform: "email", url: "mailto:info@meridianlegal.com" }],
  },
];

const practiceAreas = section("services", {
  variant: "cards-grid",
  eyebrow: "Practice areas",
  heading: "How we can help",
  intro: "Experienced lawyers in the areas families and businesses need most.",
  columns: 3,
  mobileColumns: 1,
  iconStyle: "square-badge",
  showPrices: true,
  items: [
    {
      icon: "layers",
      title: "Business law",
      description: "Contracts, shareholder agreements, disputes and company formation.",
      price: "From $450",
      link: { label: "Learn more", href: "/services" },
    },
    {
      icon: "heart",
      title: "Family law",
      description: "Separation, custody arrangements, prenuptial agreements and mediation.",
      price: "From $350",
      link: { label: "Learn more", href: "/services" },
    },
    {
      icon: "box",
      title: "Property",
      description: "Commercial leases, residential purchases and landlord–tenant issues.",
      price: "Fixed fee",
      link: { label: "Learn more", href: "/services" },
    },
  ],
});

const consultationCta = section(
  "cta",
  {
    variant: "split-visual",
    eyebrow: "No-obligation advice",
    heading: "Your first consultation is free",
    text: "Speak with a lawyer for 30 minutes about your situation. We will tell you honestly whether we can help and what it will cost.",
    button: { label: "Request a consultation", href: "/contact" },
    secondaryButton: { label: "Call +1 (555) 600-4410", href: "tel:+15556004410" },
    highlightMetric: { value: "96%", label: "Client satisfaction", subtext: "Based on 2025 client survey" },
  },
  { background: "surface" },
);

export const LAW_FIRM: BusinessTemplate = businessTemplate({
  key: "law-firm-elegant",
  name: "Law Firm · Elegant",
  category: "Business",
  description: "A trustworthy law practice site with practice areas, attorney profiles, FAQ and consultation form.",
  themeName: "Meridian Elegant",
  theme: {
    colors: {
      primary: "#A63D10",
      secondary: "#2B2118",
      background: "#FBF7F2",
      surface: "#F3E6DA",
      text: "#2B2118",
      muted: "#6E5F52",
    },
    fonts: { heading: "eb-garamond", body: "manrope" },
    buttonStyle: "filled",
    cardStyle: "border",
    radius: "sm",
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
        section("hero", {
          variant: "split-left",
          eyebrow: "Business and family law",
          heading: "Straight answers to legal questions",
          subheading:
            "Practical legal advice for families and growing companies. Fixed fees where we can, and a lawyer who returns your calls.",
          primaryCta: { label: "Request a consultation", href: "/contact" },
          secondaryCta: { label: "Practice areas", href: "/services" },
          image: photo("1589829545856-d10d557cf95f", "Scales of justice on a desk"),
          imageStyle: "shadow",
          trustedBy: {
            label: "Recognised by",
            logos: [{ label: "Best Lawyers 2026" }, { label: "Super Lawyers" }, { label: "Chambers USA" }],
          },
        }),
        practiceAreas,
        section(
          "split",
          {
            eyebrow: "Why {{businessName}}",
            heading: "Big-firm experience, small-firm attention",
            body: "Our partners trained at national firms. We left to give clients the same quality of advice without the layers, the waiting or the surprise invoices.",
            bullets: [
              "Fixed fees agreed before work starts",
              "A named lawyer who knows your case",
              "Replies to every call within one business day",
            ],
            image: photo("1505664194779-8beaceb93744", "Law library", 1200),
            imagePosition: "right",
            cta: { label: "About the firm", href: "/about" },
          },
          { background: "surface" },
        ),
        section("stats", {
          items: [
            { value: "25+", label: "Years in practice" },
            { value: "3,200", label: "Clients represented" },
            { value: "$40M+", label: "Recovered for clients" },
            { value: "4.9★", label: "Average client rating" },
          ],
        }),
        section(
          "testimonials",
          {
            heading: "What our clients say",
            items: [
              { quote: "Eleanor explained every option in plain English and got us a fair settlement fast.", name: "David M.", role: "Business owner" },
              { quote: "A difficult time made far easier. Calm, kind and incredibly well prepared.", name: "Sarah L.", role: "Family law client" },
              { quote: "Our lease was reviewed in two days for a fixed fee. Exactly what we needed.", name: "Kofi A.", role: "Restaurant owner" },
            ],
          },
          { background: "surface" },
        ),
        section("faq", {
          variant: "split-sidebar",
          heading: "Frequently asked questions",
          intro: "Can't find your answer? Call us — the first conversation is free.",
          supportCta: {
            title: "Still have questions?",
            description: "Speak to a lawyer today.",
            link: { label: "Contact us", href: "/contact" },
          },
          items: [
            { question: "How much will my case cost?", answer: "We quote fixed fees for most matters. Where we can't, we give a clear estimate and update you before it changes." },
            { question: "Is my consultation confidential?", answer: "Yes. Everything you tell us is protected by attorney–client privilege." },
            { question: "Do you offer virtual meetings?", answer: "Yes. We meet by video, phone or in person at our Boston office." },
          ],
        }),
        consultationCta,
      ],
    },
    {
      name: "About",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "About the firm",
          heading: "Law, explained like a person would",
          subheading: "Founded in 1998 by two litigators who believed clients deserved clearer advice and fairer fees.",
          primaryCta: { label: "Meet the team", href: "/team" },
        }),
        section("split", {
          eyebrow: "Our story",
          heading: "Twenty-five years at Court Square",
          body: "{{businessName}} started with two lawyers and a single client. Today our team of 18 represents families, founders and established companies across New England.\n\nWe have grown carefully, keeping the things clients told us mattered most: direct access to partners and honest advice about costs and outcomes.",
          bullets: ["Massachusetts Bar Association members", "Pro bono partner of local legal aid", "Women- and minority-led partnership"],
          image: photo("1521791136064-7986c2920216", "Handshake after a client meeting", 1200),
          imagePosition: "left",
        }),
        section(
          "features",
          {
            variant: "cards",
            heading: "Our commitments to you",
            columns: 3,
            mobileColumns: 1,
            items: [
              { icon: "wallet", title: "Clear fees", description: "Fixed or capped fees agreed in writing." },
              { icon: "phone", title: "Real access", description: "Your lawyer's direct line, not a switchboard." },
              { icon: "shield", title: "Honest advice", description: "We tell you when a case isn't worth fighting." },
            ],
          },
          { background: "surface" },
        ),
        consultationCta,
      ],
    },
    {
      name: "Services",
      slug: "/services",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Practice areas",
          heading: "Legal services for life and business",
          subheading: "From a first contract to a family settlement, we handle it with care.",
          primaryCta: { label: "Request a consultation", href: "/contact" },
        }),
        practiceAreas,
        section(
          "services",
          {
            variant: "interactive-list",
            heading: "What each practice covers",
            columns: 1,
            mobileColumns: 1,
            showBullets: true,
            items: [
              {
                title: "Business law",
                description: "Protecting your company from formation to exit.",
                features: ["Company formation", "Commercial contracts", "Shareholder disputes", "Employment issues"],
                image: photo("1450101499163-c8848c66ca85", "Signing a contract", 1000),
              },
              {
                title: "Family law",
                description: "Sensitive support at difficult moments.",
                features: ["Divorce and separation", "Child custody", "Prenuptial agreements", "Mediation"],
                image: photo("1577415124269-fc1140a69e91", "Family consultation", 1000),
              },
              {
                title: "Property",
                description: "Buying, leasing and resolving property matters.",
                features: ["Commercial leases", "Residential purchases", "Landlord–tenant disputes", "Title review"],
                image: photo("1564013799919-ab600027ffc6", "Residential property", 1000),
              },
              {
                title: "Wills and estates",
                description: "Planning ahead for the people you love.",
                features: ["Wills", "Trusts", "Power of attorney", "Probate"],
                image: photo("1505664194779-8beaceb93744", "Legal books", 1000),
              },
            ],
          },
          { background: "surface" },
        ),
        consultationCta,
      ],
    },
    {
      name: "Team",
      slug: "/team",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Our team",
          heading: "The lawyers you will work with",
          subheading: "Every matter is led by an experienced attorney — never handed off to someone you haven't met.",
        }),
        section("team", {
          variant: "grid-cards",
          heading: "Partners and associates",
          columns: 4,
          mobileColumns: 1,
          members: attorneys,
        }),
        consultationCta,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "cards-hub",
          eyebrow: "Contact",
          heading: "Request a free consultation",
          text: "Tell us briefly about your situation. A lawyer will reply within one business day.",
          email: "info@meridianlegal.com",
          phone: "+1 (555) 600-4410",
          address: "200 Court Square, 5th Floor, Boston, MA",
          officeHours: "Mon–Fri, 9am–6pm",
          responseTime: "Replies within 1 business day",
          showForm: true,
          formHeading: "Tell us about your matter",
          serviceOptions: ["Business law", "Family law", "Property", "Wills and estates", "Other"],
          submitLabel: "Request consultation",
        }),
      ],
    },
  ],
});
