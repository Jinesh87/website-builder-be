import assert from "node:assert/strict";
import { test } from "node:test";
import * as cheerio from "cheerio";
import { AppError } from "../../../common/errors/AppError.js";
import { mapTaggedSections } from "./html-import-section-mappers.js";

const SAMPLE = `
<!DOCTYPE html>
<html>
<head><title>Demo Home</title></head>
<body>
  <section data-wb-section="hero">
    <h1 data-wb-field="heading">Welcome aboard</h1>
    <p data-wb-field="subheading">We build websites</p>
    <a data-wb-field="primaryCta" href="/contact">Contact</a>
  </section>
  <section data-wb-section="features">
    <h2 data-wb-field="heading">Why us</h2>
    <div data-wb-field="items">
      <article data-wb-item>
        <h3 data-wb-field="title">Fast</h3>
        <p data-wb-field="description">Ship quickly</p>
      </article>
      <article data-wb-item>
        <h3 data-wb-field="title">Simple</h3>
        <p data-wb-field="description">Easy edits</p>
      </article>
    </div>
  </section>
  <section data-wb-section="cta">
    <h2 data-wb-field="heading">Ready?</h2>
    <a data-wb-field="button" href="/signup">Sign up</a>
  </section>
</body>
</html>
`;

test("maps tagged sections into native hero, features, and cta", () => {
  const $ = cheerio.load(SAMPLE);
  const sections = mapTaggedSections(
    $,
    { htmlPath: "index.html", uploaded: new Map(), resolveUrl: () => null },
    "index.html",
  );
  assert.equal(sections.length, 3);
  assert.equal(sections[0]!.type, "hero");
  assert.equal((sections[0]!.data as { heading: string }).heading, "Welcome aboard");
  assert.equal(sections[1]!.type, "features");
  const features = sections[1]!.data as { heading?: string; items: { title: string }[] };
  assert.equal(features.heading, "Why us");
  assert.equal(features.items.length, 2);
  assert.equal(features.items[0]!.title, "Fast");
  assert.equal(sections[2]!.type, "cta");
});

test("rejects untagged HTML", () => {
  const $ = cheerio.load("<html><body><h1>Hello</h1></body></html>");
  assert.throws(
    () => mapTaggedSections($, { htmlPath: "x.html", uploaded: new Map(), resolveUrl: () => null }, "x.html"),
    (error: unknown) => error instanceof AppError && error.code === "IMPORT_NO_SECTIONS",
  );
});

test("rejects unsupported section types", () => {
  const $ = cheerio.load('<html><body><section data-wb-section="carousel"></section></body></html>');
  assert.throws(
    () => mapTaggedSections($, { htmlPath: "x.html", uploaded: new Map(), resolveUrl: () => null }, "x.html"),
    (error: unknown) => error instanceof AppError && error.code === "IMPORT_SECTION_UNSUPPORTED",
  );
});

test("maps contact form fields from data-wb-form-field marks", () => {
  const html = `
<section data-wb-section="contact">
  <h2 data-wb-field="heading">Contact us</h2>
  <p data-wb-field="phone">81119 99526</p>
  <form data-wb-field="form">
    <label data-wb-form-field="name" data-wb-form-type="text" data-wb-required="true">
      Name <input name="name" placeholder="Your name">
    </label>
    <label data-wb-form-field="message" data-wb-form-type="textarea">
      Message <textarea name="message"></textarea>
    </label>
    <button type="submit" data-wb-field="submitLabel">Send enquiry</button>
  </form>
</section>`;
  const $ = cheerio.load(html);
  const sections = mapTaggedSections(
    $,
    { htmlPath: "contact.html", uploaded: new Map(), resolveUrl: () => null },
    "contact.html",
  );
  assert.equal(sections.length, 1);
  assert.equal(sections[0]!.type, "contact");
  const data = sections[0]!.data as {
    heading: string;
    phone?: string;
    showForm: boolean;
    submitLabel: string;
    formFields?: { id: string; type: string; required?: boolean }[];
  };
  assert.equal(data.heading, "Contact us");
  assert.equal(data.phone, "81119 99526");
  assert.equal(data.showForm, true);
  assert.equal(data.submitLabel, "Send enquiry");
  assert.ok(data.formFields?.some((f) => f.id === "name" && f.type === "text" && f.required));
  assert.ok(data.formFields?.some((f) => f.id === "message" && f.type === "textarea"));
});

test("gallery ignores unmarked images", () => {
  const html = `
<section data-wb-section="gallery">
  <h2 data-wb-field="heading">Photos</h2>
  <div data-wb-field="images">
    <figure data-wb-item>
      <img src="skip-me.jpg" alt="unmarked">
    </figure>
    <figure data-wb-item>
      <img data-wb-field="image" src="https://example.com/ok.jpg" alt="Marked">
      <figcaption data-wb-field="title">Marked</figcaption>
    </figure>
  </div>
</section>`;
  const $ = cheerio.load(html);
  const sections = mapTaggedSections(
    $,
    { htmlPath: "g.html", uploaded: new Map(), resolveUrl: () => null },
    "g.html",
  );
  const data = sections[0]!.data as { images: { url: string; title?: string }[] };
  assert.equal(data.images.length, 1);
  assert.equal(data.images[0]!.url, "https://example.com/ok.jpg");
  assert.equal(data.images[0]!.title, "Marked");
});
