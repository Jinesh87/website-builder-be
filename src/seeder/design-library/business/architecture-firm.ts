import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";

const NAME = "{{businessName}}";

const header: HeaderData = {
  design: "minimalist",
  siteName: NAME,
  menu: [
    { label: "Home", href: "/" },
    { label: "Portfolio", href: "/portfolio" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  cta: { label: "Start a project", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "centered",
  siteName: NAME,
  tagline: "Architecture and interiors",
  description: "Homes and workplaces designed around the people who use them.",
  columns: [],
  menu: [
    { label: "Portfolio", href: "/portfolio" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  contact: {
    email: "studio@atelierarchitects.com",
    phone: "+44 20 7946 0321",
    address: "12 Clerkenwell Road, London EC1M",
  },
  social: [
    { label: "Instagram", href: "https://www.instagram.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com" },
    { label: "Pinterest", href: "https://www.pinterest.com" },
  ],
  copyright: `© 2026 ${NAME} Ltd.`,
};

const projects = section("carousel", {
  variant: "image-gallery",
  eyebrow: "Selected work",
  heading: "Recent projects",
  intro: "Private homes, workplaces and interiors completed in the last three years.",
  imageAspect: "4:3",
  showArrows: true,
  showDots: true,
  slides: [
    {
      title: "Hillside House",
      subtitle: "Residential · Surrey",
      description: "A low, timber-clad family home set into a sloping garden.",
      image: photo("1600585154340-be6161a56a0c", "Hillside House exterior at dusk"),
    },
    {
      title: "Canal Loft",
      subtitle: "Interiors · London",
      description: "An open-plan warehouse conversion with oak joinery throughout.",
      image: photo("1600607687939-ce8a6c25118c", "Canal Loft living room"),
    },
    {
      title: "Meridian Offices",
      subtitle: "Commercial · Manchester",
      description: "Three floors of flexible workspace for a growing tech company.",
      image: photo("1497215728101-856f4ea42174", "Meridian Offices workspace"),
    },
    {
      title: "Garden Pavilion",
      subtitle: "Residential · Kent",
      description: "A glass garden room that doubles as a studio.",
      image: photo("1512917774080-9991f1c4c750", "Garden Pavilion with pool"),
    },
  ],
});

const ctaBand = section(
  "cta",
  {
    variant: "minimal-editorial",
    eyebrow: "New commissions",
    heading: "Tell us about your project",
    text: "We take on a small number of projects each year. Share your plans and we will arrange a site visit.",
    button: { label: "Start a project", href: "/contact" },
    secondaryButton: { label: "View portfolio", href: "/portfolio" },
  },
  { background: "dark" },
);

export const ARCHITECTURE_FIRM: BusinessTemplate = businessTemplate({
  key: "architecture-firm-minimal",
  name: "Architecture Firm · Minimal",
  category: "Business",
  description: "An image-led studio site with a project portfolio, process, partners and enquiry form.",
  themeName: "Atelier Mono",
  theme: {
    colors: {
      primary: "#111111",
      secondary: "#8A7F6D",
      background: "#F4F4F2",
      surface: "#E6E6E1",
      text: "#111111",
      muted: "#5E5E58",
    },
    fonts: { heading: "playfair-display", body: "archivo" },
    buttonStyle: "filled",
    cardStyle: "flat",
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
        section("hero", {
          variant: "background-image",
          eyebrow: "Architecture and interiors",
          heading: "Homes and workplaces designed around people",
          subheading: "Residential and commercial architecture, from first sketch to final build.",
          primaryCta: { label: "Start a project", href: "/contact" },
          secondaryCta: { label: "View our work", href: "/portfolio" },
          backgroundImage: photo("1487958449943-2429e8be8625", "White modern building facade", 2000),
          bgOverlayType: "dark",
          overlayOpacity: 45,
          minHeight: "tall",
          contentAlign: "left",
        }),
        section("services", {
          variant: "minimal-numbered",
          eyebrow: "What we do",
          heading: "Our services",
          columns: 3,
          mobileColumns: 1,
          showNumbers: true,
          items: [
            { title: "Residential", description: "New homes, extensions and full renovations, designed to last generations." },
            { title: "Commercial", description: "Offices, shops and studios that help teams and brands do their best work." },
            { title: "Interiors", description: "Joinery, lighting and finishes chosen to make spaces work and feel right." },
          ],
        }),
        projects,
        section(
          "split",
          {
            eyebrow: "Our approach",
            heading: "Quiet buildings, carefully made",
            body: "We start with how you want to live or work, then shape light, material and space around it. Every project is led by a partner from first meeting to handover.",
            bullets: ["RIBA chartered practice", "Planning and building control handled", "Trusted network of builders"],
            image: photo("1503387762-592deb58ef4e", "Architectural drawings on a desk"),
            imagePosition: "left",
            cta: { label: "About the studio", href: "/about" },
          },
          { background: "surface" },
        ),
        section("stats", {
          items: [
            { value: "120+", label: "Projects completed" },
            { value: "15", label: "Design awards" },
            { value: "2009", label: "Studio founded" },
          ],
        }),
        section(
          "testimonials",
          {
            heading: "Clients on working with us",
            items: [
              { quote: "They listened more than they talked. The house feels like it was always meant to be there.", name: "Helen & Tom Avery", role: "Hillside House" },
              { quote: "On time, on budget and our team loves coming into the office.", name: "Sam Okafor", role: "COO, Meridian" },
              { quote: "Every detail was thought through, right down to the door handles.", name: "Leah Grant", role: "Canal Loft" },
            ],
          },
          { background: "surface" },
        ),
        ctaBand,
      ],
    },
    {
      name: "Portfolio",
      slug: "/portfolio",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "Portfolio",
          heading: "Work we are proud of",
          subheading: "A selection of homes, workplaces and interiors from across the UK.",
        }),
        projects,
        section("gallery", {
          heading: "Details",
          columns: 3,
          mobileColumns: 1,
          images: [
            photo("1600566753190-17f0baa2a6c3", "Kitchen with stone worktop", 1000),
            photo("1618221195710-dd6b41faaea6", "Living room with natural light", 1000),
            photo("1586023492125-27b2c045efd7", "Lounge with designer furniture", 1000),
            photo("1564013799919-ab600027ffc6", "House exterior with pool", 1000),
            photo("1513694203232-719a280e022f", "Bright interior with large windows", 1000),
            photo("1486406146926-c627a92ad1ab", "Glass office tower", 1000),
          ],
        }),
        ctaBand,
      ],
    },
    {
      name: "About",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "split",
          eyebrow: "The studio",
          heading: "A small studio with a big attention span",
          subheading:
            "Eleven architects and designers working from a converted print works in Clerkenwell.",
          image: photo("1497366216548-37526070297c", "{{businessName}} studio"),
          imageStyle: "plain",
          primaryCta: { label: "Work with us", href: "/contact" },
        }),
        section(
          "features",
          {
            variant: "minimal",
            heading: "How we work",
            columns: 4,
            mobileColumns: 1,
            items: [
              { icon: "chat", title: "1. Brief", description: "We visit the site and learn how you want to use it." },
              { icon: "layers", title: "2. Design", description: "Sketches, models and 3D views until it feels right." },
              { icon: "shield", title: "3. Approvals", description: "We prepare and manage planning applications." },
              { icon: "tools", title: "4. Build", description: "We oversee the builders through to handover." },
            ],
          },
          { background: "surface" },
        ),
        section("team", {
          variant: "minimal-editorial",
          heading: "Partners",
          columns: 3,
          mobileColumns: 1,
          members: [
            { name: "Clara Weiss", role: "Founding Partner", photo: photo("1544005313-94ddf0286df2", "Clara Weiss", 600) },
            { name: "Oliver Shaw", role: "Partner, Residential", photo: photo("1472099645785-5658abf4ff4e", "Oliver Shaw", 600) },
            { name: "Nadia Haddad", role: "Head of Interiors", photo: photo("1580489944761-15a19d654956", "Nadia Haddad", 600) },
          ],
        }),
        ctaBand,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "minimal-editorial",
          eyebrow: "Contact",
          heading: "Start a project",
          text: "Tell us where, what and roughly when. We reply to every enquiry within two working days.",
          email: "studio@atelierarchitects.com",
          phone: "+44 20 7946 0321",
          address: "12 Clerkenwell Road, London EC1M",
          officeHours: "Mon–Fri, 9am–6pm",
          showForm: true,
          formHeading: "Project enquiry",
          serviceOptions: ["New home", "Extension or renovation", "Commercial", "Interiors"],
          submitLabel: "Send enquiry",
        }),
      ],
    },
  ],
});
