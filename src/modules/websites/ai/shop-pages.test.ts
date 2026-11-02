import assert from "node:assert/strict";
import { test } from "node:test";
import { isShopPageRequest, pageHasShopCapability, shopPagesSuggestion } from "./shop-pages.js";
import type { WebsiteDetail } from "../types/website.types.js";

test("recognises a request for shop or shopper pages", () => {
  assert.equal(isShopPageRequest("need a new product page"), true);
  assert.equal(isShopPageRequest("for a commerce purpose i need a new product page"), true);
  assert.equal(isShopPageRequest("need a login page and signup for clients"), true);
  assert.equal(isShopPageRequest("create an account page for customers"), true);
  assert.equal(isShopPageRequest("shop page should list our products"), true);
  assert.equal(isShopPageRequest("should list our products"), true);
  assert.equal(isShopPageRequest("build a new page which should list our products"), true);
  assert.equal(isShopPageRequest("show products on the shop"), true);
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

test("does not recreate pages that already provide the capability", () => {
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
  assert.ok(suggestion);
  assert.equal(suggestion.target.scope, "chat");
  assert.equal(suggestion.createdPages, undefined);
  assert.equal(suggestion.updatedPages, undefined);
});

test("upgrades a marketing shop page that has no products section", () => {
  const shopId = "shop-1";
  const suggestion = shopPagesSuggestion("shop page should list our products", {
    name: "John's company",
    info: { businessName: "John's company" },
    draft: {
      pages: [
        {
          id: shopId,
          name: "shop",
          slug: "/shop",
          showInNav: true,
          sections: [
            { id: "h1", type: "header", hidden: false, settings: {}, data: {} },
            { id: "hero1", type: "hero", hidden: false, settings: {}, data: { heading: "Discover Our Products" } },
            { id: "f1", type: "features", hidden: false, settings: {}, data: { title: "Why Shop With Us?" } },
            { id: "ft1", type: "footer", hidden: false, settings: {}, data: {} },
          ],
        },
      ],
      header: { menu: [{ label: "Shop", href: "/shop" }] },
    },
  } as unknown as WebsiteDetail, { pageId: shopId });

  assert.ok(suggestion);
  assert.equal(suggestion.createdPages?.map((page) => page.slug).join(","), "/product");
  assert.equal(suggestion.updatedPages?.length, 1);
  assert.equal(suggestion.updatedPages?.[0]?.pageId, shopId);
  assert.equal(suggestion.updatedPages?.[0]?.sections?.some((section) => section.type === "products"), true);
  assert.equal(suggestion.updatedPages?.[0]?.sections?.some((section) => section.type === "header"), true);
  assert.equal(suggestion.after.some((section) => section.type === "products"), true);
  assert.equal(pageHasShopCapability("shop", {
    id: shopId,
    name: "shop",
    slug: "/shop",
    sections: suggestion.updatedPages![0]!.sections!,
  } as DraftPageLike), true);
});

test("build a new products page upgrades an existing stub shop instead of duplicating", () => {
  const suggestion = shopPagesSuggestion("build a new page which should list our products", {
    name: "John's company",
    info: { businessName: "John's company" },
    draft: {
      pages: [
        {
          id: "shop-1",
          name: "shop",
          slug: "/shop",
          sections: [{ type: "hero" }, { type: "features" }],
        },
      ],
      header: { menu: [] },
    },
  } as unknown as WebsiteDetail);

  assert.ok(suggestion);
  assert.ok(suggestion.updatedPages?.some((page) => page.pageId === "shop-1"));
  assert.ok(suggestion.createdPages?.some((page) => page.slug === "/product"));
  assert.ok(suggestion.navigationPatch?.headerMenu?.some((item) => item.href === "/shop"));
});

type DraftPageLike = {
  id: string;
  name: string;
  slug: string;
  sections: Array<{ type: string }>;
};
