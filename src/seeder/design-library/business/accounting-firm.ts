import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "logo-left",
  siteName: NAME,
  menu: [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
    { label: "Services", href: "/services" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Book a call", href: "/contact" },
  announcement: "Tax season is here — new clients get a free first-year review",
  announcementLink: { label: "Book now", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  description: "Bookkeeping, payroll and tax for small businesses and the people who run them.",
  columns: [
    {
      title: "Company",
      links: [
        { label: "About us", href: "/about" },
        { label: "Services", href: "/services" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Services",
      links: [
        { label: "Bookkeeping", href: "/services" },
        { label: "Tax returns", href: "/services" },
        { label: "Payroll", href: "/services" },
        { label: "Advisory", href: "/services" },
      ],
    },
  ],
  contact: {
    email: "hello@northwindaccounting.com",
    phone: "+1 (555) 214-3300",
    address: "48 Harbor Street, Suite 210, Portland, OR",
    hours: "Mon–Fri, 8:30am–5:30pm",
  },
  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com" },
    { label: "Facebook", href: "https://www.facebook.com" },
  ],
  legalLinks: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
  copyright: `© 2026 ${NAME}. All rights reserved.`,
};

const testimonials = section(
  "testimonials",
  {
    heading: "Trusted by 400+ local businesses",
    items: [
      {
        quote: "They cleaned up two years of messy books in a month. Tax time is finally boring.",
        name: "Rachel Kim",
        role: "Owner, Harbor Coffee Co.",
      },
      {
        quote: "Payroll used to take me a full day. Now I just approve it on my phone.",
        name: "Marcus Bell",
        role: "Director, Bell Builders",
      },
      {
        quote: "Clear advice, fixed fees and they always pick up the phone.",
        name: "Anita Rao",
        role: "Founder, Rao Dental Studio",
      },
    ],
  },
  { background: "surface" },
);

const ctaBand = section(
  "cta",
  {
    variant: "centered-card",
    eyebrow: "Free 30-minute call",
    heading: "Talk to an accountant this week",
    text: "Tell us about your business and we will show you exactly what we would do — and what it would cost.",
    button: { label: "Book a call", href: "/contact" },
    secondaryButton: { label: "See pricing", href: "/services" },
    trustBadges: ["Fixed monthly fees", "No long contracts", "Certified CPAs"],
  },
  { background: "primary" },
);

export const ACCOUNTING_FIRM: BusinessTemplate = businessTemplate({
  key: "accounting-firm-classic",
  name: "Accounting Firm · Classic",
  category: "Business",
  description: "A complete accounting and tax practice site with services, pricing, team and contact pages.",
  themeName: "Northwind Classic",
  theme: {
    colors: {
      primary: "#2448C8",
      secondary: "#0F9D7A",
      background: "#FFFFFF",
      surface: "#EEF2FC",
      text: "#14213D",
      muted: "#5A6478",
    },
    fonts: { heading: "manrope", body: "manrope" },
    buttonStyle: "filled",
    cardStyle: "border",
    radius: "md",
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
          variant: "split",
          eyebrow: "Accounting and tax for small business",
          heading: "Clear books, calm tax season",
          highlightText: "calm tax season",
          subheading:
            "Bookkeeping, payroll and tax returns for small businesses, handled by one friendly team that answers the phone.",
          primaryCta: { label: "Book a free call", href: "/contact" },
          secondaryCta: { label: "Our services", href: "/services" },
          image: photo("1554224155-6726b3ff858f", "Accountant reviewing reports with a calculator"),
          imageStyle: "rounded",
          rating: { stars: 5, text: "4.9 from 180+ Google reviews", avatarCount: 4 },
        }, { customColors: { gradientFrom: "#2448C8", gradientTo: "#0F9D7A" } }),
        section("stats", {
          items: [
            { value: "400+", label: "Businesses supported" },
            { value: "18 yrs", label: "Serving the community" },
            { value: "$2.4M", label: "Saved for clients last year" },
            { value: "24 hrs", label: "Average reply time" },
          ],
        }),
        section(
          "services",
          {
            variant: "cards-grid",
            eyebrow: "What we do",
            heading: "How we help at {{businessName}}",
            intro: "Pick one service or hand us the whole back office.",
            columns: 3,
            mobileColumns: 1,
            iconStyle: "pastel-circle",
            items: [
              {
                icon: "chart",
                iconColor: "blue",
                title: "Bookkeeping",
                description: "Monthly books, reconciliations and reports you can actually read.",
                link: { label: "Learn more", href: "/services" },
              },
              {
                icon: "wallet",
                iconColor: "green",
                title: "Tax returns",
                description: "Business and personal returns filed on time, with every deduction found.",
                link: { label: "Learn more", href: "/services" },
              },
              {
                icon: "user",
                iconColor: "purple",
                title: "Payroll",
                description: "Staff paid correctly and on schedule, with filings handled for you.",
                link: { label: "Learn more", href: "/services" },
              },
            ],
          },
          { background: "surface" },
        ),
        section("split", {
          eyebrow: "Why {{businessName}}",
          heading: "An accountant who knows your business, not a call centre",
          body: "Every client gets a named accountant who learns how your business works. You get proactive advice through the year — not just a bill at tax time.",
          bullets: [
            "Fixed monthly fee, agreed upfront",
            "Cloud software set up and connected for you",
            "Quarterly check-ins to plan ahead",
          ],
          image: photo("1600880292203-757bb62b4baf", "Accountant meeting with a business owner"),
          imagePosition: "right",
          cta: { label: "Meet the team", href: "/about" },
        }),
        testimonials,
        section("faq", {
          variant: "accordion-classic",
          heading: "Common questions",
          items: [
            {
              question: "How much does it cost?",
              answer: "Most small businesses pay between $250 and $650 a month, fixed. We quote after a free call.",
            },
            {
              question: "Can you take over from my current accountant?",
              answer: "Yes. We handle the handover, request your records and make the switch painless.",
            },
            {
              question: "Which software do you use?",
              answer: "We work with QuickBooks, Xero and FreshBooks, and can set one up for you.",
            },
          ],
        }),
        ctaBand,
      ],
    },
    {
      name: "About",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "About us",
          heading: "Numbers people who like people",
          subheading:
            "Since 2008 we have helped local owners understand their numbers, pay less tax legally and sleep better in April.",
          primaryCta: { label: "Work with us", href: "/contact" },
        }),
        section("split", {
          eyebrow: "Our story",
          heading: "Started by two CPAs tired of jargon",
          body: "{{businessName}} began in a two-desk office above a bakery. Today we are a team of 14, but the idea is the same: plain-English advice, fair fees and real relationships.\n\nWe only work with small businesses, so everything we do is built around them.",
          bullets: ["Licensed CPAs and enrolled agents", "Member of the AICPA", "Locally owned and run"],
          image: photo("1497366216548-37526070297c", "The {{businessName}} office"),
          imagePosition: "left",
        }),
        section(
          "features",
          {
            variant: "grid",
            heading: "What we believe",
            columns: 3,
            mobileColumns: 1,
            items: [
              { icon: "chat", title: "Plain English", description: "No jargon. If we can't explain it simply, we explain it again." },
              { icon: "shield", title: "No surprises", description: "Fixed fees agreed in writing before any work starts." },
              { icon: "clock", title: "Always on time", description: "Deadlines tracked for you, so you never pay a late penalty." },
            ],
          },
          { background: "surface" },
        ),
        section("team", {
          variant: "grid-cards",
          heading: "Meet the partners",
          columns: 3,
          mobileColumns: 1,
          members: [
            {
              name: "Daniel Hart, CPA",
              role: "Managing Partner",
              bio: "Twenty years helping owner-run businesses grow.",
              photo: photo("1560250097-0b93528c311a", "Daniel Hart", 600),
            },
            {
              name: "Priya Menon, CPA",
              role: "Tax Partner",
              bio: "Specialist in small business and self-employed tax.",
              photo: photo("1573496359142-b8d87734a5a2", "Priya Menon", 600),
            },
            {
              name: "Lucas Ortega",
              role: "Payroll Lead",
              bio: "Keeps 2,000+ paychecks a month on time.",
              photo: photo("1500648767791-00dcc994a43e", "Lucas Ortega", 600),
            },
          ],
        }),
        ctaBand,
      ],
    },
    {
      name: "Services",
      slug: "/services",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Services and pricing",
          heading: "Everything your back office needs",
          subheading: "Simple monthly plans. Add or remove services any time.",
          primaryCta: { label: "Get a quote", href: "/contact" },
        }),
        section("services", {
          variant: "horizontal-cards",
          heading: "Our services",
          columns: 2,
          mobileColumns: 1,
          showImages: true,
          items: [
            {
              title: "Bookkeeping",
              description: "Bank reconciliations, invoicing and monthly management reports.",
              image: photo("1460925895917-afdab827c52f", "Financial dashboard on a laptop", 900),
            },
            {
              title: "Tax planning and returns",
              description: "Year-round planning plus business and personal returns.",
              image: photo("1450101499163-c8848c66ca85", "Signing a tax document", 900),
            },
            {
              title: "Payroll",
              description: "Pay runs, payslips, benefits and quarterly filings.",
              image: photo("1551288049-bebda4e38f71", "Payroll charts", 900),
            },
            {
              title: "Advisory",
              description: "Cash-flow forecasts, budgets and growth planning.",
              image: photo("1556761175-5973dc0f32e7", "Advisory meeting", 900),
            },
          ],
        }),
        section(
          "pricing",
          {
            variant: "cards-grid",
            eyebrow: "Pricing",
            heading: "Fixed monthly plans",
            intro: "No hourly billing. No surprise invoices.",
            columns: 3,
            mobileColumns: 1,
            plans: [
              {
                name: "Essentials",
                price: "$249",
                period: "/month",
                description: "For sole traders and new businesses.",
                features: ["Monthly bookkeeping", "Annual tax return", "Email support"],
                cta: { label: "Get started", href: "/contact" },
                featured: false,
              },
              {
                name: "Growth",
                price: "$449",
                period: "/month",
                badge: "Most popular",
                description: "For businesses with staff.",
                features: ["Everything in Essentials", "Payroll up to 10 staff", "Quarterly review call"],
                cta: { label: "Get started", href: "/contact" },
                featured: true,
              },
              {
                name: "Complete",
                price: "$749",
                period: "/month",
                description: "Your full finance team.",
                features: ["Everything in Growth", "Cash-flow forecasting", "Dedicated advisor"],
                cta: { label: "Talk to us", href: "/contact" },
                featured: false,
              },
            ],
          },
          { background: "surface" },
        ),
        testimonials,
        ctaBand,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "split-form",
          eyebrow: "Contact",
          heading: "Book your free 30-minute call",
          text: "Tell us a little about your business and we will reply within one working day.",
          email: "hello@northwindaccounting.com",
          phone: "+1 (555) 214-3300",
          address: "48 Harbor Street, Suite 210, Portland, OR",
          officeHours: "Mon–Fri, 8:30am–5:30pm",
          responseTime: "Replies within 1 business day",
          showForm: true,
          formHeading: "Send us a message",
          serviceOptions: ["Bookkeeping", "Tax returns", "Payroll", "Advisory", "Not sure yet"],
          submitLabel: "Request a call",
        }),
        section(
          "faq",
          {
            variant: "two-column-grid",
            heading: "Before you get in touch",
            items: [
              { question: "Do you work with businesses outside Oregon?", answer: "Yes — we work remotely with clients across the US." },
              { question: "What should I bring to the first call?", answer: "Just a rough idea of your revenue and current setup. No paperwork needed." },
              { question: "Is the first call really free?", answer: "Yes. No obligation and no sales pressure." },
              { question: "How fast can you start?", answer: "Usually within a week of signing up." },
            ],
          },
          { background: "surface" },
        ),
      ],
    },
  ],
});
