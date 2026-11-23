import assert from "node:assert/strict";
import { test } from "node:test";
import * as cheerio from "cheerio";
import { detectIcon } from "../../media/services/file-signature.js";
import { findFavicon, isStorableFavicon, svgFaviconDataUri } from "./html-import-favicon.js";

const resolve = (from: string, href: string) => {
  const dir = from.includes("/") ? from.slice(0, from.lastIndexOf("/") + 1) : "";
  return href.startsWith("/") ? href.slice(1) : `${dir}${href.replace(/^\.\//, "")}`;
};
const file = Buffer.from("x");

test("prefers the largest rel=icon over apple-touch-icon", () => {
  const $ = cheerio.load(`<head>
    <link rel="apple-touch-icon" href="img/touch.png" sizes="180x180">
    <link rel="icon" href="img/icon-16.png" sizes="16x16">
    <link rel="shortcut icon" href="img/icon-32.png" sizes="32x32">
  </head>`);
  const files = new Map([["img/touch.png", file], ["img/icon-16.png", file], ["img/icon-32.png", file]]);
  assert.deepEqual(findFavicon($, "index.html", files, resolve), { packagePath: "img/icon-32.png" });
});

test("falls back to apple-touch-icon, then favicon.ico at the root", () => {
  const touch = cheerio.load(`<link rel="apple-touch-icon" href="touch.png">`);
  assert.deepEqual(findFavicon(touch, "index.html", new Map([["touch.png", file]]), resolve), { packagePath: "touch.png" });
  const none = cheerio.load(`<title>x</title>`);
  assert.deepEqual(findFavicon(none, "index.html", new Map([["favicon.ico", file]]), resolve), { packagePath: "favicon.ico" });
  assert.equal(findFavicon(none, "index.html", new Map(), resolve), null);
});

test("keeps external URLs and skips files missing from the package", () => {
  const $ = cheerio.load(`<link rel="icon" href="missing.png"><link rel="icon" href="//cdn.example.com/fav.png">`);
  assert.deepEqual(findFavicon($, "index.html", new Map(), resolve), { url: "https://cdn.example.com/fav.png" });
});

test("inlines only small, script-free SVGs", () => {
  const ok = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>');
  assert.match(svgFaviconDataUri("icon.svg", ok) ?? "", /^data:image\/svg\+xml;base64,/);
  assert.equal(svgFaviconDataUri("icon.svg", Buffer.from('<svg onload="alert(1)"></svg>')), null);
  assert.equal(svgFaviconDataUri("icon.svg", Buffer.from("<svg><script>x</script></svg>")), null);
  assert.equal(isStorableFavicon("icon.svg"), false);
  assert.equal(isStorableFavicon("favicon.ico"), true);
});

test("detects .ico files", () => {
  const ico = Buffer.alloc(22);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  assert.equal(detectIcon(ico)?.mimeType, "image/x-icon");
  assert.equal(detectIcon(Buffer.alloc(22)), null);
});
