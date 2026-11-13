import assert from "node:assert/strict";
import { test } from "node:test";
import { enforceScopedCss, scopeSelector } from "./html-import-css.js";
import { sanitizeImportedHtml } from "./html-import-sanitize.js";
import { sectionSchema } from "../validators/site-content.validator.js";

test("sanitizer strips script vectors and keeps layout markup", () => {
  const dirty = `
    <div class="card" onclick="x()"><script>alert(1)</script><style>body{}</style>
      <a href=" java\tscript:alert(1)">bad</a>
      <a href="/contact" target="_blank">ok</a>
      <button formaction="javascript:alert(1)">b</button>
      <img src="x.png" onerror="alert(1)" name="getElementById">
      <svg viewBox="0 0 10 10"><a xlink:href="javascript:alert(1)"><path d="M0 0"/></a>
        <animate attributeName="href" to="javascript:alert(1)"/><foreignObject><img src=x onerror=alert(1)></foreignObject></svg>
      <iframe src="https://evil.example/"></iframe>
      <iframe src="https://www.google.com/maps/embed?pb=1"></iframe>
      <form action="https://evil.example" method="post"><input name="q"></form>
      <marquee>kept text</marquee>
      <details open><summary>Q</summary><p>A</p></details>
    </div>`;
  const clean = sanitizeImportedHtml(dirty);
  assert.doesNotMatch(clean, /<script|<style|onclick|onerror|javascript:|formaction|foreignObject|<animate|evil\.example|name="getElementById"/i);
  assert.match(clean, /href="\/contact" target="_blank" rel="noopener noreferrer"/);
  assert.match(clean, /google\.com\/maps/);
  assert.match(clean, /kept text/);
  assert.match(clean, /<details open=""><summary>Q<\/summary>/);
  assert.match(clean, /<path d="M0 0"><\/path>/);
});

test("scopeSelector maps document roots onto the scope", () => {
  assert.equal(scopeSelector(":root", "wbi-abcd"), ".wb-site .wbi-abcd");
  assert.equal(scopeSelector("html body .x", "wbi-abcd"), ".wb-site .wbi-abcd .x");
  assert.equal(scopeSelector("body > main", "wbi-abcd"), ".wb-site .wbi-abcd main");
  assert.equal(scopeSelector(".a:is(.b, .c) > p", "wbi-abcd"), ".wb-site .wbi-abcd .a:is(.b, .c) > p");
  assert.equal(scopeSelector("bodyguard", "wbi-abcd"), ".wb-site .wbi-abcd bodyguard");
});

test("enforceScopedCss re-scopes hand-edited CSS and blocks <style> breakout", () => {
  const css = enforceScopedCss(
    `body{display:none} .wb-site .wbi-abcd p{color:red} @import url(https://evil.example/x.css); a::after{content:"</style><script>"}`,
    "wbi-abcd",
  );
  assert.match(css, /^\.wb-site \.wbi-abcd\{display:none\}/);
  assert.match(css, /\.wb-site \.wbi-abcd p\{color:red\}/);
  assert.doesNotMatch(css, /evil|<\/style|<script/);
});

test("draft saves re-sanitize imported_html sections", () => {
  const { value, error } = sectionSchema.validate({
    id: "11111111-1111-4111-8111-111111111111",
    type: "imported_html",
    hidden: false,
    settings: { background: "default", hideOnMobile: false },
    data: { html: `<p onclick="x()">Hi</p><script>alert(1)</script>`, css: "h1{color:red}", scope: "wbi-abcd" },
  });
  assert.equal(error, undefined);
  assert.equal(value.data.html, "<p>Hi</p>");
  assert.equal(value.data.css, ".wb-site .wbi-abcd h1{color:red}");
});
