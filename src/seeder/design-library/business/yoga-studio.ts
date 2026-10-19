import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { YOGA_STUDIO_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "split-stacked",
  siteName: NAME,
  logo: YOGA_STUDIO_LOGO,
  logoDisplay: "logo_only",
  tagline: "Mindful movement and botanical sanctuary",
  statusText: "Next class: 5:30pm Heated Vinyasa Flow with Anya",
  statusColor: "green",
  utilityLinks: [
    { label: "Studio schedule", href: "/classes" },
    { label: "First class free", href: "/pricing" },
    { label: "Call (415) 555-0149", href: "tel:+14155550149" },
  ],
  menu: [
    { label: "Home", href: "/" },
    { label: "Classes", href: "/classes" },
    { label: "Passes & Pricing", href: "/pricing" },
    { label: "Teachers & Space", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Book a class", href: "/classes" },
  secondaryCta: { label: "Free pass", href: "/pricing" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  logo: YOGA_STUDIO_LOGO,
  tagline: "Breathe, stretch and slow down",
  description: "A sunlit sanctuary for yoga, sound healing and conscious breathwork. Heated and non-heated daily practices for all bodies.",
  columns: [
    {
      title: "Practices",
      links: [
        { label: "Heated vinyasa flow", href: "/classes" },
        { label: "Yin & sound healing", href: "/classes" },
        { label: "Breathwork & kundalini", href: "/classes" },
        { label: "Gentle restorative", href: "/classes" },
        { label: "Beginner foundations", href: "/classes" },
      ],
    },
    {
      title: "Community",
      links: [
        { label: "Our teachers", href: "/about" },
        { label: "Memberships & passes", href: "/pricing" },
        { label: "200-hour teacher training", href: "/classes" },
        { label: "Studio ethics & sustainability", href: "/about" },
      ],
    },
  ],
  contact: {
    email: "hello@evergreenyoga.com",
    phone: "(415) 555-0149",
    address: "880 Valencia Street, Mission District, San Francisco, CA",
    hours: "Daily 6:30am–9:00pm · Classes 7 days a week",
  },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "Spotify", href: "https://www.spotify.com" },
    { label: "YouTube", href: "https://www.youtube.com" },
  ],
  paymentMethods: { enabled: true, methods: ["visa", "mastercard", "applepay"] },
  legalLinks: [
    { label: "Studio guidelines", href: "/about" },
    { label: "Liability waiver", href: "/about" },
  ],
  copyright: `© 2026 ${NAME} Sanctuary LLC · 1% For The Planet Member`,
};

const marqueeValues = section(
  "marquee",
  {
    variant: "pill-badges",
    eyebrow: "Holistic movement traditions",
    items: [
      { text: "Radiant Infrared Heating (85°–95°F)", icon: "bolt" },
      { text: "Certified Organic Cork Mats", icon: "shield" },
      { text: "Tibetan Singing Bowls & Sound Bath", icon: "sparkles" },
      { text: "Complimentary Herbal Tea & Towels", icon: "heart" },
      { text: "50+ Weekly Classes Across All Levels", icon: "star" },
      { text: "Your First Class is Free", icon: "check" },
    ],
    speed: "slow",
    gradientFades: true,
    pauseOnHover: true,
  },
  { spacing: "compact" },
);

const classStyles = section(
  "services",
  {
    variant: "bento-grid",
    eyebrow: "Class styles",
    heading: "Practices for every body, energy and state of mind",
    intro: "Whether you seek an energizing athletic sweat or quiet nervous system restoration, there is a space on the mat for you.",
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
        title: "Infrared Heated Power Vinyasa",
        description: "Fast-paced breath-to-movement flow set to curated music in our 92°F radiant-heated cedar studio.",
        image: photo("1545205597-3d9d02c29597", "Power vinyasa in sunlit cedar studio", 1000),
        featured: true,
        icon: "bolt",
        iconColor: "orange",
        badge: "Heated (92°F)",
        badgeColor: "orange",
        price: "60 or 75 min",
        duration: "Athletic & Sweaty",
        features: ["Breath-to-movement rhythmic flow", "Gentle radiant infrared sweat (heats body directly)", "Creative sequence peaks & core work"],
        link: { label: "Book heated flow", href: "/classes" },
      },
      {
        title: "Candlelit Yin & Tibetan Sound Healing",
        description: "Floor-based postures held for 3–5 minutes targeting fascial connective tissue, ending with a 20-minute sound bath.",
        icon: "sparkles",
        iconColor: "green",
        badge: "Unheated (74°F)",
        badgeColor: "green",
        price: "75 min",
        duration: "Deep Release",
        features: ["Joint mobility & fascia release", "20-minute singing bowl sound bath", "Soothing candlelit room atmosphere"],
        link: { label: "Book candlelit yin", href: "/classes" },
      },
      {
        title: "Conscious Breathwork & Flow",
        description: "Grounding breathwork exercises combined with alignment-focused hatha yoga to expand lung capacity and center attention.",
        icon: "heart",
        iconColor: "blue",
        badge: "Alignment & Prana",
        badgeColor: "blue",
        price: "60 min",
        duration: "Moderate",
        features: ["Four-stage pranayama breath control", "Steady mindful posture holds", "Parasympathetic nervous system reset"],
        link: { label: "Book breathwork", href: "/classes" },
      },
      {
        title: "Gentle Foundations & Mobility",
        description: "Step-by-step guidance exploring core postures, transitions, and personalized prop modifications without pressure.",
        icon: "shield",
        iconColor: "purple",
        badge: "Beginners Welcome",
        badgeColor: "purple",
        price: "60 min",
        duration: "Accessible All-Levels",
        features: ["Zero intimidation: clear alignments", "Cork blocks and cotton strap variations", "Optional hands-on assists"],
        link: { label: "Book foundations", href: "/classes" },
      },
      {
        title: "Kundalini Kriya & Gong Meditation",
        description: "Repetitive rhythmic movement, mantra chant, and breath retention followed by deep sonic immersion with our 38-inch symphonic gong.",
        icon: "star",
        iconColor: "yellow",
        badge: "Energy Awakening",
        badgeColor: "yellow",
        price: "75 min",
        duration: "Transformative",
        features: ["Rhythmic breath of fire & spinal kriyas", "Mantra chanting for mental clarity", "Symphonic 38-inch gong vibrations"],
        link: { label: "Book kundalini", href: "/classes" },
      },
      {
        title: "Sunday Community Sound Sanctuary",
        description: "Our signature Sunday evening collective reset featuring crystal singing bowls, chimes, and grounding herbal elixirs.",
        icon: "user",
        iconColor: "cyan",
        badge: "Sunday 7:00 PM",
        badgeColor: "cyan",
        price: "90 min",
        duration: "Deep Reset",
        features: ["Multi-instrumental acoustic healing", "Guided body-scan relaxation", "Post-practice community herbal tea"],
        link: { label: "Reserve Sunday mat", href: "/classes" },
      },
    ],
  },
  { background: "surface" },
);

