import assert from "node:assert/strict";
import { test } from "node:test";
import { SiteCacheService } from "./site-cache.service.js";

test("SiteCacheService L1 in-memory caching and eviction", async () => {
  const cache = new SiteCacheService({ maxL1Entries: 2, defaultTtlSeconds: 10 });

  await cache.setPage("my-site", "/", {
    html: "<h1>Home</h1>",
    statusCode: 200,
    contentType: "text/html",
    cachedAt: Date.now(),
  });

  await cache.setPage("my-site", "/about", {
    html: "<h1>About</h1>",
    statusCode: 200,
    contentType: "text/html",
    cachedAt: Date.now(),
  });

  const home = await cache.getPage("my-site", "/");
  assert.equal(home?.html, "<h1>Home</h1>");

  // Adding a 3rd entry should evict the oldest un-accessed item (/about)
  await cache.setPage("my-site", "/contact", {
    html: "<h1>Contact</h1>",
    statusCode: 200,
    contentType: "text/html",
    cachedAt: Date.now(),
  });

  const contact = await cache.getPage("my-site", "/contact");
  assert.equal(contact?.html, "<h1>Contact</h1>");

  const homeAgain = await cache.getPage("my-site", "/");
  assert.equal(homeAgain?.html, "<h1>Home</h1>");
});

test("SiteCacheService single-flight stampede protection", async () => {
  const cache = new SiteCacheService({ maxL1Entries: 10, defaultTtlSeconds: 60 });
  let renderCount = 0;

  const mockRender = async () => {
    renderCount++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      html: `<h1>Rendered ${renderCount}</h1>`,
      statusCode: 200,
      contentType: "text/html",
      cachedAt: Date.now(),
    };
  };

  // Launch 10 concurrent requests for the exact same page
  const promises = Array.from({ length: 10 }).map(() =>
    cache.getOrRender("concurrent-site", "/page-1", mockRender),
  );

  const results = await Promise.all(promises);

  // Exactly ONE render must have executed
  assert.equal(renderCount, 1);
  for (const res of results) {
    assert.equal(res.html, "<h1>Rendered 1</h1>");
  }

  // Next subsequent call must serve from cache directly without rendering
  const cachedHit = await cache.getOrRender("concurrent-site", "/page-1", mockRender);
  assert.equal(renderCount, 1);
  assert.equal(cachedHit.html, "<h1>Rendered 1</h1>");
});

test("SiteCacheService purgeSite and purgeWebsite", async () => {
  const cache = new SiteCacheService({ maxL1Entries: 100, defaultTtlSeconds: 60 });

  await cache.setPage("shop", "/", {
    html: "<h1>Shop Home</h1>",
    statusCode: 200,
    contentType: "text/html",
    cachedAt: Date.now(),
  });

  await cache.setPage("shop", "/pricing", {
    html: "<h1>Pricing</h1>",
    statusCode: 200,
    contentType: "text/html",
    cachedAt: Date.now(),
  });

  await cache.setPage("customshop.com", "/", {
    html: "<h1>Custom Home</h1>",
    statusCode: 200,
    contentType: "text/html",
    cachedAt: Date.now(),
  });

  assert.ok(await cache.getPage("shop", "/"));
  assert.ok(await cache.getPage("shop", "/pricing"));
  assert.ok(await cache.getPage("customshop.com", "/"));

  // Purge the site and custom domain
  await cache.purgeWebsite("shop", ["customshop.com"]);

  assert.equal(await cache.getPage("shop", "/"), null);
  assert.equal(await cache.getPage("shop", "/pricing"), null);
  assert.equal(await cache.getPage("customshop.com", "/"), null);
});
