import type { FooterData, HeaderData } from "../../../modules/websites/types/site-content.types.js";
import { businessTemplate, photo, section, type BusinessTemplate } from "./build.js";
import { VIDEO_PRODUCTION_LOGO } from "../logos.js";

const NAME = "Vintage Reels Entertainment";

/** Free, publicly hosted demo clips; keep in sync with website-builder-fe/src/site-kit/sample-films.ts. */
const SAMPLE_FILM_VIDEOS = {
  oceans: "https://vjs.zencdn.net/v/oceans.mp4",
  flower: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  friday: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4",
  jellyfish: "https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_2MB.mp4",
  bunny: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4",
  bunnyTrailer: "https://media.w3.org/2010/05/bunny/trailer.mp4",
  sintel: "https://media.w3.org/2010/05/sintel/trailer.mp4",
  street: "https://media.w3.org/2010/05/video/movie_300.mp4",
} as const;

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
        { label: "[+91 98201 44520]", href: "tel:+919820144520" },
        { label: "[Mumbai, India]", href: "/contact" },
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
  copyright: `© 2026 ${NAME}. All rights reserved.`,
  legalLinks: [
    { label: "Privacy Policy", href: "/contact" },
    { label: "Terms", href: "/contact" },
  ],
};

const filmVault = section(
  "cards",
  {
    variant: "film-vault",
    eyebrow: "PORTFOLIO",
    heading: "OUR WORK",
    intro:
      "Music videos, brand films, weddings and short films. Swipe the strip and press play on any frame.",
    columns: 4,
    mobileColumns: 1,
    items: [
      {
        title: "MIDNIGHT RADIO",
        badge: "MUSIC VIDEO • 03:45",
        subtitle: "MUSIC VIDEOS",
        description: "Broadcast commercial captured on vintage anamorphic lenses.",
        videoUrl: SAMPLE_FILM_VIDEOS.sintel,
      },
      {
        title: "GOLDEN BREW CO.",
        badge: "BRAND FILM • 01:20",
        subtitle: "BRAND FILMS",
        description: "Sensory commercial series for artisanal coffee roasters.",
        videoUrl: SAMPLE_FILM_VIDEOS.flower,
      },
      {
        title: "FIELD OF GOLD",
        badge: "WEDDING • 05:10",
        subtitle: "WEDDINGS & EVENTS",
        description: "Documentary portrait of rural artisans and master woodworkers.",
        videoUrl: SAMPLE_FILM_VIDEOS.oceans,
      },
      {
        title: "THE LATE SHOW",
        badge: "SHORT FILM • 12:40",
        subtitle: "SHORT FILMS",
        description: "Feature film prologue filmed on Kodak 35mm vision stock.",
        videoUrl: SAMPLE_FILM_VIDEOS.bunnyTrailer,
      },
      {
        title: "BRICK LANE SESSION",
        badge: "MUSIC VIDEO • 04:15",
        subtitle: "MUSIC VIDEOS",
        description: "Studio live performance recorded direct to analog tape.",
        videoUrl: SAMPLE_FILM_VIDEOS.friday,
      },
      {
        title: "THE CRAFTSMAN",
        badge: "DOCUMENTARY • 08:30",
        subtitle: "SHORT FILMS",
        description: "Intimate character study of master Japanese wood joinery.",
        videoUrl: SAMPLE_FILM_VIDEOS.street,
      },
      {
        title: "NEON DREAMS",
        badge: "BRAND FILM • 02:05",
        subtitle: "BRAND FILMS",
        description: "Night drive through Tokyo captured on 500T film stock.",
        videoUrl: SAMPLE_FILM_VIDEOS.jellyfish,
      },
      {
        title: "SUMMER OF 96",
        badge: "SHORT FILM • 15:20",
        subtitle: "SHORT FILMS",
        description: "Coming-of-age road movie across California coastal highway.",
        videoUrl: SAMPLE_FILM_VIDEOS.bunny,
      },
    ],
  },
  { background: "dark" },
);

const whatWeShootSection = section(
  "services",
  {
    variant: "editorial-specs",
    heading: "WHAT WE SHOOT",
    columns: 3,
    mobileColumns: 1,
    items: [
      {
        title: "MUSIC VIDEOS",
        description: "Concept, performance and story for artists and labels.",
      },
      {
        title: "BRAND FILMS",
        description: "Commercials and brand stories with a classic feel.",
      },
      {
        title: "WEDDINGS & EVENTS",
        description: "Celebrations and launches, filmed like cinema.",
      },
      {
        title: "SHORT FILMS",
        description: "Script to screen for festivals and online release.",
      },
      {
        title: "DOCUMENTARIES",
        description: "Real people and real stories, told with warmth.",
      },
      {
        title: "POST-PRODUCTION",
        description: "Editing, colour grading, sound and film looks.",
      },
    ],
  },
  { background: "dark" },
);

