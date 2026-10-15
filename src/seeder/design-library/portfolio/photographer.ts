import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "../business/build.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "minimalist",
  siteName: NAME,
  menu: [
    { label: "Home", href: "/" },
    { label: "Selected Work", href: "/portfolio" },
    { label: "Biography", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Commission", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "split",
  siteName: NAME,
  tagline: "Fine Art & Editorial Photography",
  description: "Documenting spatial volume, human stillness, and natural light. Working internationally from Paris, Zurich, and Tokyo.",
  columns: [
    {
      title: "Navigation",
      links: [
        { label: "Home", href: "/" },
        { label: "Selected Work", href: "/portfolio" },
        { label: "Biography", href: "/about" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Featured Series",
      links: [
        { label: "Brutalist Sanctuaries", href: "/portfolio" },
        { label: "Nordic Daylight", href: "/portfolio" },
        { label: "Kyoto Ateliers", href: "/portfolio" },
      ],
    },
  ],
  contact: {
    email: "atelier@elenavance.com",
    phone: "+33 1 42 68 55 10",
    address: "14 Rue de Turenne, 75004 Paris, France",
  },
  social: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Behance", href: "https://behance.net" },
    { label: "Artsy", href: "https://artsy.net" },
  ],
  copyright: `© 2026 ${NAME}. All photographic works copyright protected.`,
};

export const PHOTOGRAPHER: BusinessTemplate = businessTemplate({
  key: "photographer-mono",
  name: "Photographer · Mono",
  category: "Portfolio",
  description: "An editorial, museum-grade portfolio with high-resolution visual storytelling, curated series coverflow, and commission inquiries.",
  themeName: "Atelier Monochrome",
  theme: {
    colors: {
      primary: "#111111",
      secondary: "#706E6B",
      background: "#F5F5F3",
      surface: "#EAE8E3",
      text: "#141414",
      muted: "#666461",
    },
    fonts: { heading: "playfair-display", body: "archivo" },
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
        section("hero", {
          variant: "split",
          eyebrow: "Editorial & Architecture",
          heading: "Capturing form, stillness, and light",
          subheading: "Fine art commissions, quiet portraiture, and architectural documentation for galleries, architects, and international publications.",
          primaryCta: { label: "Explore archive", href: "/portfolio" },
          secondaryCta: { label: "Studio biography", href: "/about" },
          image: photo("1534528741775-53994a69daeb", "Editorial portrait study in soft natural daylight"),
          imageStyle: "plain",
        }),
        section(
          "marquee",
          {
            variant: "ticker-text",
            items: [
              { text: "Vogue International" },
              { text: "Venice Biennale 2025" },
              { text: "MoMA Architecture Archive" },
              { text: "Kinfolk Quarterly" },
              { text: "Wallpaper* Magazine" },
              { text: "Phaidon Press" },
            ],
            speed: "slow",
            fontSize: "large",
            gradientFades: true,
            pauseOnHover: true,
          },
          { background: "surface", spacing: "compact" },
        ),
        section("carousel", {
          variant: "image-coverflow",
          eyebrow: "Curated series",
          heading: "Selected Collections",
          intro: "A sequence of ongoing visual explorations spanning brutalist structures, quiet portraiture, and northern topography.",
          imageAspect: "4:3",
          showArrows: true,
          showDots: true,
          autoPlay: true,
          interval: 5,
          slides: [
            {
              title: "Brutalist Sanctuaries",
              subtitle: "Architecture · Swiss Alps",
              description: "Monolithic concrete structures interacting with alpine mist and morning sun.",
              image: photo("1600585154340-be6161a56a0c", "Brutalist concrete architecture in natural light"),
              button: { label: "View series", href: "/portfolio" },
            },
            {
              title: "Portraits in Solitude",
              subtitle: "Fine Art · Paris Atelier",
              description: "Unvarnished daylight studies of authors, sculptors, and choreographers.",
              image: photo("1507003211169-0a1dd7228f2d", "Sculptural portrait in high contrast shadow and sunlight"),
              button: { label: "View series", href: "/portfolio" },
            },
            {
              title: "Basalt & Mist",
              subtitle: "Landscape · Iceland",
              description: "Volcanic textures and quiet coastal horizons captured on 8x10 large format negative.",
              image: photo("1506744038136-46273834b3fb", "Basalt cliffs and ocean mist in Iceland"),
              button: { label: "View series", href: "/portfolio" },
            },
            {
              title: "Kyoto Ateliers",
              subtitle: "Documentary · Japan",
              description: "Master ceramicists and joiners working in century-old timber workshops.",
              image: photo("1513519245088-0e12902e5a38", "Traditional ceramic composition in soft ambient light"),
              button: { label: "View series", href: "/portfolio" },
            },
          ],
        }),
        section("features", {
          variant: "minimal",
          eyebrow: "Capabilities",
          heading: "Commission Disciplines",
          intro: "Specialized photographic practices executed with medium format analog and high-resolution digital systems.",
          columns: 3,
          mobileColumns: 1,
          items: [
            {
              title: "Architectural & Spatial",
              description: "Documenting spatial volume, materiality, and ambient daylight for monographs, design studios, and cultural institutions.",
            },
            {
              title: "Portraiture & Human Form",
              description: "Quiet, unvarnished portrait commissions for authors, artists, and international editorial features.",
            },
            {
              title: "Editorial & Monograph Direction",
              description: "Concept development, sequencing, and print production for monographs, galleries, and publishing houses.",
            },
          ],
        }),
        section("split", {
          eyebrow: "Artist Statement",
          heading: "The Poetry of Restraint",
          body: "Photography is not the act of capturing everything that exists in a space, but the discipline of revealing what remains when superfluous noise is subtracted.\n\nWorking between Paris, Zurich, and Tokyo, I collaborate with architects, publishers, and cultural directors to create timeless visual documents that endure beyond algorithmic trends.",
          bullets: [
            "Natural light only — zero synthetic studio lighting",
            "Custom darkroom archival silver gelatin prints",
            "Medium-format Phase One & Hasselblad systems",
            "Full archival monograph sequencing and production",
          ],
          image: photo("1492691527719-9d1e07e534b4", "Elena Vance reviewing contact sheets in the Paris atelier"),
          imagePosition: "left",
          cta: { label: "Read biography", href: "/about" },
        }),
        section(
          "testimonials",
          {
            heading: "Curatorial & Editorial Praise",
            items: [
              {
                quote: "Elena's lens transforms concrete and shadow into profound spatial poetry. Her monograph was our fastest-selling publication of the year.",
                name: "Astrid Lindqvist",
                role: "Creative Director, Nordic Architectural Review",
              },
              {
                quote: "Uncompromising clarity and an instinct for quiet beauty. Working with her studio is a masterclass in visual storytelling.",
                name: "Marc Delacroix",
                role: "Photo Editor, Éditions de Minuit Paris",
              },
              {
                quote: "She captured our museum wing with such reverence for light that the photographs themselves became permanent exhibition pieces.",
                name: "Kenzo Mori",
                role: "Chief Curator, Kyoto Contemporary Art Space",
              },
            ],
          },
          { background: "surface" },
        ),
        section("cta", {
          variant: "minimal-editorial",
          eyebrow: "New Commissions",
          heading: "Now accepting selected commissions for 2026 and 2027",
          text: "Available worldwide for architectural documentation, museum monographs, and editorial assignments.",
          button: { label: "Inquire for commission", href: "/contact" },
          secondaryButton: { label: "View portfolio", href: "/portfolio" },
        }),
      ],
    },
    {
      name: "Selected Work",
      slug: "/portfolio",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Archive 2023–2026",
          heading: "Selected Works & Series",
          subheading: "An organized index of architectural studies, human portraits, and commissioned monographs.",
        }),
        section("gallery", {
          heading: "Archive Showcase",
          columns: 3,
          mobileColumns: 1,
          images: [
            photo("1600585154340-be6161a56a0c", "Brutalist architectural concrete study"),
            photo("1534528741775-53994a69daeb", "Editorial portrait study in soft daylight"),
            photo("1506744038136-46273834b3fb", "Nordic coastal landscape and fog"),
            photo("1507003211169-0a1dd7228f2d", "Studio portrait in high contrast shadow"),
            photo("1513519245088-0e12902e5a38", "Ceramic still life and linen"),
            photo("1492691527719-9d1e07e534b4", "Artist atelier contact sheet review"),
          ],
        }),
        section("services", {
          variant: "bento-grid",
          eyebrow: "Case Studies",
          heading: "Commission Highlights",
          intro: "Deep dive reviews of published monographs, cultural exhibitions, and architectural documentation.",
          columns: 3,
          mobileColumns: 1,
          items: [
            {
              title: "The Brutalist Monograph",
              description: "Complete 180-page photographic study of Swiss alpine concrete sanctuaries published with Lars Müller.",
              badge: "Publication",
              duration: "12 Weeks",
              price: "Monograph",
              image: photo("1600585154340-be6161a56a0c", "Brutalist concrete architecture study"),
            },
            {
              title: "Haute Horlogerie Heritage",
              description: "Atmospheric narrative documentation and macro studies for Geneva independent watchmakers.",
              badge: "Commercial",
              duration: "6 Weeks",
              price: "Campaign",
              image: photo("1513519245088-0e12902e5a38", "Ceramic composition and fine detail"),
            },
            {
              title: "Kyoto Artisans in Solitude",
              description: "An eight-part gallery exhibition documenting traditional bamboo and ceramic ateliers in Kyoto.",
              badge: "Exhibition",
              duration: "Ongoing",
              price: "Solo Show",
              image: photo("1507003211169-0a1dd7228f2d", "Portrait in soft natural light"),
            },
          ],
        }),
        section("cta", {
          variant: "centered-card",
          heading: "Have an architectural project or exhibition in mind?",
          text: "Print portfolios and bespoke archival proof boxes available for agency review upon request.",
          button: { label: "Request portfolio book", href: "/contact" },
        }),
      ],
    },
    {
      name: "Biography",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split-left",
          eyebrow: "Artist & Director",
          heading: "Elena Vance",
          subheading: "Born in Zurich, working across Paris, Kyoto, and New York. Exploring light, silence, and structural harmony.",
          primaryCta: { label: "Get in touch", href: "/contact" },
          image: photo("1534528741775-53994a69daeb", "Elena Vance studio portrait"),
        }),
        section("text", {
          heading: "Biography & Creative Practice",
          body: "Elena Vance (b. 1991) is a Swiss-born photographer and visual artist whose work interrogates the intersection of architectural geometry and transient daylight.\n\nAfter graduating from ECAL (École cantonale d'art de Lausanne) with highest honors, she spent five years documenting brutalist and modernist structures across Eastern Europe and Japan.\n\nHer work has been exhibited at the Venice Biennale of Architecture, the Grand Palais Éphémère, and the National Art Center in Tokyo. She is represented by Galerie Monolith in Paris and publishes regular monographs with Lars Müller Publishers.",
        }),
        section(
          "stats",
          {
            heading: "Career Milestones",
            intro: "Documenting spatial cultures across 18 countries over the past decade.",
            items: [
              { value: "14+", label: "Years of Practice" },
              { value: "32", label: "Solo & Group Shows" },
              { value: "4", label: "Published Monographs" },
              { value: "28", label: "Magazine Covers" },
            ],
          },
          { background: "surface" },
        ),
        section("logos", {
          heading: "Published In & Exhibited With",
          grayscale: true,
          logos: [
            photo("1600585154340-be6161a56a0c", "Vogue Magazine logo partner", 400),
            photo("1506744038136-46273834b3fb", "Venice Biennale partner", 400),
            photo("1534528741775-53994a69daeb", "MoMA Architecture partner", 400),
            photo("1507003211169-0a1dd7228f2d", "Kinfolk Quarterly partner", 400),
          ],
        }),
        section("team", {
          variant: "minimal-editorial",
          eyebrow: "Studio",
          heading: "Atelier Collaborators",
          intro: "A dedicated team managing archival printing, publishing logistics, and international on-location production.",
          columns: 3,
          mobileColumns: 1,
          members: [
            {
              name: "Claire Fontaine",
              role: "Studio Director & Archivist",
              bio: "Oversees museum print production, international exhibition loans, and gallery liaisons.",
            },
            {
              name: "Kenji Sato",
              role: "Lead Digital Tech & Retoucher",
              bio: "Specializes in high-bit depth color fidelity, negative scanning, and medium format workflows.",
            },
            {
              name: "Lucas Meyer",
              role: "Location & Lighting Producer",
              bio: "Coordinates international logistics, location permits, and specialized transit across Europe and Asia.",
            },
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
          eyebrow: "Studio Inquiries",
          heading: "Start a Conversation",
          subheading: "Inquiries regarding commercial commissions, print sales, museum exhibitions, and guest lectures.",
        }),
        section("contact", {
          variant: "split-form",
          eyebrow: "Inquiries",
          heading: "Commission Details",
          text: "Please include project scope, timeline, geographic location, and intended usage. Direct inquiries are answered within 24 to 48 hours.",
          email: "atelier@elenavance.com",
          phone: "+33 1 42 68 55 10",
          address: "14 Rue de Turenne, 75004 Paris, France",
          officeHours: "Tuesday – Saturday, 10:00 – 18:00 CET",
          responseTime: "Under 24 hours",
          showForm: true,
          submitLabel: "Send Commission Inquiry",
          serviceOptions: [
            "Architectural Documentation",
            "Editorial Portraiture",
            "Campaign Direction",
            "Archival Print Purchase",
            "Lecture / Juror",
          ],
          channels: [
            {
              label: "Studio Paris",
              value: "atelier@elenavance.com",
              description: "Direct commissions and agency contact",
            },
            {
              label: "Gallery Monolith",
              value: "prints@monolith-gallery.com",
              description: "Fine art print acquisitions and loans",
            },
          ],
        }),
        section(
          "faq",
          {
            variant: "split-sidebar",
            eyebrow: "Details",
            heading: "Frequently Asked Questions",
            intro: "Key notes regarding representation, archival prints, travel, and timelines.",
            items: [
              {
                question: "What is your typical turnaround time for commissioned work?",
                answer: "Initial select contact sheets are delivered within 72 hours of wrap. Fully graded, retouched masters and licensing packets are completed within 2 to 3 weeks.",
              },
              {
                question: "Do you travel for international assignments?",
                answer: "Yes. Elena travels frequently between Europe, North America, and Asia. International travel visas and equipment carnets are permanently maintained.",
              },
              {
                question: "Are limited edition archival prints available for collectors?",
                answer: "Yes. All exhibition works are produced in editions of 5 + 2 AP on Hahnemühle Photo Rag Baryta paper, signed, numbered, and accompanied by a certificate of authenticity.",
              },
              {
                question: "Can we license existing archive imagery for book publication?",
                answer: "Archive licensing is managed through Galerie Monolith. Please include the specific image reference, print run, and distribution territory in your request.",
              },
            ],
          },
          { background: "surface" },
        ),
      ],
    },
  ],
});
