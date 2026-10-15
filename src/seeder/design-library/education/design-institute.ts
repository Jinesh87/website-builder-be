import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "../business/build.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "classical",
  siteName: NAME,
  menu: [
    { label: "Studios", href: "/courses" },
    { label: "Faculty", href: "/about" },
    { label: "Exhibitions", href: "/courses" },
    { label: "Admissions", href: "/admissions" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Request Prospectus", href: "/admissions" },
  announcement: "Fall 2026 Master of Spatial Design & Typography Fellowships Now Open",
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: NAME,
  description:
    "Atelier Institute of Visual Arts & Architecture is an independent European-inspired design academy cultivating the vanguard of spatial environments, editorial craft, and generative aesthetics.",
  columns: [
    {
      title: "Academic Studios",
      links: [
        { label: "Spatial Design & Form", href: "/courses" },
        { label: "Modernist Typography", href: "/courses" },
        { label: "Bio-Material Labs", href: "/courses" },
        { label: "Exhibition Technology", href: "/courses" },
      ],
    },
    {
      title: "Admissions & Visas",
      links: [
        { label: "Portfolio Guidelines", href: "/admissions" },
        { label: "Tuition & Fellowships", href: "/admissions" },
        { label: "International Visas", href: "/admissions" },
        { label: "Visiting Critic Program", href: "/about" },
      ],
    },
    {
      title: "Institute",
      links: [
        { label: "Faculty & Masters", href: "/about" },
        { label: "Student Thesis Archive", href: "/courses" },
        { label: "Public Lecture Series", href: "/about" },
        { label: "Press & Publications", href: "/about" },
      ],
    },
  ],
  contact: {
    email: "admissions@atelier-institute.art",
    phone: "+1 (212) 680-4420",
    address: "740 Broadway, Design District, New York, NY",
  },
  social: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Vimeo", href: "https://vimeo.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "Twitter", href: "https://x.com" },
  ],
  copyright: `© 2026 ${NAME}. Chartered for visual excellence & architectural inquiry.`,
};

