/**
 * Single source of truth for structured HTML import markup.
 * Keep frontend/src/features/websites/importHtmlConvention.ts in sync when changing contracts.
 */

export const IMPORTABLE_SECTION_TYPES = [
  "hero",
  "features",
  "services",
  "text",
  "cta",
  "faq",
  "testimonials",
  "gallery",
  "split",
  "stats",
  "pricing",
  "team",
  "media",
  "logos",
  "contact",
] as const;

export type ImportableSectionType = (typeof IMPORTABLE_SECTION_TYPES)[number];

/** Page wrappers: prefer data-wb-page; data-view kept for SPA compatibility. */
export const PAGE_ATTRS = ["data-wb-page", "data-view"] as const;

/** CSS/cheerio selectors that identify page roots (first match wins per element). */
export const PAGE_ROOT_SELECTOR = "[data-wb-page], .view[data-view], [data-view]";

export type FieldKind = "text" | "link" | "image" | "video" | "form" | "list";

export type FieldContract = {
  kind: FieldKind;
  /** Human label for docs / errors */
  label: string;
  required?: boolean;
  /** For list fields: child attribute container name (data-wb-field on wrapper). */
  listField?: string;
  /** Fields expected on each data-wb-item */
  itemFields?: string[];
  /** List items must include a marked image */
  requireItemImage?: boolean;
};

export type SectionContract = {
  type: ImportableSectionType;
  summary: string;
  fields: Record<string, FieldContract>;
};

/**
 * Per-section field contract. Mappers and the create-UI guide both follow this.
 * Add new section types here first, then implement the mapper.
 */
export const SECTION_CONTRACTS: Record<ImportableSectionType, SectionContract> = {
  hero: {
    type: "hero",
    summary: "Page headline, supporting text, CTA, optional image/video.",
    fields: {
      heading: { kind: "text", label: "Heading", required: true },
      subheading: { kind: "text", label: "Subheading" },
      eyebrow: { kind: "text", label: "Eyebrow" },
      primaryCta: { kind: "link", label: "Primary button" },
      secondaryCta: { kind: "link", label: "Secondary button" },
      image: { kind: "image", label: "Hero image" },
    },
  },
  features: {
    type: "features",
    summary: "Grid of feature items with title + description.",
    fields: {
      heading: { kind: "text", label: "Heading" },
      intro: { kind: "text", label: "Intro" },
      items: {
        kind: "list",
        label: "Feature items",
        listField: "items",
        itemFields: ["title", "description", "icon"],
        required: true,
      },
      bottomCta: { kind: "link", label: "Bottom CTA" },
    },
  },
  services: {
    type: "services",
    summary: "Service cards with title, description, optional price/link.",
    fields: {
      heading: { kind: "text", label: "Heading", required: true },
      intro: { kind: "text", label: "Intro" },
      items: {
        kind: "list",
        label: "Service items",
        listField: "items",
        itemFields: ["title", "description", "price", "badge", "link"],
        required: true,
      },
    },
  },
  text: {
    type: "text",
    summary: "Heading plus body paragraphs.",
    fields: {
      heading: { kind: "text", label: "Heading" },
      body: { kind: "text", label: "Body", required: true },
    },
  },
  cta: {
    type: "cta",
    summary: "Call-to-action band with one primary button.",
    fields: {
      heading: { kind: "text", label: "Heading", required: true },
      text: { kind: "text", label: "Supporting text" },
      button: { kind: "link", label: "Button (or primaryCta)" },
    },
  },
  faq: {
    type: "faq",
    summary: "Questions and answers (use faq, not gallery).",
    fields: {
      heading: { kind: "text", label: "Heading", required: true },
      items: {
        kind: "list",
        label: "Q&A items",
        listField: "items",
        itemFields: ["question", "answer"],
        required: true,
      },
    },
  },
  testimonials: {
    type: "testimonials",
    summary: "Customer quotes.",
    fields: {
      heading: { kind: "text", label: "Heading", required: true },
      items: {
        kind: "list",
        label: "Quotes",
        listField: "items",
        itemFields: ["quote", "name", "role", "avatar"],
        required: true,
      },
    },
  },
  gallery: {
    type: "gallery",
    summary: "Image grid — every item needs a marked image.",
    fields: {
      heading: { kind: "text", label: "Heading" },
      intro: { kind: "text", label: "Intro" },
      images: {
        kind: "list",
        label: "Images",
        listField: "images",
        itemFields: ["image", "title", "description"],
        requireItemImage: true,
        required: true,
      },
      cta: { kind: "link", label: "CTA" },
    },
  },
  split: {
    type: "split",
    summary: "Text + bullets beside an image.",
    fields: {
      heading: { kind: "text", label: "Heading", required: true },
      body: { kind: "text", label: "Body", required: true },
      bullets: { kind: "text", label: "Bullets (ul/li inside data-wb-field=bullets)" },
      image: { kind: "image", label: "Side image" },
      cta: { kind: "link", label: "CTA" },
    },
  },
  stats: {
    type: "stats",
    summary: "Big numbers with labels.",
    fields: {
      items: {
        kind: "list",
        label: "Stats",
        listField: "items",
        itemFields: ["value", "label"],
        required: true,
      },
    },
  },
  pricing: {
    type: "pricing",
    summary: "Pricing plans.",
    fields: {
      heading: { kind: "text", label: "Heading", required: true },
      plans: {
        kind: "list",
        label: "Plans",
        listField: "plans",
        itemFields: ["name", "price", "period", "description", "features", "cta"],
        required: true,
      },
    },
  },
  team: {
    type: "team",
    summary: "Team members with optional photo.",
    fields: {
      heading: { kind: "text", label: "Heading", required: true },
      members: {
        kind: "list",
        label: "Members",
        listField: "members",
        itemFields: ["name", "role", "bio", "photo"],
        required: true,
      },
    },
  },
  media: {
    type: "media",
    summary: "Single image or video block.",
    fields: {
      image: { kind: "image", label: "Image" },
      video: { kind: "video", label: "Video (src or data-wb-field=videoUrl)" },
      caption: { kind: "text", label: "Caption" },
    },
  },
  logos: {
    type: "logos",
    summary: "Logo cloud — each logo is a marked image item.",
    fields: {
      heading: { kind: "text", label: "Heading" },
      logos: {
        kind: "list",
        label: "Logos",
        listField: "logos",
        itemFields: ["image"],
        requireItemImage: true,
      },
    },
  },
  contact: {
    type: "contact",
    summary: "Contact details and an enquiry form.",
    fields: {
      heading: { kind: "text", label: "Heading", required: true },
      text: { kind: "text", label: "Supporting text" },
      email: { kind: "text", label: "Email" },
      phone: { kind: "text", label: "Phone" },
      address: { kind: "text", label: "Address" },
      submitLabel: { kind: "text", label: "Submit button label" },
      form: { kind: "form", label: "Enquiry form" },
      channels: {
        kind: "list",
        label: "Contact channels",
        listField: "channels",
        itemFields: ["label", "value"],
      },
    },
  },
};

