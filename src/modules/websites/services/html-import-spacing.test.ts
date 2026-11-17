import assert from "node:assert/strict";
import { test } from "node:test";
import * as cheerio from "cheerio";
import { BOX_ATTR, measureBlockSpacing, type El } from "./html-import-components.js";

/** Elements with prerender boxes: [top, bottom, marginTop, marginBottom]. */
function boxed(...boxes: ([number, number, number, number] | null)[]): El[] {
  const $ = cheerio.load("");
  return boxes.map((box) => {
    const el = $("<section></section>").get(0) as El;
    if (box) el.attribs[BOX_ATTR] = box.join(",");
    return el;
  });
}

test("restores the container gap and padding lost when blocks are lifted out of the page", () => {
  // Header ends at 80; <main> has 80px padding and an 88px flex gap between three sections.
  const [header, main, footer] = boxed([0, 80, 0, 0], [80, 1316, 0, 0], [1316, 1500, 0, 0]);
  const blocks = boxed([160, 500, 0, 0], [588, 900, 0, 0], [988, 1236, 0, 0]);
  assert.deepEqual(measureBlockSpacing(blocks, { above: header, below: footer, container: main }), [
    { before: 80, after: 0 },
    { before: 88, after: 0 },
    { before: 88, after: 80 },
  ]);
});

test("leaves out space the block's own margins still provide", () => {
  const blocks = boxed([100, 200, 0, 20], [260, 400, 30, 0]);
  assert.deepEqual(measureBlockSpacing(blocks, {}), [
    { before: 0, after: 0 },
    { before: 10, after: 0 },
  ]);
});

test("adds nothing for side-by-side blocks, unmeasured pages or huge jumps", () => {
  const sideBySide = boxed([100, 400, 0, 0], [100, 380, 0, 0]);
  assert.deepEqual(measureBlockSpacing(sideBySide, {}).map((s) => s.before), [0, 0]);
  const unmeasured = boxed(null, null);
  assert.deepEqual(measureBlockSpacing(unmeasured, {}), [
    { before: 0, after: 0 },
    { before: 0, after: 0 },
  ]);
  const farApart = boxed([0, 100, 0, 0], [2000, 2100, 0, 0]);
  assert.equal(measureBlockSpacing(farApart, {})[1]!.before, 0);
});
