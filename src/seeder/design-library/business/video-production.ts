import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { VIDEO_PRODUCTION_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "minimalist",
  siteName: NAME,
  logo: VIDEO_PRODUCTION_LOGO,
  logoDisplay: "logo_only",
  menu: [
    { label: "Home", href: "/" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "Services", href: "/services" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Plan your video", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "split",
  siteName: NAME,
  logo: VIDEO_PRODUCTION_LOGO,
  tagline: "Brand films, ads and social video",
  description: "A boutique production company making videos people actually watch.",
  columns: [
    {
      title: "Studio",
      links: [
        { label: "Portfolio", href: "/portfolio" },
        { label: "Services", href: "/services" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Watch",
      links: [
        { label: "Vimeo", href: "https://vimeo.com" },
        { label: "YouTube", href: "https://www.youtube.com" },
        { label: "Instagram", href: "https://www.instagram.com" },
      ],
    },
  ],
  contact: { email: "studio@velvetfilms.tv", phone: "+44 20 7946 0888", address: "Unit 4, Hackney Wick, London E9" },
  social: [
    { label: "Vimeo", href: "https://vimeo.com" },
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "YouTube", href: "https://www.youtube.com" },
  ],
  copyright: `© 2026 ${NAME} Ltd.`,
};

const reels = section("carousel", {
  variant: "showcase",
  eyebrow: "Showreel",
  heading: "Recent productions",
  intro: "Brand films, commercials and live coverage from the last twelve months.",
  imageAspect: "16:9",
  showArrows: true,
  showDots: true,
  autoPlay: true,
  interval: 6,
  slides: [
    {
      title: "Run Free",
      subtitle: "Commercial · Stride Athletics",
      description: "A 60-second spot shot across three countries in five days.",
      badge: "Cannes shortlist",
      image: photo("1485846234645-a62644f84728", "Behind the scenes on a commercial set", 1600),
      button: { label: "Watch the film", href: "/portfolio" },
    },
    {
      title: "Made by Hand",
      subtitle: "Brand film · Oak & Iron",
      description: "A documentary portrait of a family furniture workshop.",
      image: photo("1492691527719-9d1e07e534b4", "Cinema camera filming", 1600),
      button: { label: "Watch the film", href: "/portfolio" },
    },
    {
      title: "Night Shift Live",
      subtitle: "Event · Night Shift Festival",
      description: "Multi-camera live stream and same-day highlight edits.",
      image: photo("1505686994434-e3cc5abf1330", "Festival crowd at a live concert", 1600),
      button: { label: "Watch the film", href: "/portfolio" },
    },
    {
      title: "The Edit",
      subtitle: "Series · Lumen Health",
      description: "Twelve short episodes for social, cut for every platform.",
      image: photo("1574717024653-61fd2cf4d44d", "Video editing suite", 1600),
      button: { label: "Watch the film", href: "/portfolio" },
    },
  ],
});

const quotes = section(
  "testimonials",
  {
    heading: "What clients say after the premiere",
    items: [
      { quote: "Our launch film hit two million views in a week. {{businessName}} understood the brief better than we did.", name: "Olivia Hart", role: "Brand Director, Stride Athletics" },
      { quote: "Calm on set, brilliant in the edit and always on budget.", name: "Ben Carter", role: "Founder, Oak & Iron" },
      { quote: "Highlights were live before the crowd had even left. Unreal turnaround.", name: "Priya Shah", role: "Producer, Night Shift Festival" },
    ],
  },
  { background: "surface" },
);

const planCta = section(
  "cta",
  {
    variant: "split-visual",
    eyebrow: "Booking spring productions",
    heading: "Let's plan your next video",
    text: "Tell us about your idea, audience and deadline. We'll send back a creative treatment and a fixed quote within three days.",
    button: { label: "Plan your video", href: "/contact" },
    secondaryButton: { label: "Watch the showreel", href: "/portfolio" },
    highlightMetric: { value: "3 days", label: "Treatment & quote", subtext: "From first call to creative" },
  },
  { background: "default" },
);

export const VIDEO_PRODUCTION: BusinessTemplate = businessTemplate({
  key: "video-production-velvet",
  name: "Video Production · Velvet",
  category: "Agency",
  description: "A cinematic production company site with showreel, packages, add-ons and brief form.",
  themeName: "Velvet Cinema",
  theme: {
    colors: {
      primary: "#D07AF0",
      secondary: "#F6EEF9",
      background: "#1A1020",
      surface: "#2A1C33",
      text: "#F6EEF9",
      muted: "#BFA9CC",
    },
    fonts: { heading: "playfair-display", body: "manrope" },
    buttonStyle: "filled",
    cardStyle: "border",
    radius: "md",
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
        section("hero", {
          variant: "background-image",
          eyebrow: "Video production studio",
          heading: "Videos people actually watch",
          subheading: "Brand films, commercials and social clips — from first script to final grade.",
          primaryCta: { label: "Plan your video", href: "/contact" },
          secondaryCta: { label: "Watch the showreel", href: "/portfolio" },
          backgroundImage: photo("1478720568477-152d9b164e26", "Cinema projector light in a dark theatre", 2000),
          bgOverlayType: "gradient",
          overlayOpacity: 60,
          minHeight: "tall",
          contentAlign: "center",
        }),
        section(
          "marquee",
          {
            variant: "ticker-text",
            items: [
              { text: "Stride Athletics" },
              { text: "Oak & Iron" },
              { text: "Lumen Health" },
              { text: "Night Shift Festival" },
              { text: "Northline" },
              { text: "Peel & Co." },
            ],
            speed: "slow",
            fontSize: "large",
            gradientFades: true,
          },
          { background: "surface", spacing: "compact" },
        ),
        reels,
        section("services", {
          variant: "minimal-numbered",
          eyebrow: "What we make",
          heading: "From idea to final frame",
          columns: 3,
          mobileColumns: 1,
          showNumbers: true,
          items: [
            { title: "Brand films", description: "Two-minute stories that make people care about who you are." },
            { title: "Commercials", description: "TV, cinema and online spots with full crew and post-production." },
            { title: "Social video", description: "Vertical edits, series and creator content built for the scroll." },
          ],
        }),
        section(
          "split",
          {
            eyebrow: "Full production, one team",
            heading: "Script, shoot and post under one roof",
            body: "Our in-house writers, directors, crew and editors work together from day one, so nothing gets lost between agencies. You get one point of contact and one fixed price.",
            bullets: ["Directors with broadcast experience", "Cinema cameras, lighting and drones in-house", "Colour, sound and motion in our own suites"],
            image: photo("1579632652768-6cb9dcf85912", "Camera operator filming on location", 1200),
            imagePosition: "right",
            cta: { label: "See our services", href: "/services" },
          },
          { background: "surface" },
        ),
        section("stats", {
          items: [
            { value: "350+", label: "Productions delivered" },
            { value: "48M", label: "Views generated" },
            { value: "17", label: "Industry awards" },
            { value: "72h", label: "Fastest event turnaround" },
          ],
        }),
        quotes,
        planCta,
      ],
    },
    {
      name: "Portfolio",
      slug: "/portfolio",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Portfolio",
          heading: "Every frame earns its place",
          subheading: "A selection of commercials, brand films and live productions.",
        }),
        reels,
        section("gallery", {
          heading: "Stills from set",
          columns: 3,
          mobileColumns: 1,
          images: [
            photo("1485846234645-a62644f84728", "Film crew on set", 1000),
            photo("1516035069371-29a1b244cc32", "Close-up of a camera lens", 1000),
            photo("1601506521793-dc748fc80b67", "Studio lighting setup", 1000),
            photo("1524712245354-2c4e5e7121c0", "Cinema seats", 1000),
            photo("1590602847861-f357a9332bbc", "Studio microphone", 1000),
            photo("1574717024653-61fd2cf4d44d", "Editing timeline", 1000),
          ],
        }),
        quotes,
        planCta,
      ],
    },
    {
      name: "Services",
      slug: "/services",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Services",
          heading: "Production packages",
          subheading: "Clear scopes, fixed prices and no surprise invoices after the shoot.",
          primaryCta: { label: "Get a quote", href: "/contact" },
        }),
        section("services", {
          variant: "cards-grid",
          heading: "What's included",
          columns: 3,
          mobileColumns: 1,
          showPrices: true,
          showBullets: true,
          items: [
            {
              icon: "sparkles",
              title: "Brand film",
              description: "A 90–120 second hero film for your website and launches.",
              price: "From £14,000",
              duration: "4–6 weeks",
              features: ["Creative treatment & script", "1–2 shoot days", "Colour grade & sound mix"],
            },
            {
              icon: "rocket",
              title: "Commercial",
              description: "TV, cinema and paid social spots with full crew.",
              price: "From £28,000",
              duration: "6–8 weeks",
              features: ["Casting & locations", "Full crew & equipment", "Cut-downs for every channel"],
              featured: true,
            },
            {
              icon: "bolt",
              title: "Social series",
              description: "A month of vertical content shot in one day.",
              price: "From £6,500",
              duration: "2 weeks",
              features: ["20+ edits per shoot", "Captions & motion graphics", "Platform-specific formats"],
            },
          ],
        }),
        section(
          "pricing",
          {
            variant: "horizontal-rows",
            eyebrow: "Add-ons",
            heading: "Extras when you need them",
            plans: [
              { name: "Drone filming", price: "£950", period: "/day", features: ["Licensed pilot", "4K aerial footage"], featured: false },
              { name: "Motion graphics", price: "£1,200", period: "/package", features: ["Titles & lower thirds", "Animated logo sting"], featured: false },
              { name: "Live streaming", price: "£3,500", period: "/event", features: ["Multi-camera", "Same-day highlights"], featured: true, badge: "Popular" },
            ],
          },
          { background: "surface" },
        ),
        section("faq", {
          variant: "minimal-numbered",
          heading: "Production FAQs",
          items: [
            { question: "How far ahead should we book?", answer: "Four to six weeks for most projects. We can turn events around faster." },
            { question: "Do you travel?", answer: "Yes — we shoot across the UK and Europe, and further for the right project." },
            { question: "Who owns the footage?", answer: "You do. All final files and usage rights are included." },
          ],
        }),
        planCta,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "cards-hub",
          eyebrow: "Contact",
          heading: "Tell us about your video",
          text: "Share your idea, audience and deadline. We reply with a treatment and quote within three working days.",
          email: "studio@velvetfilms.tv",
          phone: "+44 20 7946 0888",
          address: "Unit 4, Hackney Wick, London E9",
          officeHours: "Mon–Fri, 9am–7pm",
          responseTime: "Replies within 1 working day",
          showForm: true,
          formHeading: "Project brief",
          serviceOptions: ["Brand film", "Commercial", "Social series", "Event coverage", "Not sure yet"],
          submitLabel: "Send brief",
        }),
      ],
    },
  ],
});
