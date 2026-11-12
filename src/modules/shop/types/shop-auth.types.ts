export type ShopCustomerView = {
  id: string;
  websiteId: string;
  email: string;
  fullName: string;
  phone: string | null;
  emailVerified: boolean;
  createdAt: string;
};

export type ShopOrderStatusLabel =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "failed"
  | "cancelled"
  | "returned";

export type ShopRefundStatusLabel = "none" | "pending" | "processed" | "failed";

export type ShopCancelUntilStatusLabel = "paid" | "processing" | "shipped";

export type ShopOrderSummary = {
  id: string;
  number: string;
  status: ShopOrderStatusLabel;
  refundStatus: ShopRefundStatusLabel;
  totalPaise: number;
  currency: "INR";
  createdAt: string;
  refundedAt: string | null;
  /** Shopper may cancel this order under the website's cancel policy. */
  canCancel: boolean;
  /** Shopper may return this delivered order within the return window. */
  canReturn: boolean;
  /** Inclusive deadline for a customer return, when canReturn is true. */
  returnUntil: string | null;
  /** True when payment was captured and an invoice can be downloaded. */
  canDownloadInvoice: boolean;
  /** Public order-tracking token (returned after checkout when available). */
  trackToken?: string | null;
  trackUrl?: string | null;
};

export type ShopOrderTimelineEventView = {
  id: string;
  status: string;
  actorType: string;
  note: string | null;
  createdAt: string;
};

export type ShopOrderItemView = {
  id: string;
  productName: string;
  variantName: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
};

export type ShopOrderShippingAddress = {
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type ShopOrderDetailView = ShopOrderSummary & {
  items: ShopOrderItemView[];
  timeline: ShopOrderTimelineEventView[];
  failureReason: string | null;
  cancelReason: string | null;
  returnReason: string | null;
  shippingAddress: ShopOrderShippingAddress | null;
  paidAt: string | null;
  /** True when payment was captured and an invoice can be downloaded. */
  canDownloadInvoice: boolean;
  updatedAt: string;
};

export type ShopCheckoutStartInput = {
  addressId?: string;
  couponCode?: string;
};

export type ShopCancelOrderInput = {
  reason: string;
};

export type ShopReturnOrderInput = {
  reason: string;
};

export type ShopCheckoutSession = {
  orderId: string;
  orderNumber: string;
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  businessName: string;
  prefill: { name: string; email?: string; contact?: string };
  listAmountPaise?: number;
  discountPaise?: number;
  couponCode?: string;
};

export type ShopCheckoutConfirmation = {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
};

export type ShopCartItemSummary = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
  pricePaise: number;
  imageUrl?: string;
};

export type ShopWishlistItemSummary = {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  productSlug: string;
  categoryName: string;
  pricePaise: number;
  imageUrl?: string;
  addedAt: string;
};

export type ShopAddToCartInput = {
  variantId: string;
  quantity?: number;
};

export type ShopUpdateCartItemInput = {
  quantity: number;
};

export type ShopCustomerAddressView = {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  /** Present on guest-session addresses (invoice email). */
  email?: string | null;
  updatedAt: string;
};

export type ShopCustomerAddressInput = {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
  /** Required when saving a guest-session address. */
  email?: string;
};

export type ShopCustomerAccountView = {
  customer: ShopCustomerView;
  orders: ShopOrderSummary[];
  cartItems: ShopCartItemSummary[];
  wishlistItems: ShopWishlistItemSummary[];
  addresses: ShopCustomerAddressView[];
  /** Inclusive status ceiling for cancels on this shop. Null = cancels disabled. */
  cancelUntilStatus: ShopCancelUntilStatusLabel | null;
};

export type ShopAuthResult = {
  customer: ShopCustomerView;
  tokens: { accessToken: string; refreshToken: string };
  remember: boolean;
};

export type ShopVerificationDispatch = {
  email: string;
  emailSent: boolean;
  resendAvailableInSeconds: number;
};

export type ShopSignupInput = {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
};

export type ShopLoginInput = {
  email: string;
  password: string;
  remember?: boolean;
};

export type ShopResetPasswordInput = {
  token: string;
  password: string;
};

export type ShopProfileUpdateInput = {
  fullName?: string;
  phone?: string;
};
