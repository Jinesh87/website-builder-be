import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "../business/build.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "floating",
  siteName: NAME,
  menu: [
    { label: "Features", href: "/#features" },
    { label: "Vaults", href: "/#vaults" },
    { label: "Security", href: "/#security" },
    { label: "Card", href: "/#card" },
  ],
  cta: { label: "Get the App", href: "/#download" },
  announcement: "Aura v3.0 Launched — Now with 5.4% APY Automated Treasury Vaults",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  description:
    "Aura is the next-generation financial operating companion combining multi-currency global spending, automated high-yield vaults, and biometric security into one fluid mobile experience.",
  columns: [
    {
      title: "App Features",
      links: [
        { label: "Global Spending", href: "/#features" },
        { label: "High-Yield Vaults", href: "/#vaults" },
        { label: "Smart Roundups", href: "/#features" },
        { label: "Titanium Card", href: "/#card" },
      ],
    },
    {
      title: "Security & Trust",
      links: [
        { label: "FDIC Pass-Through", href: "/#security" },
        { label: "Zero-Fraud Guarantee", href: "/#security" },
        { label: "Biometric Locks", href: "/#security" },
        { label: "Compliance Disclosures", href: "/terms" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Aura", href: "/#features" },
        { label: "Press Kit", href: "/#features" },
        { label: "Support Concierge", href: "/contact" },
        { label: "Careers (We're Hiring)", href: "/contact" },
      ],
    },
  ],
  contact: {
    email: "support@aurafinance.app",
    phone: "+1 (800) 412-9092",
    address: "One Maritime Plaza, Suite 1800, San Francisco, CA",
  },
  social: [
    { label: "Apple App Store", href: "https://apple.com" },
    { label: "Google Play", href: "https://google.com" },
    { label: "Instagram", href: "https://instagram.com" },
  ],
  legalLinks: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Cardholder Agreement", href: "/terms" },
    { label: "Disclosures & Licences", href: "/security" },
  ],
  copyright: `© 2026 ${NAME}. Banking services provided by Evolve Bank & Trust, Member FDIC.`,
};

