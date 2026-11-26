import type { ShopOptionSetInput } from "../types/shop.types.js";
import type { SheetRow } from "./shop-import-sheet.js";

/** Option columns in the template: Option 1 name / Option 1 value, up to this many. */
export const IMPORT_OPTION_COLUMNS = 3;

const MAX_PAISE = 1_000_000_000;
const MAX_STOCK = 1_000_000;

type Field =
  | "name"
  | "category"
  | "description"
  | "price"
  | "cost"
  | "sku"
  | "barcode"
  | "stock"
  | "gst"
  | "listed"
  | `option${number}Name`
  | `option${number}Value`;

/** Header spellings each column accepts, compared lowercase with spaces and symbols removed. */
const ALIASES: Record<string, Field> = {
  productname: "name",
  name: "name",
  product: "name",
  category: "category",
  description: "description",
  price: "price",
  priceinr: "price",
  sellingprice: "price",
  saleprice: "price",
  baseprice: "cost",
  basepriceinr: "cost",
  cost: "cost",
  costprice: "cost",
  costinr: "cost",
  sku: "sku",
  barcode: "barcode",
  stock: "stock",
  quantity: "stock",
  qty: "stock",
  stockonhand: "stock",
  gst: "gst",
  gstpercent: "gst",
  gstrate: "gst",
  listed: "listed",
  visible: "listed",
  showinshop: "listed",
};
for (let n = 1; n <= IMPORT_OPTION_COLUMNS; n += 1) {
  ALIASES[`option${n}name`] = `option${n}Name`;
  ALIASES[`option${n}`] = `option${n}Name`;
  ALIASES[`option${n}value`] = `option${n}Value`;
  ALIASES[`value${n}`] = `option${n}Value`;
}

/** One parsed sheet row. Blank optional cells are null ("leave as it is" when updating). */
export type ImportRow = {
  line: number;
  name: string;
  category: string | null;
  description: string | null;
  options: { name: string; value: string }[];
  pricePaise: number | null;
  costPaise: number | null;
  sku: string | null;
  barcode: string | null;
  stock: number | null;
  gstPercent: number | null;
  listed: boolean | null;
};

export type ImportIssue = { line: number | null; message: string };

function headerKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** "₹1,499.50", "1499.5" or "Rs 1499" → 149950 paise. */
function parseRupees(text: string): number | null {
  const cleaned = text.replace(/₹|rs\.?|inr|,|\s/gi, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

function parseYesNo(text: string): boolean | null | undefined {
  const value = text.toLowerCase();
  if (["yes", "y", "true", "1", "listed", "show"].includes(value)) return true;
  if (["no", "n", "false", "0", "hidden", "hide"].includes(value)) return false;
  return undefined;
}

/** Reads the header row and every data row, collecting problems with their line numbers. */
export function parseImportRows(sheet: SheetRow[]): { rows: ImportRow[]; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  const [header, ...body] = sheet;
  if (!header) return { rows: [], issues: [{ line: null, message: "The file is empty." }] };

  const columns = new Map<Field, number>();
  header.cells.forEach((text, index) => {
    const field = ALIASES[headerKey(text)];
    if (field && !columns.has(field)) columns.set(field, index);
  });
  const missing = (["name", "price"] as const).filter((field) => !columns.has(field));
  if (missing.length > 0) {
    return {
      rows: [],
      issues: [{ line: header.line, message: "Row 1 must be the header from the template, with at least “Product name” and “Price” columns." }],
    };
  }

  const rows: ImportRow[] = [];
  for (const { line, cells } of body) {
    const cell = (field: Field) => {
      const index = columns.get(field);
      return index === undefined ? "" : (cells[index] ?? "").trim();
    };
    const problems: string[] = [];

    // The name may be blank on rows that update an existing variant by SKU; new products are checked later.
    const name = cell("name");
    if (!name && !cell("sku")) problems.push("Product name is empty");
    else if (name.length > 160) problems.push("Product name must be 160 characters or less");

    const category = cell("category") || null;
    if (category && category.length > 80) problems.push("Category must be 80 characters or less");
    const description = cell("description") || null;
    if (description && description.length > 2000) problems.push("Description must be 2000 characters or less");

    const money = (field: "price" | "cost", label: string) => {
      const text = cell(field);
      if (!text) return null;
      const paise = parseRupees(text);
      if (paise === null) problems.push(`${label} “${text}” isn't a number`);
      else if (paise > MAX_PAISE) problems.push(`${label} is too high`);
      return paise;
    };
    const pricePaise = money("price", "Price");
    const costPaise = money("cost", "Base price");

    const sku = cell("sku") || null;
    if (sku && sku.length > 64) problems.push("SKU must be 64 characters or less");
    const barcode = cell("barcode") || null;
    if (barcode && (barcode.length > 64 || !/^[\x21-\x7E]+$/.test(barcode))) {
      problems.push("Barcode can't contain spaces or special characters, and must be 64 characters or less");
    }

    let stock: number | null = null;
    const stockText = cell("stock").replace(/,/g, "");
    if (stockText) {
      if (!/^\d+$/.test(stockText)) problems.push(`Stock “${cell("stock")}” must be a whole number`);
      else if (Number(stockText) > MAX_STOCK) problems.push(`Stock can't be over ${MAX_STOCK.toLocaleString("en-IN")}`);
      else stock = Number(stockText);
    }

    let gstPercent: number | null = null;
    const gstText = cell("gst").replace(/%/g, "").trim();
    if (gstText) {
      if (!/^\d+$/.test(gstText) || Number(gstText) > 100) problems.push("GST % must be a whole number from 0 to 100");
      else gstPercent = Number(gstText);
    }

    let listed: boolean | null = null;
    if (cell("listed")) {
      const parsed = parseYesNo(cell("listed"));
      if (parsed === undefined) problems.push("Listed must be Yes or No");
      else listed = parsed;
    }

    const options: { name: string; value: string }[] = [];
    for (let n = 1; n <= IMPORT_OPTION_COLUMNS; n += 1) {
      const optionName = cell(`option${n}Name`);
      const value = cell(`option${n}Value`);
      if (!optionName && !value) continue;
      if (!optionName) problems.push(`Option ${n} has a value but no name (such as Size)`);
      else if (!value) problems.push(`Option ${n} (${optionName}) has no value`);
      else if (optionName.length > 40 || value.length > 40) problems.push(`Option ${n} name and value must be 40 characters or less`);
      else options.push({ name: optionName, value });
    }

    if (problems.length > 0) {
      issues.push({ line, message: problems.join("; ") });
      continue;
    }
    rows.push({ line, name, category, description, options, pricePaise, costPaise, sku, barcode, stock, gstPercent, listed });
  }
  if (body.length === 0) issues.push({ line: null, message: "The file has a header but no product rows." });
  return { rows, issues };
}

function mostCommon(values: number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Joins option values the way the product form keys a combination (see variantKey in shop.service). */
function comboKey(values: string[]): string {
  return values.map((value) => value.trim().toLowerCase()).join("\u001f");
}

/** One option set when `rows` cover every combination of their option values, else null. */
function matrixSet(rows: ImportRow[], optionNames: string[]): ShopOptionSetInput | null {
  const values = optionNames.map((_, index) => {
    const seen = new Map<string, string>();
    for (const row of rows) {
      const value = row.options[index].value;
      if (!seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
    }
    return [...seen.values()];
  });
  const combinations = values.reduce((total, list) => total * list.length, 1);
  if (combinations !== rows.length) return null;

  const pricePaise = mostCommon(rows.map((row) => row.pricePaise!));
  const costPaise = mostCommon(rows.map((row) => row.costPaise!));
  const set: ShopOptionSetInput = {
    pricePaise,
    costPaise,
    options: optionNames.map((name, index) => ({ name, values: values[index] })),
    overrides: [],
    costOverrides: [],
    skus: [],
    barcodes: [],
  };
  for (const row of rows) {
    const key = comboKey(row.options.map((option) => option.value));
    if (row.pricePaise !== pricePaise) set.overrides!.push({ key, pricePaise: row.pricePaise! });
    if (row.costPaise !== costPaise) set.costOverrides!.push({ key, costPaise: row.costPaise! });
    if (row.sku) set.skus!.push({ key, sku: row.sku });
    if (row.barcode) set.barcodes!.push({ key, barcode: row.barcode });
  }
  return set;
}

/**
 * Option name as compared between rows: case, spaces and symbols ignored, "color" read as "colour",
 * and a plural "s" dropped, so "Colour", "color" and "Colours" are the same option.
 */
export function optionNameKey(name: string): string {
  let key = name.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/color/g, "colour");
  if (key.length > 3 && key.endsWith("s") && !key.endsWith("ss")) key = key.slice(0, -1);
  return key;
}

/**
 * Lines every row of a product up with the first row's options: matched by name (see optionNameKey),
 * put in the first row's column order and spelled the first row's way. Rows that leave out one of the
 * product's options, or use one the first row doesn't have, can't be lined up and are reported.
 */
function alignOptions(rows: ImportRow[]): { rows: ImportRow[] } | { error: string } {
  const first = rows[0];
  const names = first.options.map((option) => option.name);
  const keys = first.options.map((option) => optionNameKey(option.name));
  const label = (list: string[]) => list.map((name) => `“${name}”`).join(" and ");

  const aligned: ImportRow[] = [];
  for (const row of rows) {
    const byKey = new Map<string, { name: string; value: string }>();
    for (const option of row.options) {
      const key = optionNameKey(option.name);
      if (byKey.has(key)) {
        return { error: `Row ${row.line} has ${label([byKey.get(key)!.name, option.name])}, which are the same option. Keep only one.` };
      }
      byKey.set(key, option);
    }
    const missing = names.filter((_, index) => !byKey.has(keys[index]));
    const extra = row.options.filter((option) => !keys.includes(optionNameKey(option.name))).map((option) => option.name);
    if (extra.length > 0 && missing.length > 0) {
      return {
        error: `Row ${row.line} has ${label(extra)} where row ${first.line} has ${label(missing)}. Use the same options on every row of a product, or give them different product names.`,
      };
    }
    if (missing.length > 0) {
      return { error: `Row ${row.line} has no ${label(missing)}. Fill it in so every variant of this product has the same options.` };
    }
    if (extra.length > 0) {
      return {
        error: `Row ${row.line} has ${label(extra)}, which row ${first.line} doesn't have. Add it to every row of this product, or remove it.`,
      };
    }
    aligned.push({ ...row, options: keys.map((key, index) => ({ name: names[index], value: byKey.get(key)!.value })) });
  }
  return { rows: aligned };
}

/**
 * Turns the rows of one new product into the option sets the product form saves, and returns the rows
 * with their options lined up (see alignOptions). Rows that cover every combination (S/M × Red/Blue)
 * become one set; otherwise rows are split by their first option's value.
 */
export function buildOptionSets(input: ImportRow[]): { sets: ShopOptionSetInput[]; rows: ImportRow[] } | { error: string } {
  const alignedResult = alignOptions(input);
  if ("error" in alignedResult) return alignedResult;
  const rows = alignedResult.rows;
  const optionNames = rows[0].options.map((option) => option.name);
  if (optionNames.length === 0 && rows.length > 1) {
    return { error: "This product is listed on more than one row without options. Add option columns (such as Size) or use different product names." };
  }

  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = comboKey(row.options.map((option) => option.value));
    const earlier = seen.get(key);
    if (earlier !== undefined) return { error: `Rows ${earlier} and ${row.line} are the same variant.` };
    seen.set(key, row.line);
  }

  const whole = matrixSet(rows, optionNames);
  if (whole) return { sets: [whole], rows };

  const byFirst = new Map<string, ImportRow[]>();
  for (const row of rows) {
    const key = row.options[0].value.toLowerCase();
    byFirst.set(key, [...(byFirst.get(key) ?? []), row]);
  }
  const sets: ShopOptionSetInput[] = [];
  for (const group of byFirst.values()) {
    const set = matrixSet(group, optionNames);
    if (!set) {
      return {
        error: `The variants don't form a complete grid (every ${optionNames.join(" × ")} combination). Add the missing combinations or split them into separate products.`,
      };
    }
    sets.push(set);
  }
  if (sets.length > 8) {
    return { error: "These variants need more than 8 price groups. Add the missing combinations so they form a grid, or split the product." };
  }
  return { sets, rows };
}
