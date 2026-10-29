import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "../business/build.js";
import { UX_DESIGNER_LOGO } from "../logos.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "glass-dock",
  siteName: NAME,
  logo: UX_DESIGNER_LOGO,
  logoDisplay: "logo_only",
  menu: [
    { label: "Overview", href: "/" },
    { label: "Case Studies", href: "/portfolio" },
    { label: "Experience", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Book Discovery Call", href: "/contact" },
  announcement: "Available for Q3/Q4 Design Strategy & Fractional Leadership",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "cta-banner",
  siteName: NAME,
  logo: UX_DESIGNER_LOGO,
  description: "Senior Staff Product Designer crafting AI interfaces, scalable design systems, and high-conversion software products for visionary tech companies.",
  ctaBanner: {
    enabled: true,
    heading: "Have an ambitious product in mind?",
    subheading: "Let's build an interface your users love and your competitors admire.",
    primaryCta: { label: "Start Conversation", href: "/contact" },
    secondaryCta: { label: "View Case Studies", href: "/portfolio" },
  },
  columns: [
    {
      title: "Navigation",
      links: [
        { label: "Overview", href: "/" },
        { label: "Case Studies", href: "/portfolio" },
        { label: "Experience & Bio", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Specialties",
      links: [
        { label: "Generative AI UX", href: "/portfolio" },
        { label: "Enterprise Design Systems", href: "/portfolio" },
        { label: "Fintech Mobile Apps", href: "/portfolio" },
      ],
    },
  ],
  contact: {
    email: "alex@orbitux.design",
    phone: "+1 (415) 890-4421",
    address: "SoMa Design District, San Francisco, CA",
  },
  social: [
    { label: "Twitter", href: "https://x.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Dribbble", href: "https://dribbble.com" },
    { label: "GitHub", href: "https://github.com" },
  ],
  copyright: `© 2026 ${NAME}. Designed with precision in San Francisco.`,
};

export const UX_DESIGNER: BusinessTemplate = businessTemplate({
  key: "ux-designer-midnight",
  name: "UX Designer · Midnight",
  category: "Portfolio",
  description: "A dark-mode product designer portfolio featuring floating metric cards, in-depth interactive case studies, design system tokens, and client reviews.",
  themeName: "Orbit Midnight Dark",
  theme: {
    colors: {
      primary: "#8B6CFF",
      secondary: "#38BDF8",
      background: "#070A18",
      surface: "#111836",
      text: "#F1F4FD",
      muted: "#8E9AB8",
    },
    fonts: { heading: "sora", body: "inter" },
    buttonStyle: "filled",
    cardStyle: "border",
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
            variant: "curved-carousel",
            eyebrow: "Staff Product Designer & Design Technologist",
            badgeIcon: "⚡",
            heading: "Designing digital products that scale to millions",
            highlightText: "scale to millions",
            subheading: "Architecting generative AI interfaces, design system tokens, and high-conversion mobile ecosystems for next-generation technology leaders.",
            primaryCta: { label: "Explore Case Studies", href: "/portfolio" },
            secondaryCta: { label: "Book Discovery Call", href: "/contact" },
            curveIntensity: "medium",
            carouselSpeed: 38,
            carouselDirection: "left-to-right",
            carouselSlides: [
              {
                title: "Nova AI: Generative Canvas",
                subtitle: "Product Architecture · Series B",
                description: "Infinite workspace UI with 240% collaboration uplift",
                badge: "AI Canvas",
                image: photo("1618005182384-a83a8bd57fbe", "Nova AI Canvas 3D generative interface"),
              },
              {
                title: "Aura Pay: Global Treasury",
                subtitle: "Mobile Fintech · 850k Treasurers",
                description: "Frictionless international liquidity and biometric auth",
                badge: "Fintech App",
                image: photo("1512941937669-90a1b58e7e9c", "Aura Pay mobile app screen in hand"),
              },
              {
                title: "Prism: Multi-Brand Tokens",
                subtitle: "Design System · 42 Squads",
                description: "Unified cross-platform primitives for 320+ engineers",
                badge: "Figma 4.0",
                image: photo("1498050108023-c5249f4df085", "Prism design system tokens workstation"),
              },
              {
                title: "Pulse Health: Telemetry UI",
                subtitle: "Clinical Portal · 12 ICU Units",
                description: "Real-time vitals triage reducing alert fatigue by 48%",
                badge: "HealthTech",
                image: photo("1551288049-bebda4e38f71", "Pulse Health clinical telemetry charts"),
              },
              {
                title: "Verve Spatial: VisionOS OS",
                subtitle: "Spatial Computing · Vision Pro",
                description: "Gesture-controlled 3D data canvas for quantitative traders",
                badge: "Spatial UI",
                image: photo("1531403009284-440f080d1e12", "Spatial computing user interaction research"),
              },
              {
                title: "Kinetic: Micro-interactions",
                subtitle: "Motion System · 60fps Delight",
                description: "Physics-based haptics and spring animations library",
                badge: "Interaction",
                image: photo("1581291518857-4e27b48ff24e", "Interactive prototypes wireframe mapping"),
              },
            ],
          },
          {
            background: "default",
          },
        ),
        section(
          "marquee",
          {
            variant: "cards-stream",
            items: [
              { text: "Design Systems & Token Architecture", badge: "Figma" },
              { text: "AI Copilot Interfaces", badge: "LLM UX" },
              { text: "Fintech Workflows", badge: "Security" },
              { text: "Rapid Interactive Prototyping", badge: "React / ProtoPie" },
              { text: "User Research & Usability Labs", badge: "Qualitative" },
              { text: "Micro-interactions & Motion", badge: "Delight" },
            ],
            speed: "normal",
            pauseOnHover: true,
          },
          { background: "surface", spacing: "compact" },
        ),
        section("services", {
          variant: "bento-grid",
          eyebrow: "Selected Work",
          heading: "Flagship Case Studies",
          intro: "Deep dives into zero-to-one product design, system modernization, and enterprise interface overhauls.",
          columns: 3,
          mobileColumns: 1,
          items: [
            {
              title: "Nova AI: Generative Canvas",
              description: "Architected the infinite workspace UI for a Series B generative design assistant, increasing weekly active collaborators by 240%.",
              badge: "AI / Canvas",
              duration: "6 Months",
              features: [
                "Multi-model prompt canvas",
                "Real-time multiplayer cursor engine",
                "Design token hierarchy",
              ],
              image: photo("1618005182384-a83a8bd57fbe", "Nova AI Canvas interface mockups"),
            },
            {
              title: "Aura Pay: Global Treasury App",
              description: "Redesigned mobile international money movement for 850k enterprise treasurers with biometric auth and instant settlement.",
              badge: "Fintech",
              duration: "4 Months",
              features: [
                "120-country FX selector",
                "Sub-second transaction feedback",
                "WCAG 2.1 AAA Accessibility",
              ],
              image: photo("1512941937669-90a1b58e7e9c", "Aura Pay mobile app screens"),
            },
            {
              title: "Prism: Enterprise Design System",
              description: "Unified 42 engineering squads across web, iOS, and Android around a centralized Tailwind and Figma tokens pipeline.",
              badge: "Design Systems",
              duration: "8 Months",
              features: [
                "140+ headless primitives",
                "Automated contrast tests",
                "Adopted by 320+ engineers",
              ],
              image: photo("1498050108023-c5249f4df085", "Prism Design System documentation"),
            },
          ],
        }),
        section(
          "stats",
          {
            heading: "Measurable Impact",
            intro: "Design that directly translates into customer retention, team velocity, and business growth.",
            items: [
              { value: "$420M+", label: "Client ARR Influenced" },
              { value: "8.4M", label: "Monthly Active End-Users" },
              { value: "14", label: "Industry Design Awards" },
              { value: "65%", label: "Reduction in Support Friction" },
            ],
          },
          { background: "surface" },
        ),
        section("features", {
          variant: "grid",
          eyebrow: "Strategic Process",
          heading: "How I Turn Ambiguity into Product Momentum",
          columns: 4,
          mobileColumns: 1,
          items: [
            {
              icon: "chart",
              title: "1. Research & Synthesis",
              description: "Uncovering user pain points through contextual inquiry, session recordings, and metric funnels.",
            },
            {
              icon: "layers",
              title: "2. Architecture & Wireframes",
              description: "Mapping information hierarchy and mental models before touching high-fidelity visual polish.",
            },
            {
              icon: "sparkles",
              title: "3. High-Fidelity & Motion",
              description: "Crafting tactile, fluid interfaces with micro-interactions and rigorous multi-state component behavior.",
            },
            {
              icon: "rocket",
              title: "4. Ship & Iterate",
              description: "Collaborating directly in code with engineers to ensure zero design debt from Figma to production.",
            },
          ],
        }),
        section(
          "testimonials",
          {
            heading: "Leadership Recommendations",
            items: [
              {
                quote: "Alex possesses that rare hybrid ability to think at the 30,000-foot business strategy level and then execute pixel-perfect, accessible component systems.",
                name: "Sarah Jenkins",
                role: "VP of Product, Nova Systems",
              },
              {
                quote: "Working with Alex was the highest-leverage decision our startup made. Our product went from looking like an MVP to feeling like Apple built it.",
                name: "Tariq Mansoor",
                role: "Co-Founder & CEO, Aura Treasury",
              },
              {
                quote: "He unblocked our 40-engineer org with the Prism design system. Ship velocity doubled within two quarters.",
                name: "Evelyn Reed",
                role: "Head of Engineering, HyperScale Corp",
              },
            ],
          },
          { background: "surface" },
        ),
        section("cta", {
          variant: "floating-card",
          eyebrow: "Let's Collaborate",
          heading: "Ready to elevate your product's user experience?",
          text: "Available for select design advisory, executive design sprints, and principal design leadership engagements.",
          button: { label: "Schedule a Discovery Call", href: "/contact" },
          secondaryButton: { label: "Review Career Experience", href: "/about" },
        }),
      ],
    },
    {
      name: "Case Studies",
      slug: "/portfolio",
      sections: [
        section("hero", {
          variant: "soft-card",
          eyebrow: "Design Portfolio",
          heading: "Detailed Case Studies & Systems",
          subheading: "In-depth explorations of product thinking, research methodology, design systems, and business outcomes.",
        }),
        section("carousel", {
          variant: "curved-banner",
          badge: "Interactive Prototype Reels",
          heading: "Selected Interface Demonstrations",
          intro: "Live interaction recordings and design token implementations across enterprise and mobile platforms.",
          pauseOnHover: true,
          slides: [
            {
              title: "Nova AI: Generative Canvas",
              subtitle: "Infinite Multi-Modal Workspace",
              description: "Real-time canvas with 240% collaboration uplift",
              badge: "Series B SaaS",
              image: photo("1618005182384-a83a8bd57fbe", "Nova AI Canvas 3D generative interface"),
            },
            {
              title: "Aura Pay: Global Treasury",
              subtitle: "Biometric Liquidity Platform",
              description: "Sub-second cross-border payments for 850k enterprise accounts",
              badge: "Fintech App",
              image: photo("1512941937669-90a1b58e7e9c", "Aura Pay mobile app screen in hand"),
            },
            {
              title: "Prism: Multi-Brand Tokens",
              subtitle: "Cross-Platform Design System",
              description: "Unified Tailwind and Figma tokens used by 320+ engineers",
              badge: "Design Infrastructure",
              image: photo("1498050108023-c5249f4df085", "Prism design system tokens workstation"),
            },
            {
              title: "Pulse Health: Telemetry UI",
              subtitle: "Critical Patient Monitor",
              description: "Clinical telemetry interface reducing nurse alert fatigue by 48%",
              badge: "HealthTech",
              image: photo("1551288049-bebda4e38f71", "Pulse Health clinical telemetry charts"),
            },
          ],
        }),
        section("services", {
          eyebrow: "Deep Dives",
          heading: "Featured Case Studies",
          variant: "cards-grid",
          columns: 2,
          mobileColumns: 1,
          items: [
            {
              title: "Nova AI: The Infinite Workspace",
              description: "How we reimagined generative tools for multi-disciplinary product teams with an intuitive canvas interface.",
              badge: "AI Productivity",
              duration: "6 Months",
              features: [
                "Contextual radial menus",
                "Multi-modal prompt inspector",
                "Zero-latency canvas panning",
              ],
              image: photo("1618005182384-a83a8bd57fbe", "Nova AI UI design details"),
            },
            {
              title: "Aura Pay: Global Liquidity App",
              description: "A banking experience designed around speed, trust, and frictionless regulatory compliance for high-net-worth treasurers.",
              badge: "Fintech App",
              duration: "4 Months",
              features: [
                "Biometric step-up authorization",
                "Interactive currency hedging chart",
                "Dark and light responsive tokens",
              ],
              image: photo("1512941937669-90a1b58e7e9c", "Aura Pay mobile screens in hand"),
            },
            {
              title: "Prism: Multi-Brand Design System",
              description: "Creating a single source of truth across 5 web apps and 2 native applications with automated CI/CD tokens.",
              badge: "Infrastructure",
              duration: "8 Months",
              features: [
                "Accessible WCAG color palettes",
                "Figma Variables & Sync plugins",
                "Living documentation site",
              ],
              image: photo("1498050108023-c5249f4df085", "Prism token architecture and components"),
            },
            {
              title: "Pulse Health: Telemetry Portal",
              description: "Real-time clinical patient monitoring interface reducing nurse alert fatigue in intensive care hospital units by 48%.",
              badge: "HealthTech",
              duration: "5 Months",
              features: [
                "High-contrast urgency states",
                "One-tap clinical triage",
                "Tested in 12 ICU environments",
              ],
              image: photo("1551288049-bebda4e38f71", "Pulse Health telemetry monitor interface"),
            },
          ],
        }),
        section("gallery", {
          heading: "Interface Explorations & Prototypes",
          columns: 3,
          mobileColumns: 1,
          images: [
            photo("1618005182384-a83a8bd57fbe", "Fluid generative 3D wave UI art"),
            photo("1551288049-bebda4e38f71", "Financial data analytics charts"),
            photo("1498050108023-c5249f4df085", "Dual screen designer setup with Figma"),
            photo("1512941937669-90a1b58e7e9c", "Mobile interface testing"),
            photo("1581291518857-4e27b48ff24e", "Wireframing and user journey sticky notes"),
            photo("1531403009284-440f080d1e12", "Product usability testing lab"),
          ],
        }),
        section("cta", {
          variant: "centered-card",
          heading: "Want to see NDA-protected enterprise work?",
          text: "I am happy to walk through live prototypes, architecture specs, and user testing recordings under mutual non-disclosure.",
          button: { label: "Request Private Access", href: "/contact" },
        }),
      ],
    },
    {
      name: "Experience",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "Background & Ethos",
          heading: "Alex Rivera",
          subheading: "Staff Product Designer & Design Technologist with 11+ years shaping digital products in San Francisco and London.",
          primaryCta: { label: "Contact Alex", href: "/contact" },
          image: photo("1534528741775-53994a69daeb", "Alex Rivera workspace portrait"),
        }),
        section("text", {
          heading: "Product Philosophy",
          body: "Great digital design is invisible when it functions and unforgettable when it inspires.\n\nOver the past decade, I have led design teams from seed stage to public listing. My approach combines empirical user research, rigorous mathematical spacing scales, and an obsession with micro-interactions that spark genuine delight.\n\nI believe the best designers write code and the best engineers understand typography. Bridging that chasm is where truly world-class products are forged.",
        }),
        section("features", {
          variant: "cards",
          eyebrow: "Career Timeline",
          heading: "Professional Experience",
          columns: 3,
          mobileColumns: 1,
          items: [
            {
              icon: "sparkles",
              title: "Principal Product Designer (2023 – Present)",
              description: "Leading core AI workflow architecture and spatial UI initiatives. Mentoring a high-performing team of 14 product and interaction designers.",
            },
            {
              icon: "bolt",
              title: "Staff Designer @ Stripe Ecosystem (2020 – 2023)",
              description: "Spearheaded merchant onboarding flows and developer dashboard redesigns, lifting checkout completion rates globally.",
            },
            {
              icon: "layers",
              title: "Senior Lead Designer @ Method Studio (2017 – 2020)",
              description: "Delivered digital transformation engagements for global brands including Spotify, Nike Lab, and Monzo Bank.",
            },
          ],
        }),
        section(
          "marquee",
          {
            variant: "pill-badges",
            heading: "Tooling & Technical Stack",
            items: [
              { text: "Figma" },
              { text: "React" },
              { text: "TypeScript" },
              { text: "Tailwind CSS" },
              { text: "ProtoPie" },
              { text: "Framer Motion" },
              { text: "Mixpanel" },
              { text: "Storybook" },
              { text: "Linear" },
              { text: "GraphQL" },
            ],
            speed: "fast",
          },
          { background: "surface" },
        ),
        section("logos", {
          heading: "Teams & Clients I Have Partnered With",
          grayscale: true,
          logos: [
            photo("1551288049-bebda4e38f71", "Fintech brand partner", 400),
            photo("1618005182384-a83a8bd57fbe", "Generative AI partner", 400),
            photo("1498050108023-c5249f4df085", "Design system consortium", 400),
            photo("1512941937669-90a1b58e7e9c", "Mobile platform network", 400),
          ],
        }),
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Start a Project",
          heading: "Let's Build Something Extraordinary",
          subheading: "Currently open to design strategy, fractional design leadership, and high-impact advisory roles.",
        }),
        section("contact", {
          variant: "floating-glass",
          eyebrow: "Inquiry",
          heading: "Project Brief",
          text: "Tell me about your product, your current growth stage, and the challenges you're facing. I typically respond within 12 hours.",
          email: "alex@orbitux.design",
          phone: "+1 (415) 890-4421",
          address: "SoMa Design District, San Francisco, CA",
          officeHours: "Monday – Friday, 09:00 – 17:00 PST",
          responseTime: "Under 12 hours",
          showForm: true,
          submitLabel: "Send Message & Book Call",
          serviceOptions: [
            "Full Product Redesign",
            "Design System Architecture",
            "AI UX Concept Sprints",
            "Design Leadership / Advisory",
            "UX Audit & Conversion Optimization",
          ],
          channels: [
            {
              label: "Email",
              value: "alex@orbitux.design",
              description: "Direct inbox for briefs and proposals",
            },
            {
              label: "Calendar",
              value: "cal.com/alexrivera-ux",
              description: "Direct 30-min discovery call booking",
            },
          ],
        }),
        section(
          "faq",
          {
            variant: "accordion-classic",
            eyebrow: "FAQ",
            heading: "Working Together",
            intro: "Common questions about my engagement models, rates, and collaboration process.",
            items: [
              {
                question: "What engagement models do you offer?",
                answer: "I offer three primary arrangements: 1) Full product design sprints (4–8 weeks), 2) Fractional Head of Design retainers (15–20 hrs/week), and 3) Design system architecture sprints with engineering handoff.",
              },
              {
                question: "Do you write production code or provide prototypes?",
                answer: "Yes! In addition to production-ready Figma tokens and components, I frequently deliver interactive prototypes in React, Tailwind, and ProtoPie to validate high-complexity interactions.",
              },
              {
                question: "How quickly can we kick off a project?",
                answer: "I generally book 2–4 weeks in advance to ensure dedicated focus. For emergency sprint requests, reach out directly with 'URGENT' in the subject line.",
              },
              {
                question: "Can you help our existing design team level up?",
                answer: "Absolutely. Many of my retainers include hands-on mentoring, design critique facilitation, and establishing scalable hiring rubrics for growing design orgs.",
              },
            ],
          },
          { background: "surface" },
        ),
      ],
    },
  ],
});
