import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "../business/build.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "floating",
  siteName: NAME,
  menu: [
    { label: "Speakers", href: "/#speakers" },
    { label: "Tracks", href: "/#tracks" },
    { label: "Schedule", href: "/#schedule" },
    { label: "Passes", href: "/#passes" },
  ],
  cta: { label: "Reserve Pass", href: "/#passes" },
  announcement: "October 24–26, 2026 · Moscone West & Global 4K Interactive Livestream",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  description:
    "Apex Summit 2026 brings together 3,500 visionary creators, frontier AI researchers, spatial architects, and founders for three days of immersive keynotes, technical workshops, and high-impact connections.",
  columns: [
    {
      title: "Summit",
      links: [
        { label: "Keynote Stages", href: "/#speakers" },
        { label: "Technical Tracks", href: "/#tracks" },
        { label: "Full Schedule", href: "/#schedule" },
        { label: "Ticket Passes", href: "/#passes" },
      ],
    },
    {
      title: "Experience",
      links: [
        { label: "Spatial Pavilion", href: "/#tracks" },
        { label: "VIP Networking Gala", href: "/#passes" },
        { label: "Founder Pitch Arena", href: "/#tracks" },
        { label: "Accessibility Guide", href: "/contact" },
      ],
    },
    {
      title: "Venue & Travel",
      links: [
        { label: "Moscone West San Francisco", href: "/contact" },
        { label: "Partner Hotel Blocks", href: "/contact" },
        { label: "Visa Support Letters", href: "/contact" },
        { label: "Health & Safety", href: "/contact" },
      ],
    },
  ],
  contact: {
    email: "concierge@apexsummit.org",
    phone: "+1 (415) 770-9800",
    address: "747 Howard St, Moscone West, San Francisco, CA",
  },
  social: [
    { label: "X / Twitter", href: "https://x.com" },
    { label: "YouTube Livestream", href: "https://youtube.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
  ],
  legalLinks: [
    { label: "Code of Conduct", href: "/conduct" },
    { label: "Refund Policy", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
  copyright: `© 2026 ${NAME}. The Premier Global Stage for Frontier Creators & Architects.`,
};

export const EVENT_SUMMIT: BusinessTemplate = businessTemplate({
  key: "event-summit-coral",
  name: "Apex Summit · Coral",
  category: "Landing page",
  description:
    "A high-energy, editorial conference, event drop, and product launch landing page featuring a 3D coverflow visual carousel banner, speaker spotlight cards, and tier passes.",
  themeName: "Apex Sunset Coral",
  theme: {
    colors: {
      primary: "#FF5733",
      secondary: "#FFB800",
      background: "#0C0A10",
      surface: "#171420",
      text: "#FFF7F5",
      muted: "#B8ADC2",
    },
    fonts: { heading: "syne", body: "inter" },
    buttonStyle: "filled",
    cardStyle: "shadow",
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
        // 1. High-Impact Event Hero
        section(
          "hero",
          {
            variant: "centered",
            eyebrow: "The Premier Global Gathering for Frontier Technology & Design",
            heading: "Where the future of spatial computing and AI is revealed live",
            highlightText: "revealed live",
            subheading:
              "Join 3,500 industry leaders, designers, and systems architects in San Francisco for three transformative days of visionary keynotes, hands-on spatial labs, and peerless connections.",
            primaryCta: { label: "Get Your All-Access Pass", href: "/#passes" },
            secondaryCta: { label: "Explore Keynote Speakers", href: "/#speakers" },
            image: photo("1540575467063-178a50c2df87", "Apex Summit Main Stage Keynote Hall", 1600),
            imageStyle: "rounded",
            rating: { stars: 5, text: "Rated #1 Must-Attend Tech Summit by FastCompany & Wired", avatarCount: 4 },
          },
          { background: "default" },
        ),

        // 2. Distinct Banner Carousel: 3D Coverflow Visual Image Reel
        section(
          "carousel",
          {
            variant: "image-coverflow",
            eyebrow: "Immersive Experiences",
            heading: "Three days designed to inspire, challenge, and connect",
            intro: "Explore our curated arenas, interactive hardware exhibits, and high-energy keynote sessions.",
            imageAspect: "16:9",
            autoPlay: true,
            interval: 4,
            showArrows: true,
            showDots: true,
            slides: [
              {
                title: "Main Stage Visionary Keynotes",
                subtitle: "The Spatial & AI Frontier",
                description: "Groundbreaking architectural reveals and live product drops delivered to 3,500 peers.",
                badge: "Main Auditorium",
                image: photo("1492684223066-81342ee5ff30", "Main auditorium stage keynote lighting", 1200),
                button: { label: "View Speakers", href: "/#speakers" },
              },
              {
                title: "Spatial Hardware Playground",
                subtitle: "Hands-On Prototypes",
                description: "Test unreleased next-generation neural interfaces, tactile haptics, and optical glasses.",
                badge: "Innovation Lab",
                image: photo("1515187029135-18ee286d815b", "Interactive tech workshop collaboration", 1200),
                button: { label: "Lab Schedule", href: "/#tracks" },
              },
              {
                title: "Founders & Architects Pitch Arena",
                subtitle: "Venture & Growth",
                description: "Top 20 selected frontier seed-stage teams demoing live before premier Tier-1 global investors.",
                badge: "Pitch Showcase",
                image: photo("1505373877841-8d25f7d46678", "Live presentation on main stage with screen", 1200),
                button: { label: "Apply to Pitch", href: "/#tracks" },
              },
              {
                title: "VIP Sunset Networking Gala",
                subtitle: "Rooftop Mixer & Dinner",
                description: "Exclusive curated evenings with culinary masterclasses, ambient DJ sets, and peer connections.",
                badge: "VIP Access Only",
                image: photo("1511578314322-379afb476865", "VIP conference networking lounge and cocktails", 1200),
                button: { label: "VIP Pass Details", href: "/#passes" },
              },
              {
                title: "Closing Night Soundscape & Celebration",
                subtitle: "The Apex Afterparty",
                description: "Live audiovisual performances blending generative synthesis, laser choreography, and tech culture.",
                badge: "Festival Finale",
                image: photo("1501281668745-f7f57925c3b4", "Festival crowd celebration with stage lights", 1200),
                button: { label: "Reserve Pass", href: "/#passes" },
              },
            ],
          },
          { background: "surface", spacing: "relaxed" },
        ),

        // 3. Featured Keynote Speakers (Team Section)
        section(
          "team",
          {
            eyebrow: "Visionaries on Stage",
            heading: "Hear from the pioneers defining the next compute cycle",
            intro: "Fifty world-renowned researchers, chief design officers, and founders sharing zero-fluff playbooks.",
            columns: 4,
            mobileColumns: 2,
            members: [
              {
                name: "Dr. Alistair Chen",
                role: "Chief Scientist, Horizon AI Labs",
                bio: "Leading research on large-scale multimodal physical intelligence models.",
                photo: photo("1534528741775-53994a69daeb", "Dr. Alistair Chen", 600),
              },
              {
                name: "Helena Vane",
                role: "VP of Spatial Design, FormOS",
                bio: "Pioneered ambient spatial ergonomics and reactive UI frameworks for wearables.",
                photo: photo("1580489944761-15a19d654956", "Helena Vane", 600),
              },
              {
                name: "Marcus Thorne",
                role: "Founder & CEO, NeuralStream",
                bio: "Built distributed tensor edge networks deployed in over 40 million autonomous units.",
                photo: photo("1507003211169-0a1dd7228f2d", "Marcus Thorne", 600),
              },
              {
                name: "Soraya Sterling",
                role: "Partner, CyberVenture Capital",
                bio: "Backing foundational deep tech and AI hardware infrastructure since 2018.",
                photo: photo("1573496359142-b8d87734a5a2", "Soraya Sterling", 600),
              },
            ],
          },
          { background: "default" },
        ),

        // 4. Summit Tracks & Experience
        section(
          "services",
          {
            variant: "cards-grid",
            eyebrow: "Program Structure",
            heading: "Three dedicated stages tailored to your discipline",
            columns: 3,
            mobileColumns: 1,
            showImages: true,
            items: [
              {
                title: "Track A: Spatial & Ambient Design",
                description:
                  "Deep-dive sessions on spatial interface typography, bio-material industrial design, and next-gen OS architecture.",
                icon: "sparkles",
                badge: "Design Track",
                image: photo("1475721027785-f74eccf877e2", "Speaker on stage with dramatic lighting", 900),
                link: { label: "Track Agenda", href: "/#schedule" },
              },
              {
                title: "Track B: Distributed AI & Infrastructure",
                description:
                  "Production post-mortems on low-latency inference, multi-agent evaluation suites, and self-healing cloud clusters.",
                icon: "bolt",
                badge: "Engineering",
                image: photo("1526374965328-7f61d4dc18c5", "Coding on dark screen", 900),
                link: { label: "Track Agenda", href: "/#schedule" },
              },
              {
                title: "Track C: Founder Scale & Venture",
                description:
                  "Tactical playbooks for scaling technical talent, non-linear enterprise sales, and capital allocation in 2026.",
                icon: "rocket",
                badge: "Leadership",
                image: photo("1511578314322-379afb476865", "Networking lounge discussion", 900),
                link: { label: "Track Agenda", href: "/#schedule" },
              },
            ],
          },
          { background: "surface" },
        ),

        // 5. Summit Schedule Highlight
        section(
          "split",
          {
            eyebrow: "Schedule Blueprint",
            heading: "72 hours packed with actionable insights and zero filler",
            body: "Every keynote is limited to 20 focused minutes, followed by live unscripted audience Q&A and technical breakout discussions.",
            image: photo("1515187029135-18ee286d815b", "Apex Summit interactive breakout workshop", 1200),
            imagePosition: "right",
            bullets: [
              "Day 1: The Frontier Paradigm — Keynotes, keynote drops, and opening gala",
              "Day 2: Architecture in Practice — Hands-on spatial labs and technical deep dives",
              "Day 3: The Horizon — Pitch arena, investor dinners, and the Apex festival party",
              "All attendees receive lifetime access to 4K recordings and session transcripts",
            ],
            cta: { label: "Download Full PDF Schedule", href: "/#passes" },
          },
          { background: "default" },
        ),

        // 6. Pass Tiers & Ticketing (Pricing)
        section(
          "pricing",
          {
            eyebrow: "Ticket Registration",
            heading: "Choose your pass and secure your seat before tier sellout",
            intro: "Limited to 3,500 total in-person passes to preserve high-caliber networking density.",
            plans: [
              {
                name: "Virtual 4K Pass",
                price: "$199",
                period: "per attendee",
                description: "Live interactive access from anywhere in the world.",
                featured: false,
                features: [
                  "Full live 4K stream of all 3 stages",
                  "Interactive Q&A and community Discord",
                  "Full transcript and slide downloads",
                  "On-demand recordings for 12 months",
                ],
                cta: { label: "Register Virtual", href: "/#passes" },
              },
              {
                name: "In-Person Full Summit",
                price: "$799",
                period: "per attendee",
                description: "The complete 3-day on-site experience at Moscone West.",
                featured: true,
                badge: "Selling Fast — 85% Sold",
                features: [
                  "Full access to all 3 keynote stages",
                  "Entry to Spatial Hardware Playground",
                  "Catered gourmet lunch & artisan coffee",
                  "Day 1 & Day 2 Networking Receptions",
                  "Closing Night Apex Festival Party ticket",
                  "Full lifetime virtual 4K archive",
                ],
                cta: { label: "Claim Summit Pass", href: "/#passes" },
              },
              {
                name: "VIP Founder & Executive",
                price: "$1,899",
                period: "per attendee",
                description: "Unprecedented access to speakers, venture leaders, and private lounges.",
                featured: false,
                features: [
                  "All In-Person Summit privileges",
                  "Front-row reserved keynote seating",
                  "Access to Private VIP Lounge & Bar",
                  "Invitation to Sunset Rooftop Gala & Dinner",
                  "Dedicated VIP Concierge & Fast-Track Check-In",
                  "Exclusive 1-on-1 Speaker Roundtable Access",
                ],
                cta: { label: "Apply for VIP Pass", href: "/#passes" },
              },
            ],
          },
          { background: "surface" },
        ),

        // 7. Global Sponsors & Partners
        section(
          "logos",
          {
            heading: "Backed by global technology leaders and design institutions",
            grayscale: true,
            logos: [
              photo("1618005182384-a83a8bd57fbe", "Global Partner 1", 400),
              photo("1550751827-4bd374c3f58b", "Global Partner 2", 400),
              photo("1518770660439-4636190af475", "Global Partner 3", 400),
              photo("1526374965328-7f61d4dc18c5", "Global Partner 4", 400),
            ],
          },
          { background: "default", spacing: "compact" },
        ),

        // 8. Event FAQ
        section(
          "faq",
          {
            heading: "Frequently Asked Questions",
            intro: "Important logistical details regarding attendance, travel, and passes.",
            items: [
              {
                question: "Can I transfer my ticket to a colleague if I cannot make it?",
                answer:
                  "Yes. Ticket name transfers are completely free of charge and can be completed online up to 48 hours prior to Day 1 registration.",
              },
              {
                question: "Where is the summit located and what hotels are recommended?",
                answer:
                  "The summit is held at Moscone West in downtown San Francisco. We have partnered with nearby hotels (W Hotel, St. Regis, Marriott Marquis) for discounted room blocks.",
              },
              {
                question: "Do you offer group discounts for teams?",
                answer:
                  "Yes. Teams registering 4 or more passes automatically receive an 18% group discount applied at checkout.",
              },
              {
                question: "What is the policy regarding recordings and confidentiality?",
                answer:
                  "Main stage sessions are recorded in 4K and provided to ticket holders. Hands-on breakout workshops and founder pitch sessions operate under Chatham House rules.",
              },
            ],
          },
          { background: "surface" },
        ),

        // 9. Urgency Conversion CTA
        section(
          "cta",
          {
            variant: "centered-card",
            cardStyle: "elevated",
            eyebrow: "Final Tier Registration",
            heading: "Don't miss the defining technology and design moment of 2026",
            text: "Only 120 in-person passes remain before the summit officially closes registration.",
            button: { label: "Secure Your Pass Now", href: "/#passes" },
            secondaryButton: { label: "Apply for Media Accreditation", href: "/contact" },
            trustBadges: ["Instant digital ticket delivery", "100% transferrable", "Corporate invoice ready"],
          },
          { background: "default" },
        ),
      ],
    },
  ],
});
