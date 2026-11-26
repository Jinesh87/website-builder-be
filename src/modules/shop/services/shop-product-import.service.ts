import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import type { ShopOptionSetInput, ShopProductInput } from "../types/shop.types.js";
import { buildOptionSets, parseImportRows, type ImportIssue, type ImportRow } from "../utils/shop-import-rows.js";
import { readSheet } from "../utils/shop-import-sheet.js";
import { openShopForAdmin } from "./shop-admin-access.js";
import { purgeShopPages } from "./shop-cache.js";
import { expandOptionSets, readImages, readOptionSets, shopService, variantKey } from "./shop.service.js";

/** Most data rows one upload may hold. */
export const IMPORT_MAX_ROWS = 5000;
const MAX_PRODUCTS = 500;
const MAX_CATEGORIES = 100;
const STOCK_NOTE = "Bulk import";

type ExistingVariant = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  pricePaise: number;
  costPaise: number | null;
  quantity: number;
  productId: string;
};

type CreatePlan = { name: string; rows: ImportRow[]; input: ShopProductInput; category: string | null };
type UpdatePlan = { productId: string; name: string; rows: { row: ImportRow; variant: ExistingVariant }[]; category: string | null };

export type ImportPreviewItem = { action: "create" | "update"; name: string; variants: number; lines: number[] };

export type ImportSummary = {
  rows: number;
  createProducts: number;
  createVariants: number;
  updateProducts: number;
  updateVariants: number;
  newCategories: string[];
  issues: ImportIssue[];
  items: ImportPreviewItem[];
};

export type ImportResult = ImportSummary & { applied: boolean; created: number; updated: number; failures: ImportIssue[] };

function firstValue<T>(rows: ImportRow[], pick: (row: ImportRow) => T | null): T | null {
  for (const row of rows) {
    const value = pick(row);
    if (value !== null) return value;
  }
  return null;
}

/** Combinations of a stored option set, as `{ key, label }` the way the product form names variants. */
function setCombos(set: ShopOptionSetInput): { key: string; label: string }[] {
  const lists = set.options.map((option) => option.values);
  const combos = lists.reduce<string[][]>((acc, list) => acc.flatMap((prefix) => list.map((value) => [...prefix, value])), [[]]);
  return combos.map((values) => ({ key: variantKey(values), label: values.length > 0 ? values.join(" / ") : "Standard" }));
}

function setEntry<T extends { key: string }>(list: T[] | undefined, key: string, entry: T | null): T[] {
  const rest = (list ?? []).filter((item) => item.key !== key);
  return entry ? [...rest, entry] : rest;
}

export class ShopProductImportService {
  /** Reads the file and works out what would change, without saving anything. */
  async preview(websiteId: string, file: Express.Multer.File | undefined, actor: AuthUser): Promise<ImportSummary> {
    const { summary } = await this.plan(websiteId, file, actor);
    return summary;
  }

  /** Re-plans the file and, when it has no problems, creates and updates the products. */
  async apply(websiteId: string, file: Express.Multer.File | undefined, actor: AuthUser): Promise<ImportResult> {
    const { summary, creates, updates, categories } = await this.plan(websiteId, file, actor);
    if (summary.issues.length > 0) return { ...summary, applied: false, created: 0, updated: 0, failures: [] };

    const failures: ImportIssue[] = [];
    let created = 0;
    let updated = 0;
    const categoryIds = new Map(categories);
    for (const name of summary.newCategories) {
      try {
        const created = await shopService.createCategory(websiteId, { name }, actor);
        categoryIds.set(name.toLowerCase(), created.id);
      } catch (error) {
        failures.push({ line: null, message: `Category “${name}”: ${error instanceof Error ? error.message : "couldn't be created"}` });
      }
    }
    const categoryId = (name: string | null) => (name ? (categoryIds.get(name.toLowerCase()) ?? null) : undefined);

    for (const plan of creates) {
      try {
        const product = await shopService.createProduct(websiteId, { ...plan.input, categoryId: categoryId(plan.category) ?? null }, actor);
        const stockByLabel = new Map(
          plan.rows.map((row) => [(row.options.length ? row.options.map((o) => o.value).join(" / ") : "Standard").toLowerCase(), row.stock]),
        );
        await this.setStock(
          websiteId,
          actor,
          product.variants.map((variant) => ({ variantId: variant.id, stock: stockByLabel.get(variant.name.toLowerCase()) ?? null })),
        );
        created += 1;
      } catch (error) {
        failures.push({ line: plan.rows[0].line, message: `${plan.name}: ${error instanceof Error ? error.message : "couldn't be created"}` });
      }
    }

    for (const plan of updates) {
      try {
        await this.applyUpdate(websiteId, plan, categoryId(plan.category), actor);
        updated += 1;
      } catch (error) {
        failures.push({ line: plan.rows[0].row.line, message: `${plan.name}: ${error instanceof Error ? error.message : "couldn't be updated"}` });
      }
    }
    purgeShopPages(websiteId);
    return { ...summary, applied: true, created, updated, failures };
  }

