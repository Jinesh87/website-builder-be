import assert from "node:assert/strict";
import { test } from "node:test";
import type { FooterData, HeaderData, Section } from "../types/site-content.types.js";
import { footerSchema, headerSchema } from "../validators/site-content.validator.js";
import { liftSiteChrome } from "./site-chrome.js";

const header: HeaderData = { design: "logo-left", siteName: "Old", menu: [{ label: "Home", href: "/" }], sticky: false };
const footer: FooterData = { design: "columns", siteName: "Old", columns: [], social: [], copyright: "© Old" };
const settings = { background: "dark" as const, hideOnMobile: false };

function chrome(type: "header" | "footer", data: Record<string, unknown>, hidden = false): Section {
  return { id: `${type}-${String(data.siteName)}`, type, hidden, settings, data } as Section;
}

const hero = { id: "hero", type: "hero", hidden: false, settings, data: { heading: "Hi" } } as Section;

test("lifts the home page header/footer copies into the site-wide ones and strips every copy", () => {
  const lifted = liftSiteChrome({
    header,
    footer,
    pages: [
      { slug: "/menu", pageType: "CUSTOM", sections: [chrome("header", { ...header, siteName: "Menu copy" }), hero] },
      {
        slug: "/",
        pageType: "HOME",
        sections: [chrome("header", { ...header, siteName: "Home copy" }), hero, chrome("footer", { ...footer, siteName: "Home" })],
      },
    ],
  });

  assert.equal(lifted.header.siteName, "Home copy");
  assert.deepEqual(lifted.header.menu, header.menu);
  assert.deepEqual(lifted.header.settings, settings);
  assert.equal(lifted.footer.siteName, "Home");
  assert.ok(lifted.pages.every((page) => page.sections.every((s) => s.type !== "header" && s.type !== "footer")));
  assert.equal(lifted.pages[0]?.sections[0], hero);
});

test("keeps a hidden header hidden and leaves content without copies untouched", () => {
  const hidden = liftSiteChrome({
    header,
    footer,
    pages: [{ slug: "/", pageType: "HOME", sections: [chrome("header", { ...header }, true)] }],
  });
  assert.equal(hidden.header.hidden, true);

  const plain = { header, footer, pages: [{ slug: "/", pageType: "HOME", sections: [hero] }] };
  assert.equal(liftSiteChrome(plain), plain);
});

test("the site-wide header/footer accept their saved style", () => {
  assert.equal(headerSchema.validate({ ...header, settings }).error, undefined);
  assert.equal(footerSchema.validate({ ...footer, settings }).error, undefined);
});
