import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { DENTAL_CLINIC_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "headline-ticker",
  siteName: NAME,
  logo: DENTAL_CLINIC_LOGO,
  logoDisplay: "logo_only",
  announcement: "Now welcoming new patients • Same-day emergency appointments • 0% dental financing available",
  announcementLink: { label: "Book visit", href: "/contact" },
  menu: [
    { label: "Home", href: "/" },
    { label: "Treatments", href: "/services" },
    { label: "Membership", href: "/pricing" },
    { label: "Our Doctors", href: "/team" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Book appointment", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  logo: DENTAL_CLINIC_LOGO,
  tagline: "Gentle dental care in a calm, modern space",
  description: "Comprehensive aesthetic, restorative and preventative family dentistry with state-of-the-art digital technology.",
  columns: [
    {
      title: "Treatments",
      links: [
        { label: "Preventative & cleanings", href: "/services" },
        { label: "Invisalign aligners", href: "/services" },
        { label: "Porcelain veneers", href: "/services" },
        { label: "Dental implants", href: "/services" },
        { label: "Laser whitening", href: "/services" },
      ],
    },
    {
      title: "Practice",
      links: [
        { label: "Our clinicians", href: "/team" },
        { label: "Smile membership plan", href: "/pricing" },
        { label: "Emergency care", href: "/contact" },
        { label: "New patient guide", href: "/contact" },
      ],
    },
  ],
  contact: {
    email: "hello@brightsidedental.com",
    phone: "(312) 555-0194",
    address: "420 N Michigan Ave, Suite 900, Chicago, IL",
    hours: "Mon–Fri 7:30am–6:30pm · Sat 8am–2pm",
  },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "Facebook", href: "https://www.facebook.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com" },
  ],
  paymentMethods: { enabled: true, methods: ["visa", "mastercard", "amex", "applepay"] },
  legalLinks: [
    { label: "Privacy policy", href: "/about" },
    { label: "HIPAA notice", href: "/contact" },
  ],
  copyright: `© 2026 ${NAME} Dental Group · IL Dental License #DS-94210`,
};

const credentials = section(
  "marquee",
  {
    variant: "pill-badges",
    eyebrow: "Accredited clinical excellence",
    items: [
      { text: "ADA Accredited Practice", icon: "shield" },
      { text: "Invisalign Diamond Provider", icon: "star" },
      { text: "Zero-Radiation 3D Scans", icon: "sparkles" },
      { text: "Pain-Free Guarantee", icon: "heart" },
      { text: "Same-Day Emergency Visits", icon: "clock" },
      { text: "CareCredit 0% Financing", icon: "check" },
    ],
    speed: "slow",
    gradientFades: true,
    pauseOnHover: true,
  },
  { spacing: "compact" },
);