const studioFeatures = section(
  "features",
  {
    variant: "pastel-icons",
    eyebrow: "The sanctuary space",
    heading: "Designed as an antidote to urban overwhelm",
    columns: 4,
    mobileColumns: 1,
    iconStyle: "pastel-circle",
    items: [
      {
        icon: "bolt",
        iconColor: "orange",
        title: "Infrared Radiant Heat",
        description: "Gently warms the body directly rather than blowing dry, stuffy air. Promotes circulation and deeper flexibility.",
      },
      {
        icon: "shield",
        iconColor: "green",
        title: "Zero-Waste Cork Props",
        description: "Antimicrobial, sustainable cork blocks, organic cotton straps and bolsters sanitized with natural essential oils.",
      },
      {
        icon: "sparkles",
        iconColor: "purple",
        title: "Pure Air Filtration",
        description: "Medical-grade HEPA filters exchange 100% of studio air every 12 minutes with forest air infusions.",
      },
      {
        icon: "heart",
        iconColor: "cyan",
        title: "Complimentary Tea & Mats",
        description: "Manduka Pro mats available at no extra charge, alongside our daily house-brewed organic herbal infusions.",
      },
    ],
  },
  { background: "surface" },
);

const studioStats = section("stats", {
  heading: "A community grounded in mindful presence",
  items: [
    { value: "12 yrs", label: "Rooted in the Mission" },
    { value: "52", label: "Weekly classes on schedule" },
    { value: "18", label: "Dedicated certified guides" },
    { value: "100%", label: "Renewable solar powered" },
  ],
});

const teachersSection = section(
  "team",
  {
    variant: "spotlight-featured",
    eyebrow: "Our guides",
    heading: "Experienced teachers with open hearts",
    intro: "Every teacher brings deep personal study across Indian, Tibetan, and modern anatomical traditions.",
    columns: 3,
    mobileColumns: 1,
    members: [
      {
        name: "Anya Sharma",
        role: "Founder & Lead Vinyasa Guide",
        bio: "500-hour E-RYT with 14 years teaching in Rishikesh, Bali and San Francisco. Known for creative rhythm and uplifting sequencing.",
        photo: photo("1494790108377-be9c29b29330", "Anya Sharma", 600),
      },
      {
        name: "Kai Tanaka",
        role: "Sound Alchemist & Yin Teacher",
        bio: "Trained in Tibetan singing bowls in Dharamshala, Kai blends deep anatomical yin holds with sacred resonant acoustics.",
        photo: photo("1500648767791-00dcc994a43e", "Kai Tanaka", 600),
      },
      {
        name: "Elena Frost",
        role: "Breathwork & Restorative Specialist",
        bio: "Dedicated to trauma-informed mindfulness, nervous system regulation, and accessible prop modifications for all bodies.",
        photo: photo("1580489944761-15a19d654956", "Elena Frost", 600),
      },
    ],
  },
);

