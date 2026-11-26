import type { ShopOrderView } from "../services/shop-order-view.js";

export type PosPaymentMethodLabel = "cash" | "upi" | "card" | "razorpay_qr";

export type PosCatalogVariant = {
  id: string;
  name: string;
  sku: string | null;
  /** Printed barcode; a scan matches this first, then the SKU. */
  barcode: string | null;
  /** The variant's photo (its own, or the one shared by its option value). */
  imageUrl: string | null;
  /** What the customer pays per unit, GST included. */
  unitPaise: number;
  gstPercent: number;
  /** Units that can be sold now: on hand minus units held by online checkouts in progress. */
  available: number;
};

export type PosCatalogProduct = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  /** False when hidden from the online shop; it can still be sold at the till. */
  listed: boolean;
  variants: PosCatalogVariant[];
};

export type PosCatalog = {
  products: PosCatalogProduct[];
  categories: { id: string; name: string }[];
  /**
   * Razorpay QR payments at the till: "ready" (or not checked yet, so worth trying), "not_connected"
   * (no Razorpay set up), or "not_enabled" (Razorpay's QR Codes is off for the account).
   */
  razorpayQr: "ready" | "not_connected" | "not_enabled";
  /** Which page of products this is (1-based), and whether another follows. */
  page: number;
  hasMore: boolean;
};

export type PosSaleInput = {
  items: { variantId: string; quantity: number }[];
  /** Amount in paise, or a whole percent of the cart. */
  discount?: { type: "amount" | "percent"; value: number } | null;
  /** An existing shop customer, or walk-in details (all optional). */
  customer?: { customerId?: string | null; name?: string; phone?: string; email?: string } | null;
  payment: { method: PosPaymentMethodLabel; cashReceivedPaise?: number | null; reference?: string };
};

/** Where a Razorpay QR sale stands. "paid" sales are complete; "expired"/"cancelled" released their stock. */
export type PosQrState = "waiting" | "paid" | "expired" | "cancelled";

export type PosSaleResult = {
  order: ShopOrderView;
  /** Only for Razorpay QR sales. `imageUrl` is only sent when the QR is created; status checks leave it null. */
  qr: { imageUrl: string | null; expiresAt: string; state: PosQrState } | null;
};

export type PosReceipt = {
  shop: { name: string; address: string | null; phone: string | null; email: string | null; gstin: string | null };
  orderNumber: string;
  createdAt: string;
  status: ShopOrderView["status"];
  cashierName: string | null;
  customer: { name: string; phone: string | null; email: string | null; walkIn: boolean };
  items: { productName: string; variantName: string; quantity: number; unitPaise: number; lineTotalPaise: number; gstPercent: number }[];
  subtotalPaise: number;
  discountPaise: number;
  totalPaise: number;
  taxablePaise: number;
  gstPaise: number;
  /** GST per rate, for the receipt's tax table. */
  gstByRate: { gstPercent: number; taxablePaise: number; gstPaise: number }[];
  payment: {
    method: PosPaymentMethodLabel | null;
    cashReceivedPaise: number | null;
    changePaise: number | null;
    reference: string | null;
    razorpayPaymentId: string | null;
  };
};

export type PosDailySummary = {
  /** First day covered, in the shop's time zone (Asia/Kolkata), YYYY-MM-DD. Same as `from`. */
  date: string;
  /** Days covered, YYYY-MM-DD, both inclusive. */
  from: string;
  to: string;
  /** Completed sales (paid, not cancelled or returned). */
  salesCount: number;
  totalPaise: number;
  discountPaise: number;
  byMethod: Record<PosPaymentMethodLabel, { count: number; totalPaise: number }>;
  /** Cash taken for completed cash sales (what should be in the drawer from POS). */
  cashPaise: number;
  cancelledCount: number;
  returnedCount: number;
  returnedPaise: number;
};
