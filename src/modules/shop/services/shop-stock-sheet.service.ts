import ExcelJS from "exceljs";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import { readSheet } from "../utils/shop-import-sheet.js";
import { parseStockSheet, STOCK_SHEET_COLUMNS, type StockSheetIssue, type StockSheetRow } from "../utils/shop-stock-sheet.js";
import { purgeShopPages } from "./shop-cache.js";
import { shopInventoryService } from "./shop-inventory.service.js";

/** Most data rows one stock list upload may hold. */
export const STOCK_UPLOAD_MAX_ROWS = 20_000;
const STOCK_NOTE = "Stock list upload";

/** One variant whose stock the upload would change. */
export type StockChange = {
  line: number;
  variantId: string;
  productName: string;
  variantName: string;
  /** Stock when the list was downloaded, when the file says. */
  before: number | null;
  /** Stock right now. */
  current: number;
  next: number;
  /** Sold or restocked since the list was downloaded, so the owner decides whether to apply it. */
  changedSinceDownload: boolean;
};

export type StockUploadPreview = {
  /** Rows with a New stock. */
  rows: number;
  changes: StockChange[];
  /** Rows whose New stock was left as it was. */
  unchanged: number;
  issues: StockSheetIssue[];
};

export type StockUploadResult = StockUploadPreview & { updated: number; skipped: number };

type ShopVariant = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  product: { id: string; name: string; clientId: string; category: { name: string } | null };
};

function shopVariants(websiteId: string): Promise<ShopVariant[]> {
  return prisma.productVariant.findMany({
    where: { product: { websiteId } },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      quantity: true,
      product: { select: { id: true, name: true, clientId: true, category: { select: { name: true } } } },
    },
    orderBy: [{ product: { name: "asc" } }, { productId: "asc" }, { sortOrder: "asc" }],
  });
}

function groupBy(variants: ShopVariant[], key: (variant: ShopVariant) => string | null): Map<string, ShopVariant[]> {
  const map = new Map<string, ShopVariant[]>();
  for (const variant of variants) {
    const value = key(variant);
    if (value) map.set(value, [...(map.get(value) ?? []), variant]);
  }
  return map;
}

/** The variant a row means: its Variant ID, otherwise its SKU (any case), otherwise its barcode. */
function matchRow(
  row: StockSheetRow,
  byId: Map<string, ShopVariant>,
  bySku: Map<string, ShopVariant[]>,
  byBarcode: Map<string, ShopVariant[]>,
): ShopVariant | string {
  const found = row.variantId ? byId.get(row.variantId) : undefined;
  if (found) return found;
  for (const [label, value, map] of [
    ["SKU", row.sku?.toLowerCase(), bySku],
    ["Barcode", row.barcode, byBarcode],
  ] as const) {
    if (!value) continue;
    const matches = map.get(value) ?? [];
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) return `${label} ${value} is used by more than one variant, so it can't be matched`;
  }
  return row.variantId
    ? "This variant isn't in the shop any more (it may have been deleted)"
    : "No variant has this SKU or barcode";
}

