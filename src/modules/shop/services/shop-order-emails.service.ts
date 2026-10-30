import { randomUUID } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { MediaKind, ShopOrderStatus } from "../../../generated/prisma/client.js";
import { emailService } from "../../email/services/email.service.js";
import { scopeFor } from "../../websites/services/website.service.js";
import {
  DEFAULT_SHOP_ORDER_EMAILS,
  EMAIL_LABEL_FROM_STATUS,
  SHOP_ORDER_EMAIL_PLACEHOLDERS,
  SHOP_ORDER_EMAIL_STATUSES,
  STATUS_DISPLAY,
  STATUS_FROM_EMAIL_LABEL,
  type ShopOrderEmailStatusLabel,
} from "../utils/shop-order-email-defaults.js";
import {
  isShopOrderEmailLayout,
  normalizeAccentColor,
  renderShopOrderEmail,
  SHOP_ORDER_EMAIL_LAYOUT_META,
  SHOP_ORDER_EMAIL_LAYOUTS,
  type ShopOrderEmailLayout,
} from "../utils/shop-order-email-layouts.js";

export type ShopOrderEmailTemplateView = {
  status: ShopOrderEmailStatusLabel;
  statusLabel: string;
  enabled: boolean;
  subject: string;
  heading: string;
  message: string;
  isDefault: boolean;
  updatedAt: string | null;
};

export type ShopOrderEmailTemplateInput = {
  enabled: boolean;
  subject: string;
  heading: string;
  message: string;
};

export type ShopOrderEmailDesignView = {
  layout: ShopOrderEmailLayout;
  accentColor: string;
  showLogo: boolean;
  logoMediaId: string | null;
  logoUrl: string | null;
  websiteLogoUrl: string | null;
};

