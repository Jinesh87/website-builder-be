import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "glass-dock",
  siteName: NAME,
  menu: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Get a proposal", href: "/contact" },
  announcement: "Free growth audit for new clients — limited to 10 brands this month",
  announcementLink: { label: "Claim yours", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "newsletter",
  siteName: NAME,
  description: "Performance marketing for brands that measure everything.",
  newsletter: {
    enabled: true,
    title: "The {{businessName}} Report",
    description: "One email a month with the tactics our clients are winning with.",
    placeholder: "you@company.com",
    buttonText: "Subscribe",
  },
  columns: [
    {
      title: "Services",
      links: [
        { label: "SEO", href: "/services" },
        { label: "Paid media", href: "/services" },
        { label: "Social", href: "/services" },
        { label: "Analytics", href: "/services" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Blog", href: "/blog" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ],
  contact: { email: "growth@orbitmarketing.co", phone: "+1 (212) 555-0144", address: "85 Broad Street, New York, NY" },
  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com" },
    { label: "X", href: "https://x.com" },
    { label: "YouTube", href: "https://www.youtube.com" },
  ],
  legalLinks: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
  copyright: `© 2026 ${NAME} Inc.`,
};

const channels = section(
  "marquee",
  {
    variant: "pill-badges",
    eyebrow: "Certified partners",
    items: [
      { text: "Google Premier Partner", icon: "star" },
      { text: "Meta Business Partner", icon: "check" },
      { text: "TikTok Marketing Partner", icon: "bolt" },
      { text: "HubSpot Diamond", icon: "shield" },
      { text: "Shopify Plus Expert", icon: "box" },
      { text: "LinkedIn Ads Certified", icon: "user" },
    ],
    speed: "slow",
    gradientFades: true,
    pauseOnHover: true,
  },
  { spacing: "compact" },
);

const results = section(
  "stats",
  {
    heading: "Results our clients report",
    intro: "Average across retainer clients in 2025.",
    items: [
      { value: "3.8×", label: "Return on ad spend" },
      { value: "+212%", label: "Organic traffic" },
      { value: "-41%", label: "Cost per lead" },
      { value: "$84M", label: "Revenue influenced" },
    ],
  },
  { background: "surface" },
);

const retainers = section("pricing", {
  variant: "cards-grid",
  eyebrow: "Retainers",
  heading: "Growth plans that scale with you",
  intro: "Month-to-month. Cancel any time. Ad spend billed separately.",
  billingCycleLabel: "Billed monthly",
  columns: 3,
  mobileColumns: 1,
  plans: [
    {
      name: "Launch",
      price: "$3,500",
      period: "/month",
      description: "For brands spending up to $20k/month on ads.",
      features: ["2 paid channels", "Monthly SEO sprint", "Reporting dashboard", "Monthly strategy call"],
      cta: { label: "Start with Launch", href: "/contact" },
      featured: false,
    },
    {
      name: "Scale",
      price: "$7,500",
      period: "/month",
      badge: "Most popular",
      description: "For brands ready to grow every channel.",
      features: ["4 paid channels", "Full SEO program", "Creative testing", "Weekly optimisation calls"],
      cta: { label: "Start with Scale", href: "/contact" },
      featured: true,
      highlightNote: "Average client ROAS 4.2×",
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For enterprise and multi-market teams.",
      features: ["Unlimited channels", "Dedicated pod", "Data warehouse & attribution", "Quarterly business reviews"],
      cta: { label: "Talk to sales", href: "/contact" },
      featured: false,
    },
  ],
});

const quotes = section(
  "testimonials",
  {
    heading: "Teams that grew with {{businessName}}",
    items: [
      { quote: "{{businessName}} cut our cost per lead by 46% in the first quarter and we've scaled spend 5× since.", name: "Daniel Okoro", role: "VP Growth, Lumen Health" },
      { quote: "The first agency that reports on revenue, not vanity metrics.", name: "Sophie Laurent", role: "CMO, Atelier Skin" },
      { quote: "We went from page three to the top three for our biggest keywords in eight months.", name: "Raj Mehta", role: "Founder, Stackwise" },
    ],
  },
  { background: "surface" },
);

const proposalCta = section(
  "cta",
  {
    variant: "centered-card",
    eyebrow: "Free strategy call",
    heading: "Find out where your next $1M is hiding",
    text: "Book a 30-minute call. We'll audit your channels live and show you the three fastest wins.",
    button: { label: "Book my free audit", href: "/contact" },
    secondaryButton: { label: "See pricing", href: "/services" },
    trustBadges: ["No lock-in contracts", "Results in 90 days", "Certified on every platform"],
    cardStyle: "glass",
  },
  { background: "primary" },
);

export const MARKETING_AGENCY: BusinessTemplate = businessTemplate({
  key: "marketing-agency-midnight",
  name: "Marketing Agency · Midnight",
  category: "Agency",
  description: "A performance marketing agency site with results, retainers, a blog and audit form.",
  themeName: "Orbit Midnight",
  theme: {
    colors: {
      primary: "#8B6CFF",
      secondary: "#3DD9C1",
      background: "#0B1026",
      surface: "#161C3D",
      text: "#E9ECFF",
      muted: "#A3A9CF",
    },
    fonts: { heading: "sora", body: "sora" },
    buttonStyle: "filled",
    cardStyle: "border",
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
            variant: "gradient",
            eyebrow: "Performance marketing agency",
            heading: "Marketing that pays for itself",
            highlightText: "pays for itself",
            subheading:
              "Search, social and paid campaigns measured by the revenue they bring — not the clicks they collect.",
            primaryCta: { label: "Get a free audit", href: "/contact" },
            secondaryCta: { label: "See results", href: "/about" },
            rating: { stars: 5, text: "Rated 4.9 by 200+ growth teams", avatarCount: 5 },
            trustedBy: {
              label: "Trusted by fast-growing brands",
              logos: [{ label: "Lumen Health" }, { label: "Stackwise" }, { label: "Atelier Skin" }, { label: "Northline" }, { label: "Brightpay" }],
            },
          },
          { customColors: { gradientFrom: "#8B6CFF", gradientTo: "#3DD9C1" } },
        ),
        channels,
        results,
        section("services", {
          variant: "cards-grid",
          eyebrow: "What we do",
          heading: "Every channel, one growth team",
          columns: 3,
          mobileColumns: 1,
          iconStyle: "glow-icon",
          cardStyle: "glow",
          items: [
            { icon: "chart", iconColor: "purple", title: "SEO & content", description: "Technical SEO, content and links that compound every month.", link: { label: "Learn more", href: "/services" } },
            { icon: "bolt", iconColor: "cyan", title: "Paid media", description: "Google, Meta, TikTok and LinkedIn campaigns tuned weekly.", link: { label: "Learn more", href: "/services" } },
            { icon: "heart", iconColor: "pink", title: "Social & creators", description: "Content, community and creator partnerships that convert.", link: { label: "Learn more", href: "/services" } },
          ],
        }),
        section(
          "features",
          {
            variant: "split",
            eyebrow: "Radical transparency",
            heading: "See every dollar, live",
            intro: "Your private dashboard connects ad platforms, analytics and CRM so you always know what's working.",
            columns: 2,
            mobileColumns: 1,
            splitPosition: "right",
            splitImage: photo("1551288049-bebda4e38f71", "Live marketing dashboard", 1200),
            splitCta: { label: "Book a demo", href: "/contact" },
            items: [
              { icon: "chart", title: "Revenue attribution", description: "Know which channel drove each sale." },
              { icon: "bell", title: "Real-time alerts", description: "Get pinged the moment a metric moves." },
              { icon: "layers", title: "One source of truth", description: "Ads, SEO and CRM in one view." },
              { icon: "lock", title: "You own the data", description: "Every account stays in your name." },
            ],
          },
          { background: "surface" },
        ),
        quotes,
        retainers,
        section("faq", {
          variant: "accordion-classic",
          heading: "Questions growth teams ask",
          items: [
            { question: "How fast will we see results?", answer: "Paid campaigns usually show lift in 2–4 weeks. SEO compounds from month three." },
            { question: "Do you require long contracts?", answer: "No. Every plan is month-to-month after a 90-day onboarding period." },
            { question: "Who owns the ad accounts?", answer: "You do. We work inside your accounts so you keep all history and data." },
          ],
        }),
        proposalCta,
      ],
    },
    {
      name: "Services",
      slug: "/services",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Services",
          heading: "Full-funnel growth, one team",
          subheading: "From first click to repeat purchase, we plan, run and optimise every channel.",
          primaryCta: { label: "Get a proposal", href: "/contact" },
        }),
        section("services", {
          variant: "horizontal-cards",
          heading: "Channels we run",
          columns: 2,
          mobileColumns: 1,
          showImages: true,
          items: [
            { title: "SEO & content", description: "Audits, technical fixes, content strategy and digital PR.", image: photo("1432888498266-38ffec3eaf0a", "Writing content on a laptop", 900) },
            { title: "Paid search & shopping", description: "Google and Microsoft Ads built around profit, not clicks.", image: photo("1460925895917-afdab827c52f", "Paid search analytics", 900) },
            { title: "Paid social", description: "Meta, TikTok and LinkedIn with weekly creative testing.", image: photo("1611162617474-5b21e879e113", "Social media apps", 900) },
            { title: "Analytics & CRO", description: "Tracking, attribution and landing pages that convert.", image: photo("1543286386-713bdd548da4", "Conversion analytics charts", 900) },
          ],
        }),
        section(
          "features",
          {
            variant: "minimal",
            heading: "Our 90-day launch plan",
            columns: 3,
            mobileColumns: 1,
            items: [
              { icon: "help", title: "Days 1–30: Audit", description: "Tracking fixed, accounts audited, quick wins shipped." },
              { icon: "rocket", title: "Days 31–60: Launch", description: "New campaigns, content and landing pages go live." },
              { icon: "chart", title: "Days 61–90: Scale", description: "Budget moves to what works. Reporting goes weekly." },
            ],
          },
          { background: "surface" },
        ),
        retainers,
        proposalCta,
      ],
    },
    {
      name: "About",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "About {{businessName}}",
          heading: "Marketers who answer to revenue",
          subheading: "Founded in 2016 by ex-Google and Meta strategists who were tired of agencies hiding behind impressions.",
          image: photo("1522202176988-66273c2fd55f", "{{businessName}} team collaborating", 1400),
          imageStyle: "glow",
          primaryCta: { label: "Work with us", href: "/contact" },
        }),
        results,
        section("split", {
          eyebrow: "Our promise",
          heading: "If it doesn't grow revenue, we don't do it",
          body: "Every strategy, campaign and piece of content we create is tied to a business number you care about. You'll see it in your weekly report, in plain English.",
          bullets: ["Senior strategists on every account", "Weekly reporting on revenue, not clicks", "Your accounts, your data, always"],
          image: photo("1552664730-d307ca884978", "Strategy session at a whiteboard", 1200),
          imagePosition: "left",
        }),
        section(
          "team",
          {
            variant: "grid-cards",
            heading: "Leadership",
            columns: 4,
            mobileColumns: 1,
            members: [
              { name: "Nina Torres", role: "CEO & Co-founder", bio: "Former Google Ads strategist.", photo: photo("1529626455594-4ff0802cfb7e", "Nina Torres", 600) },
              { name: "Marcus Lee", role: "Head of Paid Media", bio: "Managed $200M+ in ad spend.", photo: photo("1500648767791-00dcc994a43e", "Marcus Lee", 600) },
              { name: "Ella Novak", role: "Head of SEO", bio: "Built SEO at two unicorns.", photo: photo("1517841905240-472988babdf9", "Ella Novak", 600) },
              { name: "Sam Rivera", role: "Head of Data", bio: "Attribution nerd, ex-Meta.", photo: photo("1506794778202-cad84cf45f1d", "Sam Rivera", 600) },
            ],
          },
          { background: "surface" },
        ),
        proposalCta,
      ],
    },
    {
      name: "Blog",
      slug: "/blog",
      sections: [
        section("blog", {
          eyebrow: "The {{businessName}} Report",
          title: "Growth tactics that actually work",
          subtitle: "Playbooks, teardowns and data from campaigns we run every day.",
          categories: ["All", "SEO", "Paid media", "Social", "Analytics"],
          layout: "magazine",
          showNewsletterCard: true,
          newsletterTitle: "Get the monthly report",
          newsletterDescription: "One email. The best tactic we tested that month.",
          newsletterPlaceholder: "you@company.com",
          newsletterButtonText: "Subscribe",
          posts: [
            {
              id: "post-1",
              title: "How we cut cost per lead by 46% in 90 days",
              slug: "cut-cost-per-lead",
              excerpt: "The exact audit, creative testing and bidding changes behind Lumen Health's best quarter.",
              coverImage: photo("1504868584819-f8e8b4b6d7e3", "Charts showing falling cost per lead", 1200),
              category: "Paid media",
              authorName: "Marcus Lee",
              date: "Oct 2, 2026",
              readTime: "8 min read",
              featured: true,
            },
            {
              id: "post-2",
              title: "The 2026 technical SEO checklist",
              slug: "technical-seo-checklist",
              excerpt: "Forty checks we run on every new client site, in priority order.",
              coverImage: photo("1432888498266-38ffec3eaf0a", "SEO work on a laptop", 1000),
              category: "SEO",
              authorName: "Ella Novak",
              date: "Sep 24, 2026",
              readTime: "12 min read",
            },
            {
              id: "post-3",
              title: "Creator ads that outperform studio shoots",
              slug: "creator-ads",
              excerpt: "Why raw, phone-shot content keeps beating our polished concepts.",
              coverImage: photo("1611162617474-5b21e879e113", "Social media creator content", 1000),
              category: "Social",
              authorName: "Nina Torres",
              date: "Sep 15, 2026",
              readTime: "6 min read",
            },
            {
              id: "post-4",
              title: "Attribution after cookies: what still works",
              slug: "attribution-after-cookies",
              excerpt: "A practical setup using server-side tracking and simple incrementality tests.",
              coverImage: photo("1543286386-713bdd548da4", "Attribution data dashboard", 1000),
              category: "Analytics",
              authorName: "Sam Rivera",
              date: "Sep 3, 2026",
              readTime: "10 min read",
            },
            {
              id: "post-5",
              title: "Landing pages: 7 tests worth running first",
              slug: "landing-page-tests",
              excerpt: "Small changes that consistently lift conversion rate across industries.",
              coverImage: photo("1557838923-2985c318be48", "Landing page analytics", 1000),
              category: "Analytics",
              authorName: "Ella Novak",
              date: "Aug 21, 2026",
              readTime: "7 min read",
            },
          ],
        }),
        proposalCta,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "split-form",
          eyebrow: "Get a proposal",
          heading: "Let's find your fastest growth wins",
          text: "Tell us about your goals and current spend. A senior strategist replies within one business day.",
          email: "growth@orbitmarketing.co",
          phone: "+1 (212) 555-0144",
          address: "85 Broad Street, New York, NY",
          officeHours: "Mon–Fri, 9am–6pm ET",
          responseTime: "Replies within 1 business day",
          showForm: true,
          formHeading: "Request your free audit",
          serviceOptions: ["SEO", "Paid search", "Paid social", "Analytics & CRO", "Full-funnel retainer"],
          submitLabel: "Get my audit",
          cardStyle: "glass",
        }),
        section(
          "faq",
          {
            variant: "two-column-grid",
            heading: "Before we talk",
            items: [
              { question: "Is there a minimum budget?", answer: "We work best with brands spending $10k+/month on media." },
              { question: "Which industries do you serve?", answer: "Mostly e-commerce, SaaS, health and professional services." },
              { question: "What happens on the call?", answer: "We review your accounts live and share three prioritised wins." },
              { question: "Do you work internationally?", answer: "Yes — we run campaigns in 14 countries and 6 languages." },
            ],
          },
          { background: "surface" },
        ),
      ],
    },
  ],
});
