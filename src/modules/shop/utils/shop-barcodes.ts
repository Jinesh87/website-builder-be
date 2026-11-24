import { AppError } from "../../../common/errors/AppError.js";
import { prisma } from "../../../config/prisma.js";

/**
 * A barcode must point at exactly one variant in a shop, or a scan at the till couldn't tell which
 * item was meant. Checks the product's own variants and every other product in the shop.
 */
export async function assertBarcodesFree(
  websiteId: string,
  variants: { name: string; barcode: string | null }[],
  exceptProductId?: string,
): Promise<void> {
  const seen = new Map<string, string>();
  for (const variant of variants) {
    if (!variant.barcode) continue;
    const other = seen.get(variant.barcode);
    if (other) {
      throw new AppError(409, `${other} and ${variant.name} have the same barcode (${variant.barcode}).`, "BARCODE_TAKEN");
    }
    seen.set(variant.barcode, variant.name);
  }
  if (seen.size === 0) return;

  const clash = await prisma.productVariant.findFirst({
    where: {
      barcode: { in: [...seen.keys()] },
      product: { websiteId, ...(exceptProductId ? { id: { not: exceptProductId } } : {}) },
    },
    select: { barcode: true, name: true, product: { select: { name: true } } },
  });
  if (clash) {
    const owner = clash.name === "Standard" ? clash.product.name : `${clash.product.name} (${clash.name})`;
    throw new AppError(409, `Barcode ${clash.barcode} is already used by ${owner}.`, "BARCODE_TAKEN");
  }
}