const pricingPasses = section(
  "pricing",
  {
    variant: "cards-grid",
    eyebrow: "Passes & memberships",
    heading: "Simple, honest investment in your practice",
    intro: "No long-term contracts. Pause or cancel your membership anytime with 7 days notice.",
    columns: 3,
    mobileColumns: 1,
    cardStyle: "elevated",
    plans: [
      {
        name: "Single Drop-in",
        price: "$26",
        period: "/class",
        description: "Ideal for travelers and flexible schedules.",
        features: ["Access to any regular class", "Complimentary mat & towel", "Herbal tea lounge", "Valid for 30 days"],
        cta: { label: "Buy drop-in", href: "/classes" },
        featured: false,
      },
      {
        name: "Unlimited Studio Pass",
        price: "$165",
        period: "/month",
        badge: "Best Value",
        description: "Unlimited in-studio and livestream classes.",
        features: ["Unlimited weekly classes", "2 complimentary guest passes monthly", "15% off workshops & retreats", "Free mat storage locker"],
        cta: { label: "Join unlimited", href: "/pricing" },
        featured: true,
        highlightNote: "Pays for itself in 7 classes a month",
      },
      {
        name: "10-Class Pack",
        price: "$210",
        originalPrice: "$260",
        period: "/pack",
        badge: "Save $50",
        description: "Flexible pack for practicing 1–2 times weekly.",
        features: ["$21 per class (save $50)", "Shareable with a partner", "Complimentary mat rental", "Valid for 6 full months"],
        cta: { label: "Buy 10-pack", href: "/classes" },
        featured: false,
      },
    ],
    footerNote: "All class passes and memberships include complimentary Manduka cork mats, organic cotton towels, and herbal tea lounge access.",
  },
  { background: "surface" },
);

const communityReviews = section("testimonials", {
  heading: "Words from our sangha & students",
  items: [
    {
      quote: "Evergreen is more than a studio — it has become my daily mental sanctuary. The warm cedar room, the smell of Palo Santo, and Anya's classes are pure medicine.",
      name: "Maya Lin",
      role: "Student for 4 years · Mission District",
    },
    {
      quote: "The Sunday evening sound bath cured my insomnia. The infrared heat feels like natural sunlight on cold SF days. Cannot recommend it enough.",
      name: "Julian Rivera",
      role: "Unlimited Member",
    },
    {
      quote: "As a complete beginner, I was intimidated by yoga studios. The teachers here welcomed me with genuine warmth and zero judgment.",
      name: "Rachel Stern",
      role: "Practicing since 2024",
    },
  ],
});

const faq = section("faq", {
  variant: "split-sidebar",
  eyebrow: "New to Evergreen",
  heading: "Helpful details for your first visit",
  intro: "Everything you need to know before stepping onto the mat.",
  supportCta: {
    title: "Need help choosing a class?",
    description: "Our community team is happy to recommend the best class for your experience level.",
    link: { label: "Call (415) 555-0149", href: "tel:+14155550149" },
  },
  items: [
    {
      question: "How do I claim my free first class?",
      answer: "Local Bay Area residents can simply select 'First Class Free' at checkout when booking their initial class online, or arrive 15 minutes before class with photo ID.",
    },
    {
      question: "What should I bring to class?",
      answer: "Comfortable workout clothing and a water bottle. We provide premium Manduka cork mats, filtered electrolyte water, and organic cotton towels free of charge.",
    },
    {
      question: "How hot is the infrared heated room?",
      answer: "Our heated vinyasa classes range from 88°F to 94°F with gentle radiant warmth. Our Yin, Gentle, and Breathwork classes are completely unheated (around 72°F).",
    },
    {
      question: "Do you have showers and lockers?",
      answer: "Yes, our modern changerooms feature private rain showers with non-toxic organic shampoo, conditioner, and secure keyless lockers.",
    },
  ],
});

