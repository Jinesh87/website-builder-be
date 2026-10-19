import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { DAY_SPA_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "side-drawer",
  siteName: NAME,
  logo: DAY_SPA_LOGO,
  logoDisplay: "logo_only",
  tagline: "A sensory sanctuary for deep restoration",
  menu: [
    { label: "Home", href: "/" },
    { label: "Rituals", href: "/services" },
    { label: "Memberships", href: "/pricing" },
    { label: "The Sanctuary", href: "/about" },
    { label: "Reservations", href: "/contact" },
  ],
  cta: { label: "Reserve ritual", href: "/contact" },
  contactLabel: "Spa Concierge",
  contactEmail: "concierge@halftonespa.com",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "centered",
  siteName: NAME,
  logo: DAY_SPA_LOGO,
  tagline: "Silence, warmth, and botanical restoration",
  description: "An intentional urban bathhouse and restorative day spa. 10,000 square feet of geothermal mineral pools, cedar steam, and artisan bodywork.",
  columns: [
    {
      title: "Signature Rituals",
      links: [
        { label: "Mineral thermal soaking", href: "/services" },
        { label: "Deep tissue bodywork", href: "/services" },
        { label: "Biologique facials", href: "/services" },
        { label: "Infrared sauna suites", href: "/services" },
        { label: "Sound bath journeys", href: "/services" },
      ],
    },
    {
      title: "Sanctuary",
      links: [
        { label: "The Halftone Club", href: "/pricing" },
        { label: "Private bathhouse buyouts", href: "/pricing" },
        { label: "Apothecary & oils", href: "/about" },
        { label: "Gift invitations", href: "/contact" },
      ],
    },
  ],
  contact: {
    email: "concierge@halftonespa.com",
    phone: "(212) 555-0182",
    address: "74 Mercer Street, SoHo, New York, NY",
    hours: "Tue–Sun 9:00am–10:00pm · Mondays by private reservation",
  },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "Pinterest", href: "https://www.pinterest.com" },
  ],
  paymentMethods: { enabled: true, methods: ["visa", "mastercard", "amex"] },
  legalLinks: [
    { label: "Etiquette & quiet policy", href: "/about" },
    { label: "Cancellation policy", href: "/services" },
  ],
  copyright: `© 2026 ${NAME} Sanctuary Group LLC · All rights reserved`,
};

const marqueeRituals = section(
  "marquee",
  {
    variant: "pill-badges",
    eyebrow: "Sensory ritual offerings",
    items: [
      { text: "Thermal Mineral Bathhouse", icon: "sparkles" },
      { text: "Cold Plunge (48°F)", icon: "bolt" },
      { text: "Herbal Eucalyptus Steam", icon: "heart" },
      { text: "Organic Cold-Pressed Oils", icon: "shield" },
      { text: "Tibetan Sound Baths", icon: "star" },
      { text: "Vogue Wellness Award 2026", icon: "star" },
    ],
    speed: "slow",
    gradientFades: true,
    pauseOnHover: true,
  },
  { spacing: "compact" },
);

