import type { Prisma, ShopOrderStatus } from "../../../generated/prisma/client.js";

export type StatusEventActor = "SYSTEM" | "CLIENT" | "CUSTOMER";

export type ShopOrderTimelineEvent = {
  id: string;
  status: string;
  actorType: string;
  note: string | null;
  createdAt: string;
};

/** Fulfillment steps shown on the order detail timeline (happy path). */
export const FULFILLMENT_STEPS = ["paid", "processing", "shipped", "delivered"] as const;

export async function recordOrderStatusEvent(
  tx: Prisma.TransactionClient | typeof import("../../../config/prisma.js").prisma,
  input: {
    orderId: string;
    status: ShopOrderStatus;
    actorType: StatusEventActor;
    note?: string | null;
    userId?: string | null;
  },
): Promise<void> {
  await tx.shopOrderStatusEvent.create({
    data: {
      orderId: input.orderId,
      status: input.status,
      actorType: input.actorType,
      note: input.note?.trim() || null,
      userId: input.userId ?? null,
    },
  });
}

export function toTimelineEvent(row: {
  id: string;
  status: ShopOrderStatus;
  actorType: string;
  note: string | null;
  createdAt: Date;
}): ShopOrderTimelineEvent {
  return {
    id: row.id,
    status: row.status.toLowerCase(),
    actorType: row.actorType,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}