const treatments = section(
  "services",
  {
    variant: "bento-grid",
    eyebrow: "Our treatments",
    heading: "Complete dentistry, designed around comfort",
    intro: "From routine check-ups to full smile transformations, all delivered with gentle care in private suites.",
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
        title: "Invisalign Clear Aligners & Orthodontics",
        description: "Custom digital treatment plans designed by certified orthodontists. Straighten without metal brackets or dietary restrictions.",
        image: photo("1606811841689-23dfddce3e95", "Healthy bright aligned smile", 1000),
        featured: true,
        icon: "sparkles",
        badge: "Top Choice 2026",
        price: "From $2,800",
        duration: "Avg 6–9 months",
        features: ["Complimentary 3D iTero digital preview", "Zero metal brackets or food restrictions", "Includes premium take-home whitening"],
        link: { label: "Book free 3D scan", href: "/contact" },
      },
      {
        title: "Preventative Hygiene & Ultrasound Cleanings",
        description: "Comprehensive exams, gentle piezoelectric ultrasonic scaling, digital decay detection and oral cancer screenings.",
        icon: "shield",
        badge: "Routine Care",
        price: "$140 or Free with Plan",
        duration: "45 min",
        features: ["Ultrasonic scaling", "Enamel fluoridation & polish", "Low-dose digital x-rays"],
        link: { label: "Explore hygiene", href: "/services" },
      },
      {
        title: "Artisan Porcelain Veneers",
        description: "Handcrafted ultra-thin porcelain shells crafted to enhance tooth shape, shade, and harmonious facial symmetry.",
        icon: "heart",
        badge: "Cosmetic",
        price: "Custom Smile Design",
        duration: "2 visits",
        features: ["Custom artisan ceramics", "Digital trial smile preview in 48 hours", "10-year aesthetic warranty"],
        link: { label: "View smile gallery", href: "/services" },
      },
      {
        title: "Dental Implants & Restorative Crowns",
        description: "Titanium and ceramic implant restorations that look, feel, and function just like your natural healthy teeth.",
        icon: "tools",
        price: "From $1,950",
        duration: "Permanent",
        features: ["3D guided surgical precision", "Bone preservation & natural chewing", "Lifetime warranty on fixtures"],
        link: { label: "Book implant consult", href: "/services" },
      },
      {
        title: "Same-Day Emergency Relief",
        description: "Toothaches, broken crowns, or sporting injuries seen the same day with priority pain alleviation and dedicated slots.",
        icon: "bolt",
        badge: "Same-Day Openings",
        price: "Fixed Diagnostic Fee",
        duration: "Priority arrival",
        features: ["Immediate pain alleviation", "Temporary & permanent fixes", "On-call weekend staff"],
        link: { label: "Emergency call-out", href: "/contact" },
      },
      {
        title: "Zero-Anxiety Sedation & Comfort Care",
        description: "Nitrous oxide and conscious oral sedation for anxious patients, paired with ceiling video displays and warm neck wraps.",
        icon: "user",
        badge: "Anxiety-Free",
        price: "Complimentary Amenities",
        duration: "Your pace",
        features: ["Nitrous oxide & conscious oral sedation", "Overhead Netflix & Bose headphones", "Zero-pressure stop-anytime policy"],
        link: { label: "Read comfort guide", href: "/services" },
      },
    ],
  },
  { background: "surface" },
);

const comfortExperience = section("split", {
  eyebrow: "The Comfort Experience",
  heading: "Dentistry without the dental clinic anxiety",
  body: "We intentionally eliminated everything people dread about dental visits: the cold chemical smell, harsh fluorescent overheads, intimidating instruments, and rushed appointments.\n\nRelax in private suites featuring memory-foam heated massage chairs, noise-canceling headphones, ceiling video displays, and warm organic lavender towelettes following your visit.",
  bullets: [
    "Strict zero-wait policy: your appointment time is your exact chair time",
    "High-definition 3D camera displays: see what your doctor sees before treatment",
    "Beverage bar with organic teas, cold-pressed juices, and electrolyte water",
  ],
  image: photo("1588776814546-1ffcf47267a5", "Friendly dental consultation in private suite", 1200),
  imagePosition: "right",
  cta: { label: "Schedule your visit", href: "/contact" },
});

const clinicStats = section("stats", {
  heading: "Excellence in numbers across Chicago",
  items: [
    { value: "18,500+", label: "Happy smiles transformed" },
    { value: "0 min", label: "Average wait time" },
    { value: "4.9★", label: "From 1,400+ Google reviews" },
    { value: "100%", label: "Digital low-dose scans" },
  ],
});

const pricingSnapshot = section(
  "pricing",
  {
    variant: "horizontal-rows",
    heading: "Transparent dental fees & membership",
    intro: "No hidden charges, surprise out-of-pocket bills, or confusing insurance codes.",
    footerNote: "We accept all major PPO insurance plans and offer 0% financing through CareCredit & Sunbit.",
    plans: [
      {
        name: "New patient complete exam & clean",
        price: "$179",
        originalPrice: "$320",
        badge: "New Patient Special",
        description: "Includes comprehensive exam, cleaning, low-dose digital x-rays, and oral cancer check.",
        features: ["60-minute appointment", "3D digital scan preview", "Full doctor consultation"],
        cta: { label: "Book online", href: "/contact" },
        featured: false,
      },
      {
        name: "{{businessName}} Smile Membership",
        price: "$29",
        period: "/month",
        badge: "No Insurance Needed",
        description: "Full preventative care plus 20% off all restorative and cosmetic treatments.",
        features: ["2 cleanings & exams per year", "All emergency exams included", "20% off all treatments", "No waiting periods"],
        cta: { label: "Join membership", href: "/pricing" },
        featured: true,
        highlightNote: "Saves patients an average of $640/year",
      },
      {
        name: "Professional in-office laser whitening",
        price: "$349",
        originalPrice: "$450",
        badge: "Single Session",
        description: "Up to 8 shades whiter in a single 45-minute treatment, with zero enamel damage.",
        features: ["Custom desensitizing gel", "Take-home maintenance tray", "Instant results"],
        cta: { label: "Book whitening", href: "/contact" },
        featured: false,
      },
      {
        name: "Invisalign alignment consult",
        price: "Free",
        description: "Complimentary 30-minute 3D digital smile simulation with our specialist.",
        features: ["See before & after simulation", "Accurate treatment timeline", "Flexible payment breakdown"],
        cta: { label: "Claim consult", href: "/contact" },
        featured: false,
      },
    ],
  },
  { background: "surface" },
);