const signatureRituals = section(
  "services",
  {
    variant: "bento-grid",
    eyebrow: "Signature experiences",
    heading: "Designed to release tension and recalibrate the nervous system",
    intro: "Every session begins with 30 minutes of complimentary thermal soaking and herbal tea in our silent lounge.",
    columns: 3,
    mobileColumns: 1,
    cardStyle: "glow",
    iconStyle: "colored-circle",
    showBadges: true,
    showIcons: true,
    showPrices: true,
    showBullets: true,
    showImages: true,
    items: [
      {
        title: "Hydrothermal Mineral Bathhouse Circuit",
        description: "Self-guided immersion through warm mineral pool (102°F), Scandinavian cold plunge (48°F), and cedarwood infrared sauna.",
        image: photo("1540555700478-4be289fbecef", "Thermal mineral bath and quiet pool", 1000),
        featured: true,
        icon: "shield",
        iconColor: "cyan",
        badge: "Signature Circuit",
        badgeColor: "cyan",
        price: "2 Hours · $115",
        duration: "Self-Guided",
        features: ["Three mineral thermal contrast pools (98°F, 102°F, 104°F)", "Scandinavian 48°F cold plunge pool", "Eucalyptus steam room & Finnish cedar sauna", "Herbal tea tasting lounge & fresh citrus"],
        link: { label: "Book bathhouse pass", href: "/contact" },
      },
      {
        title: "Volcanic Hot Stone Bodywork",
        description: "Heated basalt river stones infused with organic cedarwood and bergamot oils melt chronic physical tension.",
        icon: "heart",
        iconColor: "orange",
        badge: "Most Requested",
        badgeColor: "orange",
        price: "75 min · $240",
        duration: "75 min",
        features: ["Heated basalt river stones", "Aromatherapy inhalation ritual", "Scalp & cervical tension release"],
        link: { label: "Reserve session", href: "/contact" },
      },
      {
        title: "Cellular Sculpting Botanical Facial",
        description: "Cryo-sticks, microcurrent lifting, and cold-pressed botanical serums restore skin barrier elasticity and radiant tone.",
        icon: "sparkles",
        iconColor: "yellow",
        badge: "Barrier Glow",
        badgeColor: "yellow",
        price: "60 min · $210",
        duration: "60 min",
        features: ["Double enzymatic botanical cleanse", "Cryo-sculpt cold therapy massage", "Custom hyaluronic & peptide infusion"],
        link: { label: "Reserve facial", href: "/contact" },
      },
      {
        title: "Sound Bath & Energy Restoration",
        description: "Immersive private session inside our acoustic dome with Tibetan singing bowls, gongs, and restorative breathwork.",
        icon: "star",
        iconColor: "purple",
        badge: "Acoustic Dome",
        badgeColor: "purple",
        price: "60 min · $180",
        duration: "60 min",
        features: ["Acoustic resonance dome chamber", "Chakra frequency bowls & 38-inch gong", "Guided grounding integration elixir"],
        link: { label: "Book sound bath", href: "/contact" },
      },
      {
        title: "Couples Sanctuary Private Suite",
        description: "Private subterranean suite with duo soaking tubs, tandem side-by-side massages, and champagne with organic berries.",
        icon: "heart",
        iconColor: "red",
        badge: "Private Suite",
        badgeColor: "red",
        price: "120 min · $580",
        duration: "120 min",
        features: ["Private cedar duo soaking tub", "90-minute customized synchronized massage", "Private eucalyptus steam room"],
        link: { label: "Reserve suite", href: "/contact" },
      },
      {
        title: "Lymphatic Herbal Mud Cocoon",
        description: "Warm mineral-rich seaweed and wild rosemary mask followed by thermal cocoon wrap and gentle lymphatic drainage strokes.",
        icon: "bolt",
        iconColor: "green",
        price: "75 min · $230",
        duration: "75 min",
        features: ["Dry body brushing exfoliation", "Warm mineral mud thermal wrap", "Botanical moisture seal finish"],
        link: { label: "Learn more", href: "/services" },
      },
    ],
  },
  { background: "surface" },
);

const thermalCircuitFeatures = section(
  "features",
  {
    variant: "pastel-icons",
    eyebrow: "Contrast hydrotherapy",
    heading: "The five-stage thermal recovery circuit",
    columns: 4,
    mobileColumns: 1,
    iconStyle: "pastel-circle",
    items: [
      {
        icon: "sparkles",
        iconColor: "orange",
        title: "1. Caldarium (102°F)",
        description: "Volcanic mineral soaking pool dilates capillaries, softens muscular tension, and prepares the body for deep release.",
      },
      {
        icon: "bolt",
        iconColor: "cyan",
        title: "2. Frigidarium (48°F)",
        description: "30-second immersion in our Nordic cold plunge stimulates norepinephrine, reduces inflammation, and sharpens alertness.",
      },
      {
        icon: "heart",
        iconColor: "green",
        title: "3. Eucalyptus Steam",
        description: "115°F herbal steam grotto clears respiratory passages and deeply detoxifies pores with wild Australian eucalyptus.",
      },
      {
        icon: "star",
        iconColor: "purple",
        title: "4. Tepidarium Lounge",
        description: "Silent stone relaxation beds with heated organic cotton wraps, binaural soundscapes, and house botanical infusions.",
      },
    ],
  },
  { background: "default" },
);

const theSpaceStory = section("split", {
  eyebrow: "The Architecture of Silence",
  heading: "A subterranean oasis beneath the city streets",
  body: "Conceived by minimalist European architects, {{businessName}} is built entirely from honed volcanic basalt stone, charred cedar, and water.\n\nHere, phone rings are replaced by falling mineral springs, harsh lighting gives way to amber candle flames, and the rush of everyday obligations disappears into quiet comfort.",
  bullets: [
    "Strict digital-detox etiquette: phones rest in secure lockers upon entry",
    "Acoustically isolated private treatment sanctuaries",
    "Pure spring water infused with seasonal botanicals and electrolytes",
  ],
  image: photo("1507652313519-d4e9174996dd", "Private soaking tub and bathhouse suite", 1200),
  imagePosition: "left",
  cta: { label: "Explore the sanctuary", href: "/about" },
});

const bathhouseGallery = section("gallery", {
  heading: "Moments of stillness at {{businessName}}",
  columns: 4,
  mobileColumns: 2,
  images: [
    photo("1540555700478-4be289fbecef", "Thermal mineral bath and quiet pool", 1000),
    photo("1544161515-4ab6ce6db874", "Deep relaxation botanical massage", 1000),
    photo("1507652313519-d4e9174996dd", "Private soaking tub with candles", 1000),
    photo("1512290903672-911859846399", "Botanical apothecary and cold-pressed oils", 1000),
  ],
});

