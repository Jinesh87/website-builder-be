import assert from "node:assert/strict";
import { test } from "node:test";
import { isShopPageRequest, shopPagesSuggestion } from "./shop-pages.js";
import type { WebsiteDetail } from "../types/website.types.js";

test("recognises a request for shop or shopper pages", () => {
  assert.equal(isShopPageRequest("need a new product page"), true);
  assert.equal(isShopPageRequest("for a commerce purpose i need a new product page"), true);
  assert.equal(isShopPageRequest("need a login page and signup for clients"), true);
  assert.equal(isShopPageRequest("create an account page for customers"), true);
  assert.equal(isShopPageRequest("make the heading shorter"), false);
});

test("header, nav and button requests are never page builds", () => {
  assert.equal(isShopPageRequest("in header i need login"), false);
  assert.equal(isShopPageRequest("add a login button to the navbar"), false);
  assert.equal(isShopPageRequest("add a button in nav to this page"), false);
  assert.equal(isShopPageRequest("link the account page in the header menu"), false);
});

test("builds a shop list page and a product detail page", () => {
  const suggestion = shopPagesSuggestion("need a new product page", {
    name: "rock",
    info: { businessName: "Rock" },
    draft: { pages: [], header: { menu: [{ label: "Home", href: "/" }] } },
  } as unknown as WebsiteDetail);

  assert.ok(suggestion);
  assert.equal(suggestion.createdPages?.map((page) => page.slug).join(","), "/shop,/product");
  assert.equal(suggestion.createdPages?.[0]?.sections.some((section) => section.type === "products"), true);
  assert.equal(suggestion.createdPages?.[1]?.sections[0]?.type, "product_detail");
  assert.equal(suggestion.createdPages?.[1]?.showInNav, false);
  assert.deepEqual(suggestion.navigationPatch?.headerMenu, [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/shop" },
  ]);
});

test("builds login and account pages with their own section types", () => {
  const suggestion = shopPagesSuggestion("need a login page for customers", {
    name: "rock",
    info: { businessName: "Rock" },
    draft: { pages: [], header: { menu: [] } },
  } as unknown as WebsiteDetail);

  assert.ok(suggestion);
  assert.equal(suggestion.createdPages?.map((page) => page.slug).join(","), "/login,/account");
  assert.equal(suggestion.createdPages?.[0]?.sections[0]?.type, "auth");
  assert.equal(suggestion.createdPages?.[1]?.sections[0]?.type, "account");
  assert.equal(suggestion.createdPages?.[1]?.showInNav, false);
  assert.equal(suggestion.navigationPatch, undefined);
});

test("never overwrites pages that already exist", () => {
  const suggestion = shopPagesSuggestion("need a login page", {
    name: "rock",
    info: { businessName: "Rock" },
    draft: {
      pages: [
        { id: "1", name: "Login", slug: "/login", sections: [{ type: "auth" }] },
        { id: "2", name: "Account", slug: "/account", sections: [{ type: "account" }] },
      ],
      header: { menu: [] },
    },
  } as unknown as WebsiteDetail);
  assert.equal(suggestion, null);
});
