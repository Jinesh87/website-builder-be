import assert from "node:assert/strict";
import { test } from "node:test";
import { parsePlan } from "./ai-ops.js";
import { planNavigation, resolveNavHref, withNavigation, type NavPage } from "./navigation.js";

const pages: NavPage[] = [
  { name: "Home", slug: "/" },
  { name: "Menu", slug: "/menu" },
  { name: "About Us", slug: "/about-us" },
];
const homeOnly = [{ label: "Home", href: "/" }];

test("resolves links to real pages by slug, name or label", () => {
  assert.equal(resolveNavHref("/menu", "Menu", pages), "/menu");
  assert.equal(resolveNavHref("menu/", "Our menu", pages), "/menu");
  assert.equal(resolveNavHref("#", "Menu", pages), "/menu");
  assert.equal(resolveNavHref("", "About us", pages), "/about-us");
  assert.equal(resolveNavHref("/home", "Home", pages), "/");
  assert.equal(resolveNavHref("#contact", "Contact", pages), "#contact");
  assert.equal(resolveNavHref("https://wa.me/123", "WhatsApp", pages), "https://wa.me/123");
  assert.equal(resolveNavHref("/gallery", "Gallery", pages), null);
});

test("adds a menu link to an existing page", () => {
  const change = planNavigation({
    currentMenu: homeOnly,
    plannedMenu: [
      { label: "Home", href: "/" },
      { label: "Menu", href: "/menu" },
    ],
    newNavPages: [],
    pages,
  });
  assert.deepEqual(change.headerMenu, [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
  ]);
  assert.deepEqual(change.unresolved, []);
});

test("reports no change when the link is already there", () => {
  const change = planNavigation({
    currentMenu: [...homeOnly, { label: "Menu", href: "/menu" }],
    plannedMenu: [
      { label: "Home", href: "/" },
      { label: "Menu", href: "menu" },
    ],
    newNavPages: [],
    pages,
  });
  assert.equal(change.headerMenu, undefined);
  assert.equal(change.headerCta, undefined);
});

test("leaves out links to pages that do not exist", () => {
  const change = planNavigation({
    currentMenu: homeOnly,
    plannedMenu: [
      { label: "Home", href: "/" },
      { label: "Gallery", href: "/gallery" },
    ],
    newNavPages: [],
    pages,
  });
  assert.equal(change.headerMenu, undefined);
  assert.deepEqual(change.unresolved, ["Gallery"]);
});

test("appends newly created pages and keeps existing item details", () => {
  const change = planNavigation({
    currentMenu: [{ label: "Home", href: "/", badge: "New" }],
    plannedMenu: null,
    newNavPages: [{ name: "Gallery", slug: "/gallery" }],
    pages: [...pages, { name: "Gallery", slug: "/gallery" }],
  });
  assert.deepEqual(change.headerMenu, [
    { label: "Home", href: "/", badge: "New" },
    { label: "Gallery", href: "/gallery" },
  ]);
});

test("changes the header button only when it differs", () => {
  const cta = { label: "Book a Table", href: "/about-us" };
  assert.deepEqual(
    planNavigation({ currentMenu: homeOnly, plannedCta: cta, newNavPages: [], pages }).headerCta,
    cta,
  );
  assert.equal(
    planNavigation({ currentMenu: homeOnly, currentCta: cta, plannedCta: cta, newNavPages: [], pages }).headerCta,
    undefined,
  );
});

test("writes the change into header sections only", () => {
  const header = { id: "h", type: "header", hidden: false, settings: {}, data: { siteName: "My Brand", menu: homeOnly } };
  const hero = { id: "x", type: "hero", hidden: false, settings: {}, data: { heading: "Hi" } };
  const menu = [...homeOnly, { label: "Menu", href: "/menu" }];
  assert.deepEqual(withNavigation(header, { headerMenu: menu }).data, { siteName: "My Brand", menu });
  assert.equal(withNavigation(hero, { headerMenu: menu }), hero);
});

test("parses update_navigation with a planned menu", () => {
  const plan = parsePlan(
    {
      intent: "edit",
      reply: "Adding Menu to the header",
      clarification: null,
      ops: [
        {
          op: "update_navigation",
          instruction: "Add a Menu link",
          headerMenu: [
            { label: "Home", href: "/" },
            { label: "Menu", href: "/menu" },
          ],
          headerCta: null,
        },
      ],
    },
    [],
  );
  const [op] = plan.ops;
  assert.equal(op?.op, "update_navigation");
  if (op?.op !== "update_navigation") return;
  assert.equal(op.headerMenu?.length, 2);
  assert.equal(op.headerCta, null);
});
