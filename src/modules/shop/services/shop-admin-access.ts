import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import { scopeFor } from "../../websites/services/website.service.js";

/** The website, when this user may manage its shop and the shop is switched on. */
export async function openShopForAdmin(websiteId: string, actor: AuthUser) {
  const website = await prisma.website.findFirst({
    where: { id: websiteId, ...scopeFor(actor) },
    select: { id: true, shopEnabled: true, client: { select: { shopFeatureEnabled: true } } },
  });
  if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
  if (!website.client.shopFeatureEnabled) {
    throw new AppError(403, "Shop isn't available for this company yet.", "SHOP_NOT_ALLOWED");
  }
  if (!website.shopEnabled) {
    throw new AppError(403, "Turn the shop on before managing orders.", "SHOP_OFF");
  }
  return website;
}

/** Like {@link openShopForAdmin}, and the shop owner has turned the POS till on in shop settings. */
export async function openPosForAdmin(websiteId: string, actor: AuthUser) {
  const website = await openShopForAdmin(websiteId, actor);
  const { shopPosEnabled } = await prisma.website.findUniqueOrThrow({
    where: { id: websiteId },
    select: { shopPosEnabled: true },
  });
  if (!shopPosEnabled) {
    throw new AppError(403, "Turn on POS in the shop settings to sell in store.", "POS_OFF");
  }
  return website;
}
