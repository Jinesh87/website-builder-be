import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { DESIGN_STUDIO_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "floating",
  siteName: NAME,
  logo: DESIGN_STUDIO_LOGO,
  logoDisplay: "logo_only",
  menu: [
    { label: "Home", href: "/" },
    { label: "Work", href: "/portfolio" },
    { label: "Services", href: "/services" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Start a project", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "cta-banner",
  siteName: NAME,
  logo: DESIGN_STUDIO_LOGO,
  description: "Independent design studio for brands that refuse to blend in.",
  ctaBanner: {
    enabled: true,
    heading: "Got something bold in mind?",
    subheading: "We take on six new clients a quarter. Let's talk before the slots go.",
    primaryCta: { label: "Start a project", href: "/contact" },
    secondaryCta: { label: "See our work", href: "/portfolio" },
  },
  columns: [
    {
      title: "Studio",
      links: [
        { label: "Work", href: "/portfolio" },
        { label: "Services", href: "/services" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Capabilities",
      links: [
        { label: "Brand identity", href: "/services" },
        { label: "Web design", href: "/services" },
        { label: "Motion", href: "/services" },
        { label: "Campaigns", href: "/services" },
      ],
    },
  ],
  contact: { email: "hello@halftone.studio", phone: "+1 (415) 555-0199", address: "Mission District, San Francisco" },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "Behance", href: "https://www.behance.net" },
    { label: "Dribbble", href: "https://dribbble.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com" },
  ],
  copyright: `© 2026 ${NAME}. Made loud in San Francisco.`,
};

const capabilities = section(
  "marquee",
  {
    variant: "ticker-text",
    items: [
      { text: "Brand identity" },
      { text: "Web design" },
      { text: "Motion design" },
      { text: "Art direction" },
      { text: "Packaging" },
      { text: "Campaigns" },
    ],
    speed: "normal",
    fontSize: "huge",
    gradientFades: true,
    pauseOnHover: true,
  },
  { background: "primary", spacing: "compact" },
);

const caseStudies = section("carousel", {
  variant: "image-coverflow",
  eyebrow: "Selected work",
  heading: "Case studies",
  intro: "A few recent projects we can't stop talking about.",
  imageAspect: "4:3",
  showArrows: true,
  showDots: true,
  autoPlay: true,
  interval: 5,
  slides: [
    {
      title: "Peel & Co.",
      subtitle: "Rebrand · Packaging",
      description: "A juice brand rebuilt around one fearless orange.",
      image: photo("1634942537034-2531766767d1", "Peel & Co. brand mockups"),
      button: { label: "View case study", href: "/portfolio" },
    },
    {
      title: "Northline Bikes",
      subtitle: "Website · E-commerce",
      description: "An online store that sells like a showroom.",
      image: photo("1559028012-481c04fa702d", "Northline Bikes website design"),
      button: { label: "View case study", href: "/portfolio" },
    },
    {
      title: "Loudhouse Festival",
      subtitle: "Campaign · Motion",
      description: "Posters, social and stage visuals for 40,000 fans.",
      image: photo("1572044162444-ad60f128bdea", "Loudhouse Festival posters"),
      button: { label: "View case study", href: "/portfolio" },
    },
    {
      title: "Field Notes Café",
      subtitle: "Identity · Interiors",
      description: "A neighbourhood café with a hand-drawn soul.",
      image: photo("1586717791821-3f44a563fa4c", "Field Notes Café sketchbook identity"),
      button: { label: "View case study", href: "/portfolio" },
    },
  ],
});

const clientQuotes = section(
  "testimonials",
  {
    heading: "Clients who went bold",
    items: [
      { quote: "{{businessName}} gave us a brand our customers actually talk about. Sales up 38% in a year.", name: "Maya Chen", role: "Founder, Peel & Co." },
      { quote: "Fast, fearless and weirdly fun to work with. The site paid for itself in a month.", name: "Jonas Berg", role: "CEO, Northline Bikes" },
      { quote: "They turned a tight brief into the best-selling festival in our history.", name: "Ari Patel", role: "Director, Loudhouse" },
    ],
  },
  { background: "surface" },
);

const projectCta = section("cta", {
  variant: "floating-card",
  eyebrow: "Now booking Q3",
  heading: "Let's make something people remember",
  text: "Tell us what you're building. We'll come back within 48 hours with ideas, a timeline and a price.",
  button: { label: "Start a project", href: "/contact" },
  secondaryButton: { label: "Download credentials", href: "/contact" },
  highlightMetric: { value: "48h", label: "Proposal turnaround", subtext: "Every enquiry, every time" },
  cardStyle: "contrast",
});

export const DESIGN_STUDIO: BusinessTemplate = businessTemplate({
  key: "design-studio-bold",
  name: "Design Studio · Bold",
  category: "Agency",
  description: "A bold creative studio site with case studies, capabilities, engagement pricing and team.",
  themeName: "Halftone Bold",
  theme: {
    colors: {
      primary: "#FF5A36",
      secondary: "#F5F5F0",
      background: "#0F0F12",
      surface: "#1C1C22",
      text: "#F5F5F0",
      muted: "#A3A3AD",
    },
    fonts: { heading: "archivo", body: "archivo" },
    buttonStyle: "filled",
    cardStyle: "border",
    radius: "none",
    containerWidth: 1280,
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
            variant: "floating-cards",
            eyebrow: "Independent design studio",
            heading: "Brands, websites and campaigns that get noticed",
            highlightText: "get noticed",
            subheading:
              "Strategy, identity and digital design for ambitious companies that would rather be remembered than safe.",
            primaryCta: { label: "Start a project", href: "/contact" },
            secondaryCta: { label: "See our work", href: "/portfolio" },
            image: photo("1558655146-9f40138edfeb", "Designers working on a brand board"),
            floatingCards: [
              { title: "Awwwards SOTD", subtitle: "Northline Bikes", badge: "2026", icon: "star" },
              { title: "+38% revenue", subtitle: "Peel & Co. rebrand", icon: "chart" },
              { title: "120+ brands", subtitle: "Launched since 2014", icon: "rocket" },
            ],
          }
        ),
        capabilities,
        section("services", {
          variant: "bento-grid",
          eyebrow: "What we do",
          heading: "Everything a brand needs to be loud",
          columns: 3,
          mobileColumns: 1,
          showImages: true,
          items: [
            {
              title: "Brand identity",
              description: "Naming, logos, type and full identity systems built to flex across every touchpoint.",
              badge: "Most requested",
              image: photo("1561070791-2526d30994b5", "Colour swatches and brand identity", 1000),
              featured: true,
              link: { label: "Explore", href: "/services" },
            },
            {
              title: "Web design",
              description: "Fast, editable websites that convert visitors into fans.",
              image: photo("1559028012-481c04fa702d", "Website wireframes", 1000),
              link: { label: "Explore", href: "/services" },
            },
            {
              title: "Motion",
              description: "Logo animation, product films and social loops.",
              image: photo("1550745165-9bc0b252726f", "Retro motion graphics", 1000),
              link: { label: "Explore", href: "/services" },
            },
            {
              title: "Campaigns",
              description: "Launch concepts that run across print, social and stage.",
              image: photo("1572044162444-ad60f128bdea", "Campaign posters", 1000),
              link: { label: "Explore", href: "/services" },
            },
          ],
        }),
        caseStudies,
        section(
          "stats",
          {
            heading: "Twelve years of loud",
            items: [
              { value: "120+", label: "Brands launched" },
              { value: "34", label: "Design awards" },
              { value: "9", label: "Countries" },
              { value: "92%", label: "Clients who return" },
            ],
          },
          { background: "surface" },
        ),
        clientQuotes,
        projectCta,
      ],
    },
    {
      name: "About",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "About the studio",
          heading: "Twelve people. Zero beige.",
          subheading: "We're designers, writers and developers who believe the boldest idea in the room is usually the right one.",
        }),
        section("split", {
          eyebrow: "Our story",
          heading: "Started in a garage, still allergic to boring",
          body: "{{businessName}} began in 2014 as two designers printing posters on a borrowed risograph. Today we're a 12-person studio working with founders and global brands alike.\n\nThe size is deliberate: every project gets senior people from first sketch to launch day.",
          bullets: ["Senior team on every project", "No account managers in the middle", "Strategy, design and build under one roof"],
          image: photo("1542744094-3a31f272c490", "The {{businessName}} team in a workshop", 1200),
          imagePosition: "right",
        }),
        section(
          "features",
          {
            variant: "cards",
            heading: "How we work",
            columns: 4,
            mobileColumns: 1,
            items: [
              { icon: "chat", title: "Discover", description: "Workshops to find the truth worth shouting about." },
              { icon: "sparkles", title: "Define", description: "Strategy and creative territories to react to." },
              { icon: "layers", title: "Design", description: "The identity, site or campaign, crafted in detail." },
              { icon: "rocket", title: "Launch", description: "Roll-out, guidelines and support after go-live." },
            ],
          },
          { background: "surface" },
        ),
        section("team", {
          variant: "glass-overlay",
          heading: "The people behind the work",
          columns: 4,
          mobileColumns: 1,
          members: [
            { name: "Leo Marquez", role: "Founder & Creative Director", photo: photo("1506794778202-cad84cf45f1d", "Leo Marquez", 600) },
            { name: "Hana Sato", role: "Design Director", photo: photo("1534528741775-53994a69daeb", "Hana Sato", 600) },
            { name: "Theo Grant", role: "Head of Digital", photo: photo("1539571696357-5a69c17a67c6", "Theo Grant", 600) },
            { name: "Zara Ali", role: "Strategy Lead", photo: photo("1531123897727-8f129e1688ce", "Zara Ali", 600) },
          ],
        }),
        projectCta,
      ],
    },
    {
      name: "Services",
      slug: "/services",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Services",
          heading: "Pick a lane or take the whole road",
          subheading: "Fixed-scope packages for focused projects, or an embedded studio for brands that move fast.",
          primaryCta: { label: "Get a proposal", href: "/contact" },
        }),
        section("services", {
          variant: "interactive-list",
          heading: "Capabilities",
          columns: 1,
          mobileColumns: 1,
          showBullets: true,
          items: [
            {
              title: "Brand identity",
              description: "A complete identity system your team can actually use.",
              features: ["Brand strategy & naming", "Logo & visual identity", "Typography & colour", "Brand guidelines"],
              image: photo("1561070791-2526d30994b5", "Brand identity swatches", 1000),
            },
            {
              title: "Web design & build",
              description: "Websites designed to convert and easy to update.",
              features: ["UX & content strategy", "Design system", "Development", "SEO & analytics setup"],
              image: photo("1559028012-481c04fa702d", "Website design process", 1000),
            },
            {
              title: "Motion & film",
              description: "Movement that gives your brand a personality.",
              features: ["Logo animation", "Product films", "Social loops", "Event visuals"],
              image: photo("1550745165-9bc0b252726f", "Motion design", 1000),
            },
            {
              title: "Campaigns",
              description: "Big ideas that travel across every channel.",
              features: ["Creative concept", "Art direction", "Print & OOH", "Social content"],
              image: photo("1572044162444-ad60f128bdea", "Campaign posters", 1000),
            },
          ],
        }),
        section(
          "pricing",
          {
            variant: "spotlight-tier",
            eyebrow: "Engagements",
            heading: "Ways to work with us",
            intro: "Every project starts with a free 45-minute strategy call.",
            columns: 3,
            mobileColumns: 1,
            plans: [
              {
                name: "Sprint",
                price: "$12k",
                period: "from",
                description: "A focused 3-week project.",
                features: ["Logo refresh or landing page", "2 creative directions", "Final files & handover"],
                cta: { label: "Book a sprint", href: "/contact" },
                featured: false,
              },
              {
                name: "Brand build",
                price: "$38k",
                period: "from",
                badge: "Most popular",
                description: "Full identity and website, 10–12 weeks.",
                features: ["Strategy & naming", "Complete identity system", "Website design & build", "Launch support"],
                cta: { label: "Start a brand build", href: "/contact" },
                featured: true,
              },
              {
                name: "Studio retainer",
                price: "$9k",
                period: "/month",
                description: "An embedded design team.",
                features: ["Dedicated senior designer", "Weekly creative sessions", "Unlimited requests"],
                cta: { label: "Talk retainers", href: "/contact" },
                featured: false,
              },
            ],
          },
          { background: "surface" },
        ),
        section("faq", {
          variant: "categorized-cards",
          heading: "Good questions",
          items: [
            { category: "Process", question: "How long does a brand project take?", answer: "Most identity projects run 8–12 weeks from kickoff to guidelines." },
            { category: "Process", question: "Do you work with startups?", answer: "Yes — about half our clients are founders raising their first or second round." },
            { category: "Pricing", question: "Can we pay in stages?", answer: "Always. We split fees across project milestones." },
            { category: "Pricing", question: "Do you offer equity deals?", answer: "Occasionally, for founders we believe in. Ask us." },
          ],
        }),
        projectCta,
      ],
    },
    {
      name: "Portfolio",
      slug: "/portfolio",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Work",
          heading: "Proof, not promises",
          subheading: "Identities, websites and campaigns for brands that chose loud.",
        }),
        caseStudies,
        section("gallery", {
          heading: "More from the studio",
          columns: 3,
          mobileColumns: 1,
          images: [
            photo("1634942537034-2531766767d1", "Packaging mockups", 1000),
            photo("1626785774573-4b799315345d", "Brand guidelines spread", 1000),
            photo("1611162617474-5b21e879e113", "Social media campaign", 1000),
            photo("1545239351-1141bd82e8a6", "Creative workspace", 1000),
            photo("1586717791821-3f44a563fa4c", "Sketchbook explorations", 1000),
            photo("1618005182384-a83a8bd57fbe", "Abstract 3D artwork", 1000),
          ],
        }),
        clientQuotes,
        projectCta,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "floating-glass",
          eyebrow: "Start a project",
          heading: "Tell us what you're building",
          text: "Share a few details and a senior designer will reply within 48 hours.",
          email: "hello@halftone.studio",
          phone: "+1 (415) 555-0199",
          address: "Mission District, San Francisco",
          responseTime: "Replies within 48 hours",
          showForm: true,
          formHeading: "Project details",
          serviceOptions: ["Brand identity", "Web design", "Motion", "Campaign", "Retainer"],
          submitLabel: "Send brief",
        }),
      ],
    },
  ],
});
