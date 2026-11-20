import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareStylesheet, sectionMatcher, shakeStylesheet } from "./html-import-css.js";

test("unwraps cascade layers so imported Tailwind-style CSS is not outranked by builder styles", () => {
  const sheet = prepareStylesheet(
    "@layer theme, base, utilities;@layer base{a{color:inherit;text-decoration:inherit}}@layer utilities{.flex{display:flex}@media (min-width:768px){.md\\:hidden{display:none}}}",
    "kf",
  );
  const css = shakeStylesheet(sheet, sectionMatcher('<div class="flex md:hidden"><a href="/">Home</a></div>'), "wbi-test1");

  assert.doesNotMatch(css, /@layer/);
  assert.match(css, /\.wbi-test1 a\{color:inherit;text-decoration:inherit\}/);
  // Source order (base before utilities) is kept.
  assert.ok(css.indexOf("text-decoration") < css.indexOf("display:flex"));
  assert.match(css, /@container wb-site \(min-width:768px\)\{[^}]*md\\:hidden/);
});
