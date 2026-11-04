import { AppError } from "../../../common/errors/AppError.js";
import { env } from "../../../config/env.js";
import { prisma } from "../../../config/prisma.js";
import {
  isShopInvoiceLayout,
  renderShopInvoiceHtml,
} from "../utils/shop-invoice-layouts.js";

function mediaUrl(id: string | null | undefined): string | null {
  return id ? `${env.API_PUBLIC_URL}/api/media/files/${id}` : null;
}

function formatDate(iso: Date | null | undefined): string | null {
  if (!iso) return null;
  return iso.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function addressLines(address: unknown): string[] {
  if (!address || typeof address !== "object" || Array.isArray(address)) return [];
  const row = address as Record<string, unknown>;
  const line1 = typeof row.line1 === "string" ? row.line1.trim() : "";
  const line2 = typeof row.line2 === "string" ? row.line2.trim() : "";
  const city = typeof row.city === "string" ? row.city.trim() : "";
  const state = typeof row.state === "string" ? row.state.trim() : "";
  const postalCode = typeof row.postalCode === "string" ? row.postalCode.trim() : "";
  const country = typeof row.country === "string" ? row.country.trim() : "";
  const phone = typeof row.phone === "string" ? row.phone.trim() : "";
  const cityLine = [city, state, postalCode].filter(Boolean).join(", ");
  return [line1, line2, cityLine, country, phone ? `Phone ${phone}` : ""].filter(Boolean);
}

export class ShopInvoiceService {
  async renderCustomerInvoice(websiteId: string, customerId: string, orderId: string): Promise<{
    html: string;
    filename: string;
  }> {
    const [order, website, design] = await Promise.all([
      prisma.shopOrder.findFirst({
        where: { id: orderId, websiteId, customerId },
        include: {
          items: { orderBy: { productName: "asc" } },
          customer: { select: { fullName: true, email: true } },
        },
      }),
      prisma.website.findUnique({
        where: { id: websiteId },
        select: {
          name: true,
          businessName: true,
          address: true,
          contactEmail: true,
          contactPhone: true,
          logoMediaId: true,
          shopEnabled: true,
          client: { select: { businessName: true, shopFeatureEnabled: true } },
        },
      }),
      prisma.shopInvoiceDesign.findUnique({ where: { websiteId } }),
    ]);

    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!website.client.shopFeatureEnabled || !website.shopEnabled) {
      throw new AppError(403, "Shop isn't available.", "SHOP_OFF");
    }
    if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
    if (!order.paidAt) {
      throw new AppError(400, "Invoice is available after payment.", "INVOICE_UNAVAILABLE");
    }

    const companyName =
      website.businessName?.trim() ||
      website.client.businessName?.trim() ||
      website.name.trim() ||
      "Shop";
    const companyAddress = website.address?.trim() || "";
    const layout = design && isShopInvoiceLayout(design.layout) ? design.layout : "classic";
    const showLogo = design?.showLogo ?? true;
    const logoUrl = showLogo ? mediaUrl(design?.logoMediaId ?? website.logoMediaId) : null;
    const invoiceNumber = `INV-${order.number}`;
    const statusLabel =
      order.status === "RETURNED"
        ? "Returned"
        : order.status === "CANCELLED"
          ? "Cancelled"
          : order.status === "DELIVERED"
            ? "Delivered"
            : order.status === "SHIPPED"
              ? "Shipped"
              : order.status === "PROCESSING"
                ? "Processing"
                : "Paid";
    const refundLabel =
      order.refundStatus === "PROCESSED"
        ? "Refunded"
        : order.refundStatus === "PENDING"
          ? "Refund pending"
          : order.refundStatus === "FAILED"
            ? "Refund failed"
            : null;

    const html = renderShopInvoiceHtml({
      layout,
      logoUrl,
      companyName,
      companyAddress: companyAddress || "—",
      companyEmail: website.contactEmail,
      companyPhone: website.contactPhone,
      invoiceNumber,
      orderDate: formatDate(order.createdAt) || "",
      paidAt: formatDate(order.paidAt),
      statusLabel,
      refundLabel,
      customerName: order.customer.fullName || "Customer",
      customerEmail: order.customer.email,
      shippingLines: addressLines(order.shippingAddress),
      items: order.items.map((item) => ({
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        lineTotalPaise: item.lineTotalPaise,
      })),
      totalPaise: order.totalPaise,
      currency: order.currency,
    });

    return { html, filename: `invoice-${order.number}.pdf` };
  }
}

export const shopInvoiceService = new ShopInvoiceService();
