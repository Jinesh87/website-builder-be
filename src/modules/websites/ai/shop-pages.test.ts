import assert from "node:assert/strict";
import { test } from "node:test";
import { isShopPageRequest, shopPagesSuggestion } from "./shop-pages.js";
import type { WebsiteDetail } from "../types/website.types.js";

test("recognises a request for a product page", () => {
  assert.equal(isShopPageRequest("need a new product page"), true);
  assert.equal(isShopPageRequest("for a commerce purpose i need a new product page"), true);
  assert.equal(isShopPageRequest("make the heading shorter"), false);
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
