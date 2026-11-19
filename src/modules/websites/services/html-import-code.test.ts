import assert from "node:assert/strict";
import { test } from "node:test";
import { rebuildImportedBlock, scopeEditorCss } from "./html-import-code.js";

const scope = "wbi-abc123";

test("keeps existing text ids and labels, and tags new text", () => {
  const result = rebuildImportedBlock({
    html: '<h2 data-wb-text-id="t4">Our work</h2><p>Brand new paragraph</p><p data-wb-text-id="t4">Pasted copy</p>',
    scope,
    texts: [{ id: "t4", label: "Main title", value: "Our work" }],
  });
  assert.deepEqual(
    result.texts?.map(({ id, label, value }) => [id, label, value]),
    [
      ["t4", "Main title", "Our work"],
      ["t5", "Paragraph", "Brand new paragraph"],
      ["t6", "Paragraph", "Pasted copy"],
    ],
  );
  assert.match(result.html, /<p data-wb-text-id="t5">Brand new paragraph<\/p>/);
});

test("tags images and drops ids from elements that no longer hold text", () => {
  const result = rebuildImportedBlock({
    html: '<div data-wb-text-id="t0"><img src="https://example.com/a.jpg" alt="Sofa"></div>',
    scope,
  });
  assert.deepEqual(result.texts, []);
  assert.deepEqual(result.mediaSlots, [{ key: "m0", kind: "image", url: "https://example.com/a.jpg", alt: "Sofa" }]);
  assert.doesNotMatch(result.html, /data-wb-text-id/);
});

test("strips scripts and event handlers like an import does", () => {
  const result = rebuildImportedBlock({
    html: '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>',
    scope,
  });
  assert.doesNotMatch(result.html, /onclick|<script|javascript:/);
});

test("scopes hand-written CSS to the block and expands the & root", () => {
  const css = scopeEditorCss("& { padding: 8px } &.dark h2, .card { color: red } body { margin: 0 }", scope);
  assert.match(css, /\.wb-site \.wbi-abc123\s*\{/);
  assert.match(css, /\.wb-site \.wbi-abc123\.dark h2,\s*\.wb-site \.wbi-abc123 \.card\s*\{/);
  assert.doesNotMatch(css, /(^|\})\s*body\s*\{/);
});

test("turns width media queries into container queries and neutralises </style>", () => {
  const css = scopeEditorCss("@media (max-width: 600px) { .card { content: '</style>' } }", scope);
  assert.match(css, /@container wb-site \(max-width: 600px\)/);
  assert.match(css, /\.wb-site \.wbi-abc123 \.card/);
  assert.doesNotMatch(css, /<\/style>/);
});

test("makes a new scope when the block has none", () => {
  const result = rebuildImportedBlock({ html: "<p>Hi</p>", css: ".x{color:red}", scope: "not valid" });
  assert.match(result.scope ?? "", /^wbi-[a-f0-9]{12}$/);
  assert.match(result.css ?? "", new RegExp(`\\.wb-site \\.${result.scope} \\.x`));
});