/** Markup rules shown in docs and referenced in error messages. */
export const IMPORT_MARKUP_RULES = {
  pages: {
    title: "Pages",
    rules: [
      "One HTML file can define multiple pages with data-wb-page=\"slug\" wrappers (preferred).",
      "SPA-style data-view=\"slug\" is also accepted.",
      "Or use separate .html files in a ZIP (index.html → Home).",
      "Slug home or index becomes the Home page at /.",
    ],
    example: `<section data-wb-page="home">
  <section data-wb-section="hero">…</section>
</section>
<section data-wb-page="products">
  <section data-wb-section="services">…</section>
</section>`,
  },
  sections: {
    title: "Sections",
    rules: [
      "Every importable block must be <section data-wb-section=\"TYPE\">.",
      `TYPE must be one of: ${IMPORTABLE_SECTION_TYPES.join(", ")}.`,
      "Do not put FAQ content in gallery — use data-wb-section=\"faq\".",
      "Site header/footer chrome is not imported as body sections (use the builder header/footer).",
    ],
    example: `<section data-wb-section="hero">
  <h1 data-wb-field="heading">Welcome</h1>
</section>`,
  },
  fields: {
    title: "Fields",
    rules: [
      "Mark text/links/images with data-wb-field=\"name\" matching the section contract.",
      "Links need href on the element (or a child <a>).",
      "Repeatable rows use a container data-wb-field=\"items\" (or images/plans/members) and children with data-wb-item.",
    ],
    example: `<div data-wb-field="items">
  <article data-wb-item>
    <h3 data-wb-field="title">Fast</h3>
    <p data-wb-field="description">Ship quickly</p>
  </article>
</div>`,
  },
  images: {
    title: "Images",
    rules: [
      "Every importable image must be <img data-wb-field=\"image\" src=\"…\" alt=\"…\"> (or photo/avatar per contract).",
      "Gallery/logo items: wrap each in data-wb-item with a marked img inside.",
      "Unmarked <img> tags are ignored.",
      "Put images in the ZIP next to the HTML; relative paths are uploaded to the media library.",
    ],
    example: `<figure data-wb-item>
  <img data-wb-field="image" src="photos/chair.jpg" alt="Oak chair">
  <figcaption data-wb-field="title">Oak chair</figcaption>
</figure>`,
  },
  forms: {
    title: "Contact forms",
    rules: [
      "Use data-wb-section=\"contact\".",
      "Wrap inputs in <form data-wb-field=\"form\">.",
      "Each control: data-wb-form-field=\"id\" data-wb-form-type=\"text|email|tel|textarea|select|number\" and optional data-wb-required=\"true\".",
      "Select options: <option> labels, or data-wb-form-options=\"A|B|C\".",
      "Submit label: data-wb-field=\"submitLabel\" on the button.",
    ],
    example: `<section data-wb-section="contact">
  <h2 data-wb-field="heading">Contact us</h2>
  <p data-wb-field="text">We reply within a day.</p>
  <p data-wb-field="phone">81119 99526</p>
  <form data-wb-field="form">
    <label data-wb-form-field="name" data-wb-form-type="text" data-wb-required="true">
      Name <input name="name" placeholder="Your name">
    </label>
    <label data-wb-form-field="phone" data-wb-form-type="tel" data-wb-required="true">
      Phone <input name="phone">
    </label>
    <label data-wb-form-field="message" data-wb-form-type="textarea">
      Message <textarea name="message"></textarea>
    </label>
    <button type="submit" data-wb-field="submitLabel">Send enquiry</button>
  </form>
</section>`,
  },
} as const;

export function isImportableSectionType(value: string): value is ImportableSectionType {
  return (IMPORTABLE_SECTION_TYPES as readonly string[]).includes(value);
}

export function pageSlugFromElement(el: {
  attribs?: Record<string, string>;
  attrib?: (name: string) => string | undefined;
}): string {
  const attr =
    el.attribs?.["data-wb-page"] ||
    el.attribs?.["data-view"] ||
    (typeof el.attrib === "function" ? el.attrib("data-wb-page") || el.attrib("data-view") : undefined);
  return (attr || "").trim().toLowerCase();
}
