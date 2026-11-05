import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { env } from "../../../config/env.js";
import { prisma } from "../../../config/prisma.js";
import { MediaKind } from "../../../generated/prisma/client.js";
import { scopeFor } from "../../websites/services/website.service.js";
import {
  isShopInvoiceLayout,
  SHOP_INVOICE_LAYOUTS,
  type ShopInvoiceLayout,
} from "../utils/shop-invoice-layouts.js";

export { SHOP_INVOICE_LAYOUTS, type ShopInvoiceLayout };

export type ShopInvoiceLayoutOption = {
  id: ShopInvoiceLayout;
  label: string;
  description: string;
};

export type ShopInvoiceDesignView = {
  layout: ShopInvoiceLayout;
  showLogo: boolean;
  logoMediaId: string | null;
  logoUrl: string | null;
  websiteLogoUrl: string | null;
};

export type ShopInvoiceDesignInput = {
  layout: ShopInvoiceLayout;
  showLogo: boolean;
  logoMediaId?: string | null;
};

const SHOP_INVOICE_LAYOUT_META: Record<ShopInvoiceLayout, Omit<ShopInvoiceLayoutOption, "id">> = {
  classic: { label: "Classic", description: "Bordered table with taxable amount, GST % and totals." },
  minimal: { label: "Minimal", description: "Open rows with taxable amount, GST and grand total." },
  bold: { label: "Bold", description: "Dark band header with GST columns and filled titles." },
  modern: { label: "Modern", description: "Accent bar, company cards, and GST breakdown card." },
};

function mediaUrl(id: string | null | undefined): string | null {
  return id ? `${env.API_PUBLIC_URL}/api/media/files/${id}` : null;
}

function defaultDesign(websiteLogoId: string | null): ShopInvoiceDesignView {
  return {
    layout: "classic",
    showLogo: true,
    logoMediaId: null,
    logoUrl: null,
    websiteLogoUrl: mediaUrl(websiteLogoId),
  };
}

export class ShopInvoiceTemplateService {
  private async openShop(websiteId: string, actor: AuthUser) {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...scopeFor(actor) },
      select: {
        id: true,
        clientId: true,
        logoMediaId: true,
        shopEnabled: true,
        client: { select: { shopFeatureEnabled: true } },
      },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!website.client.shopFeatureEnabled) {
      throw new AppError(403, "Shop isn't available for this company yet.", "SHOP_NOT_ALLOWED");
    }
    if (!website.shopEnabled) {
      throw new AppError(403, "Turn the shop on before managing invoice templates.", "SHOP_OFF");
    }
    return website;
  }

  layouts(): ShopInvoiceLayoutOption[] {
    return SHOP_INVOICE_LAYOUTS.map((id) => ({ id, ...SHOP_INVOICE_LAYOUT_META[id] }));
  }

  async getDesign(websiteId: string, actor: AuthUser): Promise<ShopInvoiceDesignView> {
    const website = await this.openShop(websiteId, actor);
    const row = await prisma.shopInvoiceDesign.findUnique({ where: { websiteId } });
    if (!row) return defaultDesign(website.logoMediaId);
    return {
      layout: isShopInvoiceLayout(row.layout) ? row.layout : "classic",
      showLogo: row.showLogo,
      logoMediaId: row.logoMediaId,
      logoUrl: mediaUrl(row.logoMediaId),
      websiteLogoUrl: mediaUrl(website.logoMediaId),
    };
  }

  async updateDesign(websiteId: string, input: ShopInvoiceDesignInput, actor: AuthUser): Promise<ShopInvoiceDesignView> {
    const website = await this.openShop(websiteId, actor);
    if (!isShopInvoiceLayout(input.layout)) {
      throw new AppError(400, "Choose one of the invoice templates.", "INVALID_LAYOUT");
    }
    let logoMediaId: string | null = input.logoMediaId === undefined ? null : input.logoMediaId;
    if (input.logoMediaId) {
      const file = await prisma.mediaFile.findFirst({
        where: { id: input.logoMediaId, clientId: website.clientId, kind: MediaKind.IMAGE },
        select: { id: true },
      });
      if (!file) throw new AppError(400, "That logo image isn't available. Upload it again.", "LOGO_NOT_FOUND");
      logoMediaId = file.id;
    }

    const existing = await prisma.shopInvoiceDesign.findUnique({ where: { websiteId } });
    const row = existing
      ? await prisma.shopInvoiceDesign.update({
          where: { websiteId },
          data: {
            layout: input.layout,
            showLogo: input.showLogo,
            ...(input.logoMediaId !== undefined ? { logoMediaId } : {}),
          },
        })
      : await prisma.shopInvoiceDesign.create({
          data: {
            websiteId,
            clientId: website.clientId,
            layout: input.layout,
            showLogo: input.showLogo,
            logoMediaId,
          },
        });

    return {
      layout: isShopInvoiceLayout(row.layout) ? row.layout : "classic",
      showLogo: row.showLogo,
      logoMediaId: row.logoMediaId,
      logoUrl: mediaUrl(row.logoMediaId),
      websiteLogoUrl: mediaUrl(website.logoMediaId),
    };
  }
}

export const shopInvoiceTemplateService = new ShopInvoiceTemplateService();
