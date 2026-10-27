import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { VIDEO_PRODUCTION_LOGO } from "../logos.js";

const NAME = "Vintage Reels Entertainment";

const header: HeaderData = {
  design: "vintage-editorial",
  siteName: NAME,
  logo: VIDEO_PRODUCTION_LOGO,
  logoDisplay: "logo_only",
  menu: [
    { label: "HOME", href: "/" },
    { label: "ABOUT US", href: "/about" },
    { label: "WORK", href: "/work" },
    { label: "BLOG", href: "/blog" },
    { label: "CONTACT", href: "/contact" },
  ],
  cta: { label: "START A PROJECT", href: "/contact" },
  position: "sticky",
  sticky: true,
};

const footer: FooterData = {
  design: "columns",
  siteName: "Vintage Reels",
  logoDisplay: "text_only",
  tagline: "ENTERTAINMENT",
  description: "Entertainment videos that blend vintage charm with modern aesthetics.",
  columns: [
    {
      title: "PAGES",
      links: [
        { label: "Home", href: "/" },
        { label: "About Us", href: "/about" },
        { label: "Work", href: "/work" },
        { label: "Blog", href: "/blog" },
        { label: "Contact", href: "/contact" },
      ],
    },
    {
      title: "CONTACT",
      links: [
        { label: "[hello@vintagereels.com]", href: "mailto:hello@vintagereels.com" },
        { label: "[+01 00000 00000]", href: "tel:+010000000000" },
        { label: "[City, Country]", href: "/contact" },
      ],
    },
    {
      title: "FOLLOW",
      links: [
        { label: "[Instagram]", href: "https://www.instagram.com" },
        { label: "[YouTube]", href: "https://www.youtube.com" },
        { label: "[Vimeo]", href: "https://vimeo.com" },
      ],
    },
  ],
  social: [],
  paymentMethods: { enabled: false },
  copyright: `© [Year] ${NAME}. All rights reserved.`,
  legalLinks: [
    { label: "Privacy Policy", href: "/contact" },
    { label: "Terms", href: "/contact" },
  ],
};

const filmVault = section("cards", {
  variant: "film-vault",
  eyebrow: "CONTACT SHEET — RECENT WORK",
  heading: "",
  columns: 4,
  mobileColumns: 1,
  items: [
    {
      title: "Midnight Radio",
      description: "Concert stage lights and beams",
      image: photo("1540039155733-5bb30b53aa14", "Midnight Radio stage lighting", 1000),
    },
    {
      title: "Fields of Gold",
      description: "Golden hour sunlit meadow",
      image: photo("1500534314209-a25ddb2bd429", "Fields of Gold sunlit meadow", 1000),
    },
    {
      title: "The Late Show",
      description: "Cinema projector beam and theater seats",
      image: photo("1489599849927-2ee91cede3ba", "The Late Show cinema theatre", 1000),
    },
    {
      title: "Brick Lane Session",
      description: "Vintage studio brick wall",
      image: photo("1495578942200-c5f5d2137def", "Brick Lane session texture", 1000),
    },
  ],
});

const quoteSection = section(
  "text",
  {
    variant: "pull-quote",
    body: "“Every frame should feel like a memory you haven't had yet.”",
  },
  { align: "center" },
);

const storyCta = section("cta", {
  variant: "vintage-story",
  heading: "Have a story <em>to tell?</em>",
  button: { label: "Start a project", href: "/contact" },
});

const bannerCta = section("cta", {
  variant: "vintage-banner",
  heading: "Let's make something timeless",
  button: { label: "Book a free call", href: "/contact" },
});

