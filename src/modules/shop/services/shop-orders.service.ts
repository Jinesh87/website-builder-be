import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import { ShopOrderStatus } from "../../../generated/prisma/client.js";
import { recordOrderStatusEvent } from "../utils/shop-order-timeline.js";
import { openShopForAdmin } from "./shop-admin-access.js";
import { purgeShopPages } from "./shop-cache.js";
import { restoreStockOnce } from "./shop-checkout.service.js";
import { shopOrderEmailsService } from "./shop-order-emails.service.js";
import {
  LABEL_FROM_STATUS,
  ORDER_PAGE_SIZE,
  ORDER_VIEW_INCLUDE,
  STATUS_FROM_LABEL,
  toView,
  type ShopOrderPage,
  type ShopOrderStatusLabel,
  type ShopOrderView,
} from "./shop-order-view.js";
import { finishStoreCancel } from "./shop-store-cancel.js";

export type { ShopOrderItemView, ShopOrderPage, ShopOrderStatusLabel, ShopOrderView } from "./shop-order-view.js";

export type ShopOrderQuery = {
  search?: string;
  status?: ShopOrderStatusLabel;
  page?: number;
};

export class ShopOrdersService {
  async list(websiteId: string, query: ShopOrderQuery, actor: AuthUser): Promise<ShopOrderPage> {
    await openShopForAdmin(websiteId, actor);
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const search = query.search?.trim();
    const status = query.status ? STATUS_FROM_LABEL[query.status] : undefined;

    const where = {
      websiteId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              ...( /^\d+$/.test(search) ? [{ number: Number(search) }] : []),
              { customer: { fullName: { contains: search, mode: "insensitive" as const } } },
              { customer: { email: { contains: search, mode: "insensitive" as const } } },
              { razorpayPaymentId: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.shopOrder.count({ where }),
      prisma.shopOrder.findMany({
        where,
        include: ORDER_VIEW_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * ORDER_PAGE_SIZE,
        take: ORDER_PAGE_SIZE,
      }),
    ]);

    return { orders: rows.map(toView), page, pageSize: ORDER_PAGE_SIZE, total };
  }

  async get(websiteId: string, orderId: string, actor: AuthUser): Promise<ShopOrderView> {
    await openShopForAdmin(websiteId, actor);
    const order = await prisma.shopOrder.findFirst({
      where: { id: orderId, websiteId },
      include: {
        customer: { select: { id: true, fullName: true, email: true, phone: true, isGuest: true } },
        items: { orderBy: { productName: "asc" } },
        events: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!order) throw new AppError(404, "Order not found", "ORDER_NOT_FOUND");
    return toView(order);
  }

  /**
   * Client fulfillment status updates. Moving into `paid` (or any paid-or-later status)
   * deducts stock once if payment never finished that step.
   */
  async updateStatus(
    websiteId: string,
    orderId: string,
    status: ShopOrderStatusLabel,
    actor: AuthUser,
  ): Promise<ShopOrderView> {
    await openShopForAdmin(websiteId, actor);
    const nextStatus = STATUS_FROM_LABEL[status];
    const existing = await prisma.shopOrder.findFirst({
      where: { id: orderId, websiteId },
      include: { items: true },
    });
    if (!existing) throw new AppError(404, "Order not found", "ORDER_NOT_FOUND");

    const shouldDeduct =
      !existing.stockDeductedAt &&
      (nextStatus === ShopOrderStatus.PAID ||
        nextStatus === ShopOrderStatus.PROCESSING ||
        nextStatus === ShopOrderStatus.SHIPPED ||
        nextStatus === ShopOrderStatus.DELIVERED);

    const cancelling =
      nextStatus === ShopOrderStatus.CANCELLED &&
      existing.status !== ShopOrderStatus.CANCELLED &&
      existing.status !== ShopOrderStatus.RETURNED;
    let stockChanged = false;
    await prisma.$transaction(async (tx) => {
      if (shouldDeduct) {
        for (const item of existing.items) {
          if (!item.variantId) continue;
          const variant = await tx.productVariant.findFirst({
            where: { id: item.variantId, product: { websiteId } },
            select: {
              id: true,
              name: true,
              product: { select: { id: true, name: true } },
            },
          });
          if (!variant) {
            throw new AppError(400, `${item.productName} is no longer available.`, "VARIANT_NOT_FOUND");
          }
          const claimed = await tx.productVariant.updateMany({
            where: { id: variant.id, quantity: { gte: item.quantity } },
            data: { quantity: { decrement: item.quantity } },
          });
          if (claimed.count === 0) {
            throw new AppError(400, `Not enough stock for ${item.productName}.`, "INSUFFICIENT_STOCK");
          }
          const after = await tx.productVariant.findUnique({ where: { id: variant.id }, select: { quantity: true } });
          await tx.inventoryMovement.create({
            data: {
              websiteId: existing.websiteId,
              clientId: existing.clientId,
              productId: variant.product.id,
              variantId: variant.id,
              productName: variant.product.name,
              variantName: variant.name,
              delta: -item.quantity,
              quantityAfter: after?.quantity ?? 0,
              note: `Order #${existing.number}`,
              userId: actor.id,
            },
          });
        }
        stockChanged = true;
      }

      // Cancelling puts the items back into stock (once; returned items stay out under Inventory → Returned).
      if (cancelling && (await restoreStockOnce(tx, existing.id, actor.id))) stockChanged = true;

      if (existing.status !== nextStatus) {
        await tx.shopOrder.update({
          where: { id: existing.id },
          data: {
            status: nextStatus,
            ...(shouldDeduct ? { stockDeductedAt: new Date() } : {}),
            ...(nextStatus === ShopOrderStatus.PAID && !existing.paidAt ? { paidAt: new Date() } : {}),
            ...(nextStatus === ShopOrderStatus.FAILED || nextStatus === ShopOrderStatus.CANCELLED
              ? {}
              : { failureReason: null }),
          },
        });
        await recordOrderStatusEvent(tx, {
          orderId: existing.id,
          status: nextStatus,
          actorType: "CLIENT",
          note: `Status set to ${LABEL_FROM_STATUS[nextStatus]}`,
          userId: actor.id,
        });
      } else if (shouldDeduct) {
        await tx.shopOrder.update({
          where: { id: existing.id },
          data: {
            ...(shouldDeduct ? { stockDeductedAt: new Date() } : {}),
            ...(nextStatus === ShopOrderStatus.PAID && !existing.paidAt ? { paidAt: new Date() } : {}),
          },
        });
      }
    });

    if (cancelling) await finishStoreCancel(websiteId, existing, actor, stockChanged);
    if (stockChanged) purgeShopPages(websiteId);
    if (existing.status !== nextStatus) {
      void shopOrderEmailsService.notifyStatusChange(orderId, nextStatus);
    }
    return this.get(websiteId, orderId, actor);
  }

}

export const shopOrdersService = new ShopOrdersService();
