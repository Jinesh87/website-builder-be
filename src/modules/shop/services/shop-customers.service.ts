import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { prisma } from "../../../config/prisma.js";
import type { ShopCustomer, UserStatus } from "../../../generated/prisma/client.js";
import { scopeFor } from "../../websites/services/website.service.js";

const PAGE_SIZE = 20;

export type ShopCustomerAdminView = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  emailVerifiedAt: string | null;
  lastSignedInAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ShopCustomerPage = {
  customers: ShopCustomerAdminView[];
  page: number;
  pageSize: number;
  total: number;
};

export type ShopCustomerQuery = {
  search?: string;
  page?: number;
};

function toView(customer: ShopCustomer): ShopCustomerAdminView {
  return {
    id: customer.id,
    email: customer.email,
    fullName: customer.fullName,
    phone: customer.phone,
    status: customer.status,
    emailVerifiedAt: customer.emailVerifiedAt?.toISOString() ?? null,
    lastSignedInAt: customer.lastSignedInAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  };
}

export class ShopCustomersService {
  private async openShop(websiteId: string, actor: AuthUser): Promise<void> {
    const website = await prisma.website.findFirst({
      where: { id: websiteId, ...scopeFor(actor) },
      select: { id: true, shopEnabled: true, client: { select: { shopFeatureEnabled: true } } },
    });
    if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    if (!website.client.shopFeatureEnabled) {
      throw new AppError(403, "Shop isn't available for this company yet.", "SHOP_NOT_ALLOWED");
    }
    if (!website.shopEnabled) {
      throw new AppError(403, "Turn the shop on before viewing customers.", "SHOP_OFF");
    }
  }

  async list(websiteId: string, query: ShopCustomerQuery, actor: AuthUser): Promise<ShopCustomerPage> {
    await this.openShop(websiteId, actor);
    const page = Math.max(1, query.page ?? 1);
    const needle = query.search?.trim();
    const where = {
      websiteId,
      ...(needle
        ? {
            OR: [
              { email: { contains: needle, mode: "insensitive" as const } },
              { fullName: { contains: needle, mode: "insensitive" as const } },
              { phone: { contains: needle, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [total, rows] = await prisma.$transaction([
      prisma.shopCustomer.count({ where }),
      prisma.shopCustomer.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ]);

    return {
      customers: rows.map(toView),
      page,
      pageSize: PAGE_SIZE,
      total,
    };
  }

  async get(websiteId: string, customerId: string, actor: AuthUser): Promise<ShopCustomerAdminView> {
    await this.openShop(websiteId, actor);
    const customer = await prisma.shopCustomer.findFirst({
      where: { id: customerId, websiteId },
    });
    if (!customer) throw new AppError(404, "Customer not found", "CUSTOMER_NOT_FOUND");
    return toView(customer);
  }
}

export const shopCustomersService = new ShopCustomersService();