export const VIDEO_PRODUCTION: BusinessTemplate = businessTemplate({
  key: "video-production-velvet",
  name: "Video Production · Vintage Reels",
  category: "Agency",
  description: "A boutique film & entertainment production template with vintage editorial typography, polaroid gallery, and 35mm film aesthetics.",
  themeName: "Vintage Reels",
  theme: {
    colors: {
      primary: "#C4472D",
      secondary: "#FBEFD5",
      background: "#F2EEE3",
      surface: "#EAE4D6",
      text: "#1D1910",
      muted: "#6B645A",
    },
    fonts: { heading: "fraunces", body: "manrope" },
    buttonStyle: "filled",
    cardStyle: "flat",
    radius: "md",
    containerWidth: 1058,
    sectionSpacing: "normal",
  },
  header,
  footer,
  pages: [
    {
      name: "Home",
      slug: "/",
      sections: [
        section("hero", {
          variant: "vintage-editorial",
          heading: "Old soul,<br><em>new</em> stories.",
          subheading:
            "Vintage Reels Entertainment crafts high-quality entertainment videos that blend vintage charm with modern aesthetics. We bring stories to life through captivating visuals, timeless creativity and contemporary storytelling.",
          primaryCta: { label: "Start a project", href: "/contact" },
          secondaryCta: { label: "Watch showreel", href: "/work" },
          topStrip: {
            left: "VOL. 01 — THE EDITORIAL ISSUE",
            center: "VINTAGE FILMS & ADS COMPANY",
            right: "MUSIC • FILMS • EVENTS • FILM",
          },
          image: photo("1688876100018-501f6b9393b8", "Photographer on set", 1200),
          secondaryImage: photo("1514432324607-a09d9b4aefdd", "Espresso coffee cup", 1200),
          vintagePolaroids: [
            {
              image: photo("1688876100018-501f6b9393b8", "Photographer on set", 1200),
              caption: "On location, frame 07",
              rotation: -2,
            },
            {
              image: photo("1514432324607-a09d9b4aefdd", "Espresso coffee cup", 1200),
              caption: "Golden Hour Espresso Bar",
              rotation: 2,
            },
          ],
        }),
        section("services", {
          variant: "editorial-specs",
          eyebrow: "THE SPECS — WHAT WE MAKE",
          heading: "The Specs",
          columns: 1,
          mobileColumns: 1,
          items: [
            { title: "Music videos", description: "A hit, lit world for every track" },
            {
              title: "Brand films & ads",
              description: "Commercials with a cinema spirit and pulse",
              stampHighlight: true,
            },
            { title: "Weddings & events", description: "Celebrations filmed like cinema" },
            { title: "Short films", description: "Stories to scream, feel & relate" },
            { title: "Documentaries", description: "Real stories, told with warmth" },
            { title: "Post-production", description: "Edit, colour grade, sound and film looks" },
          ],
        }),
        filmVault,
        section("features", {
          variant: "editorial-process",
          eyebrow: "HOW WE WORK",
          heading: "From first idea to <em>final cut</em>",
          columns: 4,
          mobileColumns: 1,
          items: [
            {
              badge: "i.",
              title: "Discover",
              description: "We learn your story, audience, goals and budget.",
            },
            {
              badge: "ii.",
              title: "Pre-production",
              description: "Concept, script, mood board, locations and schedule.",
            },
            {
              badge: "iii.",
              title: "Production",
              description: "Our crew films with cinema cameras, light and sound.",
            },
            {
              badge: "iv.",
              title: "Post & delivery",
              description: "Edit, colour, sound and files for every platform.",
            },
          ],
        }),
        quoteSection,
        section("blog", {
          variant: "vintage-journal",
          eyebrow: "FROM THE BLOG",
          title: "Stories behind the reels",
          subtitle: "Observations on classic cinema, analog color science, and timeless visual craft.",
          categories: ["All", "Trends", "Guide", "Craft"],
          layout: "grid-3",
          posts: [
            {
              id: "post-1",
              title: "Why vintage looks are back in music videos",
              slug: "/blog/why-vintage-looks-are-back",
              excerpt:
                "The resurgence of warm halation, 16mm grain, and authentic analog lenses in modern chart-topping visuals.",
              coverImage: photo("1540039155733-5bb30b53aa14", "Music video stage lighting", 1000),
              category: "TRENDS • 3 MIN",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "3 MIN",
              readMoreLabel: "Read article",
            },
            {
              id: "post-2",
              title: "How to plan a brand film in five steps",
              slug: "/blog/how-to-plan-a-brand-film",
              excerpt:
                "From creative treatment and mood board curation to principal photography and final color grade delivery.",
              coverImage: photo("1514432324607-a09d9b4aefdd", "Espresso coffee cup", 1000),
              category: "GUIDE • 5 MIN",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "5 MIN",
              readMoreLabel: "Read article",
            },
            {
              id: "post-3",
              title: "Getting the film look with digital cameras",
              slug: "/blog/getting-the-film-look",
              excerpt:
                "Emulating classic Kodak and Fujifilm print stocks using modern cinema sensors, vintage glass, and soft lighting.",
              coverImage: photo("1489599849927-2ee91cede3ba", "Cinema projector light in theatre", 1000),
              category: "CRAFT • 4 MIN",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "4 MIN",
              readMoreLabel: "Read article",
            },
          ],
        }),
        storyCta,
      ],
    },
    {
      name: "About Us",
      slug: "/about",
      sections: [
        section("hero", {
          variant: "vintage-sunburst",
          eyebrow: "ABOUT US",
          heading: "Lights!<br>Camera!",
          sunburstTitleWhite: "Nostalgia!",
          subheading:
            "We are Vintage Reels Entertainment, a creative production company that makes modern films with a vintage heart.",
          primaryCta: { label: "See our reels", href: "/work" },
          circularPortrait: photo("1688876100018-501f6b9393b8", "Photographer portrait", 1200),
        }),
        section(
          "split",
          {
            eyebrow: "",
            heading: "Born from a love of old movies",
            body:
              "Vintage Reels began with a simple love for classic cinema: the grain, the warm colours and the patient storytelling. [Add the founding year, city and founder story here.]\n\nToday we blend that vintage charm with modern cameras, editing and formats. Music videos, brand films, weddings and short films, every project is crafted to look beautiful and be remembered.",
            bullets: [],
            image: photo("1495578942200-c5f5d2137def", "Our studio vintage brick wall", 1200),
            imagePosition: "left",
            imageStyle: "polaroid",
            imageTapeLabel: "Our studio, [Year]",
          },
          { background: "default" },
        ),
        section("features", {
          variant: "colored-pillars",
          heading: "What drives us",
          columns: 3,
          mobileColumns: 1,
          items: [
            {
              badge: "MISSION",
              title: "Bring stories to life",
              description:
                "Craft entertainment videos that blend vintage charm with modern aesthetics, so every story is captivating to watch.",
            },
            {
              badge: "VISION",
              title: "Timeless for years",
              description:
                "Be the studio artists, brands and families choose for films that still feel right years from now.",
            },
            {
              badge: "VALUES",
              title: "Craft, care, character",
              description:
                "Quality in every frame, friendly communication and bold, original ideas.",
            },
          ],
        }),
        section(
          "cards",
          {
            variant: "polaroid-grid",
            heading: "Why choose us",
            columns: 4,
            mobileColumns: 1,
            items: [
              {
                title: "A signature look",
                description:
                  "Vintage textures and warm colour your audience will remember.",
                image: photo("1489599849927-2ee91cede3ba", "Cinema seats", 800),
              },
              {
                title: "Story first",
                description:
                  "Every frame serves the story, from 15 seconds to 30 minutes.",
                image: photo("1540039155733-5bb30b53aa14", "Concert stage lights", 800),
              },
              {
                title: "One studio",
                description:
                  "Concept, shoot and post-production with one point of contact.",
                image: photo("1514432324607-a09d9b4aefdd", "Espresso coffee cup", 800),
              },
              {
                title: "Every screen",
                description:
                  "Masters for cinema and TV, cut-downs for YouTube and reels.",
                image: photo("1500534314209-a25ddb2bd429", "Green field and forest", 800),
              },
            ],
          },
          { background: "dark" },
        ),
        bannerCta,
      ],
    },
    {
      name: "Work",
      slug: "/work",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "PORTFOLIO ARCHIVE",
          heading: "Every frame earns its place",
          subheading:
            "A showcase of music videos, commercials, brand documentaries and cinema productions.",
          primaryCta: { label: "Start a project", href: "/contact" },
        }),
        filmVault,
        section(
          "cards",
          {
            variant: "polaroid-grid",
            heading: "Featured Frames",
            columns: 4,
            mobileColumns: 1,
            items: [
              {
                title: "Midnight Radio",
                description: "Broadcast commercial captured on vintage anamorphic lenses.",
                image: photo("1540039155733-5bb30b53aa14", "Concert stage lights", 800),
              },
              {
                title: "The Late Show",
                description: "Feature film prologue filmed on Kodak 35mm vision stock.",
                image: photo("1489599849927-2ee91cede3ba", "Cinema projector", 800),
              },
              {
                title: "Fields of Gold",
                description: "Documentary portrait of rural artisans and master woodworkers.",
                image: photo("1500534314209-a25ddb2bd429", "Fields of gold", 800),
              },
              {
                title: "Espresso Session",
                description: "Sensory commercial series for artisanal coffee roasters.",
                image: photo("1514432324607-a09d9b4aefdd", "Coffee cup", 800),
              },
            ],
          },
          { background: "dark" },
        ),
        quoteSection,
        storyCta,
      ],
    },
    {
      name: "Blog",
      slug: "/blog",
      sections: [
        section("hero", {
          variant: "minimal-typography",
          eyebrow: "DISPATCHES",
          heading: "Stories behind the celluloid",
          subheading:
            "Practical notes on vintage lenses, color grading, analog lighting and cinematic storytelling.",
        }),
        section("blog", {
          eyebrow: "FROM THE BLOG",
          title: "Articles & Dispatches",
          subtitle:
            "Guides and observations to help filmmakers and brands create memorable visual work.",
          categories: ["All", "Trends", "Guide", "Craft"],
          layout: "grid-3",
          posts: [
            {
              id: "post-1",
              title: "Why vintage looks are back in music videos",
              slug: "/blog/why-vintage-looks-are-back",
              excerpt:
                "The resurgence of warm halation, 16mm grain, and authentic analog lenses in modern chart-topping visuals.",
              coverImage: photo("1540039155733-5bb30b53aa14", "Music video stage lighting", 1000),
              category: "TRENDS • 3 MIN",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "3 MIN",
              readMoreLabel: "Read article",
            },
            {
              id: "post-2",
              title: "How to plan a brand film in five steps",
              slug: "/blog/how-to-plan-a-brand-film",
              excerpt:
                "From creative treatment and mood board curation to principal photography and final color grade delivery.",
              coverImage: photo("1514432324607-a09d9b4aefdd", "Espresso coffee cup", 1000),
              category: "GUIDE • 5 MIN",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "5 MIN",
              readMoreLabel: "Read article",
            },
            {
              id: "post-3",
              title: "Getting the film look with digital cameras",
              slug: "/blog/getting-the-film-look",
              excerpt:
                "Emulating classic Kodak and Fujifilm print stocks using modern cinema sensors, vintage glass, and soft lighting.",
              coverImage: photo("1489599849927-2ee91cede3ba", "Cinema projector light in theatre", 1000),
              category: "CRAFT • 4 MIN",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "4 MIN",
              readMoreLabel: "Read article",
            },
          ],
        }),
        bannerCta,
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section("contact", {
          variant: "cards-hub",
          eyebrow: "GET IN TOUCH",
          heading: "Tell us about your story",
          text:
            "Share your project idea, timeline, and audience. We'll reply with a creative treatment and fixed quote within 24 hours.",
          email: "hello@vintagereels.com",
          phone: "+01 00000 00000",
          address: "74 Brick Lane, Shoreditch, London E1",
          officeHours: "Mon–Fri, 9am–7pm",
          responseTime: "Replies within 1 business day",
          showForm: true,
          formHeading: "Project brief",
          serviceOptions: [
            "Music video",
            "Brand film & ad",
            "Weddings & events",
            "Short film",
            "Documentaries",
            "Post-production",
          ],
          submitLabel: "Send brief",
        }),
      ],
    },
  ],
});
