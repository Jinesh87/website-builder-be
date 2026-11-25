import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import {
  Prisma,
  ShopOrderChannel,
  ShopOrderStatus,
  ShopPosPaymentMethod,
  type ShopOrder,
} from "../../../generated/prisma/client.js";
import type { RazorpayAuth } from "../../wallet/services/razorpay.client.js";
import { PAYMENT_CURRENCY } from "../../wallet/services/wallet.service.js";
import type {
  PosCatalog,
  PosPaymentMethodLabel,
  PosQrState,
  PosSaleInput,
  PosSaleResult,
} from "../types/shop-pos.types.js";
import type { PosCustomerDetails } from "../utils/shop-order-buyer.js";
import { nextOrderNumber, priceOrderLine } from "../utils/shop-order-pricing.js";
import { recordOrderStatusEvent } from "../utils/shop-order-timeline.js";
import { razorpayErrorMessage, recordPaymentLog } from "../utils/shop-payment-log.js";
import {
  getReservedQty,
  releaseStockForOrder,
  reserveStockForOrder,
  SHOP_STOCK_HOLD_TTL_SECONDS,
} from "../utils/shop-stock-hold.js";
import { closeQr, createUpiQr, fetchQr, fetchQrPayments } from "./razorpay-qr.client.js";
import { openPosForAdmin, openShopForAdmin } from "./shop-admin-access.js";
import { purgeShopPages } from "./shop-cache.js";
import { deductStockOnce, shopCheckoutService } from "./shop-checkout.service.js";
import { ORDER_VIEW_INCLUDE, toView } from "./shop-order-view.js";
import { readImages, readOptionSets, variantPhotos } from "./shop.service.js";
import { shopRazorpayAuth } from "./shop-razorpay-auth.js";

const METHOD_FROM_LABEL: Record<PosPaymentMethodLabel, ShopPosPaymentMethod> = {
  cash: ShopPosPaymentMethod.CASH,
  upi: ShopPosPaymentMethod.UPI,
  card: ShopPosPaymentMethod.CARD,
  razorpay_qr: ShopPosPaymentMethod.RAZORPAY_QR,
};

const METHOD_NAME: Record<ShopPosPaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  RAZORPAY_QR: "Razorpay UPI QR",
};

/** Razorpay won't take less than ₹1. */
const MIN_RAZORPAY_PAISE = 100;
const MAX_CATALOG_PRODUCTS = 1000;

type PricedLine = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  onHand: number;
  /** Base (cost) price per unit, snapshotted onto the order item. */
  unitCostPaise: number | null;
  pricing: ReturnType<typeof priceOrderLine>;
};

type PosOrder = Prisma.ShopOrderGetPayload<{ include: typeof ORDER_VIEW_INCLUDE }>;