const teamSection = section(
  "team",
  {
    variant: "spotlight-featured",
    eyebrow: "Clinical directors",
    heading: "Doctors dedicated to precision and gentle care",
    intro: "Our multidisciplinary team combines ivy-league training with empathetic bedside manner.",
    columns: 3,
    mobileColumns: 1,
    members: [
      {
        name: "Dr. Elena Rostova, DDS",
        role: "Founder & Cosmetic Director",
        bio: "Harvard School of Dental Medicine graduate with 16 years specializing in minimally invasive aesthetic veneers and full mouth rehabilitation.",
        photo: photo("1559839734-2b71ea197ec2", "Dr. Elena Rostova", 600),
      },
      {
        name: "Dr. Marcus Thorne, DMD",
        role: "Orthodontist & Implantologist",
        bio: "Columbia University trained specialist dedicated to painless digital Invisalign workflows and guided dental implant restorations.",
        photo: photo("1622253692010-333f2da6031d", "Dr. Marcus Thorne", 600),
      },
      {
        name: "Dr. Sarah Chen, DDS",
        role: "Pediatric & Preventative Specialist",
        bio: "Renowned for calming dental anxiety in children and adults alike with gentle communication and micro-abrasion techniques.",
        photo: photo("1594824813629-b68b75c1c875", "Dr. Sarah Chen", 600),
      },
    ],
  },
);

const reviews = section("testimonials", {
  heading: "What our patients say",
  items: [
    {
      quote: "I avoided the dentist for 7 years due to phobia. The team at {{businessName}} completely changed that. Warm neck pillow, Netflix on the ceiling, zero pain.",
      name: "Jessica Morales",
      role: "Patient since 2023 · Gold Coast",
    },
    {
      quote: "Got my Invisalign and whitening done here. The 3D scan at my first visit predicted the exact outcome. My smile has never looked better.",
      name: "Marcus Vance",
      role: "Invisalign Patient · Lincoln Park",
    },
    {
      quote: "Their Smile Membership saved me hundreds after switching jobs without dental insurance. The facility is pristine and the doctors are exceptional.",
      name: "David Sterling",
      role: "Membership Patient · River North",
    },
  ],
});

const faq = section("faq", {
  variant: "split-sidebar",
  eyebrow: "Patient questions",
  heading: "Everything you need to know before your visit",
  intro: "Honest, clear answers about insurance, scheduling and dental anxiety.",
  supportCta: {
    title: "Have a specific question?",
    description: "Our front-desk clinical concierge is available to assist by phone or text.",
    link: { label: "Call (312) 555-0194", href: "tel:+13125550194" },
  },
  items: [
    {
      question: "Do you accept my dental insurance?",
      answer: "Yes, we are in-network with most major PPO insurance plans (Delta Dental, Cigna, MetLife, Aetna, Guardian). We handle all claim submissions directly on your behalf.",
    },
    {
      question: "What if I don't have dental insurance?",
      answer: "Over 40% of our patients utilize our in-house Smile Membership Plan ($29/month), which covers all routine cleanings, x-rays, exams, and gives 20% off all restorative work with no waiting periods.",
    },
    {
      question: "How do you handle dental anxiety?",
      answer: "We offer conscious oral sedation, nitrous oxide, noise-canceling Bose headphones, overhead streaming television, and a strict 'stop whenever you raise a hand' policy.",
    },
    {
      question: "Do you accommodate same-day emergencies?",
      answer: "Yes. We reserve daily appointment blocks exclusively for emergency patients experiencing tooth pain, cracked teeth, or trauma. Call our main line for priority scheduling.",
    },
  ],
});