const pricingPackages = section(
  "pricing",
  {
    variant: "cards-grid",
    eyebrow: "Day immersions & memberships",
    heading: "Curated packages for restorative pause",
    intro: "All packages include unlimited bathhouse privileges, robe service, and organic refreshments.",
    columns: 3,
    mobileColumns: 1,
    cardStyle: "glass",
    plans: [
      {
        name: "Day Sanctuary Pass",
        price: "$145",
        originalPrice: "$185",
        period: "/visit",
        badge: "Weekday Pass",
        description: "For spontaneous recharge and solo reflection.",
        features: ["2.5 hrs hydrothermal bathhouse access", "Finnish cedar sauna & steam", "Locker, robe & slide service", "Herbal tonic tasting bar"],
        cta: { label: "Book day pass", href: "/contact" },
        featured: false,
      },
      {
        name: "The Full Immersion",
        price: "$380",
        originalPrice: "$450",
        period: "/package",
        badge: "Most Popular",
        description: "Half-day restorative escape for deep total-body renewal.",
        features: ["3.5 hrs complete bathhouse access", "75-min signature stone massage", "60-min cellular glow facial", "Seasonal lunch & wellness elixir"],
        cta: { label: "Reserve immersion", href: "/contact" },
        featured: true,
        highlightNote: "Includes complimentary take-home botanical oil",
      },
      {
        name: "The Halftone Circle",
        price: "$275",
        period: "/month",
        badge: "Membership",
        description: "Monthly sanctuary membership for urban wellness seekers.",
        features: ["Unlimited weekday bathhouse access", "One 75-min treatment included monthly", "20% off all additional rituals", "Guest pass every month"],
        cta: { label: "Join the circle", href: "/pricing" },
        featured: false,
      },
    ],
    footerNote: "All rituals and packages include full locker amenities, French terry robes, Malin+Goetz bath products, and access to the herbal relaxation lounge.",
  },
  { background: "surface" },
);

const pressReviews = section("testimonials", {
  heading: "Praised by leading publications and guests",
  items: [
    {
      quote: "The quietest, most transformative space in Manhattan. The basalt pools and deep bodywork leave you feeling entirely recalibrated.",
      name: "Vogue Wellness Guide",
      role: "Review & Award Recipient",
    },
    {
      quote: "Stepping off Mercer Street into this warm candlelit sanctuary feels like arriving at a remote Nordic retreat. Unmatched attention to detail.",
      name: "Camille Durand",
      role: "Architectural Digest Contributing Editor",
    },
    {
      quote: "The volcanic hot stone massage coupled with the cold plunge pool relieved weeks of chronic shoulder tension in a single afternoon.",
      name: "Alexander Hayes",
      role: "Halftone Circle Member",
    },
  ],
});

const faqSection = section("faq", {
  variant: "split-sidebar",
  eyebrow: "Etiquette & guidance",
  heading: "Frequently asked questions",
  intro: "Guidance to help you prepare for a seamless and serene visit.",
  supportCta: {
    title: "Need custom scheduling?",
    description: "Our guest concierge is available to curate bespoke half-day and full-day itineraries.",
    link: { label: "Call (212) 555-0182", href: "tel:+12125550182" },
  },
  items: [
    {
      question: "What should I bring with me?",
      answer: "We provide plush organic cotton robes, spa slides, towels, private keyless lockers, and non-toxic botanical grooming amenities. You only need to bring swimwear for the communal bathhouse pools.",
    },
    {
      question: "What is your silence policy?",
      answer: "To ensure a restorative environment for all guests, we observe whisper-quiet conversation throughout the bathhouse, and cell phone usage is strictly prohibited in treatment and pool areas.",
    },
    {
      question: "Can I book private group bathhouse buyouts?",
      answer: "Yes, we host private evening buyouts for corporate executive retreats, bridal wellness rituals, and private gatherings. Inquire with our concierge for custom buyouts.",
    },
    {
      question: "What is your cancellation policy?",
      answer: "We require 24 hours notice for individual treatment cancellations and 48 hours for packages or couples suites. Cancellations within this window incur a 50% fee.",
    },
  ],
});

const reserveCta = section(
  "cta",
  {
    variant: "floating-card",
    eyebrow: "Advance reservations recommended",
    heading: "Your journey to stillness awaits",
    text: "Reserve your signature treatment or hydrothermal bathhouse pass online today.",
    button: { label: "Reserve your ritual", href: "/contact" },
    secondaryButton: { label: "Call concierge (212) 555-0182", href: "tel:+12125550182" },
    trustBadges: ["Vogue Wellness Award 2026", "Organic certified oils", "Quiet sanctuary guaranteed"],
    cardStyle: "elevated",
  },
  { background: "surface" },
);

