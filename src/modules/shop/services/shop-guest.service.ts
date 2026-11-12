import { randomUUID } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import { UserStatus } from "../../../common/constants/roles.js";
import { hashPassword } from "../../../common/utils/hash.js";
import { env } from "../../../config/env.js";
import { prisma } from "../../../config/prisma.js";
import { DomainStatus, Prisma, type ShopOrder } from "../../../generated/prisma/client.js";
import { mediaUrl } from "../../media/services/media.service.js";
import { effectiveGst, payableUnitPaise } from "../utils/shop-gst.js";
import { newOrderAccessToken, orderTrackUrl } from "../utils/shop-order-access.js";
import type {
  ShopAddToCartInput,
  ShopCartItemSummary,
  ShopCheckoutSession,
  ShopCustomerAddressInput,
  ShopCustomerAddressView,
  ShopOrderDetailView,
  ShopOrderSummary,
  ShopWishlistItemSummary,
} from "../types/shop-auth.types.js";
import { shopCheckoutService, type ShopCheckoutConfirmation } from "./shop-checkout.service.js";
import { shopInvoiceService } from "./shop-invoice.service.js";
import type { ShopCustomerAddress } from "../../../generated/prisma/client.js";

type GuestCheckoutInput = {
  email: string;
  fullName: string;
  phone?: string;
  address: ShopCustomerAddressInput;
  couponCode?: string;
};

type OpenGuestShop = {
  id: string;
  clientId: string;
  subdomain: string;
  name: string;
  customDomain: string | null;
};

function siteUrl(subdomain: string, customDomain: string | null): string {
  if (customDomain) return `https://${customDomain}`;
  return `${env.API_PUBLIC_URL}/live/${subdomain}`;
}

