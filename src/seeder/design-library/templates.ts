import { PageType } from "../../common/constants/website.js";
import type {
  SectionDataMap,
  SectionSettings,
  SectionType,
} from "../../modules/websites/types/site-content.types.js";
import type {
  TemplateFooter,
  TemplateHeader,
  TemplatePage,
  TemplateSection,
} from "../../modules/websites/types/template.types.js";
import { BUSINESS_TEMPLATES } from "./business/index.js";
import { EDUCATION_TEMPLATES } from "./education/index.js";
import { PORTFOLIO_TEMPLATES } from "./portfolio/index.js";

export type WebsiteTemplateSeed = {
  key: string;
  name: string;
  category: string;
  description: string;
  themeName: string;
  header: TemplateHeader;
  footer: TemplateFooter;
  pages: TemplatePage[];
};

function section<T extends SectionType>(
  type: T,
  data: SectionDataMap[T],
  settings: Partial<SectionSettings> = {},
): TemplateSection {
  return {
    type,
    hidden: false,
    settings: { background: "default", hideOnMobile: false, ...settings },
    data,
  } as TemplateSection;
}

const contactPage: TemplatePage = {
  name: "Contact",
  slug: "/contact",
  pageType: PageType.CONTACT,
  showInNav: true,
  sections: [
    section("contact", {
      heading: "Get in touch",
      text: "Tell us what you need and we will get back to you within one business day.",
      showForm: true,
      submitLabel: "Send message",
    }),
  ],
};

const testimonials = section(
  "testimonials",
  {
    heading: "What our customers say",
    items: [
      { quote: "Professional, friendly and quick. Highly recommended.", name: "Customer name", role: "Company" },
      { quote: "They understood exactly what we needed.", name: "Customer name", role: "Company" },
      { quote: "Great results and clear communication throughout.", name: "Customer name", role: "Company" },
    ],
  },
  { background: "surface" },
);