function cleanText(value: string | undefined | null, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function loadPosOrder(websiteId: string, orderId: string): Promise<PosOrder> {
  const order = await prisma.shopOrder.findFirst({
    where: { id: orderId, websiteId, channel: ShopOrderChannel.POS },
    include: ORDER_VIEW_INCLUDE,
  });
  if (!order) throw new AppError(404, "Sale not found.", "ORDER_NOT_FOUND");
  return order;
}

function qrExpiresAt(order: Pick<ShopOrder, "createdAt">): Date {
  return new Date(order.createdAt.getTime() + SHOP_STOCK_HOLD_TTL_SECONDS * 1000);
}

function qrStateOf(order: Pick<ShopOrder, "status" | "paidAt" | "failureReason">): PosQrState {
  if (order.paidAt) return "paid";
  if (order.status === ShopOrderStatus.PENDING) return "waiting";
  return order.failureReason?.startsWith("QR expired") ? "expired" : "cancelled";
}

export class ShopPosService {
  /** Everything the till can sell, with live availability (stock minus online checkout holds). */
  async catalog(websiteId: string, actor: AuthUser): Promise<PosCatalog> {
    await openPosForAdmin(websiteId, actor);
    const [products, website, paymentConfig] = await Promise.all([
      prisma.product.findMany({
        where: { websiteId },
        orderBy: { name: "asc" },
        take: MAX_CATALOG_PRODUCTS,
        include: {
          category: { select: { id: true, name: true } },
          variants: { orderBy: { sortOrder: "asc" } },
        },
      }),
      prisma.website.findUnique({
        where: { id: websiteId },
        select: { shopGstPercent: true, shopPriceIncludesGst: true },
      }),
      prisma.shopPaymentConfig.findUnique({
        where: { websiteId },
        select: { razorpayKeyId: true, oauthAccessTokenCipher: true },
      }),
    ]);

    const variantIds = products.flatMap((product) => product.variants.map((variant) => variant.id));
    const reserved = new Map(
      await Promise.all(variantIds.map(async (id) => [id, await getReservedQty(websiteId, id)] as const)),
    );

    const categories = new Map<string, string>();
    const catalog = products
      .filter((product) => product.variants.length > 0)
      .map((product) => {
        if (product.category) categories.set(product.category.id, product.category.name);
        const optionSets = readOptionSets(product.optionSets);
        const variants = product.variants.map((variant) => {
          const pricing = priceOrderLine(product, website ?? {}, variant.pricePaise, 1);
          return {
            id: variant.id,
            name: variant.name,
            sku: variant.sku,
            barcode: variant.barcode,
            imageUrl: variantPhotos(variant, optionSets)[0]?.url ?? null,
            unitPaise: pricing.unitPayable,
            gstPercent: pricing.gst.gstPercent,
            available: Math.max(0, variant.quantity - (reserved.get(variant.id) ?? 0)),
          };
        });
        // Product photo first; otherwise a variant's, preferring one that's in stock.
        const variantPhoto =
          variants.find((variant) => variant.imageUrl && variant.available > 0)?.imageUrl ??
          variants.find((variant) => variant.imageUrl)?.imageUrl ??
          null;
        return {
          id: product.id,
          name: product.name,
          categoryId: product.category?.id ?? null,
          categoryName: product.category?.name ?? null,
          imageUrl: readImages(product.images)[0]?.url ?? variantPhoto,
          listed: product.listed,
          variants,
        };
      });

    return {
      products: catalog,
      categories: [...categories].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
      razorpayQrAvailable: Boolean(paymentConfig?.razorpayKeyId || paymentConfig?.oauthAccessTokenCipher),
    };
  }

  /**
   * Rings up a sale. Cash/UPI/card sales are recorded as paid and handed over, with stock taken now.
   * Razorpay QR sales hold the stock and wait for the payment ({@link checkQr}).
   */
  async createSale(websiteId: string, input: PosSaleInput, actor: AuthUser): Promise<PosSaleResult> {
    await openPosForAdmin(websiteId, actor);
    const method = METHOD_FROM_LABEL[input.payment.method];
    const lines = await this.priceLines(websiteId, input.items);

    const listAmountPaise = lines.reduce((sum, line) => sum + line.pricing.lineTotal, 0);
    const discountPaise = discountOf(input.discount, listAmountPaise);
    const totalPaise = listAmountPaise - discountPaise;

    const cashReceivedPaise = method === ShopPosPaymentMethod.CASH ? (input.payment.cashReceivedPaise ?? totalPaise) : null;
    if (cashReceivedPaise != null && cashReceivedPaise < totalPaise) {
      throw new AppError(400, "Cash received is less than the total.", "CASH_SHORT");
    }

    let auth: RazorpayAuth | null = null;
    if (method === ShopPosPaymentMethod.RAZORPAY_QR) {
      if (totalPaise < MIN_RAZORPAY_PAISE) {
        throw new AppError(400, "Razorpay needs a total of at least ₹1. Take this one in cash.", "AMOUNT_TOO_LOW");
      }
      auth = await shopRazorpayAuth(websiteId);
      if (!auth) {
        throw new AppError(400, "Connect Razorpay in the shop's payment settings to take QR payments.", "PAYMENTS_NOT_CONFIGURED");
      }
    }

    const customer = await this.resolveCustomer(websiteId, input.customer);
    const { clientId } = await prisma.website.findUniqueOrThrow({ where: { id: websiteId }, select: { clientId: true } });
    const base = {
      websiteId,
      clientId,
      customerId: customer.customerId,
      posCustomer: customer.details ? (customer.details as Prisma.InputJsonValue) : Prisma.JsonNull,
      channel: ShopOrderChannel.POS,
      posPaymentMethod: method,
      posCashReceivedPaise: cashReceivedPaise,
      posPaymentReference: cleanText(input.payment.reference, 100),
      posCashierId: actor.id,
      currency: PAYMENT_CURRENCY,
      totalPaise,
      ...(discountPaise > 0 ? { listAmountPaise, discountPaise } : {}),
      items: {
        create: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          productName: line.productName,
          variantName: line.variantName,
          unitPricePaise: line.pricing.unitPayable,
          quantity: line.quantity,
          lineTotalPaise: line.pricing.lineTotal,
          gstPercent: line.pricing.gst.gstPercent,
          priceIncludesGst: line.pricing.gst.priceIncludesGst,
          taxablePaise: line.pricing.taxablePaise,
          gstPaise: line.pricing.gstPaise,
          unitCostPaise: line.unitCostPaise,
        })),
      },
    } satisfies Omit<Prisma.ShopOrderUncheckedCreateInput, "number">;

    if (method !== ShopPosPaymentMethod.RAZORPAY_QR) {
      const orderId = await this.recordPaidSale(base, METHOD_NAME[method], actor);
      purgeShopPages(websiteId);
      logger.info({ websiteId, orderId, method, totalPaise }, "POS sale recorded");
      return { order: toView(await loadPosOrder(websiteId, orderId)), qr: null };
    }
    return this.startQrSale(base, lines, auth!);
  }

  /** Polled by the till while the QR is on screen. Completes, expires or keeps waiting. */
  async checkQr(websiteId: string, orderId: string, actor: AuthUser): Promise<PosSaleResult> {
    await openShopForAdmin(websiteId, actor);
    const order = await loadPosOrder(websiteId, orderId);
    if (order.posPaymentMethod !== ShopPosPaymentMethod.RAZORPAY_QR || !order.razorpayQrCodeId) {
      throw new AppError(400, "This sale isn't a Razorpay QR sale.", "NOT_QR_SALE");
    }
    if (order.status === ShopOrderStatus.PENDING) {
      const auth = await shopRazorpayAuth(websiteId);
      if (auth) {
        const paid = await this.findQrPayment(auth, order.razorpayQrCodeId, order.totalPaise);
        if (paid) {
          await this.completeQrSale(order.id, paid);
        } else if (Date.now() >= qrExpiresAt(order).getTime()) {
          await this.endQrSale(order, auth, "QR expired before payment", actor.id);
        }
      }
    }
    return this.qrResult(websiteId, orderId);
  }

  /** The cashier gives up on the QR. If the customer paid meanwhile, the sale completes instead. */
  async cancelQrSale(websiteId: string, orderId: string, actor: AuthUser): Promise<PosSaleResult> {
    await openShopForAdmin(websiteId, actor);
    const order = await loadPosOrder(websiteId, orderId);
    if (order.status === ShopOrderStatus.PENDING && order.razorpayQrCodeId) {
      const auth = await shopRazorpayAuth(websiteId);
      const paid = auth ? await this.findQrPayment(auth, order.razorpayQrCodeId, order.totalPaise) : null;
      if (paid) await this.completeQrSale(order.id, paid);
      else await this.endQrSale(order, auth, "Cancelled at the till", actor.id);
    }
    return this.qrResult(websiteId, orderId);
  }

  /** Razorpay `qr_code.credited` webhook: the backup for a till that stopped polling. */
  async applyQrCredited(websiteId: string, qrCodeId: string, paymentId: string | undefined): Promise<boolean> {
    const order = await prisma.shopOrder.findFirst({
      where: { websiteId, razorpayQrCodeId: qrCodeId, channel: ShopOrderChannel.POS },
      select: { id: true, totalPaise: true, status: true },
    });
    if (!order) return false;
    if (order.status !== ShopOrderStatus.PENDING) return true;
    let id = paymentId;
    if (!id) {
      const auth = await shopRazorpayAuth(websiteId);
      id = auth ? ((await this.findQrPayment(auth, qrCodeId, order.totalPaise)) ?? undefined) : undefined;
    }
    if (!id) return false;
    await this.completeQrSale(order.id, id);
    return true;
  }

  private async qrResult(websiteId: string, orderId: string): Promise<PosSaleResult> {
    const order = await loadPosOrder(websiteId, orderId);
    return {
      order: toView(order),
      qr: { imageUrl: null, expiresAt: qrExpiresAt(order).toISOString(), state: qrStateOf(order) },
    };
  }

  /** Prices the cart and checks stock; duplicate variants are merged. */
  private async priceLines(websiteId: string, items: PosSaleInput["items"]): Promise<PricedLine[]> {
    const quantities = new Map<string, number>();
    for (const item of items) quantities.set(item.variantId, (quantities.get(item.variantId) ?? 0) + item.quantity);

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: [...quantities.keys()] }, product: { websiteId } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            gstPercent: true,
            priceIncludesGst: true,
            website: { select: { shopGstPercent: true, shopPriceIncludesGst: true } },
          },
        },
      },
    });
    if (variants.length !== quantities.size) {
      throw new AppError(400, "An item in the cart is no longer for sale. Refresh the products.", "VARIANT_NOT_FOUND");
    }

    const lines: PricedLine[] = [];
    for (const variant of variants) {
      const quantity = quantities.get(variant.id)!;
      const available = variant.quantity - (await getReservedQty(websiteId, variant.id));
      if (quantity > available) {
        const label = `${variant.product.name} (${variant.name})`;
        throw new AppError(
          400,
          available > 0 ? `Only ${available} of ${label} available.` : `${label} is out of stock.`,
          "INSUFFICIENT_STOCK",
        );
      }
      lines.push({
        productId: variant.product.id,
        variantId: variant.id,
        productName: variant.product.name,
        variantName: variant.name,
        quantity,
        onHand: variant.quantity,
        unitCostPaise: variant.costPaise,
        pricing: priceOrderLine(variant.product, variant.product.website, variant.pricePaise, quantity),
      });
    }
    return lines;
  }

  /** Links an existing shop account (picked, or matched by email); otherwise keeps the typed walk-in details. */
  private async resolveCustomer(
    websiteId: string,
    input: PosSaleInput["customer"],
  ): Promise<{ customerId: string | null; details: PosCustomerDetails | null }> {
    const details: PosCustomerDetails = {
      name: cleanText(input?.name, 120),
      phone: cleanText(input?.phone, 32),
      email: cleanText(input?.email, 255)?.toLowerCase() ?? null,
    };
    const hasDetails = Boolean(details.name || details.phone || details.email);

    if (input?.customerId) {
      const account = await prisma.shopCustomer.findFirst({
        where: { id: input.customerId, websiteId },
        select: { id: true },
      });
      if (!account) throw new AppError(400, "That customer wasn't found in this shop.", "CUSTOMER_NOT_FOUND");
      return { customerId: account.id, details: hasDetails ? details : null };
    }
    if (details.email) {
      const account = await prisma.shopCustomer.findUnique({
        where: { websiteId_email: { websiteId, email: details.email } },
        select: { id: true },
      });
      if (account) return { customerId: account.id, details };
    }
    return { customerId: null, details: hasDetails ? details : null };
  }

  /** Cash/UPI/card: one transaction creates the sale, takes the stock and records it as handed over. */
  private async recordPaidSale(
    base: Omit<Prisma.ShopOrderUncheckedCreateInput, "number">,
    methodName: string,
    actor: AuthUser,
  ): Promise<string> {
    const now = new Date();
    for (let attempt = 1; ; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const order = await tx.shopOrder.create({
            data: {
              ...base,
              number: await nextOrderNumber(tx, base.websiteId),
              status: ShopOrderStatus.DELIVERED,
              paidAt: now,
            },
            select: { id: true },
          });
          await deductStockOnce(tx, order.id, actor.id);
          await recordOrderStatusEvent(tx, {
            orderId: order.id,
            status: ShopOrderStatus.PAID,
            actorType: "CLIENT",
            note: `POS sale paid by ${methodName}`,
            userId: actor.id,
          });
          await recordOrderStatusEvent(tx, {
            orderId: order.id,
            status: ShopOrderStatus.DELIVERED,
            actorType: "CLIENT",
            note: "Handed over at the counter",
            userId: actor.id,
          });
          return order.id;
        });
      } catch (error) {
        // Two sales took the same order number at once: try again with the next one.
        if (isUniqueViolation(error) && attempt < 3) continue;
        throw error;
      }
    }
  }

  /** Razorpay QR: creates the pending sale, holds its stock and shows a single-use QR for the exact total. */
  private async startQrSale(
    base: Omit<Prisma.ShopOrderUncheckedCreateInput, "number">,
    lines: PricedLine[],
    auth: RazorpayAuth,
  ): Promise<PosSaleResult> {
    const websiteId = base.websiteId;
    let orderId: string | null = null;
    for (let attempt = 1; !orderId; attempt++) {
      try {
        orderId = await prisma.$transaction(async (tx) => {
          const order = await tx.shopOrder.create({
            data: { ...base, number: await nextOrderNumber(tx, websiteId), status: ShopOrderStatus.PENDING },
            select: { id: true },
          });
          await recordOrderStatusEvent(tx, {
            orderId: order.id,
            status: ShopOrderStatus.PENDING,
            actorType: "CLIENT",
            note: "POS sale — waiting for Razorpay QR payment",
            userId: base.posCashierId ?? null,
          });
          return order.id;
        });
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 3) continue;
        throw error;
      }
    }

    const order = await prisma.shopOrder.findUniqueOrThrow({ where: { id: orderId } });
    const fail = async (reason: string) => {
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: { status: ShopOrderStatus.FAILED, failureReason: reason },
      });
      await releaseStockForOrder(websiteId, order.id, lines);
    };

    const hold = await reserveStockForOrder(
      websiteId,
      order.id,
      lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity, productName: line.productName })),
      new Map(lines.map((line) => [line.variantId, line.onHand])),
    ).catch(async (error: unknown) => {
      await fail("Could not hold stock");
      throw error;
    });
    if (!hold.ok) {
      await fail("Stock held by an online checkout");
      throw new AppError(400, `${hold.productName} is being bought online right now. Try again shortly.`, "STOCK_HELD");
    }

    const website = await prisma.website.findUniqueOrThrow({
      where: { id: websiteId },
      select: { name: true, businessName: true },
    });
    let qr;
    try {
      qr = await createUpiQr(auth, {
        amountPaise: order.totalPaise,
        name: website.businessName?.trim() || website.name,
        description: `POS sale #${order.number}`,
        closeBy: qrExpiresAt(order),
        notes: { purpose: "shop_pos_sale", websiteId, shopOrderId: order.id },
      });
    } catch (error) {
      void recordPaymentLog({
        websiteId,
        orderId: order.id,
        kind: "order_created",
        success: false,
        amountPaise: order.totalPaise,
        message: `POS QR not created: ${razorpayErrorMessage(error)}`,
      });
      await fail("Could not create Razorpay QR");
      throw error;
    }
    void recordPaymentLog({
      websiteId,
      orderId: order.id,
      kind: "order_created",
      success: true,
      amountPaise: order.totalPaise,
      razorpayRef: qr.id,
      message: `POS sale #${order.number}: QR shown.`,
    });
    await prisma.shopOrder.update({ where: { id: order.id }, data: { razorpayQrCodeId: qr.id } });

    return {
      order: toView(await loadPosOrder(websiteId, order.id)),
      qr: { imageUrl: qr.image_url, expiresAt: qrExpiresAt(order).toISOString(), state: "waiting" },
    };
  }

  /** The captured QR payment's id once the full amount has arrived, else null. */
  private async findQrPayment(auth: RazorpayAuth, qrId: string, totalPaise: number): Promise<string | null> {
    try {
      const qr = await fetchQr(auth, qrId);
      if (qr.payments_amount_received < totalPaise) return null;
      const payments = await fetchQrPayments(auth, qrId);
      return payments.find((payment) => payment.status === "captured")?.id ?? null;
    } catch (error) {
      logger.warn({ err: error, qrId }, "POS QR status check failed");
      return null;
    }
  }

  /** Marks the QR sale paid (shared checkout logic: stock, refund on sell-out) and hands it over. */
  private async completeQrSale(orderId: string, paymentId: string): Promise<void> {
    const paid = await shopCheckoutService.markPaid(orderId, paymentId);
    const handedOver = await prisma.shopOrder.updateMany({
      where: { id: paid.id, status: ShopOrderStatus.PAID },
      data: { status: ShopOrderStatus.DELIVERED },
    });
    if (handedOver.count > 0) {
      await recordOrderStatusEvent(prisma, {
        orderId: paid.id,
        status: ShopOrderStatus.DELIVERED,
        actorType: "SYSTEM",
        note: "Handed over at the counter",
      });
      logger.info({ websiteId: paid.websiteId, orderId: paid.id }, "POS QR sale paid");
    }
  }

  /** Closes the QR and releases the held stock. */
  private async endQrSale(order: PosOrder, auth: RazorpayAuth | null, reason: string, userId: string): Promise<void> {
    if (auth && order.razorpayQrCodeId) {
      await closeQr(auth, order.razorpayQrCodeId).catch((error: unknown) => {
        logger.warn({ err: error, orderId: order.id }, "POS QR close failed");
      });
    }
    const ended = await prisma.shopOrder.updateMany({
      where: { id: order.id, status: ShopOrderStatus.PENDING },
      data: { status: ShopOrderStatus.CANCELLED, failureReason: reason },
    });
    if (ended.count > 0) {
      await recordOrderStatusEvent(prisma, {
        orderId: order.id,
        status: ShopOrderStatus.CANCELLED,
        actorType: "CLIENT",
        note: reason,
        userId,
      });
    }
    await releaseStockForOrder(order.websiteId, order.id, order.items);
  }
}

/** Whole paise, never more than the cart. */
function discountOf(discount: PosSaleInput["discount"], listAmountPaise: number): number {
  if (!discount || discount.value <= 0) return 0;
  const amount =
    discount.type === "percent" ? Math.round((listAmountPaise * Math.min(100, discount.value)) / 100) : Math.round(discount.value);
  if (amount > listAmountPaise) {
    throw new AppError(400, "The discount is more than the cart total.", "DISCOUNT_TOO_HIGH");
  }
  return amount;
}

export const shopPosService = new ShopPosService();