  private async plan(websiteId: string, file: Express.Multer.File | undefined, actor: AuthUser) {
    await openShopForAdmin(websiteId, actor);
    if (!file) throw new AppError(400, "Choose a .csv or .xlsx file to import.", "IMPORT_FILE_REQUIRED");
    const sheet = await readSheet(file);
    if (sheet.length - 1 > IMPORT_MAX_ROWS) {
      throw new AppError(400, `A file can have up to ${IMPORT_MAX_ROWS.toLocaleString("en-IN")} rows. Split it into smaller files.`, "IMPORT_TOO_MANY_ROWS");
    }
    const { rows, issues } = parseImportRows(sheet);

    const [variants, products, categoryRows] = await Promise.all([
      prisma.productVariant.findMany({
        where: { product: { websiteId } },
        select: { id: true, name: true, sku: true, barcode: true, pricePaise: true, costPaise: true, quantity: true, productId: true },
      }),
      prisma.product.findMany({ where: { websiteId }, select: { id: true, name: true } }),
      prisma.shopCategory.findMany({ where: { websiteId }, select: { id: true, name: true } }),
    ]);
    const productNames = new Map(products.map((product) => [product.id, product.name]));
    const existingByName = new Map(products.map((product) => [product.name.trim().toLowerCase(), product.name]));
    const bySku = new Map<string, ExistingVariant[]>();
    for (const variant of variants) {
      if (!variant.sku) continue;
      const key = variant.sku.toLowerCase();
      bySku.set(key, [...(bySku.get(key) ?? []), variant]);
    }
    const barcodeOwner = new Map(variants.filter((v) => v.barcode).map((v) => [v.barcode!, v]));

    // SKUs and barcodes must be unique within the file.
    const fileSkus = new Map<string, number>();
    const fileBarcodes = new Map<string, number>();
    const usable: ImportRow[] = [];
    for (const row of rows) {
      let ok = true;
      if (row.sku) {
        const earlier = fileSkus.get(row.sku.toLowerCase());
        if (earlier !== undefined) {
          issues.push({ line: row.line, message: `SKU ${row.sku} is also on row ${earlier}` });
          ok = false;
        } else fileSkus.set(row.sku.toLowerCase(), row.line);
      }
      if (row.barcode) {
        const earlier = fileBarcodes.get(row.barcode);
        if (earlier !== undefined) {
          issues.push({ line: row.line, message: `Barcode ${row.barcode} is also on row ${earlier}` });
          ok = false;
        } else fileBarcodes.set(row.barcode, row.line);
      }
      if (ok) usable.push(row);
    }

    // Split rows into updates (SKU already in the shop) and new products (grouped by name).
    const updates = new Map<string, UpdatePlan>();
    const newGroups = new Map<string, ImportRow[]>();
    for (const row of usable) {
      const matches = row.sku ? bySku.get(row.sku.toLowerCase()) : undefined;
      if (matches && matches.length > 1) {
        issues.push({ line: row.line, message: `SKU ${row.sku} is used by more than one existing variant, so it can't be matched` });
        continue;
      }
      if (matches) {
        const variant = matches[0];
        if (row.barcode && barcodeOwner.get(row.barcode) && barcodeOwner.get(row.barcode)!.id !== variant.id) {
          const owner = barcodeOwner.get(row.barcode)!;
          issues.push({ line: row.line, message: `Barcode ${row.barcode} is already used by ${productNames.get(owner.productId)} (${owner.name})` });
          continue;
        }
        const plan = updates.get(variant.productId) ?? {
          productId: variant.productId,
          name: productNames.get(variant.productId) ?? row.name,
          rows: [],
          category: null,
        };
        plan.rows.push({ row, variant });
        updates.set(variant.productId, plan);
        continue;
      }
      if (!row.name) {
        issues.push({ line: row.line, message: `SKU ${row.sku} isn't in the shop yet, so this row needs a Product name` });
        continue;
      }
      const key = row.name.trim().toLowerCase();
      newGroups.set(key, [...(newGroups.get(key) ?? []), row]);
    }
    for (const plan of updates.values()) plan.category = firstValue(plan.rows.map((r) => r.row), (row) => row.category);

    const creates: CreatePlan[] = [];
    for (const [key, group] of newGroups) {
      const at = group[0].line;
      if (existingByName.has(key)) {
        issues.push({
          line: at,
          message: `“${existingByName.get(key)}” already exists. To update it, fill in the SKU of each variant; new variants for an existing product are added in the product form.`,
        });
        continue;
      }
      const missingPrice = group.filter((row) => row.pricePaise === null || row.costPaise === null);
      if (missingPrice.length > 0) {
        for (const row of missingPrice) issues.push({ line: row.line, message: "New products need both Price and Base price" });
        continue;
      }
      const barcodeClash = group.find((row) => row.barcode && barcodeOwner.has(row.barcode));
      if (barcodeClash) {
        const owner = barcodeOwner.get(barcodeClash.barcode!)!;
        issues.push({ line: barcodeClash.line, message: `Barcode ${barcodeClash.barcode} is already used by ${productNames.get(owner.productId)} (${owner.name})` });
        continue;
      }
      const built = buildOptionSets(group);
      if ("error" in built) {
        issues.push({ line: at, message: `${group[0].name}: ${built.error}` });
        continue;
      }
      try {
        expandOptionSets(built.sets);
      } catch (error) {
        issues.push({ line: at, message: `${group[0].name}: ${error instanceof Error ? error.message : "invalid variants"}` });
        continue;
      }
      creates.push({
        name: group[0].name,
        rows: group,
        category: firstValue(group, (row) => row.category),
        input: {
          name: group[0].name,
          description: firstValue(group, (row) => row.description) ?? undefined,
          listed: firstValue(group, (row) => row.listed) ?? true,
          gstPercent: firstValue(group, (row) => row.gstPercent),
          optionSets: built.sets,
        },
      });
    }

    if (products.length + creates.length > MAX_PRODUCTS) {
      issues.push({
        line: null,
        message: `A shop can have up to ${MAX_PRODUCTS} products. You have ${products.length}, and this file adds ${creates.length}.`,
      });
    }

    const categories = new Map(categoryRows.map((category) => [category.name.toLowerCase(), category.id]));
    const newCategories = new Map<string, string>();
    for (const name of [...creates.map((c) => c.category), ...[...updates.values()].map((u) => u.category)]) {
      if (name && !categories.has(name.toLowerCase()) && !newCategories.has(name.toLowerCase())) newCategories.set(name.toLowerCase(), name);
    }
    if (categoryRows.length + newCategories.size > MAX_CATEGORIES) {
      issues.push({ line: null, message: `A shop can have up to ${MAX_CATEGORIES} categories; this file would add ${newCategories.size} more.` });
    }

    issues.sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
    const items: ImportPreviewItem[] = [
      ...creates.map((plan) => ({ action: "create" as const, name: plan.name, variants: plan.rows.length, lines: plan.rows.map((r) => r.line) })),
      ...[...updates.values()].map((plan) => ({
        action: "update" as const,
        name: plan.name,
        variants: plan.rows.length,
        lines: plan.rows.map((r) => r.row.line),
      })),
    ];
    const summary: ImportSummary = {
      rows: sheet.length - 1,
      createProducts: creates.length,
      createVariants: creates.reduce((sum, plan) => sum + plan.rows.length, 0),
      updateProducts: updates.size,
      updateVariants: [...updates.values()].reduce((sum, plan) => sum + plan.rows.length, 0),
      newCategories: [...newCategories.values()],
      issues,
      items,
    };
    return { summary, creates, updates: [...updates.values()], categories };
  }