export const DAY_SPA: BusinessTemplate = businessTemplate({
  key: "day-spa-bold",
  name: "Day Spa · Bold",
  category: "Health",
  description: "A dark editorial luxury spa and thermal bathhouse website featuring hydrothermal circuits, artisan rituals, membership tiers and reservations.",
  themeName: "Halftone Noir Luxury",
  theme: {
    colors: {
      primary: "#E0A96D",
      secondary: "#FF5A36",
      background: "#0F0F12",
      surface: "#181820",
      text: "#F5F5F0",
      muted: "#9E9EA8",
    },
    fonts: { heading: "fraunces", body: "archivo" },
    buttonStyle: "filled",
    cardStyle: "shadow",
    radius: "none",
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
            variant: "floating-cards",
            eyebrow: "SoHo Subterranean Bathhouse & Spa",
            heading: "Time to switch off and return to yourself",
            highlightText: "switch off",
            subheading:
              "Ten thousand square feet of geothermal mineral pools, cedarwood infrared saunas, volcanic stone bodywork, and restorative botanical facials in a quiet, candlelit sanctuary.",
            primaryCta: { label: "Reserve a ritual", href: "/contact" },
            secondaryCta: { label: "Explore experiences", href: "/services" },
            image: photo("1540555700478-4be289fbecef", "{{businessName}} thermal bathhouse and quiet pool", 1600),
            imageStyle: "glow",
            floatingCards: [
              { title: "102°F Thermal Pool", subtitle: "Three hydrothermal pools", icon: "sparkles", badge: "Mineral Circuit" },
              { title: "48°F Cold Plunge", subtitle: "Nervous system recalibration", icon: "bolt", badge: "Nordic Contrast" },
              { title: "Vogue Spa 2026", subtitle: "Top Urban Sanctuary Award", icon: "star", badge: "Gold Recipient" },
            ],
          },
          { customColors: { gradientFrom: "#E0A96D", gradientTo: "#FF5A36" } },
        ),
        marqueeRituals,
        signatureRituals,
        thermalCircuitFeatures,
        theSpaceStory,
        bathhouseGallery,
        pricingPackages,
        pressReviews,
        faqSection,
        reserveCta,
      ],
    },
    {
      name: "Rituals",
      slug: "/services",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Rituals & Treatments",
          heading: "Restorative treatments inspired by ancient bath culture",
          subheading: "Every treatment combines organic cold-pressed botanicals with time-tested bodywork techniques.",
          primaryCta: { label: "Reserve your treatment", href: "/contact" },
        }),
        signatureRituals,
        thermalCircuitFeatures,
        theSpaceStory,
        reserveCta,
      ],
    },
    {
      name: "Memberships",
      slug: "/pricing",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Immersions & Sanctuary Club",
          heading: "A dedicated sanctuary for regular recalibration",
          subheading: "Choose single visit passes, curated half-day packages, or monthly membership to the Halftone Circle.",
        }),
        pricingPackages,
        faqSection,
        reserveCta,
      ],
    },
    {
      name: "The Sanctuary",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "Our Sanctuary",
          heading: "Architecture created for tranquility and nervous system ease",
          subheading: "From natural acoustics to geothermal mineral waters, discover the philosophy guiding every ritual at {{businessName}}.",
          image: photo("1507652313519-d4e9174996dd", "{{businessName}} private soaking tub", 1400),
          imageStyle: "rounded",
          primaryCta: { label: "Book a visit", href: "/contact" },
        }),
        theSpaceStory,
        bathhouseGallery,
        pressReviews,
        reserveCta,
      ],
    },
    {
      name: "Reservations",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "split-form",
          eyebrow: "Reserve your ritual",
          heading: "Connect with our spa concierge",
          text: "We invite you to select your preferred treatment date and time. Our concierge confirms every reservation individually.",
          email: "concierge@halftonespa.com",
          phone: "(212) 555-0182",
          address: "74 Mercer Street, SoHo, New York, NY",
          officeHours: "Tue–Sun 9:00am–10:00pm",
          responseTime: "Concierge response within 2 hours",
          showForm: true,
          formHeading: "Request a reservation",
          serviceOptions: [
            "Thermal Bathhouse Pass (2 hrs)",
            "Volcanic Hot Stone Bodywork (75 min)",
            "Cellular Sculpting Facial (60 min)",
            "Couples Sanctuary Suite (120 min)",
            "Sound Bath & Energy Restoration (60 min)",
            "The Full Immersion Half-Day Package",
          ],
          submitLabel: "Submit reservation request",
          cardStyle: "elevated",
        }),
        faqSection,
      ],
    },
  ],
});