const bookCta = section(
  "cta",
  {
    variant: "floating-card",
    eyebrow: "Online booking available 24/7",
    heading: "Experience modern, gentle dentistry",
    text: "Join over 5,000 Chicago families who love their dental visits. Same-day slots available.",
    button: { label: "Book appointment", href: "/contact" },
    secondaryButton: { label: "Call (312) 555-0194", href: "tel:+13125550194" },
    trustBadges: ["4.9 ★ on Google Reviews", "In-network with PPO plans", "Zero-radiation 3D imaging"],
    cardStyle: "elevated",
  },
  { background: "surface" },
);

export const DENTAL_CLINIC: BusinessTemplate = businessTemplate({
  key: "dental-clinic-fresh",
  name: "Dental Clinic · Fresh",
  category: "Health",
  description: "A modern, high-trust dental clinic website featuring 3D digital services, transparent membership pricing, clinician spotlights and online booking.",
  themeName: "Brightside Fresh Mint",
  theme: {
    colors: {
      primary: "#0E8A7A",
      secondary: "#18A999",
      background: "#FFFFFF",
      surface: "#EBF7F5",
      text: "#0B2D3A",
      muted: "#4F6B77",
    },
    fonts: { heading: "plus-jakarta-sans", body: "plus-jakarta-sans" },
    buttonStyle: "filled",
    cardStyle: "shadow",
    radius: "lg",
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
            variant: "floating-cards",
            eyebrow: "Modern Family & Cosmetic Dentistry",
            heading: "Gentle dental care for your healthiest smile",
            highlightText: "healthiest smile",
            subheading:
              "Check-ups, clear aligners and restorative treatments in a calm, welcoming clinic. Transparent pricing with zero dental anxiety.",
            primaryCta: { label: "Book appointment", href: "/contact" },
            secondaryCta: { label: "Explore treatments", href: "/services" },
            image: photo("1629909613654-28e377c37b09", "{{businessName}} modern clinical suite", 1600),
            imageStyle: "glow",
            floatingCards: [
              { title: "4.9 ★ Rating", subtitle: "1,400+ verified reviews", icon: "star", badge: "Top Rated" },
              { title: "Same-Day Visits", subtitle: "Emergency relief slots", icon: "clock", badge: "Reserved Daily" },
              { title: "$29/mo Plan", subtitle: "No insurance needed", icon: "shield", badge: "Instant Savings" },
            ],
          }
        ),
        credentials,
        treatments,
        comfortExperience,
        clinicStats,
        pricingSnapshot,
        teamSection,
        reviews,
        faq,
        bookCta,
      ],
    },
    {
      name: "Treatments",
      slug: "/services",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Clinical Services",
          heading: "Comprehensive dental care under one roof",
          subheading: "Advanced preventative, aesthetic, and surgical dental procedures delivered with micro-precision.",
          primaryCta: { label: "Book a consultation", href: "/contact" },
        }),
        treatments,
        comfortExperience,
        reviews,
        bookCta,
      ],
    },
    {
      name: "Membership",
      slug: "/pricing",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Transparent Pricing",
          heading: "Honest dental fees with no hidden costs",
          subheading: "Whether utilizing PPO insurance or our in-house Smile Membership Plan, you will always know your exact cost upfront.",
        }),
        pricingSnapshot,
        faq,
        bookCta,
      ],
    },
    {
      name: "Our Doctors",
      slug: "/team",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "The Clinical Team",
          heading: "Compassionate experts who treat you like family",
          subheading: "Our dentists and hygienists continuously train in the latest digital techniques to ensure your visits are fast, gentle, and lasting.",
          image: photo("1588776814546-1ffcf47267a5", "{{businessName}} dentists in discussion", 1400),
          imageStyle: "rounded",
          primaryCta: { label: "Meet the team", href: "/contact" },
        }),
        teamSection,
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
          eyebrow: "Schedule an appointment",
          heading: "We look forward to seeing you",
          text: "Book your visit online in under 2 minutes. For emergency pain relief or same-day appointments, call us directly.",
          email: "hello@brightsidedental.com",
          phone: "(312) 555-0194",
          address: "420 N Michigan Ave, Suite 900, Chicago, IL",
          officeHours: "Mon–Fri 7:30am–6:30pm · Sat 8am–2pm",
          responseTime: "Immediate online booking",
          showForm: true,
          formHeading: "Request your appointment",
          serviceOptions: ["Routine Cleaning & Exam", "Invisalign Consult", "Emergency Visit", "Teeth Whitening", "Implants / Restorative", "Second Opinion"],
          submitLabel: "Confirm appointment request",
          cardStyle: "elevated",
        }),
        faq,
      ],
    },
  ],
});
