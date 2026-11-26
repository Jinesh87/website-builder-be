import type { SheetRow } from "./shop-import-sheet.js";

/** Highest on-hand stock a variant may have (matches Add quantity). */
export const STOCK_SHEET_MAX = 1_000_000;

/** Column headers of the downloaded stock list, in order. */
export const STOCK_SHEET_COLUMNS = ["Product", "Variant", "Category", "SKU", "Barcode", "Stock on download", "New stock", "Variant ID"] as const;

type Field = "variantId" | "sku" | "barcode" | "before" | "next";

/** Header spellings accepted, compared as lowercase letters and digits only. */
const ALIASES: Record<string, Field> = {
  variantid: "variantId",
  id: "variantId",
  sku: "sku",
  barcode: "barcode",
  stockondownload: "before",
  currentstock: "before",
  oldstock: "before",
  newstock: "next",
  stock: "next",
  quantity: "next",
  qty: "next",
};

export type StockSheetIssue = { line: number | null; message: string };

export type StockSheetRow = {
  line: number;
  variantId: string | null;
  sku: string | null;
  barcode: string | null;
  /** Stock when the list was downloaded; null when the file has no such column or cell. */
  before: number | null;
  next: number;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function count(text: string): number | null | "bad" {
  const clean = text.replace(/,/g, "").trim();
  if (!clean) return null;
  // Spreadsheets may save whole numbers as "12.0".
  if (!/^-?\d+(\.0+)?$/.test(clean)) return "bad";
  return Number(clean);
}

/**
 * Reads the rows of a stock list. Rows with a blank New stock are left out (nothing to change);
 * every row with a problem is reported by its spreadsheet row number and the rest still count.
 */
export function parseStockSheet(sheet: SheetRow[]): { rows: StockSheetRow[]; issues: StockSheetIssue[] } {
  const [header, ...body] = sheet;
  if (!header) return { rows: [], issues: [{ line: null, message: "The file is empty." }] };

  const columns = new Map<Field, number>();
  header.cells.forEach((text, index) => {
    const field = ALIASES[text.toLowerCase().replace(/[^a-z0-9]/g, "")];
    if (field && !columns.has(field)) columns.set(field, index);
  });
  if (!columns.has("next") || !(columns.has("variantId") || columns.has("sku") || columns.has("barcode"))) {
    return {
      rows: [],
      issues: [
        {
          line: header.line,
          message: "Row 1 must be the header of the downloaded stock list, with a “New stock” column and a “Variant ID”, “SKU” or “Barcode” column.",
        },
      ],
    };
  }

  const rows: StockSheetRow[] = [];
  const issues: StockSheetIssue[] = [];
  for (const { line, cells } of body) {
    const cell = (field: Field) => {
      const index = columns.get(field);
      return index === undefined ? "" : (cells[index] ?? "").trim();
    };
    const next = count(cell("next"));
    if (next === null) continue;
    if (next === "bad") {
      issues.push({ line, message: `New stock “${cell("next")}” must be a whole number` });
      continue;
    }
    if (next < 0) {
      issues.push({ line, message: "New stock can't be below 0" });
      continue;
    }
    if (next > STOCK_SHEET_MAX) {
      issues.push({ line, message: `New stock can't be over ${STOCK_SHEET_MAX.toLocaleString("en-IN")}` });
      continue;
    }
    const before = count(cell("before"));
    const idText = cell("variantId");
    const row: StockSheetRow = {
      line,
      variantId: UUID.test(idText) ? idText.toLowerCase() : null,
      sku: cell("sku") || null,
      barcode: cell("barcode") || null,
      before: typeof before === "number" ? before : null,
      next,
    };
    if (!row.variantId && !row.sku && !row.barcode) {
      issues.push({ line, message: "The row has no Variant ID, SKU or barcode to find the variant by" });
      continue;
    }
    rows.push(row);
  }
  return { rows, issues };
}