  /** Applies price, base price, barcode and product details through the product form's save, then sets stock. */
  private async applyUpdate(websiteId: string, plan: UpdatePlan, categoryId: string | null | undefined, actor: AuthUser): Promise<void> {
    const product = await prisma.product.findFirstOrThrow({ where: { id: plan.productId, websiteId } });
    const rows = plan.rows.map((r) => r.row);
    const sets = readOptionSets(product.optionSets);
    let changed = false;

    for (const { row, variant } of plan.rows) {
      for (const set of sets) {
        const combo = setCombos(set as ShopOptionSetInput).find((c) => c.label.toLowerCase() === variant.name.toLowerCase());
        if (!combo) continue;
        if (row.pricePaise !== null && row.pricePaise !== variant.pricePaise) {
          set.overrides = setEntry(set.overrides, combo.key, row.pricePaise === set.pricePaise ? null : { key: combo.key, pricePaise: row.pricePaise });
          changed = true;
        }
        if (row.costPaise !== null && row.costPaise !== variant.costPaise) {
          set.costOverrides = setEntry(set.costOverrides, combo.key, row.costPaise === set.costPaise ? null : { key: combo.key, costPaise: row.costPaise });
          changed = true;
        }
        if (row.barcode && row.barcode !== variant.barcode) {
          set.barcodes = setEntry(set.barcodes, combo.key, { key: combo.key, barcode: row.barcode });
          changed = true;
        }
        break;
      }
    }

    const description = firstValue(rows, (row) => row.description);
    const gstPercent = firstValue(rows, (row) => row.gstPercent);
    const listed = firstValue(rows, (row) => row.listed);
    if (categoryId !== undefined && categoryId !== product.categoryId) changed = true;
    if (description !== null && description !== product.description) changed = true;
    if (gstPercent !== null && gstPercent !== product.gstPercent) changed = true;
    if (listed !== null && listed !== product.listed) changed = true;

    if (changed) {
      const image = (list: { mediaId: string; alt: string }[]) => list.map(({ mediaId, alt }) => ({ mediaId, alt }));
      await shopService.updateProduct(
        websiteId,
        product.id,
        {
          name: product.name,
          description: description ?? product.description ?? undefined,
          categoryId: categoryId !== undefined ? categoryId : product.categoryId,
          listed: listed ?? product.listed,
          gstPercent: gstPercent ?? product.gstPercent,
          priceIncludesGst: product.priceIncludesGst,
          returnsEnabled: product.returnsEnabled,
          returnDays: product.returnDays,
          images: image(readImages(product.images)),
          optionSets: sets.map((set) => ({
            ...set,
            costPaise: set.costPaise as number,
            options: set.options.map((option) => ({
              ...option,
              images: option.images?.map((group) => ({ value: group.value, images: image(group.images) })),
            })),
            images: set.images?.map((group) => ({ key: group.key, images: image(group.images) })),
          })),
        },
        actor,
      );
    }

    // Variants are re-created on save, so find them again by name before setting stock.
    const current = await prisma.productVariant.findMany({ where: { productId: product.id }, select: { id: true, name: true } });
    const idByName = new Map(current.map((variant) => [variant.name.toLowerCase(), variant.id]));
    await this.setStock(
      websiteId,
      actor,
      plan.rows.flatMap(({ row, variant }) => {
        const id = idByName.get(variant.name.toLowerCase());
        return id ? [{ variantId: id, stock: row.stock }] : [];
      }),
    );
  }

