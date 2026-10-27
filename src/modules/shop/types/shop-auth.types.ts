export type ShopCustomerView = {
  id: string;
  websiteId: string;
  email: string;
  fullName: string;
  phone: string | null;
  emailVerified: boolean;
  createdAt: string;
};

export type ShopOrderSummary = {
  id: string;
  number: string;
  status: "pending" | "paid" | "failed" | "cancelled";
  totalPaise: number;
  currency: "INR";
  createdAt: string;
};

export type ShopCartItemSummary = {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  quantity: number;
  pricePaise: number;
  imageUrl?: string;
};

export type ShopCustomerAccountView = {
  customer: ShopCustomerView;
  orders: ShopOrderSummary[];
  cartItems: ShopCartItemSummary[];
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