const freeClassCta = section(
  "cta",
  {
    variant: "floating-card",
    eyebrow: "First class is complimentary for locals",
    heading: "Step onto the mat today",
    text: "Experience the calming energy of our Mission District sanctuary. Reserve your mat in under a minute.",
    button: { label: "Claim free class", href: "/classes" },
    secondaryButton: { label: "Call (415) 555-0149", href: "tel:+14155550149" },
    trustBadges: ["Free mat & towel rental", "50+ classes weekly", "Non-toxic organic space"],
    cardStyle: "elevated",
  },
  { background: "surface" },
);

export const YOGA_STUDIO: BusinessTemplate = businessTemplate({
  key: "yoga-studio-forest",
  name: "Yoga Studio · Forest",
  category: "Health",
  description: "A warm botanical yoga and sound healing studio website featuring infrared heated classes, teacher spotlights, flexible passes and class bookings.",
  themeName: "Evergreen Forest Sanctuary",
  theme: {
    colors: {
      primary: "#2D5A3D",
      secondary: "#C97A52",
      background: "#F7F5EE",
      surface: "#E4ECE0",
      text: "#16261A",
      muted: "#506655",
    },
    fonts: { heading: "cormorant", body: "plus-jakarta-sans" },
    buttonStyle: "filled",
    cardStyle: "shadow",
    radius: "md",
    containerWidth: 1220,
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
            eyebrow: "Mindful Movement & Sound Sanctuary",
            heading: "Breathe, stretch and slow down",
            highlightText: "slow down",
            subheading:
              "Heated vinyasa, restorative yin, and sound baths in a sunlit botanical studio. Your first class is complimentary.",
            primaryCta: { label: "View daily schedule", href: "/classes" },
            secondaryCta: { label: "First class free", href: "/pricing" },
            image: photo("1545205597-3d9d02c29597", "{{businessName}} sunlit wooden studio practice", 1600),
            imageStyle: "glow",
            floatingCards: [
              { title: "Heated to 92°F", subtitle: "Infrared radiant sun-warmth", icon: "bolt", badge: "Gentle Heat" },
              { title: "52 Weekly Classes", subtitle: "All levels beginner to advanced", icon: "heart", badge: "Daily Schedule" },
              { title: "First Class Free", subtitle: "Locals welcome on the mat", icon: "check", badge: "Complimentary" },
            ],
            rating: { stars: 5, text: "4.95 from 1,200+ yogis · SF Best Studio 2026", avatarCount: 5 },
          },
          { customColors: { gradientFrom: "#2D5A3D", gradientTo: "#5B8E6D" } },
        ),
        marqueeValues,
        classStyles,
        studioFeatures,
        studioStats,
        teachersSection,
        pricingPasses,
        communityReviews,
        faq,
        freeClassCta,
      ],
    },
    {
      name: "Classes",
      slug: "/classes",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Daily Schedule & Practices",
          heading: "Find the rhythm that fits your day",
          subheading: "Over 50 weekly classes ranging from heated athletic flows to deep sound healing and meditation.",
          primaryCta: { label: "Reserve your mat", href: "/contact" },
        }),
        classStyles,
        studioFeatures,
        freeClassCta,
      ],
    },
    {
      name: "Passes & Pricing",
      slug: "/pricing",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Studio Investment",
          heading: "Honest pricing with zero commitment pressure",
          subheading: "Choose flexible drop-in passes, multi-class packs, or our unlimited sanctuary membership.",
        }),
        pricingPasses,
        faq,
        freeClassCta,
      ],
    },
    {
      name: "Teachers & Space",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "Our Sanctuary",
          heading: "Built as an earth-first home for collective healing",
          subheading: "Learn about our non-toxic materials, 100% solar power, and our teacher collective.",
          image: photo("1575052814086-f385e2e2ad1b", "{{businessName}} serene botanical corner", 1400),
          imageStyle: "rounded",
          primaryCta: { label: "Meet our teachers", href: "/about" },
        }),
        teachersSection,
        studioFeatures,
        studioStats,
        freeClassCta,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "split-form",
          eyebrow: "Visit the sanctuary",
          heading: "We welcome you with open arms",
          text: "Have a question about class styles, private sessions, or teacher training? Reach out to our community team.",
          email: "hello@evergreenyoga.com",
          phone: "(415) 555-0149",
          address: "880 Valencia Street, Mission District, San Francisco, CA",
          officeHours: "Daily 6:30am–9:00pm",
          responseTime: "We reply within 3 hours",
          showForm: true,
          formHeading: "Send us an inquiry",
          serviceOptions: [
            "Claim First Free Class",
            "Unlimited Membership Question",
            "Private 1-on-1 Practice",
            "Sound Bath Group Booking",
            "200h Teacher Training Info",
            "General Question",
          ],
          submitLabel: "Send message",
          cardStyle: "elevated",
        }),
        faq,
      ],
    },
  ],
});