export type ShopOrderEmailDesignInput = {
  layout: ShopOrderEmailLayout;
  accentColor: string;
  showLogo: boolean;
  logoMediaId?: string | null;
};

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: Date): string {
  return iso.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mediaUrl(id: string | null | undefined): string | null {
  return id ? `${env.API_PUBLIC_URL}/api/media/files/${id}` : null;
}

function defaultDesign(websiteLogoId: string | null): ShopOrderEmailDesignView {
  return {
    layout: "classic",
    accentColor: "#194a7a",
    showLogo: true,
    logoMediaId: null,
    logoUrl: null,
    websiteLogoUrl: mediaUrl(websiteLogoId),
  };
}

export class ShopOrderEmailsService {
  private async openShop(websiteId: string, actor: AuthUser) {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...scopeFor(actor) },
      select: {
        id: true,
        clientId: true,
        name: true,
        businessName: true,
        logoMediaId: true,
        shopEnabled: true,
        client: { select: { shopFeatureEnabled: true, businessName: true } },
      },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!website.client.shopFeatureEnabled) {
      throw new AppError(403, "Shop isn't available for this company yet.", "SHOP_NOT_ALLOWED");
    }
    if (!website.shopEnabled) {
      throw new AppError(403, "Turn the shop on before managing order emails.", "SHOP_OFF");
    }
    return website;
  }

  placeholders() {
    return [...SHOP_ORDER_EMAIL_PLACEHOLDERS];
  }

  layouts() {
    return SHOP_ORDER_EMAIL_LAYOUTS.map((id) => ({
      id,
      label: SHOP_ORDER_EMAIL_LAYOUT_META[id].label,
      description: SHOP_ORDER_EMAIL_LAYOUT_META[id].description,
      defaultAccent: SHOP_ORDER_EMAIL_LAYOUT_META[id].defaultAccent,
    }));
  }

  async getDesign(websiteId: string, actor: AuthUser): Promise<ShopOrderEmailDesignView> {
    const website = await this.openShop(websiteId, actor);
    const row = await prisma.shopOrderEmailDesign.findUnique({ where: { websiteId } });
    if (!row) return defaultDesign(website.logoMediaId);
    return {
      layout: isShopOrderEmailLayout(row.layout) ? row.layout : "classic",
      accentColor: normalizeAccentColor(row.accentColor),
      showLogo: row.showLogo,
      logoMediaId: row.logoMediaId,
      logoUrl: mediaUrl(row.logoMediaId),
      websiteLogoUrl: mediaUrl(website.logoMediaId),
    };
  }

  async updateDesign(
    websiteId: string,
    input: ShopOrderEmailDesignInput,
    actor: AuthUser,
  ): Promise<ShopOrderEmailDesignView> {
    const website = await this.openShop(websiteId, actor);
    if (!isShopOrderEmailLayout(input.layout)) {
      throw new AppError(400, "Choose one of the email designs.", "INVALID_LAYOUT");
    }
    const accentColor = normalizeAccentColor(input.accentColor);
    let logoMediaId: string | null = input.logoMediaId === undefined ? null : input.logoMediaId;
    if (input.logoMediaId) {
      const file = await prisma.mediaFile.findFirst({
        where: { id: input.logoMediaId, clientId: website.clientId, kind: MediaKind.IMAGE },
        select: { id: true },
      });
      if (!file) throw new AppError(400, "That logo image isn't available. Upload it again.", "LOGO_NOT_FOUND");
      logoMediaId = file.id;
    }

    const existing = await prisma.shopOrderEmailDesign.findUnique({ where: { websiteId } });
    const row = existing
      ? await prisma.shopOrderEmailDesign.update({
          where: { websiteId },
          data: {
            layout: input.layout,
            accentColor,
            showLogo: input.showLogo,
            ...(input.logoMediaId !== undefined ? { logoMediaId } : {}),
          },
        })
      : await prisma.shopOrderEmailDesign.create({
          data: {
            websiteId,
            clientId: website.clientId,
            layout: input.layout,
            accentColor,
            showLogo: input.showLogo,
            logoMediaId,
          },
        });

    return {
      layout: isShopOrderEmailLayout(row.layout) ? row.layout : "classic",
      accentColor: normalizeAccentColor(row.accentColor),
      showLogo: row.showLogo,
      logoMediaId: row.logoMediaId,
      logoUrl: mediaUrl(row.logoMediaId),
      websiteLogoUrl: mediaUrl(website.logoMediaId),
    };
  }

  async list(websiteId: string, actor: AuthUser): Promise<ShopOrderEmailTemplateView[]> {
    await this.openShop(websiteId, actor);
    const rows = await prisma.shopOrderEmailTemplate.findMany({ where: { websiteId } });
    const byStatus = new Map(rows.map((row) => [row.status, row]));
    return SHOP_ORDER_EMAIL_STATUSES.map((status) => {
      const defaults = DEFAULT_SHOP_ORDER_EMAILS[status];
      const row = byStatus.get(STATUS_FROM_EMAIL_LABEL[status]);
      if (!row) {
        return {
          status,
          statusLabel: STATUS_DISPLAY[status],
          enabled: true,
          subject: defaults.subject,
          heading: defaults.heading,
          message: defaults.message,
          isDefault: true,
          updatedAt: null,
        };
      }
      return {
        status,
        statusLabel: STATUS_DISPLAY[status],
        enabled: row.enabled,
        subject: row.subject,
        heading: row.heading,
        message: row.message,
        isDefault: false,
        updatedAt: row.updatedAt.toISOString(),
      };
    });
  }

  async upsert(
    websiteId: string,
    statusLabel: ShopOrderEmailStatusLabel,
    input: ShopOrderEmailTemplateInput,
    actor: AuthUser,
  ): Promise<ShopOrderEmailTemplateView> {
    if (!SHOP_ORDER_EMAIL_STATUSES.includes(statusLabel)) {
      throw new AppError(400, "Unknown order status for email templates.", "INVALID_STATUS");
    }
    const website = await this.openShop(websiteId, actor);
    const status = STATUS_FROM_EMAIL_LABEL[statusLabel];
    const subject = input.subject.trim().replace(/[\r\n]+/g, " ");
    const heading = input.heading.trim().replace(/[\r\n]+/g, " ");
    const message = input.message.trim();
    if (!subject) throw new AppError(400, "Enter an email subject.", "SUBJECT_REQUIRED");
    if (!heading) throw new AppError(400, "Enter a title.", "HEADING_REQUIRED");
    if (!message) throw new AppError(400, "Enter a message.", "MESSAGE_REQUIRED");

    const row = await prisma.shopOrderEmailTemplate.upsert({
      where: { websiteId_status: { websiteId, status } },
      create: {
        id: randomUUID(),
        websiteId,
        clientId: website.clientId,
        status,
        enabled: input.enabled,
        subject,
        heading,
        message,
      },
      update: {
        enabled: input.enabled,
        subject,
        heading,
        message,
      },
    });

    return {
      status: statusLabel,
      statusLabel: STATUS_DISPLAY[statusLabel],
      enabled: row.enabled,
      subject: row.subject,
      heading: row.heading,
      message: row.message,
      isDefault: false,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async reset(websiteId: string, statusLabel: ShopOrderEmailStatusLabel, actor: AuthUser): Promise<ShopOrderEmailTemplateView> {
    if (!SHOP_ORDER_EMAIL_STATUSES.includes(statusLabel)) {
      throw new AppError(400, "Unknown order status for email templates.", "INVALID_STATUS");
    }
    await this.openShop(websiteId, actor);
    await prisma.shopOrderEmailTemplate.deleteMany({
      where: { websiteId, status: STATUS_FROM_EMAIL_LABEL[statusLabel] },
    });
    const defaults = DEFAULT_SHOP_ORDER_EMAILS[statusLabel];
    return {
      status: statusLabel,
      statusLabel: STATUS_DISPLAY[statusLabel],
      enabled: true,
      subject: defaults.subject,
      heading: defaults.heading,
      message: defaults.message,
      isDefault: true,
      updatedAt: null,
    };
  }

  private async resolveDesign(websiteId: string): Promise<{
    layout: ShopOrderEmailLayout;
    accentColor: string;
    logoUrl: string | null;
  }> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { logoMediaId: true },
    });
    const row = await prisma.shopOrderEmailDesign.findUnique({ where: { websiteId } });
    const layout = row && isShopOrderEmailLayout(row.layout) ? row.layout : "classic";
    const accentColor = normalizeAccentColor(row?.accentColor ?? SHOP_ORDER_EMAIL_LAYOUT_META[layout].defaultAccent);
    const showLogo = row?.showLogo ?? true;
    const logoUrl = showLogo ? mediaUrl(row?.logoMediaId ?? website?.logoMediaId ?? null) : null;
    return { layout, accentColor, logoUrl };
  }

  /**
   * Sends the customer email for this status. Never throws — checkout/admin updates must not fail on mail.
   */
  async notifyStatusChange(orderId: string, status: ShopOrderStatus): Promise<void> {
    try {
      const label = EMAIL_LABEL_FROM_STATUS[status];
      if (!SHOP_ORDER_EMAIL_STATUSES.includes(label)) return;

      const order = await prisma.shopOrder.findUnique({
        where: { id: orderId },
        include: {
          customer: { select: { email: true, fullName: true } },
          items: { orderBy: { productName: "asc" } },
          website: { select: { name: true, businessName: true, client: { select: { businessName: true } } } },
        },
      });
      if (!order?.customer.email) return;

      const stored = await prisma.shopOrderEmailTemplate.findUnique({
        where: { websiteId_status: { websiteId: order.websiteId, status } },
      });
      if (stored && !stored.enabled) return;

      const defaults = DEFAULT_SHOP_ORDER_EMAILS[label];
      const subject = stored?.subject ?? defaults.subject;
      const heading = stored?.heading ?? defaults.heading;
      const message = stored?.message ?? defaults.message;
      const design = await this.resolveDesign(order.websiteId);

      const shopName =
        order.website.businessName?.trim() ||
        order.website.client.businessName?.trim() ||
        order.website.name.trim() ||
        "Shop";
      const itemsText = order.items
        .map((item) => `${item.productName} (${item.variantName}) × ${item.quantity} — ${formatInr(item.lineTotalPaise)}`)
        .join("\n");
      const itemsHtml = escapeHtml(itemsText).replace(/\n/g, "<br/>");

      const vars: Record<string, string> = {
        customerName: order.customer.fullName || "there",
        customerEmail: order.customer.email,
        orderNumber: String(order.number),
        orderTotal: formatInr(order.totalPaise),
        orderDate: formatDate(order.createdAt),
        status: label,
        statusLabel: STATUS_DISPLAY[label],
        shopName,
        failureReason: order.failureReason?.trim() || "",
      };

      const rendered = renderShopOrderEmail({
        subject,
        heading,
        message,
        vars,
        itemsHtml,
        itemsText,
        layout: design.layout,
        accentColor: design.accentColor,
        logoUrl: design.logoUrl,
      });

      await emailService.sendRendered({
        to: order.customer.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
    } catch (error) {
      logger.warn({ err: error, orderId, status }, "Shop order status email skipped");
    }
  }
}

export const shopOrderEmailsService = new ShopOrderEmailsService();
