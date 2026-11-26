import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SheetRow } from "./shop-import-sheet.js";
import { parseStockSheet, STOCK_SHEET_COLUMNS } from "./shop-stock-sheet.js";

const ID = "3f2b8c1e-1d2a-4c5b-9e8f-0a1b2c3d4e5f";

function sheet(...rows: string[][]): SheetRow[] {
  return [[...STOCK_SHEET_COLUMNS], ...rows].map((cells, index) => ({ line: index + 1, cells }));
}

/** A downloaded row: Product, Variant, Category, SKU, Barcode, Stock on download, New stock, Variant ID. */
function row(before: string, next: string, overrides: { sku?: string; barcode?: string; id?: string } = {}): string[] {
  return ["Tee", "Red", "Clothing", overrides.sku ?? "TS-RED", overrides.barcode ?? "", before, next, overrides.id ?? ID];
}

describe("parseStockSheet", () => {
  it("reads the downloaded columns", () => {
    const { rows, issues } = parseStockSheet(sheet(row("10", "7")));
    assert.deepEqual(issues, []);
    assert.deepEqual(rows, [{ line: 2, variantId: ID, sku: "TS-RED", barcode: null, before: 10, next: 7 }]);
  });

  it("allows reducing to zero and accepts 12.0 and 1,200", () => {
    const { rows } = parseStockSheet(sheet(row("4", "0"), row("3", "12.0"), row("3", "1,200")));
    assert.deepEqual(rows.map((r) => r.next), [0, 12, 1200]);
  });

  it("skips rows with a blank New stock", () => {
    assert.deepEqual(parseStockSheet(sheet(row("4", ""))).rows, []);
  });

  it("flags negative, fractional, text and too-large numbers by row", () => {
    const { rows, issues } = parseStockSheet(sheet(row("1", "-2"), row("1", "2.5"), row("1", "ten"), row("1", "1000001")));
    assert.deepEqual(rows, []);
    assert.deepEqual(issues.map((issue) => issue.line), [2, 3, 4, 5]);
  });

  it("works with only SKU and Stock columns", () => {
    const { rows, issues } = parseStockSheet([
      { line: 1, cells: ["sku", "Stock"] },
      { line: 2, cells: ["MUG-1", "9"] },
    ]);
    assert.deepEqual(issues, []);
    assert.deepEqual(rows, [{ line: 2, variantId: null, sku: "MUG-1", barcode: null, before: null, next: 9 }]);
  });

  it("ignores a Variant ID that isn't an id, and needs some way to find the variant", () => {
    const { rows, issues } = parseStockSheet(sheet(row("1", "2", { id: "abc", sku: "" })));
    assert.deepEqual(rows, []);
    assert.equal(issues[0].line, 2);
  });

  it("rejects a header without New stock or any code column", () => {
    assert.equal(parseStockSheet([{ line: 1, cells: ["Product", "Stock"] }]).issues[0].line, 1);
    assert.equal(parseStockSheet([{ line: 1, cells: ["SKU", "Price"] }]).issues[0].line, 1);
  });
});