export const WEBSITE_TEMPLATE_SEEDS: WebsiteTemplateSeed[] = [
  {
    key: "business-classic",
    name: "Business Classic",
    category: "Business",
    description: "A clear, professional site for service businesses.",
    themeName: "Clean Professional",
    header: { design: "logo-left", sticky: true, cta: { label: "Contact us", href: "/contact" } },
    footer: { design: "columns", description: "{{businessName}}", columns: [], social: [] },
    pages: [
      {
        name: "Home",
        slug: "/",
        pageType: PageType.HOME,
        showInNav: true,
        sections: [
          section("hero", {
            variant: "centered",
            eyebrow: "Welcome to {{businessName}}",
            heading: "Reliable service you can count on",
            subheading: "Describe what your business does and who it helps in one or two sentences.",
            primaryCta: { label: "Get in touch", href: "/contact" },
            secondaryCta: { label: "Our services", href: "/services" },
          }),
          section(
            "features",
            {
              heading: "Why choose {{businessName}}",
              columns: 3,
              mobileColumns: 1,
              items: [
                { icon: "shield", title: "Trusted", description: "Explain why customers can rely on you." },
                { icon: "bolt", title: "Responsive", description: "Explain how quickly you help customers." },
                { icon: "heart", title: "Friendly", description: "Explain what it is like to work with you." },
              ],
            },
            { background: "surface" },
          ),
          section("services", {
            heading: "What we do",
            columns: 3,
            mobileColumns: 1,
            items: [
              { title: "Service one", description: "A short description of this service.", link: { label: "Learn more", href: "/services" } },
              { title: "Service two", description: "A short description of this service.", link: { label: "Learn more", href: "/services" } },
              { title: "Service three", description: "A short description of this service.", link: { label: "Learn more", href: "/services" } },
            ],
          }),
          testimonials,
          section(
            "cta",
            {
              heading: "Ready to get started?",
              text: "Contact us today for a free consultation.",
              button: { label: "Contact us", href: "/contact" },
            },
            { background: "primary" },
          ),
        ],
      },
      {
        name: "About",
        slug: "/about",
        pageType: PageType.ABOUT,
        showInNav: true,
        sections: [
          section("text", {
            heading: "About {{businessName}}",
            body: "Tell your story here: when you started, what you do and why you do it.\n\nAdd a second paragraph about your team, values or experience.",
          }),
          section(
            "features",
            {
              heading: "Our values",
              columns: 3,
              mobileColumns: 1,
              items: [
                { icon: "check", title: "Quality", description: "Describe this value." },
                { icon: "chat", title: "Honesty", description: "Describe this value." },
                { icon: "star", title: "Care", description: "Describe this value." },
              ],
            },
            { background: "surface" },
          ),
        ],
      },
      {
        name: "Services",
        slug: "/services",
        pageType: PageType.SERVICES,
        showInNav: true,
        sections: [
          section("services", {
            heading: "Our services",
            intro: "Everything we offer, in one place.",
            columns: 3,
            mobileColumns: 1,
            items: [
              { title: "Service one", description: "Describe this service in a sentence or two." },
              { title: "Service two", description: "Describe this service in a sentence or two." },
              { title: "Service three", description: "Describe this service in a sentence or two." },
            ],
          }),
          section(
            "faq",
            {
              heading: "Frequently asked questions",
              items: [
                { question: "How do I get started?", answer: "Explain the first step for a new customer." },
                { question: "How much does it cost?", answer: "Explain your pricing or how you quote." },
              ],
            },
            { background: "surface" },
          ),
        ],
      },
      contactPage,
    ],
  },
  {
    key: "agency-modern",
    name: "Agency Modern",
    category: "Agency",
    description: "A bold layout for agencies and studios, with a portfolio page.",
    themeName: "Fresh Green",
    header: {
      design: "logo-left",
      sticky: true,
      announcement: "Now taking new projects",
      cta: { label: "Start a project", href: "/contact" },
    },
    footer: { design: "columns", description: "{{businessName}}", columns: [], social: [] },
    pages: [
      {
        name: "Home",
        slug: "/",
        pageType: PageType.HOME,
        showInNav: true,
        sections: [
          section("hero", {
            variant: "centered",
            eyebrow: "{{businessName}}",
            heading: "We help brands grow online",
            subheading: "Strategy, design and marketing for businesses that want to stand out.",
            primaryCta: { label: "Start a project", href: "/contact" },
            secondaryCta: { label: "See our work", href: "/portfolio" },
          }),
          section(
            "services",
            {
              heading: "What we do",
              columns: 3,
              mobileColumns: 1,
              items: [
                { title: "Strategy", description: "Research and planning that sets clear goals." },
                { title: "Design", description: "Websites and brands people remember." },
                { title: "Marketing", description: "Campaigns that bring in the right customers." },
              ],
            },
            { background: "surface" },
          ),
          section("features", {
            heading: "How we work",
            columns: 4,
            mobileColumns: 1,
            items: [
              { icon: "chat", title: "Listen", description: "We learn your goals." },
              { icon: "star", title: "Plan", description: "We agree a clear plan." },
              { icon: "bolt", title: "Build", description: "We deliver quickly." },
              { icon: "check", title: "Improve", description: "We measure and refine." },
            ],
          }),
          testimonials,
          section(
            "cta",
            {
              heading: "Have a project in mind?",
              text: "Tell us about it and get a proposal within a week.",
              button: { label: "Start a project", href: "/contact" },
            },
            { background: "primary" },
          ),
        ],
      },
      {
        name: "About",
        slug: "/about",
        pageType: PageType.ABOUT,
        showInNav: true,
        sections: [
          section("text", {
            heading: "About {{businessName}}",
            body: "Introduce your agency: who you are, who you work with and what makes you different.\n\nAdd a paragraph about your team and approach.",
          }),
        ],
      },
      {
        name: "Services",
        slug: "/services",
        pageType: PageType.SERVICES,
        showInNav: true,
        sections: [
          section("services", {
            heading: "Services",
            columns: 2,
            mobileColumns: 1,
            items: [
              { title: "Brand strategy", description: "Describe this service." },
              { title: "Web design", description: "Describe this service." },
              { title: "Search marketing", description: "Describe this service." },
              { title: "Social media", description: "Describe this service." },
            ],
          }),
          section(
            "faq",
            {
              heading: "Questions",
              items: [
                { question: "How long does a project take?", answer: "Explain your typical timeline." },
                { question: "Do you work with small businesses?", answer: "Explain who you work with." },
              ],
            },
            { background: "surface" },
          ),
        ],
      },
      {
        name: "Portfolio",
        slug: "/portfolio",
        pageType: PageType.CUSTOM,
        showInNav: true,
        sections: [
          section("gallery", { heading: "Our work", columns: 3, mobileColumns: 1, images: [] }),
        ],
      },
      contactPage,
    ],
  },
  {
    key: "single-landing",
    name: "Single Landing Page",
    category: "Landing page",
    description: "One focused page to promote a single offer and collect enquiries.",
    themeName: "Warm Studio",
    header: { design: "centered", sticky: false },
    footer: { design: "simple", columns: [], social: [] },
    pages: [
      {
        name: "Home",
        slug: "/",
        pageType: PageType.LANDING,
        showInNav: false,
        sections: [
          section("hero", {
            variant: "centered",
            eyebrow: "{{businessName}}",
            heading: "Your main offer in one sentence",
            subheading: "Explain the benefit and who it is for.",
          }),
          section(
            "features",
            {
              heading: "What you get",
              columns: 3,
              mobileColumns: 1,
              items: [
                { icon: "check", title: "Benefit one", description: "Describe this benefit." },
                { icon: "check", title: "Benefit two", description: "Describe this benefit." },
                { icon: "check", title: "Benefit three", description: "Describe this benefit." },
              ],
            },
            { background: "surface" },
          ),
          testimonials,
          section("faq", {
            heading: "Questions",
            items: [{ question: "Add a common question?", answer: "Answer it here." }],
          }),
          section("contact", {
            heading: "Get in touch",
            text: "Leave your details and we will contact you.",
            showForm: true,
            submitLabel: "Send",
          }),
        ],
      },
    ],
  },
  ...BUSINESS_TEMPLATES.map((business) => business.template),
  ...EDUCATION_TEMPLATES.map((edu) => edu.template),
  ...PORTFOLIO_TEMPLATES.map((portfolio) => portfolio.template),
];
