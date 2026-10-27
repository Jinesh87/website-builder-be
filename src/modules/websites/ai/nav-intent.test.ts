import assert from "node:assert/strict";
import { test } from "node:test";
import { ensureNavLink, navIntent } from "./nav-intent.js";
import type { NavPage } from "./navigation.js";

const pages: NavPage[] = [
  { name: "Home", slug: "/" },
  { name: "About us", slug: "/about-us" },
  { name: "Menu", slug: "/menu" },
  { name: "Login", slug: "/login" },
];
const current: NavPage = { name: "Gallery", slug: "/gallery" };
const menu = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about-us" },
];

test("'this page' means the page open in the editor", () => {
  const intent = navIntent("add a button in nav to this page", pages, current);
  assert.ok(intent);
  assert.equal(intent.asButton, true);
  assert.deepEqual(intent.target, { kind: "page", page: current });
  assert.deepEqual(ensureNavLink(intent, { menu }, undefined, { label: "Gallery", href: "/gallery" }), {
    headerCta: { label: "Gallery", href: "/gallery" },
  });
});

test("a named page becomes a menu item, keeping the existing menu", () => {
  const intent = navIntent("in header i need login", pages, current);
  assert.ok(intent);
  assert.equal(intent.asButton, false);
  assert.deepEqual(intent.target, { kind: "page", page: pages[3] });
  assert.deepEqual(ensureNavLink(intent, { menu }, undefined, { label: "Login", href: "/login" }), {
    headerMenu: [...menu, { label: "Login", href: "/login" }],
  });
});

test("'menu bar' names the header, not the Menu page", () => {
  const intent = navIntent("put about us in the menu bar", pages, current);
  assert.ok(intent);
  assert.deepEqual(intent.target, { kind: "page", page: pages[1] });
});

test("a shopper page that doesn't exist is reported as missing", () => {
  const intent = navIntent("add account link to the navbar", pages, current);
  assert.ok(intent);
  assert.deepEqual(intent.target, { kind: "missing", shopPage: "account", label: "Account", slug: "/account" });
});

test("nothing changes when the header already links the page", () => {
  const intent = navIntent("add about us to the header", pages, current);
  assert.ok(intent);
  assert.equal(ensureNavLink(intent, { menu }, undefined, { label: "About us", href: "/about-us" }), undefined);
});

test("a label the owner wrote wins over the page name", () => {
  const intent = navIntent('add a "Book now" button in the header linking to this page', pages, current);
  assert.ok(intent);
  assert.equal(intent.label, "Book now");
  assert.deepEqual(ensureNavLink(intent, { menu }, undefined, { label: "Gallery", href: "/gallery" }), {
    headerCta: { label: "Book now", href: "/gallery" },
  });
});

test("ordinary edits are not header requests", () => {
  assert.equal(navIntent("make the hero heading shorter", pages, current), null);
  assert.equal(navIntent("build a complete menu page", pages, current), null);
});
