import type { Prisma } from "../../../generated/prisma/client.js";

/** Details a cashier may type for a POS walk-in; every field is optional. */
export type PosCustomerDetails = {
  name: string | null;
  phone: string | null;
  email: string | null;
};

export const WALK_IN_NAME = "Walk-in customer";

function text(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parsePosCustomer(value: Prisma.JsonValue | null | undefined): PosCustomerDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const details = { name: text(row, "name"), phone: text(row, "phone"), email: text(row, "email") };
  return details.name || details.phone || details.email ? details : null;
}

/** Who bought an order, for views, invoices and emails. */
export type OrderBuyer = {
  /** Shop customer account id; null for a POS walk-in. */
  id: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  isGuest: boolean;
  /** True when the sale isn't linked to a shop account (POS walk-in). */
  walkIn: boolean;
};

type BuyerSource = {
  customer: { id?: string; fullName: string; email: string; phone?: string | null; isGuest?: boolean } | null;
  posCustomer?: Prisma.JsonValue | null;
};

/** The order's shop account when it has one, otherwise the walk-in details typed at the till. */
export function orderBuyer(order: BuyerSource): OrderBuyer {
  if (order.customer) {
    return {
      id: order.customer.id ?? null,
      fullName: order.customer.fullName,
      email: order.customer.email,
      phone: order.customer.phone ?? null,
      isGuest: order.customer.isGuest ?? false,
      walkIn: false,
    };
  }
  const walkIn = parsePosCustomer(order.posCustomer);
  return {
    id: null,
    fullName: walkIn?.name ?? WALK_IN_NAME,
    email: walkIn?.email ?? null,
    phone: walkIn?.phone ?? null,
    isGuest: false,
    walkIn: true,
  };
}