export const DESIGN_INSTITUTE: BusinessTemplate = businessTemplate({
  key: "design-institute-editorial",
  name: "Design Institute · Editorial",
  category: "Education",
  description:
    "A prestigious arts and architecture academy featuring asymmetric editorial hero layouts, student exhibition galleries, studio workshops, and portfolio critique admissions.",
  themeName: "Atelier Stone Editorial",
  theme: {
    colors: {
      primary: "#C2410C",
      secondary: "#854D0E",
      background: "#FAF8F5",
      surface: "#F4EFEA",
      text: "#18181B",
      muted: "#71717A",
    },
    fonts: { heading: "playfair-display", body: "plus-jakarta-sans" },
    buttonStyle: "filled",
    cardStyle: "flat",
    radius: "sm",
    containerWidth: 1200,
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
          variant: "asymmetric",
          eyebrow: "School of Visual Arts & Architecture",
          badgeIcon: "🏛️",
          heading: "Where formal rigor meets radical spatial imagination",
          highlightText: "radical spatial imagination",
          subheading:
            "A transatlantic academy offering intensive postgraduate masterclasses in architecture, spatial design, kinetic typography, and bio-material engineering.",
          primaryCta: { label: "Explore Academic Studios", href: "/courses" },
          secondaryCta: { label: "Schedule Studio Review", href: "/admissions" },
          image: photo("1503387762-592deb58ef4e", "Architectural Wooden Model and Drafting Studio"),
          minHeight: "screen",
        }),
        section(
          "marquee",
          {
            variant: "ticker-text",
            items: [
              { text: "Spatial Environments & Scenography" },
              { text: "Modernist Typography & Type Foundry" },
              { text: "Bio-Materials & Regenerative Form" },
              { text: "Interactive Exhibition & Scenographic Media" },
              { text: "Architectural Theory & Urbanism" },
            ],
            speed: "slow",
            pauseOnHover: true,
          },
          { background: "surface", spacing: "compact" },
        ),
        section(
          "services",
          {
            variant: "split-showcase",
            eyebrow: "The Master Studios",
            heading: "Four Disciplinary Pillars of Atelier",
            intro:
              "Each studio operates as an intimate master atelier of 16 researchers under the direct tutelage of practicing architects and design laureates.",
            columns: 2,
            mobileColumns: 1,
            splitPosition: "right",
            splitImage: photo("1513694203232-719a280e022f", "Architectural Studio Workspace with Natural Daylight"),
            splitTagline: "Rigorous Critique · Private Studio Desks · Material Fabrication Shop",
            items: [
              {
                title: "Studio I: Spatial Architecture & Atmosphere",
                description: "Interrogating the threshold between structural mass, natural illumination, and human perception through physical model making and 1:1 scale mockups.",
                badge: "M.Arch II",
                price: "Full Residency",
              },
              {
                title: "Studio II: Typography, Orthography & Editorial Craft",
                description: "Deep research into historical punch-cutting, variable font axes, algorithmic typesetting, and large-scale architectural environmental signage.",
                badge: "MFA Design",
                price: "Fall Term",
              },
              {
                title: "Studio III: Regenerative Bio-Materials & Biomimicry",
                description: "Synthesizing mycelium composites, algae-based bioplastics, and terracotta thermal tiles for sustainable circular construction.",
                badge: "Bio-Lab",
                price: "Year-Round",
              },
              {
                title: "Studio IV: Exhibition Scenography & Museum Systems",
                description: "Curating spatial narratives for world-leading institutions, designing ambient lighting, acoustic zoning, and reactive spatial telemetry.",
                badge: "Curatorial",
                price: "Spring Term",
              },
            ],
          },
          { background: "default" },
        ),
        section(
          "gallery",
          {
            heading: "Annual Graduate Thesis Exhibition",
            columns: 4,
            mobileColumns: 2,
            images: [
              photo("1541701494587-cb58502866ab", "Experimental Kinetic Typography Printmaking"),
              photo("1507238691740-187a5b1d37b8", "Concrete Spatial Form and Minimalist Sculpture"),
              photo("1487958449943-2429e8be8625", "Geometric Pavilion Facade and Structural Mass"),
              photo("1600585154340-be6161a56a0c", "Minimalist Monolithic Residence Interior Form"),
            ],
          },
          { background: "surface" },
        ),
        section(
          "features",
          {
            variant: "pastel-icons",
            eyebrow: "Pedagogical Manifesto",
            heading: "The Atelier Methodology",
            intro: "Rejecting mass commercial assembly lines in favor of deep mastery, physical making, and intellectual sovereignty.",
            columns: 4,
            mobileColumns: 1,
            items: [
              {
                icon: "sparkles",
                iconColor: "orange",
                title: "Daily Studio Critique",
                description: "Rigorous collective reviews where concepts are defended, dismantled, and reconstructed alongside senior visiting critics.",
              },
              {
                icon: "tools",
                iconColor: "yellow",
                title: "Fabrication Laboratories",
                description: "Access to 5-axis CNC routers, clay 3D extruders, letterpress casting rooms, and timber joinery workshops.",
              },
              {
                icon: "user",
                iconColor: "purple",
                title: "Master Mentors",
                description: "Every fellow studies directly under a Pritzker-level architect or AGI-laureate typography director.",
              },
              {
                icon: "shield",
                iconColor: "indigo",
                title: "Permanent Archive",
                description: "Exceptional graduate thesis artifacts and publications are preserved in the permanent museum archives of the Institute.",
              },
            ],
          },
          { background: "default" },
        ),
        section(
          "testimonials",
          {
            heading: "Endorsements from the Global Design Vanguard",
            items: [
              {
                quote: "Graduates of Atelier possess a rare duality: an almost monastic devotion to craft coupled with fearless contemporary ambition.",
                name: "Sir David Chipperfield Studio",
                role: "Visiting External Examiner",
              },
              {
                quote: "The spatial clarity and typographical maturity of Atelier fellows sets the gold benchmark across our international studios.",
                name: "Beatriz Colomina",
                role: "Professor of Architectural History",
              },
              {
                quote: "Atelier has revitalized the European atelier model for the 21st century. Their researchers define the next century of built form.",
                name: "Hans Ulrich Obrist",
                role: "Artistic Director, Serpentine Galleries",
              },
            ],
          },
          { background: "surface" },
        ),
        section(
          "pricing",
          {
            variant: "minimal-monochrome",
            eyebrow: "Tuition & Grants",
            heading: "Academic Fees & Merit Endowments",
            intro: "We maintain a robust $4.2M endowment fund providing merit fellowships to 62% of admitted researchers.",
            columns: 3,
            plans: [
              {
                name: "Master Fellowships",
                price: "$0",
                period: "Fully Funded",
                badge: "Merit Endowed",
                description: "Awarded to the top 15% of applicants demonstrating exceptional conceptual and portfolio mastery.",
                features: [
                  "100% Tuition waiver for academic year",
                  "$28,000 Annual living stipend",
                  "Dedicated private studio desk in Manhattan",
                  "$4,000 Material fabrication budget",
                  "European summer residency placement",
                ],
                featured: true,
                cta: { label: "Apply for Fellowship", href: "/admissions" },
              },
              {
                name: "Standard Postgraduate",
                price: "$16,500",
                period: "Per Semester",
                badge: "Tuition",
                description: "Full matriculation into chosen master studio with complete laboratory and critic access.",
                features: [
                  "Unlimited 24/7 fabrication workshop access",
                  "Direct studio desk assignment",
                  "Weekly 1:1 master critic review",
                  "Thesis monograph publishing inclusion",
                  "Institutional visa sponsorship support",
                ],
                featured: false,
                cta: { label: "Request Application", href: "/admissions" },
              },
              {
                name: "Summer Masterclass",
                price: "$3,800",
                period: "4-Week Intensive",
                badge: "Short Residency",
                description: "Condensed summer immersion in kinetic typography, biomaterials, or spatial scenography.",
                features: [
                  "Intensive 120-hour studio sprint",
                  "Direct guest critic masterclasses",
                  "Exhibition in the summer pavilion",
                  "Certificate of Advanced Studies",
                ],
                featured: false,
                cta: { label: "Register for Summer", href: "/admissions" },
              },
            ],
          },
          { background: "default" },
        ),
        section(
          "faq",
          {
            variant: "two-column-grid",
            eyebrow: "Inquiries",
            heading: "Admissions & Portfolio Criteria",
            intro: "Everything you need to prepare for portfolio submission and studio evaluation.",
            items: [
              {
                category: "Portfolio",
                question: "What should be included in the admissions portfolio?",
                answer:
                  "We seek 12-18 curated works demonstrating conceptual rigor, physical spatial sense, and typographical precision. Process sketches, fabrication tests, and unbuilt spatial experiments are actively celebrated.",
              },
              {
                category: "Background",
                question: "Do I need an undergraduate degree in architecture or design?",
                answer:
                  "No. While many candidates hold degrees in architecture or fine arts, we welcome applicants from mathematics, literature, philosophy, and computer science who exhibit profound visual and spatial acumen.",
              },
              {
                category: "Residency",
                question: "Can the program be completed remotely?",
                answer:
                  "No. Atelier is an inherently physical institution rooted in material inquiry, tactile critique, and studio culture. Full on-campus presence in our Manhattan studios is required.",
              },
              {
                category: "Visas",
                question: "Does Atelier sponsor international student visas?",
                answer:
                  "Yes. We are authorized under Federal Law to issue I-20 certificates for F-1 academic visas to international fellows across all postgraduate programs.",
              },
            ],
          },
          { background: "surface" },
        ),
        section(
          "cta",
          {
            variant: "minimal-editorial",
            eyebrow: "Admissions Open",
            heading: "Commence your architectural inquiry at Atelier",
            text: "Applications for the 2026/2027 academic cycle are reviewed on a rolling schedule. Early decision deadline: March 31.",
            button: { label: "Request 2026 Prospectus", href: "/admissions" },
            secondaryButton: { label: "Schedule Studio Visit", href: "/contact" },
          },
          { background: "default" },
        ),
      ],
    },
    {
      name: "Studios",
      slug: "/courses",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Academic Architecture",
          heading: "The Disciplinary Master Studios",
          subheading: "An overview of curriculum frameworks, fabrication equipment, and visiting critics.",
          primaryCta: { label: "Download Academic Bulletin", href: "/contact" },
        }),
        section(
          "services",
          {
            variant: "interactive-list",
            eyebrow: "Full Studio Directory",
            heading: "Detailed Program Directory",
            intro: "Select a studio discipline to explore seminar themes, bibliographies, and visiting critic appointments.",
            columns: 2,
            mobileColumns: 1,
            items: [
              {
                title: "Studio I: Spatial Architecture & Atmosphere",
                description: "Seminar on non-standard masonry, light wells, thermal acoustics, and monolithic cast stone construction.",
                badge: "Architecture",
                features: ["Weekly tectonic critique", "Large format physical models", "1:1 structural joints"],
              },
              {
                title: "Studio II: Typography, Orthography & Editorial Craft",
                description: "Type design history, OpenType font engineering, variable font axis programming, and architectural environmental signage.",
                badge: "Typography",
                features: ["Glyph drawing masterclasses", "Hot metal typesetting heritage", "Bespoke font release"],
              },
              {
                title: "Studio III: Regenerative Bio-Materials & Biomimicry",
                description: "Mycelium cultivation, calcium carbonate mineralization, algae bio-resins, and closed-loop architectural envelopes.",
                badge: "Bio-Materials",
                features: ["Wet-lab sterile culture hoods", "Material strength stress-testing", "Life-cycle carbon audit"],
              },
              {
                title: "Studio IV: Exhibition Scenography & Museum Systems",
                description: "Architectures of temporary display, museum lighting calculations, audience circulation choreography, and acoustic dampening.",
                badge: "Scenography",
                features: ["Scale 1:20 museum gallery models", "Dynamic DMX lighting control", "Curatorial catalogue design"],
              },
            ],
          },
          { background: "surface" },
        ),
      ],
    },
    {
      name: "Admissions",
      slug: "/admissions",
      sections: [
        section("hero", {
          variant: "centered",
          eyebrow: "Academic Application",
          heading: "Admissions Criteria & Portfolio Review",
          subheading: "Atelier admits 48 researchers annually across its four master studios.",
          primaryCta: { label: "Submit Online Portfolio", href: "/contact" },
        }),
        section(
          "contact",
          {
            variant: "minimal-editorial",
            eyebrow: "Portfolio Submission",
            heading: "Request Admissions Package & Portfolio Portal",
            text: "Submit your details below to receive the official 2026 application guide, portfolio submission link, and financial aid schedule.",
            showForm: true,
            submitLabel: "Request Application Guide",
            email: "admissions@atelier-institute.art",
            phone: "+1 (212) 680-4420",
            address: "740 Broadway, Design District, New York, NY",
            officeHours: "Mon-Fri: 10am - 5pm EST",
          },
          { background: "default" },
        ),
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "cards-hub",
          eyebrow: "Studio Location",
          heading: "Visit Atelier Manhattan Studios",
          text: "We welcome prospective fellows, gallery directors, and academic peers for scheduled studio walkthroughs and public lectures.",
          showForm: true,
          submitLabel: "Schedule Studio Visit",
          email: "admissions@atelier-institute.art",
          phone: "+1 (212) 680-4420",
          address: "740 Broadway, Design District, New York, NY",
          officeHours: "Mon-Fri: 10am - 5pm EST",
          channels: [
            { label: "Admissions Office", value: "admissions@atelier-institute.art", icon: "mail" },
            { label: "Press & Curatorial", value: "press@atelier-institute.art", icon: "user" },
            { label: "Studio Desk Walkthroughs", value: "+1 (212) 680-4420", icon: "phone" },
          ],
        }),
      ],
    },
  ],
});