/** Download the stock list, change the New stock column, and upload it to update stock in one go. */
export class ShopStockSheetService {
  /** Every variant with its stock now, as an Excel file whose New stock column is ready to edit. */
  async download(websiteId: string, actor: AuthUser): Promise<{ content: Buffer; filename: string }> {
    await shopInventoryService.openShop(websiteId, actor);
    const variants = await shopVariants(websiteId);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Stock", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = STOCK_SHEET_COLUMNS.map((header) => ({
      header,
      width: header === "Product" ? 36 : header === "Variant ID" ? 40 : header === "Variant" || header === "Category" ? 22 : 18,
    }));
    for (const variant of variants) {
      // Text cells keep long barcodes and SKUs like "00123" exactly as they are.
      sheet.addRow([
        variant.product.name,
        variant.name,
        variant.product.category?.name ?? "",
        variant.sku ?? "",
        variant.barcode ?? "",
        variant.quantity,
        variant.quantity,
        variant.id,
      ]);
    }
    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    const newStock = STOCK_SHEET_COLUMNS.indexOf("New stock") + 1;
    sheet.getColumn(newStock).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF9C3" } };
    header.getCell(newStock).font = { bold: true, color: { argb: "FF854D0E" } };
    sheet.getColumn(STOCK_SHEET_COLUMNS.indexOf("Variant ID") + 1).font = { color: { argb: "FF94A3B8" } };

    const help = workbook.addWorksheet("How to use");
    help.getColumn(1).width = 110;
    [
      "How to update stock with this file",
      "",
      "1. On the Stock sheet, change the numbers in the yellow “New stock” column to the stock you have now.",
      "   Type a higher number to add stock or a lower number to reduce it. 0 means out of stock.",
      "2. Leave the other columns as they are. You can delete rows you don't need.",
      "3. Save the file and upload it on the Stock screen with “Upload stock list”.",
      "",
      "Only rows where New stock differs from “Stock on download” are changed.",
      "If a variant sold or was restocked after you downloaded this file, the upload asks before changing it.",
      "Prices and product details are never changed by this file.",
    ].forEach((text, index) => {
      const row = help.addRow([text]);
      if (index === 0) row.font = { bold: true, size: 13 };
    });

    const content = Buffer.from(await workbook.xlsx.writeBuffer());
    return { content, filename: `stock-list-${new Date().toISOString().slice(0, 10)}.xlsx` };
  }

  /** What the uploaded list would change, without saving anything. */
  async preview(websiteId: string, file: Express.Multer.File | undefined, actor: AuthUser): Promise<StockUploadPreview> {
    return (await this.plan(websiteId, file, actor)).preview;
  }

  /**
   * Sets stock to the list's numbers. Rows that sold or were restocked since the download are
   * skipped unless `includeChanged`. Rows with problems are skipped and the rest still apply.
   */
  async apply(
    websiteId: string,
    file: Express.Multer.File | undefined,
    includeChanged: boolean,
    actor: AuthUser,
  ): Promise<StockUploadResult> {
    const { preview, variants } = await this.plan(websiteId, file, actor);
    const targets = preview.changes.filter((change) => includeChanged || !change.changedSinceDownload);
    if (targets.length === 0) return { ...preview, updated: 0, skipped: preview.changes.length };

    const updated = await prisma.$transaction(
      async (tx) => {
        // Lock the rows so a sale at the same moment can't slip between reading and writing the stock.
        const ids = targets.map((target) => target.variantId);
        const live = await tx.$queryRaw<{ id: string; quantity: number }[]>`
          SELECT id::text AS id, quantity FROM product_variants WHERE id = ANY(${ids}::uuid[]) FOR UPDATE`;
        const liveById = new Map(live.map((row) => [row.id, row.quantity]));
        let count = 0;
        for (const target of targets) {
          const now = liveById.get(target.variantId);
          const variant = variants.get(target.variantId);
          if (now === undefined || !variant || now === target.next) continue;
          await tx.productVariant.update({ where: { id: target.variantId }, data: { quantity: target.next } });
          await tx.inventoryMovement.create({
            data: {
              websiteId,
              clientId: variant.product.clientId,
              productId: variant.product.id,
              variantId: variant.id,
              productName: variant.product.name,
              variantName: variant.name,
              delta: target.next - now,
              quantityAfter: target.next,
              note: STOCK_NOTE,
              userId: actor.id,
            },
          });
          count += 1;
        }
        return count;
      },
      { timeout: 120_000 },
    );
    if (updated > 0) purgeShopPages(websiteId);
    return { ...preview, updated, skipped: preview.changes.length - targets.length };
  }

  private async plan(
    websiteId: string,
    file: Express.Multer.File | undefined,
    actor: AuthUser,
  ): Promise<{ preview: StockUploadPreview; variants: Map<string, ShopVariant> }> {
    await shopInventoryService.openShop(websiteId, actor);
    if (!file) throw new AppError(400, "Choose a .xlsx or .csv file to upload.", "IMPORT_FILE_MISSING");
    const sheet = await readSheet(file);
    if (sheet.length - 1 > STOCK_UPLOAD_MAX_ROWS) {
      throw new AppError(
        400,
        `A stock list can have up to ${STOCK_UPLOAD_MAX_ROWS.toLocaleString("en-IN")} rows. Split it into smaller files.`,
        "IMPORT_TOO_MANY_ROWS",
      );
    }
    const { rows, issues } = parseStockSheet(sheet);

    const all = await shopVariants(websiteId);
    const byId = new Map(all.map((variant) => [variant.id, variant]));
    const bySku = groupBy(all, (variant) => variant.sku?.toLowerCase() ?? null);
    const byBarcode = groupBy(all, (variant) => variant.barcode);

    const seen = new Map<string, number>();
    const changes: StockChange[] = [];
    let unchanged = 0;
    for (const row of rows) {
      const variant = matchRow(row, byId, bySku, byBarcode);
      if (typeof variant === "string") {
        issues.push({ line: row.line, message: variant });
        continue;
      }
      const earlier = seen.get(variant.id);
      if (earlier !== undefined) {
        issues.push({ line: row.line, message: `${variant.product.name} (${variant.name}) is also on row ${earlier}` });
        continue;
      }
      seen.set(variant.id, row.line);
      // A New stock left as downloaded means "no change", even if a sale has moved the stock since.
      if ((row.before !== null && row.next === row.before) || row.next === variant.quantity) {
        unchanged += 1;
        continue;
      }
      changes.push({
        line: row.line,
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        before: row.before,
        current: variant.quantity,
        next: row.next,
        changedSinceDownload: row.before !== null && row.before !== variant.quantity,
      });
    }
    issues.sort((left, right) => (left.line ?? 0) - (right.line ?? 0));
    return { preview: { rows: rows.length, changes, unchanged, issues }, variants: byId };
  }
}

export const shopStockSheetService = new ShopStockSheetService();