export const MOBILE_APP: BusinessTemplate = businessTemplate({
  key: "mobile-app-fresh",
  name: "Aura Pay · Fresh",
  category: "Landing page",
  description:
    "A fresh, modern FinTech and consumer mobile app landing page featuring an interactive hero banner slider, mobile UI previews, and high-conversion app download cards.",
  themeName: "Aura Mint Modern",
  theme: {
    colors: {
      primary: "#10B981",
      secondary: "#0EA5E9",
      background: "#05110E",
      surface: "#0C201B",
      text: "#F0FDF4",
      muted: "#86EFAC",
    },
    fonts: { heading: "manrope", body: "manrope" },
    buttonStyle: "filled",
    cardStyle: "shadow",
    radius: "lg",
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
        // 1. Mobile App Hero
        section(
          "hero",
          {
            variant: "split",
            eyebrow: "The Intelligent Money Companion",
            heading: "Money that works as hard and moves as fast as you do",
            highlightText: "moves as fast as you do",
            subheading:
              "Experience zero-FX global spending, automated 5.4% APY wealth vaults, and instantaneous borderless transfers — all in an intuitive, private mobile experience.",
            primaryCta: { label: "Download for iOS", href: "/#download" },
            secondaryCta: { label: "Download for Android", href: "/#download" },
            image: photo("1512941937669-90a1b58e7e9c", "Aura mobile app interface on smartphone", 1200),
            imageStyle: "mockup",
            rating: { stars: 5, text: "4.9 Rating from 42,000+ App Store reviews", avatarCount: 4 },
          },
          { background: "default" },
        ),

        // 2. Distinct Banner Carousel: Hero Slider Banner Carousel
        section(
          "carousel",
          {
            variant: "hero-slider",
            eyebrow: "Designed for Everyday Financial Mastery",
            heading: "Every feature crafted to put your wealth on autopilot",
            intro: "Swipe through the core innovations powering over 450,000 daily accounts worldwide.",
            autoPlay: true,
            interval: 5,
            showArrows: true,
            showDots: true,
            slides: [
              {
                title: "Automated 5.4% APY Wealth Vaults",
                subtitle: "Daily Compound Interest",
                description:
                  "Put idle cash to work instantly with automated treasury yields compounded daily and zero lockup periods or withdrawal penalties.",
                badge: "5.4% Annual Yield",
                image: photo("1579621970563-ebec7560ff3e", "Smart savings vault growth and coin stack", 1200),
                button: { label: "Calculate Earnings", href: "/#vaults" },
                secondaryButton: { label: "Learn About Vaults", href: "/#features" },
              },
              {
                title: "Zero-FX Physical & Virtual Titanium Cards",
                subtitle: "Spend Anywhere in 140+ Currencies",
                description:
                  "Spend globally at the real interbank exchange rate with instant freeze controls, single-use burnable cards, and 2% unlimited cashback.",
                badge: "Zero Foreign Fees",
                image: photo("1556742049-0a67e557224d", "Contactless NFC payment with sleek titanium card", 1200),
                button: { label: "Order Your Card", href: "/#card" },
                secondaryButton: { label: "Card Benefits", href: "/#card" },
              },
              {
                title: "Autonomous Micro-Investing & Roundups",
                subtitle: "Grow While You Spend",
                description:
                  "Every coffee, grocery run, and flight booking rounds up to the nearest dollar and automatically diversifies into low-cost global index funds.",
                badge: "Effortless Investing",
                image: photo("1559526324-4b87b5e36e44", "Financial growth portfolio dashboard on phone", 1200),
                button: { label: "Explore Portfolios", href: "/#features" },
                secondaryButton: { label: "See How It Works", href: "/#features" },
              },
              {
                title: "Biometric Zero-Knowledge Security",
                subtitle: "Bank-Grade Protection Built In",
                description:
                  "Hardware-secured enclave biometrics, instantaneous transaction push notifications, and 24/7 AI fraud anomaly interception.",
                badge: "Zero-Fraud Guarantee",
                image: photo("1607604276583-eef5d076aa5f", "Biometric secure mobile authentication", 1200),
                button: { label: "Security Architecture", href: "/#security" },
              },
            ],
          },
          { background: "surface", spacing: "relaxed" },
        ),

        // 3. App Feature Services Grid
        section(
          "services",
          {
            variant: "cards-grid",
            eyebrow: "Why 450,000+ People Choose Aura",
            heading: "Modern banking without paperwork, hidden fees, or branch visits",
            columns: 3,
            mobileColumns: 1,
            showImages: true,
            showBadges: true,
            showIcons: true,
            items: [
              {
                title: "Instant Global P2P Transfers",
                description:
                  "Send money instantly to anyone with an Aura username or phone number anywhere in the world with zero transaction fees.",
                icon: "bolt",
                badge: "Instant",
                image: photo("1556740758-90de374c12ad", "Happy young person making phone transfer", 900),
                link: { label: "Learn More", href: "/#features" },
              },
              {
                title: "AI Budget Categorization",
                description:
                  "Watch your spending auto-sort with smart weekly digests, subscription cancellation reminders, and proactive bill forecasts.",
                icon: "sparkles",
                badge: "Smart Analytics",
                image: photo("1563986768609-322da13575f3", "Digital finance smartphone analytics", 900),
                link: { label: "Explore Analytics", href: "/#features" },
              },
              {
                title: "Burner Virtual Cards",
                description:
                  "Generate temporary card numbers for free trials and online checkouts that automatically expire after one single charge.",
                icon: "shield",
                badge: "Anti-Fraud",
                image: photo("1556742049-0a67e557224d", "Titanium security payment", 900),
                link: { label: "Virtual Cards", href: "/#card" },
              },
            ],
          },
          { background: "default" },
        ),

        // 4. Split Feature Section: Card Spotlight
        section(
          "split",
          {
            eyebrow: "Physical & Virtual Hardware",
            heading: "Precision-milled aerospace titanium engineered to turn heads",
            body: "No printed card numbers, no exposed CVV, and built-in RFID shielding. Tap with confidence anywhere in the world.",
            image: photo("1556742049-0a67e557224d", "Aura black titanium contactless payment card", 1200),
            imagePosition: "right",
            bullets: [
              "Precision-machined 16g solid aerospace grade titanium",
              "2% unlimited cash back deposited directly into your 5.4% yield vault",
              "Instant lock & unlock from your phone with zero delay",
              "Compatible with Apple Pay, Google Wallet, and Garmin Pay",
            ],
            cta: { label: "Claim Your Titanium Card", href: "/#download" },
          },
          { background: "surface" },
        ),

        // 5. Growth Metrics
        section(
          "stats",
          {
            heading: "Trusted by half a million digital citizens globally",
            intro: "Real numbers from real account holders moving money around the world every second.",
            items: [
              { value: "$3.4B+", label: "Annual Volume Transacted" },
              { value: "5.4%", label: "Yield on Cash Vaults" },
              { value: "4.9 ★", label: "App Store Rating" },
              { value: "< 2 min", label: "Account Setup Time" },
            ],
          },
          { background: "default" },
        ),

        // 6. Verified User Testimonials
        section(
          "testimonials",
          {
            heading: "What our account holders are saying",
            items: [
              {
                quote:
                  "I travel 8 months out of the year across Europe and Asia. Aura has saved me literally thousands in ATM and currency fees. It is the best financial product I have ever used.",
                name: "Siddharth Rao",
                role: "Product Designer & Digital Nomad",
              },
              {
                quote:
                  "The 5.4% daily compound vault is incredible. My emergency fund generates hundreds every month without me having to lock it in a restrictive CD.",
                name: "Chloe Vance",
                role: "Senior Software Engineer, Vercel",
              },
              {
                quote:
                  "The single-use burner cards saved me from a shady gym membership renewal. Aura auto-blocked the recurrent charge without me having to make a single phone call.",
                name: "Liam O'Connor",
                role: "Co-Founder, Outlier Media",
              },
            ],
          },
          { background: "surface" },
        ),

        // 7. Security & Banking FAQ
        section(
          "faq",
          {
            heading: "Frequently Asked Questions",
            intro: "Everything you need to know about deposits, cards, and regulation.",
            items: [
              {
                question: "Is my money safe and insured with Aura?",
                answer:
                  "Yes. Your funds are deposited with our program bank (Evolve Bank & Trust, Member FDIC), providing pass-through FDIC insurance of up to $2,500,000.",
              },
              {
                question: "How does the 5.4% APY vault earn interest?",
                answer:
                  "Aura routes your vault deposits directly into short-term US Treasury bills and high-yield central bank cash reserves, passing yields straight to you.",
              },
              {
                question: "Are there any monthly maintenance or minimum balance fees?",
                answer:
                  "None. There are zero account opening fees, zero monthly maintenance fees, zero minimum balance requirements, and zero foreign exchange markups.",
              },
              {
                question: "How fast can I get a card and start spending?",
                answer:
                  "Your virtual card is activated instantly inside Apple Pay or Google Wallet within 2 minutes of verification. Your physical titanium card arrives in 3–5 business days.",
              },
            ],
          },
          { background: "default" },
        ),

        // 8. Download Conversion CTA
        section(
          "cta",
          {
            variant: "centered-card",
            cardStyle: "elevated",
            eyebrow: "Available on iOS & Android",
            heading: "Ready to upgrade your financial life in two minutes?",
            text: "Scan the QR code or download directly from the App Store and Google Play to claim your welcome bonus.",
            button: { label: "Download on Apple App Store", href: "/#download" },
            secondaryButton: { label: "Get it on Google Play", href: "/#download" },
            trustBadges: ["Free account creation", "No impact on credit score", "Setup in under 120 seconds"],
          },
          { background: "surface" },
        ),
      ],
    },
  ],
});