const rollCameraCta = section(
  "cta",
  {
    variant: "vintage-banner",
    heading: "ROLL CAMERA?",
    button: { label: "START A PROJECT", href: "/contact" },
  },
  { background: "dark" },
);

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
            center: "COURTESY: VINTAGE FILM COMPANY",
            right: "MUSIC • FILMS • EVENTS • FILM",
          },
          image: photo("1485846234645-a62644f84728", "Director with vintage camera on tripod", 1200),
          secondaryImage: photo("1514432324607-a09d9b4aefdd", "Espresso coffee cup", 1200),
          vintagePolaroids: [
            {
              image: photo("1485846234645-a62644f84728", "Director with vintage camera on tripod", 1200),
              caption: "Up for views, press 12",
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
              "Vintage Reels began with a simple love for classic cinema: the grain, the warm colours and the patient storytelling. Founded in 2018 in Mumbai by cinematographer Aarav Sen, our boutique studio started with an Arriflex 16SR and a collection of vintage Cooke Speed Panchro lenses.\n\nToday we blend that vintage charm with modern cameras, editing and formats. Music videos, brand films, weddings and short films, every project is crafted to look beautiful and be remembered.",
            bullets: [],
            image: photo("1495578942200-c5f5d2137def", "Our studio vintage brick wall", 1200),
            imagePosition: "left",
            imageStyle: "polaroid",
            imageTapeLabel: "Studio Stage A, 2018",
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
        filmVault,
        whatWeShootSection,
        rollCameraCta,
      ],
    },
    {
      name: "Blog",
      slug: "/blog",
      sections: [
        section("blog", {
          variant: "vintage-journal",
          eyebrow: "THE VINTAGE REELS BLOG",
          title: "Notes from the cutting room",
          italicTitle: "cutting room",
          categories: ["ALL", "TRENDS", "GUIDES", "CRAFT"],
          showNewsletterCard: true,
          newsletterTitle: "Get new articles in your inbox",
          newsletterPlaceholder: "Your email address",
          newsletterButtonText: "SUBSCRIBE",
          posts: [
            {
              id: "post-1",
              title: "Why vintage looks are back in music videos",
              slug: "/blog/why-vintage-looks-are-back",
              excerpt:
                "The resurgence of warm halation, 16mm grain, and authentic analog lenses in modern chart-topping visuals.",
              coverImage: photo("1540039155733-5bb30b53aa14", "Concert stage lights with audience", 1200),
              category: "TRENDS",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "4 MIN READ",
              featured: true,
            },
            {
              id: "post-2",
              title: "How to plan a brand film in five steps",
              slug: "/blog/how-to-plan-a-brand-film",
              excerpt: "A simple plan that keeps your shoot on time and on budget.",
              coverImage: photo("1514432324607-a09d9b4aefdd", "Espresso coffee cup", 1000),
              category: "GUIDE",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "5 MIN",
            },
            {
              id: "post-3",
              title: "Getting the film look with digital cameras",
              slug: "/blog/getting-the-film-look",
              excerpt: "Lenses, light and grading choices that make digital feel like film.",
              coverImage: photo("1489599849927-2ee91cede3ba", "Cinema projector light in theatre", 1000),
              category: "CRAFT",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "6 MIN",
            },
            {
              id: "post-4",
              title: "Seven questions to ask your wedding filmmaker",
              slug: "/blog/seven-questions-wedding-filmmaker",
              excerpt: "What to check before you book, from style to delivery time.",
              coverImage: photo("1500382017468-9049fed747ef", "Sunlit meadow and pine trees", 1000),
              category: "GUIDE",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "4 MIN",
            },
            {
              id: "post-5",
              title: "Why vintage looks are back in music videos",
              slug: "/blog/why-vintage-looks-are-back",
              excerpt: "Grain, light leaks and 4:3 frames are everywhere again.",
              coverImage: photo("1540039155733-5bb30b53aa14", "Music video stage lighting", 1000),
              category: "TRENDS",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "4 MIN",
            },
            {
              id: "post-6",
              title: "Inside our colour suite",
              slug: "/blog/inside-our-colour-suite",
              excerpt:
                "How one custom 35mm print LUT and photochemical halation curve turn everyday footage into a timeless memory.",
              coverImage: photo("1495578942200-c5f5d2137def", "Studio vintage brick wall", 1000),
              category: "CRAFT",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "3 MIN",
            },
            {
              id: "post-7",
              title: "Short-form films that feel like cinema",
              slug: "/blog/short-form-films-cinema",
              excerpt:
                "Practical techniques for framing in 4:3, choosing vintage glass, and pacing vertical reels to feel like cinema.",
              coverImage: photo("1485846234645-a62644f84728", "Director with vintage camera on tripod", 1000),
              category: "TRENDS",
              authorName: "Vintage Reels",
              date: "Spring 2026",
              readTime: "5 MIN",
            },
          ],
        }),
      ],
    },
    {
      name: "Contact",
      slug: "/contact",
      sections: [
        section(
          "contact",
          {
            variant: "clapper-slate",
            eyebrow: "CONTACT",
            heading: "ROLL CAMERA",
            solidHeading: "ROLL",
            outlineHeading: "CAMERA",
            text: "Tell us about your project. We reply within 24 hours with ideas, timing and a quote.",
            recText: "REC · TAKE 01",
            timecode: "00:00:25:10",
            timecodeMode: "live",
            email: "[hello@vintagereels.com]",
            phone: "[+91 98201 44520]",
            address: "[14 Film City Rd, Goregaon East, Mumbai 400065]",
            officeHours: "[Mon–Sat, 10:00–19:00]",
            socialLinksText: "[Instagram] · [YouTube] · [Vimeo]",
            serviceOptions: [
              "MUSIC VIDEO",
              "BRAND FILM",
              "WEDDING / EVENT",
              "SHORT FILM",
              "DOCUMENTARY",
              "POST-PRODUCTION",
            ],
            budgetOptions: [
              "Choose a range",
              "Under $5,000",
              "$5,000 – $15,000",
              "$15,000 – $30,000",
              "$30,000+",
            ],
            sceneTakeLabel: "SCENE 01 · TAKE 01",
            submitLabel: "SEND IT ●",
            showForm: true,
          },
          { background: "dark" },
        ),
      ],
    },
  ],
});
