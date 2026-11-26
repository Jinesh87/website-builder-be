import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOptionSets, parseImportRows } from "./shop-import-rows.js";
import { parseCsv } from "./shop-import-sheet.js";

const HEADER = "Product name,Category,Option 1 name,Option 1 value,Option 2 name,Option 2 value,Price,Base price,SKU,Barcode,Stock,GST %,Listed";

function rowsOf(csv: string) {
  const sheet = parseCsv(csv).map((cells, index) => ({ line: index + 1, cells }));
  return parseImportRows(sheet);
}

describe("parseCsv", () => {
  it("handles quotes, embedded commas, line breaks and a BOM", () => {
    assert.deepEqual(parseCsv('﻿a,"b, c","say ""hi"""\r\n"multi\nline",2\n'), [
      ["a", "b, c", 'say "hi"'],
      ["multi\nline", "2"],
    ]);
  });
});

describe("parseImportRows", () => {
  it("reads rupees, stock, GST and Yes/No, and tolerates header spelling", () => {
    const { rows, issues } = rowsOf(`product NAME,price (INR),Cost price,Qty,GST,Visible\nMug,"₹1,499.50",Rs 600,"1,200",18%,no`);
    assert.deepEqual(issues, []);
    assert.equal(rows[0].pricePaise, 149950);
    assert.equal(rows[0].costPaise, 60000);
    assert.equal(rows[0].stock, 1200);
    assert.equal(rows[0].gstPercent, 18);
    assert.equal(rows[0].listed, false);
  });

  it("reports bad cells with their row number and skips the row", () => {
    const { rows, issues } = rowsOf(`${HEADER}\nMug,,,,,,abc,10,,,1.5,,maybe\n,,,,,,10,5,,,,,`);
    assert.equal(rows.length, 0);
    assert.equal(issues[0].line, 2);
    assert.match(issues[0].message, /Price “abc”/);
    assert.match(issues[0].message, /whole number/);
    assert.match(issues[0].message, /Yes or No/);
    assert.equal(issues[1].line, 3);
    assert.match(issues[1].message, /Product name is empty/);
  });

  it("allows a blank product name when the row has a SKU", () => {
    const { rows, issues } = rowsOf("Product name,SKU,Price,Stock\n,MUG-1,,40");
    assert.deepEqual(issues, []);
    assert.equal(rows[0].stock, 40);
  });

  it("needs a header with Product name and Price", () => {
    assert.match(rowsOf("Foo,Bar\n1,2").issues[0].message, /header/);
  });
});

describe("buildOptionSets", () => {
  it("turns a full grid into one set with price and SKU overrides", () => {
    const { rows } = rowsOf(
      `${HEADER}\nTee,,Size,S,Colour,Red,499,200,TS-S-R,,,,\nTee,,Size,M,Colour,Red,499,200,TS-M-R,,,,\nTee,,Size,S,Colour,Blue,549,200,TS-S-B,,,,\nTee,,Size,M,Colour,Blue,499,200,,,,,`,
    );
    const built = buildOptionSets(rows);
    assert.ok("sets" in built);
    assert.equal(built.sets.length, 1);
    const [set] = built.sets;
    assert.equal(set.pricePaise, 49900);
    assert.deepEqual(set.options.map((o) => [o.name, o.values]), [["Size", ["S", "M"]], ["Colour", ["Red", "Blue"]]]);
    assert.deepEqual(set.overrides, [{ key: "s\u001fblue", pricePaise: 54900 }]);
    assert.equal(set.skus?.length, 3);
  });

  it("splits an incomplete grid by the first option", () => {
    const { rows } = rowsOf(
      `${HEADER}\nTee,,Size,S,Colour,Red,499,200,,,,,\nTee,,Size,S,Colour,Blue,499,200,,,,,\nTee,,Size,M,Colour,Red,499,200,,,,,`,
    );
    const built = buildOptionSets(rows);
    assert.ok("sets" in built);
    assert.equal(built.sets.length, 2);
  });

  it("rejects duplicate variants and mismatched option names", () => {
    const dup = rowsOf(`${HEADER}\nTee,,Size,S,,,499,200,,,,,\nTee,,Size,s,,,499,200,,,,,`).rows;
    assert.match((buildOptionSets(dup) as { error: string }).error, /same variant/);
  });

  it("matches options by name: swapped columns and spellings like Color/Colour or Sizes/Size", () => {
    const { rows } = rowsOf(
      `${HEADER}\nTee,,Size,S,Colour,Red,499,200,TS-S-R,,4,,\nTee,,color,Red,SIZES,M,499,200,TS-M-R,,5,,\nTee,,Size,S,Colours,Blue,499,200,,,,,\nTee,,Colour,Blue,Size,M,499,200,,,,,`,
    );
    const built = buildOptionSets(rows);
    assert.ok("sets" in built, "error" in built ? built.error : "");
    assert.equal(built.sets.length, 1);
    assert.deepEqual(built.sets[0].options.map((o) => [o.name, o.values]), [["Size", ["S", "M"]], ["Colour", ["Red", "Blue"]]]);
    // Rows come back in the first row's order and spelling, so stock lines up with the variant names.
    assert.deepEqual(built.rows[1].options, [{ name: "Size", value: "M" }, { name: "Colour", value: "Red" }]);
    assert.equal(built.rows[1].stock, 5);
  });

  it("explains a missing option, an extra option and a different option", () => {
    const error = (csv: string) => {
      const built = buildOptionSets(rowsOf(`${HEADER}\n${csv}`).rows);
      assert.ok("error" in built);
      return built.error;
    };
    assert.match(error("Tee,,Size,S,Colour,Red,499,200,,,,,\nTee,,Size,L,,,499,200,,,,,"), /Row 3 has no “Colour”/);
    assert.match(error("Tee,,Size,S,,,499,200,,,,,\nTee,,Size,M,Colour,Red,499,200,,,,,"), /Row 3 has “Colour”, which row 2 doesn't have/);
    assert.match(error("Tee,,Size,M,,,499,200,,,,,\nTee,,Material,Cotton,,,499,200,,,,,"), /Row 3 has “Material” where row 2 has “Size”/);
    assert.match(error("Tee,,Color,Red,Colour,Blue,499,200,,,,,"), /same option/);
  });

  it("makes a simple product from one row without options", () => {
    const { rows } = rowsOf(`${HEADER}\nMug,,,,,,299,120,MUG-1,890200,25,,`);
    const built = buildOptionSets(rows);
    assert.ok("sets" in built);
    assert.deepEqual(built.sets[0].options, []);
    assert.deepEqual(built.sets[0].skus, [{ key: "", sku: "MUG-1" }]);
  });
});