function firstImageUrl(images: Prisma.JsonValue): string | undefined {
  if (!Array.isArray(images) || images.length === 0) return undefined;
  const first = images[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return undefined;
  const mediaId = (first as { mediaId?: unknown }).mediaId;
  return typeof mediaId === "string" && mediaId ? mediaUrl(mediaId) : undefined;
}

type CartRow = {
  id: string;
  productId: string;
  quantity: number;
  product: {
    name: string;
    images: Prisma.JsonValue;
    gstPercent: number | null;
    priceIncludesGst: boolean | null;
    website: { shopGstPercent: number; shopPriceIncludesGst: boolean };
  };
  variant: { id: string; name: string; pricePaise: number; images: Prisma.JsonValue };
};

function toCartItemSummary(row: CartRow): ShopCartItemSummary {
  const unit = payableUnitPaise(row.variant.pricePaise, effectiveGst(row.product, row.product.website));
  return {
    id: row.id,
    productId: row.productId,
    variantId: row.variant.id,
    productName: row.product.name,
    variantName: row.variant.name,
    quantity: row.quantity,
    pricePaise: unit,
    imageUrl: firstImageUrl(row.variant.images) ?? firstImageUrl(row.product.images),
  };
}

const cartInclude = {
  product: {
    select: {
      id: true,
      name: true,
      images: true,
      gstPercent: true,
      priceIncludesGst: true,
      website: { select: { shopGstPercent: true, shopPriceIncludesGst: true } },
    },
  },
  variant: { select: { id: true, name: true, pricePaise: true, quantity: true, images: true } },
} as const;

const wishlistInclude = {
  product: {
    select: {
      id: true,
      name: true,
      slug: true,
      images: true,
      gstPercent: true,
      priceIncludesGst: true,
      category: { select: { name: true } },
      website: { select: { shopGstPercent: true, shopPriceIncludesGst: true } },
    },
  },
  variant: { select: { id: true, name: true, pricePaise: true, images: true } },
} as const;

function toAddressView(row: ShopCustomerAddress): ShopCustomerAddressView {
  return {
    id: row.id,
    label: row.label,
    fullName: row.fullName,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    isDefault: row.isDefault,
    email: row.email,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toWishlistSummary(row: {
  id: string;
  productId: string;
  variantId: string;
  updatedAt: Date;
  product: {
    name: string;
    slug: string;
    images: Prisma.JsonValue;
    gstPercent: number | null;
    priceIncludesGst: boolean | null;
    category: { name: string } | null;
    website: { shopGstPercent: number; shopPriceIncludesGst: boolean };
  };
  variant: { name: string; pricePaise: number; images: Prisma.JsonValue };
}): ShopWishlistItemSummary {
  const unit = payableUnitPaise(row.variant.pricePaise, effectiveGst(row.product, row.product.website));
  return {
    id: row.id,
    productId: row.productId,
    variantId: row.variantId,
    productName: row.product.name,
    variantName: row.variant.name,
    productSlug: row.product.slug,
    categoryName: row.product.category?.name ?? "",
    pricePaise: unit,
    imageUrl: firstImageUrl(row.product.images) ?? firstImageUrl(row.variant.images),
    addedAt: row.updatedAt.toISOString(),
  };
}

export class ShopGuestService {
  private async openGuestShop(websiteId: string): Promise<OpenGuestShop> {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        id: true,
        clientId: true,
        subdomain: true,
        name: true,
        shopEnabled: true,
        shopAllowGuestCheckout: true,
        client: { select: { shopFeatureEnabled: true } },
        domains: {
          where: { status: DomainStatus.ACTIVE },
          orderBy: { isPrimary: "desc" },
          select: { hostname: true },
          take: 1,
        },
      },
    });
    if (!website?.shopEnabled || !website.client.shopFeatureEnabled) {
      throw new AppError(404, "Shop is not available on this website.", "SHOP_DISABLED");
    }
    if (!website.shopAllowGuestCheckout) {
      throw new AppError(403, "Guest checkout is turned off for this shop. Please sign in.", "GUEST_CHECKOUT_DISABLED");
    }
    return {
      id: website.id,
      clientId: website.clientId,
      subdomain: website.subdomain,
      name: website.name,
      customDomain: website.domains[0]?.hostname ?? null,
    };
  }

  async listCart(websiteId: string, guestSessionId: string): Promise<ShopCartItemSummary[]> {
    await this.openGuestShop(websiteId);
    const rows = await prisma.shopCartItem.findMany({
      where: { websiteId, guestSessionId, customerId: null },
      orderBy: { updatedAt: "desc" },
      include: cartInclude,
    });
    return rows.map((row) => toCartItemSummary(row));
  }

  async addToCart(websiteId: string, guestSessionId: string, input: ShopAddToCartInput): Promise<ShopCartItemSummary[]> {
    const shop = await this.openGuestShop(websiteId);
    const quantity = Math.max(1, Math.min(99, Math.floor(input.quantity ?? 1)));
    const variant = await prisma.productVariant.findFirst({
      where: { id: input.variantId, product: { websiteId, listed: true } },
      select: {
        id: true,
        quantity: true,
        productId: true,
      },
    });
    if (!variant) throw new AppError(404, "That product is no longer available.", "VARIANT_NOT_FOUND");
    if (variant.quantity <= 0) throw new AppError(400, "This item is out of stock.", "OUT_OF_STOCK");

    const existing = await prisma.shopCartItem.findUnique({
      where: { guestSessionId_variantId: { guestSessionId, variantId: variant.id } },
      select: { id: true, quantity: true },
    });
    const nextQty = Math.min(99, (existing?.quantity ?? 0) + quantity);
    if (nextQty > variant.quantity) {
      throw new AppError(400, `Only ${variant.quantity} left in stock.`, "INSUFFICIENT_STOCK");
    }

    if (existing) {
      await prisma.shopCartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
    } else {
      await prisma.shopCartItem.create({
        data: {
          websiteId,
          clientId: shop.clientId,
          guestSessionId,
          productId: variant.productId,
          variantId: variant.id,
          quantity,
        },
      });
    }
    return this.listCart(websiteId, guestSessionId);
  }

  async updateCartItem(
    websiteId: string,
    guestSessionId: string,
    itemId: string,
    quantity: number,
  ): Promise<ShopCartItemSummary[]> {
    await this.openGuestShop(websiteId);
    const qty = Math.max(1, Math.min(99, Math.floor(quantity)));
    const item = await prisma.shopCartItem.findFirst({
      where: { id: itemId, websiteId, guestSessionId, customerId: null },
      include: { variant: { select: { quantity: true } } },
    });
    if (!item) throw new AppError(404, "That cart item was not found.", "CART_ITEM_NOT_FOUND");
    if (qty > item.variant.quantity) {
      throw new AppError(400, `Only ${item.variant.quantity} left in stock.`, "INSUFFICIENT_STOCK");
    }
    await prisma.shopCartItem.update({ where: { id: item.id }, data: { quantity: qty } });
    return this.listCart(websiteId, guestSessionId);
  }

  async removeCartItem(websiteId: string, guestSessionId: string, itemId: string): Promise<ShopCartItemSummary[]> {
    await this.openGuestShop(websiteId);
    const item = await prisma.shopCartItem.findFirst({
      where: { id: itemId, websiteId, guestSessionId, customerId: null },
      select: { id: true },
    });
    if (!item) throw new AppError(404, "That cart item was not found.", "CART_ITEM_NOT_FOUND");
    await prisma.shopCartItem.delete({ where: { id: item.id } });
    return this.listCart(websiteId, guestSessionId);
  }

  async listAddresses(websiteId: string, guestSessionId: string): Promise<ShopCustomerAddressView[]> {
    await this.openGuestShop(websiteId);
    const rows = await prisma.shopCustomerAddress.findMany({
      where: { websiteId, guestSessionId, customerId: null },
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    });
    return rows.map(toAddressView);
  }

  async saveAddress(
    websiteId: string,
    guestSessionId: string,
    input: ShopCustomerAddressInput & { email: string },
  ): Promise<ShopCustomerAddressView[]> {
    const shop = await this.openGuestShop(websiteId);
    const email = input.email.trim().toLowerCase();
    const data = {
      label: input.label?.trim() || "Delivery",
      fullName: input.fullName.trim(),
      phone: input.phone.trim(),
      line1: input.line1.trim(),
      line2: input.line2?.trim() || null,
      city: input.city.trim(),
      state: input.state.trim(),
      postalCode: input.postalCode.trim(),
      country: (input.country || "IN").trim().toUpperCase(),
      email,
      isDefault: true,
    };
    const existing = await prisma.shopCustomerAddress.findFirst({
      where: { websiteId, guestSessionId, customerId: null },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) {
      await prisma.shopCustomerAddress.update({ where: { id: existing.id }, data });
    } else {
      await prisma.shopCustomerAddress.create({
        data: {
          websiteId: shop.id,
          clientId: shop.clientId,
          guestSessionId,
          ...data,
        },
      });
    }
    return this.listAddresses(websiteId, guestSessionId);
  }

  async deleteAddress(websiteId: string, guestSessionId: string, addressId: string): Promise<ShopCustomerAddressView[]> {
    await this.openGuestShop(websiteId);
    const row = await prisma.shopCustomerAddress.findFirst({
      where: { id: addressId, websiteId, guestSessionId, customerId: null },
      select: { id: true },
    });
    if (!row) throw new AppError(404, "That address was not found.", "ADDRESS_NOT_FOUND");
    await prisma.shopCustomerAddress.delete({ where: { id: row.id } });
    return this.listAddresses(websiteId, guestSessionId);
  }

  async listWishlist(websiteId: string, guestSessionId: string): Promise<ShopWishlistItemSummary[]> {
    await this.openGuestShop(websiteId);
    const rows = await prisma.shopWishlistItem.findMany({
      where: { websiteId, guestSessionId, customerId: null, product: { listed: true } },
      orderBy: { updatedAt: "desc" },
      include: wishlistInclude,
    });
    return rows.map(toWishlistSummary);
  }

  async addToWishlist(websiteId: string, guestSessionId: string, variantId: string): Promise<ShopWishlistItemSummary[]> {
    const shop = await this.openGuestShop(websiteId);
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, product: { websiteId, listed: true } },
      select: { id: true, productId: true },
    });
    if (!variant) throw new AppError(404, "That variant is no longer available.", "VARIANT_NOT_FOUND");
    await prisma.shopWishlistItem.upsert({
      where: { guestSessionId_variantId: { guestSessionId, variantId: variant.id } },
      update: {},
      create: {
        websiteId: shop.id,
        clientId: shop.clientId,
        guestSessionId,
        productId: variant.productId,
        variantId: variant.id,
      },
    });
    return this.listWishlist(websiteId, guestSessionId);
  }

  async removeFromWishlist(
    websiteId: string,
    guestSessionId: string,
    variantId: string,
  ): Promise<ShopWishlistItemSummary[]> {
    await this.openGuestShop(websiteId);
    const row = await prisma.shopWishlistItem.findFirst({
      where: { websiteId, guestSessionId, customerId: null, variantId },
      select: { id: true },
    });
    if (!row) throw new AppError(404, "That wishlist item was not found.", "WISHLIST_ITEM_NOT_FOUND");
    await prisma.shopWishlistItem.delete({ where: { id: row.id } });
    return this.listWishlist(websiteId, guestSessionId);
  }

  private async upsertGuestCustomer(
    shop: OpenGuestShop,
    input: GuestCheckoutInput,
  ): Promise<{ id: string; email: string; fullName: string; phone: string | null }> {
    const email = input.email.trim().toLowerCase();
    const fullName = input.fullName.trim();
    const phone = input.phone?.trim() || input.address.phone.trim() || null;
    const existing = await prisma.shopCustomer.findUnique({
      where: { websiteId_email: { websiteId: shop.id, email } },
    });
    if (existing) {
      if (existing.status === UserStatus.SUSPENDED) {
        throw new AppError(403, "This email can't place orders right now. Contact the store.", "ACCOUNT_SUSPENDED");
      }
      // Registered shoppers must sign in — don't attach guest checkouts to their account.
      if (!existing.isGuest && existing.status !== UserStatus.PENDING_VERIFICATION) {
        throw new AppError(
          409,
          "An account already exists for this email. Please sign in to checkout.",
          "ACCOUNT_EXISTS",
        );
      }
      const updated = await prisma.shopCustomer.update({
        where: { id: existing.id },
        data: {
          fullName: fullName || existing.fullName,
          phone: phone ?? existing.phone,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
          isGuest: true,
        },
        select: { id: true, email: true, fullName: true, phone: true },
      });
      return updated;
    }

    return prisma.shopCustomer.create({
      data: {
        websiteId: shop.id,
        clientId: shop.clientId,
        email,
        fullName,
        phone,
        passwordHash: await hashPassword(randomUUID()),
        isGuest: true,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true, fullName: true, phone: true },
    });
  }

  async startCheckout(
    websiteId: string,
    guestSessionId: string,
    input: GuestCheckoutInput,
  ): Promise<ShopCheckoutSession & { trackToken: string; trackUrl: string }> {
    const shop = await this.openGuestShop(websiteId);
    const customer = await this.upsertGuestCustomer(shop, input);

    // Move guest cart lines onto the customer so the shared checkout path can run.
    const guestLines = await prisma.shopCartItem.findMany({
      where: { websiteId, guestSessionId, customerId: null },
      select: { id: true, variantId: true, productId: true, quantity: true },
    });
    if (guestLines.length === 0) throw new AppError(400, "Your cart is empty.", "CART_EMPTY");

    await prisma.$transaction(async (tx) => {
      for (const line of guestLines) {
        const existing = await tx.shopCartItem.findUnique({
          where: { customerId_variantId: { customerId: customer.id, variantId: line.variantId } },
          select: { id: true, quantity: true },
        });
        if (existing) {
          await tx.shopCartItem.update({
            where: { id: existing.id },
            data: { quantity: Math.min(99, existing.quantity + line.quantity) },
          });
          await tx.shopCartItem.delete({ where: { id: line.id } });
        } else {
          await tx.shopCartItem.update({
            where: { id: line.id },
            data: { customerId: customer.id, guestSessionId: null },
          });
        }
      }
    });

    // Keep a guest-session copy for return visits, and attach a customer address for the order.
    const addressFields = {
      label: input.address.label?.trim() || "Checkout",
      fullName: input.address.fullName.trim(),
      phone: input.address.phone.trim(),
      line1: input.address.line1.trim(),
      line2: input.address.line2?.trim() || null,
      city: input.address.city.trim(),
      state: input.address.state.trim(),
      postalCode: input.address.postalCode.trim(),
      country: (input.address.country || "IN").trim().toUpperCase(),
      email: input.email.trim().toLowerCase(),
    };
    const guestAddress = await prisma.shopCustomerAddress.findFirst({
      where: { websiteId, guestSessionId, customerId: null },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
    });
    if (guestAddress) {
      await prisma.shopCustomerAddress.update({
        where: { id: guestAddress.id },
        data: { ...addressFields, isDefault: true },
      });
    } else {
      await prisma.shopCustomerAddress.create({
        data: {
          websiteId: shop.id,
          clientId: shop.clientId,
          guestSessionId,
          ...addressFields,
          isDefault: true,
        },
      });
    }
    const orderAddress = await prisma.shopCustomerAddress.create({
      data: {
        websiteId: shop.id,
        clientId: shop.clientId,
        customerId: customer.id,
        ...addressFields,
        isDefault: false,
      },
      select: { id: true },
    });

    const checkout = await shopCheckoutService.startCheckout(websiteId, customer.id, {
      addressId: orderAddress.id,
      couponCode: input.couponCode,
    });
    let trackToken = checkout.trackToken ?? null;
    if (!trackToken) {
      trackToken = newOrderAccessToken();
      await prisma.shopOrder.update({
        where: { id: checkout.orderId },
        data: { publicAccessToken: trackToken },
      });
    }
    const trackUrl = orderTrackUrl(siteUrl(shop.subdomain, shop.customDomain), trackToken);
    return { ...checkout, trackToken, trackUrl };
  }

  async confirmCheckout(
    websiteId: string,
    guestSessionId: string,
    input: ShopCheckoutConfirmation,
  ): Promise<ShopOrderSummary & { trackToken: string | null; trackUrl: string | null }> {
    await this.openGuestShop(websiteId);
    const pending = await prisma.shopOrder.findFirst({
      where: { websiteId, razorpayOrderId: input.razorpayOrderId },
      select: {
        id: true,
        customerId: true,
        publicAccessToken: true,
        website: {
          select: {
            subdomain: true,
            domains: {
              where: { status: DomainStatus.ACTIVE },
              orderBy: { isPrimary: "desc" },
              select: { hostname: true },
              take: 1,
            },
          },
        },
      },
    });
    if (!pending) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");

    const order = await shopCheckoutService.confirmCheckout(websiteId, pending.customerId, input);
    await prisma.shopCartItem.deleteMany({ where: { websiteId, guestSessionId } });

    let trackToken = pending.publicAccessToken;
    if (!trackToken) {
      trackToken = newOrderAccessToken();
      await prisma.shopOrder.update({ where: { id: pending.id }, data: { publicAccessToken: trackToken } });
    }
    const trackUrl = orderTrackUrl(
      siteUrl(pending.website.subdomain, pending.website.domains[0]?.hostname ?? null),
      trackToken,
    );
    return { ...order, trackToken, trackUrl };
  }

  async getTrackedOrder(websiteId: string, token: string): Promise<ShopOrderDetailView & { trackUrl: string }> {
    const order = await prisma.shopOrder.findFirst({
      where: { websiteId, publicAccessToken: token },
      select: { id: true, customerId: true, publicAccessToken: true },
    });
    if (!order?.publicAccessToken) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
    const detail = await shopCheckoutService.getCustomerOrder(websiteId, order.customerId, order.id);
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        subdomain: true,
        domains: {
          where: { status: DomainStatus.ACTIVE },
          orderBy: { isPrimary: "desc" },
          select: { hostname: true },
          take: 1,
        },
      },
    });
    return {
      ...detail,
      trackUrl: orderTrackUrl(siteUrl(website?.subdomain ?? "", website?.domains[0]?.hostname ?? null), token),
    };
  }

  async renderTrackedInvoice(websiteId: string, token: string) {
    const order = await prisma.shopOrder.findFirst({
      where: { websiteId, publicAccessToken: token },
      select: { id: true, customerId: true },
    });
    if (!order) throw new AppError(404, "Order not found.", "ORDER_NOT_FOUND");
    return shopInvoiceService.renderCustomerInvoice(websiteId, order.customerId, order.id);
  }

  /** Ensures paid orders always have a track token (for emails). */
  async ensureTrackToken(order: Pick<ShopOrder, "id" | "publicAccessToken" | "websiteId">): Promise<{
    token: string;
    trackUrl: string;
  }> {
    let token = order.publicAccessToken;
    if (!token) {
      token = newOrderAccessToken();
      await prisma.shopOrder.update({ where: { id: order.id }, data: { publicAccessToken: token } });
    }
    const website = await prisma.website.findUnique({
      where: { id: order.websiteId },
      select: {
        subdomain: true,
        domains: {
          where: { status: DomainStatus.ACTIVE },
          orderBy: { isPrimary: "desc" },
          select: { hostname: true },
          take: 1,
        },
      },
    });
    return {
      token,
      trackUrl: orderTrackUrl(siteUrl(website?.subdomain ?? "", website?.domains[0]?.hostname ?? null), token),
    };
  }
}

export const shopGuestService = new ShopGuestService();