  /** Sets on-hand stock to the sheet's numbers, logging each change in the stock history. */
  private async setStock(websiteId: string, actor: AuthUser, targets: { variantId: string; stock: number | null }[]): Promise<void> {
    const wanted = targets.filter((target): target is { variantId: string; stock: number } => target.stock !== null);
    if (wanted.length === 0) return;
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: wanted.map((t) => t.variantId) }, product: { websiteId } },
      select: { id: true, name: true, quantity: true, product: { select: { id: true, name: true, clientId: true } } },
    });
    const stockById = new Map(wanted.map((t) => [t.variantId, t.stock]));
    const changes = variants.filter((variant) => stockById.get(variant.id) !== variant.quantity);
    if (changes.length === 0) return;
    await prisma.$transaction(async (tx) => {
      for (const variant of changes) {
        const next = stockById.get(variant.id)!;
        await tx.productVariant.update({ where: { id: variant.id }, data: { quantity: next } });
        await tx.inventoryMovement.create({
          data: {
            websiteId,
            clientId: variant.product.clientId,
            productId: variant.product.id,
            variantId: variant.id,
            productName: variant.product.name,
            variantName: variant.name,
            delta: next - variant.quantity,
            quantityAfter: next,
            note: STOCK_NOTE,
            userId: actor.id,
          },
        });
      }
    });
  }
}

export const shopProductImportService = new ShopProductImportService();
