import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { ROOFING_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "side-drawer",
  siteName: NAME,
  logo: ROOFING_LOGO,
  logoDisplay: "logo_only",
  tagline: "Now booking spring re-roofs",
  menu: [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Projects", href: "/projects" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Free inspection", href: "/contact" },
  contactLabel: "Talk to a roofer",
  contactEmail: "hello@velvetroofing.com",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "centered",
  siteName: NAME,
  logo: ROOFING_LOGO,
  tagline: "Roofs built to outlast the mortgage",
  description: "Premium slate, metal and shingle roofing across the Pacific Northwest. Family-owned since 1998.",
  columns: [
    {
      title: "Roofing",
      links: [
        { label: "Roof replacement", href: "/services" },
        { label: "Repairs", href: "/services" },
        { label: "Standing-seam metal", href: "/services" },
        { label: "Gutters & skylights", href: "/services" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "Projects", href: "/projects" },
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
  ],
  menu: [
    { label: "Services", href: "/services" },
    { label: "Projects", href: "/projects" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  contact: {
    email: "hello@velvetroofing.com",
    phone: "(503) 555-0142",
    address: "1820 NW Raleigh St, Portland, OR",
    hours: "Mon–Fri 7am–5pm",
  },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "Houzz", href: "https://www.houzz.com" },
    { label: "Facebook", href: "https://www.facebook.com" },
  ],
  paymentMethods: { enabled: false },
  legalLinks: [
    { label: "Privacy", href: "/about" },
    { label: "Warranty terms", href: "/services" },
  ],
  copyright: `© 2026 ${NAME} Co. · OR CCB #204118`,
};

const materials = section(
  "marquee",
  {
    variant: "ticker-text",
    items: [
      { text: "Natural slate" },
      { text: "Standing-seam metal" },
      { text: "Cedar shake" },
      { text: "Designer shingles" },
      { text: "Copper detailing" },
      { text: "Green roofs" },
    ],
    speed: "slow",
    fontSize: "large",
    gradientFades: true,
    pauseOnHover: true,
  },
  { background: "surface", spacing: "compact" },
);

const projects = section("carousel", {
  variant: "image-coverflow",
  eyebrow: "Recent projects",
  heading: "Roofs we're proud to sign",
  intro: "Every project is photographed, documented and backed by our 25-year workmanship warranty.",
  imageAspect: "4:3",
  showArrows: true,
  showDots: true,
  autoPlay: true,
  interval: 6,
  slides: [
    {
      title: "The Laurelhurst Craftsman",
      subtitle: "Cedar shake · Full replacement",
      description: "A 1912 craftsman restored with hand-split western red cedar.",
      image: photo("1568605114967-8130f3a36994", "Craftsman home with a new roof at dusk", 1600),
      button: { label: "View project", href: "/projects" },
    },
    {
      title: "West Hills Modern",
      subtitle: "Standing-seam metal",
      description: "Charcoal standing-seam with concealed gutters and solar mounts.",
      image: photo("1600585154340-be6161a56a0c", "Modern home with a metal roof", 1600),
      button: { label: "View project", href: "/projects" },
    },
    {
      title: "Eastmoreland Colonial",
      subtitle: "Natural slate · Copper flashing",
      description: "Vermont slate with copper valleys built to last a century.",
      image: photo("1570129477492-45c003edd2be", "Colonial home with a slate roof", 1600),
      button: { label: "View project", href: "/projects" },
    },
    {
      title: "Lake Oswego Residence",
      subtitle: "Designer shingles · Skylights",
      description: "Architectural shingles with three new energy-efficient skylights.",
      image: photo("1605276374104-dee2a0ed3cd6", "Suburban home with architectural shingles", 1600),
      button: { label: "View project", href: "/projects" },
    },
  ],
});

const guarantees = section(
  "features",
  {
    variant: "cards",
    eyebrow: "The {{businessName}} standard",
    heading: "Premium roofs, without the premium headaches",
    columns: 3,
    mobileColumns: 1,
    cardStyle: "bordered",
    iconStyle: "minimal-accent",
    items: [
      { icon: "shield", title: "25-year warranty", description: "Workmanship guaranteed in writing, transferable if you sell." },
      { icon: "layers", title: "Drone inspections", description: "4K drone survey and a photo report before we quote." },
      { icon: "clock", title: "Finished on schedule", description: "Most replacements completed in 2–4 days, weather permitting." },
      { icon: "heart", title: "Property protected", description: "Gardens tarped, magnetic nail sweep and daily clean-up." },
      { icon: "wallet", title: "Fixed-price quotes", description: "No hidden extras. Rotten decking priced upfront per sheet." },
      { icon: "star", title: "Manufacturer certified", description: "GAF Master Elite and CertainTeed SELECT ShingleMaster." },
    ],
  },
  { background: "default" },
);

const reviews = section(
  "testimonials",
  {
    heading: "Homeowners on their new roofs",
    items: [
      { quote: "The crew treated our 100-year-old home like a museum piece. The slate is stunning and they left the garden spotless.", name: "Eleanor Hughes", role: "Eastmoreland" },
      { quote: "Clear quote, drone photos of every problem, and done in three days. Our energy bill dropped noticeably too.", name: "James Park", role: "West Hills" },
      { quote: "After a storm tore off half our shingles, {{businessName}} had us watertight the same night. Exceptional people.", name: "Rosa Delgado", role: "Lake Oswego" },
    ],
  },
  { background: "surface" },
);

const inspectionCta = section(
  "cta",
  {
    variant: "floating-card",
    eyebrow: "Free drone inspection",
    heading: "Know exactly what your roof needs",
    text: "A certified roofer and 4K drone survey, a written report within 48 hours, and zero pressure to buy.",
    button: { label: "Book my free inspection", href: "/contact" },
    secondaryButton: { label: "Call (503) 555-0142", href: "tel:+15035550142" },
    trustBadges: ["25-year warranty", "GAF Master Elite", "Financing from 0% APR"],
    cardStyle: "contrast",
  },
  { background: "default" },
);

export const ROOFING: BusinessTemplate = businessTemplate({
  key: "roofing-velvet",
  name: "Roofing · Velvet",
  category: "Services",
  description: "A premium dark roofing contractor site with project gallery, tiered quotes and free inspection booking.",
  themeName: "Velvet Copper",
  theme: {
    colors: {
      primary: "#E0A96D",
      secondary: "#F6EEF9",
      background: "#1A1020",
      surface: "#251A2D",
      text: "#F6EEF9",
      muted: "#BCA9C6",
    },
    fonts: { heading: "fraunces", body: "manrope" },
    buttonStyle: "filled",
    cardStyle: "border",
    radius: "sm",
    containerWidth: 1240,
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
            variant: "background-image",
            eyebrow: "Portland's premium roofers since 1998",
            heading: "A roof you never have to think about",
            highlightText: "never",
            subheading:
              "Slate, metal and designer shingle roofs built by certified craftspeople — backed by a 25-year workmanship warranty.",
            primaryCta: { label: "Book a free inspection", href: "/contact" },
            secondaryCta: { label: "View projects", href: "/projects" },
            backgroundImage: photo("1568605114967-8130f3a36994", "Home with a new roof at dusk", 2000),
            bgOverlayType: "dark",
            overlayOpacity: 60,
            minHeight: "tall",
            contentAlign: "left",
            rating: { stars: 5, text: "4.9 average from 640 Google reviews", avatarCount: 4 },
          },
          { customColors: { gradientFrom: "#E0A96D", gradientTo: "#F5D7B2" } },
        ),
        materials,
        section("services", {
          variant: "minimal-numbered",
          eyebrow: "What we do",
          heading: "Roofing, end to end",
          columns: 2,
          mobileColumns: 1,
          showNumbers: true,
          items: [
            { title: "Full roof replacement", description: "Tear-off, new decking where needed, premium underlayment and a roof that adds real value to your home.", link: { label: "Learn more", href: "/services" } },
            { title: "Repairs & storm response", description: "Leaks, missing shingles and storm damage — emergency tarping within hours.", link: { label: "Learn more", href: "/services" } },
            { title: "Standing-seam metal", description: "Architectural metal roofs that last 50+ years and love solar panels.", link: { label: "Learn more", href: "/services" } },
            { title: "Gutters, skylights & ventilation", description: "Seamless gutters, VELUX skylights and balanced attic ventilation.", link: { label: "Learn more", href: "/services" } },
          ],
        }),
        projects,
        section(
          "split",
          {
            eyebrow: "Insurance claims",
            heading: "Storm damage? We handle the insurance",
            body: "Our claims team meets your adjuster on site, documents every shingle with drone photos and makes sure nothing is missed.\n\nMost homeowners pay only their deductible.",
            bullets: ["Same-day emergency tarping", "Adjuster meetings included", "Direct billing to your insurer"],
            image: photo("1632759145351-1d592919f522", "Roofer repairing a damaged roof", 1200),
            imagePosition: "right",
            cta: { label: "Start a claim", href: "/contact" },
          },
          { background: "surface" },
        ),
        guarantees,
        section(
          "stats",
          {
            items: [
              { value: "4,200+", label: "Roofs completed" },
              { value: "28 yrs", label: "Family-owned" },
              { value: "25-yr", label: "Workmanship warranty" },
              { value: "4.9★", label: "Google rating" },
            ],
          },
          { background: "surface" },
        ),
        reviews,
        inspectionCta,
      ],
    },
    {
      name: "Services",
      slug: "/services",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Services",
          heading: "Built for Pacific Northwest weather",
          subheading: "Every roof we install is engineered for rain, wind and moss — and designed to look beautiful doing it.",
          primaryCta: { label: "Book a free inspection", href: "/contact" },
        }),
        section("services", {
          variant: "horizontal-cards",
          heading: "Roofing systems",
          columns: 2,
          mobileColumns: 1,
          showImages: true,
          items: [
            { title: "Natural slate", description: "Hand-laid Vermont and Spanish slate with copper flashing. A 100-year roof.", image: photo("1570129477492-45c003edd2be", "Colonial home with slate roof", 900) },
            { title: "Standing-seam metal", description: "Concealed-fastener metal in 18 colors, ready for solar.", image: photo("1600585154340-be6161a56a0c", "Modern home with a metal roof", 900) },
            { title: "Cedar shake", description: "Hand-split western red cedar for heritage and craftsman homes.", image: photo("1568605114967-8130f3a36994", "Craftsman home with cedar roof", 900) },
            { title: "Designer shingles", description: "GAF and CertainTeed architectural shingles with lifetime material warranties.", image: photo("1605276374104-dee2a0ed3cd6", "Home with architectural shingles", 900) },
          ],
        }),
        section(
          "pricing",
          {
            variant: "spotlight-tier",
            eyebrow: "Packages",
            heading: "Choose your level of protection",
            intro: "Typical prices for a 2,000 sq ft home. Your free inspection includes a fixed quote.",
            columns: 3,
            mobileColumns: 1,
            plans: [
              { name: "Repair", price: "$650", period: "from", description: "Leaks, flashing and storm fixes.", features: ["Drone inspection", "Photo report", "2-year repair warranty"], cta: { label: "Book a repair", href: "/contact" }, featured: false },
              { name: "Signature", price: "$18,900", period: "from", badge: "Most chosen", description: "Full replacement in designer shingles.", features: ["Full tear-off", "Synthetic underlayment", "Ridge ventilation", "25-year workmanship warranty"], cta: { label: "Get my quote", href: "/contact" }, featured: true, highlightNote: "0% APR financing for 18 months" },
              { name: "Heritage", price: "$42,000", period: "from", description: "Slate, cedar or standing-seam metal.", features: ["Architectural design consult", "Copper detailing", "Lifetime material warranty", "Annual maintenance visit"], cta: { label: "Book a consult", href: "/contact" }, featured: false },
            ],
          },
          { background: "surface" },
        ),
        section("faq", {
          variant: "minimal-numbered",
          heading: "Roofing questions, answered",
          items: [
            { question: "How long does a replacement take?", answer: "Most homes take 2–4 days. Slate and cedar can take 1–2 weeks." },
            { question: "Do I need to be home?", answer: "No. We'll walk the roof with you before and after, and send daily photo updates." },
            { question: "Can you roof in the rain?", answer: "We schedule around weather and never leave a roof open overnight." },
            { question: "Do you offer financing?", answer: "Yes — 0% APR for 18 months, or low monthly payments up to 12 years." },
          ],
        }),
        inspectionCta,
      ],
    },
    {
      name: "Projects",
      slug: "/projects",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Projects",
          heading: "Craftsmanship you can see from the street",
          subheading: "A selection of recent replacements across Portland and the surrounding neighborhoods.",
        }),
        projects,
        section("gallery", {
          heading: "From the field",
          columns: 3,
          mobileColumns: 1,
          images: [
            photo("1600596542815-ffad4c1539a9", "Modern villa with flat roof", 1000),
            photo("1513584684374-8bab748fbf90", "Glass house at dusk", 1000),
            photo("1635424710928-0544e8512eae", "Roofer installing shingles", 1000),
            photo("1600585154526-990dced4db0d", "Dark modern facade with metal roof", 1000),
            photo("1580587771525-78b9dba3b914", "Luxury home with new roof", 1000),
            photo("1564013799919-ab600027ffc6", "Family home with pool", 1000),
          ],
        }),
        reviews,
        inspectionCta,
      ],
    },
    {
      name: "About",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "About us",
          heading: "Three generations on Portland's rooftops",
          subheading: "Founded by Frank Moreau in 1998, {{businessName}} is still family-owned and run by people who climb ladders for a living.",
          image: photo("1635424710928-0544e8512eae", "{{businessName}} crew installing a roof", 1400),
          imageStyle: "shadow",
          primaryCta: { label: "Book an inspection", href: "/contact" },
        }),
        guarantees,
        section(
          "team",
          {
            variant: "minimal-editorial",
            heading: "The family behind the roofs",
            columns: 3,
            mobileColumns: 1,
            members: [
              { name: "Frank Moreau", role: "Founder", bio: "Started with one truck and a ladder in 1998.", photo: photo("1560250097-0b93528c311a", "Frank Moreau", 600) },
              { name: "Claire Moreau", role: "Managing Director", bio: "Runs projects, claims and the warranty team.", photo: photo("1494790108377-be9c29b29330", "Claire Moreau", 600) },
              { name: "Luis Ortega", role: "Master Roofer", bio: "Slate and cedar specialist with 22 years on the tools.", photo: photo("1500648767791-00dcc994a43e", "Luis Ortega", 600) },
            ],
          },
          { background: "surface" },
        ),
        reviews,
        inspectionCta,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "minimal-editorial",
          eyebrow: "Free inspection",
          heading: "Let's take a look at your roof",
          text: "Book a free drone inspection. You'll get a photo report and a fixed quote within 48 hours.",
          email: "hello@velvetroofing.com",
          phone: "(503) 555-0142",
          address: "1820 NW Raleigh St, Portland, OR",
          officeHours: "Mon–Fri 7am–5pm",
          responseTime: "Inspections within 3 days",
          showForm: true,
          formHeading: "Request an inspection",
          serviceOptions: ["Roof replacement", "Repair or leak", "Storm damage", "Metal roof", "Gutters & skylights"],
          submitLabel: "Book my inspection",
        }),
      ],
    },
  ],
});
