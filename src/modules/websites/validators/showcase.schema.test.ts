import assert from "node:assert/strict";
import { test } from "node:test";
import { sectionSchema } from "./site-content.validator.js";

const OPTIONS = { stripUnknown: true, abortEarly: false } as const;
const settings = { background: "default", hideOnMobile: false };

const data = {
  mode: "tabs",
  design: "catalogue",
  categoryDesign: "circles",
  eyebrow: "Our collection",
  heading: "Products",
  intro: "Made to last.",
  headerAlign: "left",
  categoryId: "seating",
  allLabel: "Everything",
  otherLabel: "More",
  columns: 4,
  tabletColumns: 2,
  mobileColumns: 1,
  imageAspect: "3:4",
  imageFit: "contain",
  showImage: true,
  showName: true,
  showSummary: false,
  showPrice: true,
  showCategory: true,
  showBadge: false,
  showButton: true,
  showCount: true,
  showCategoryDescription: false,
  summaryLines: 2,
  defaultLink: { label: "Enquire", href: "/contact" },
  emptyMessage: "Nothing here yet.",
  categories: [
    { id: "seating", name: "Seating", description: "Sofas", image: { url: "https://example.com/a.jpg", alt: "Sofa" }, link: { label: "Seating", href: "/seating" } },
  ],
  products: [
    {
      id: "p1",
      name: "Harbour Sofa",
      summary: "Deep seats.",
      price: "$1,490",
      image: { url: "https://example.com/b.jpg", alt: "Sofa" },
      badge: "NEW",
      categoryId: "seating",
      link: { label: "Details", href: "/sofa" },
    },
    { id: "p2", name: "Rug" },
  ],
};

const section = (overrides: Record<string, unknown> = {}) => ({
  id: "showcase-1",
  type: "showcase",
  hidden: false,
  settings,
  data: { ...data, ...overrides },
});

test("every showcase field survives saving", () => {
  const { value, error } = sectionSchema.validate(section(), OPTIONS);
  assert.equal(error, undefined);
  assert.deepEqual(value.data, data);
});

test("showcase rejects unknown designs, duplicate ids and unsafe links", () => {
  assert.ok(sectionSchema.validate(section({ design: "bogus" }), OPTIONS).error);
  assert.ok(sectionSchema.validate(section({ products: [{ id: "a", name: "A" }, { id: "a", name: "B" }] }), OPTIONS).error);
  assert.ok(sectionSchema.validate(section({ defaultLink: { label: "x", href: "javascript:alert(1)" } }), OPTIONS).error);
  assert.ok(sectionSchema.validate(section({ products: Array.from({ length: 201 }, (_, i) => ({ id: `p${i}`, name: "P" })) }), OPTIONS).error);
});

test("showcase without a mode defaults to the products grid", () => {
  const { mode: _mode, ...rest } = data;
  const { value, error } = sectionSchema.validate({ ...section(), data: rest }, OPTIONS);
  assert.equal(error, undefined);
  assert.equal(value.data.mode, "products");
});
