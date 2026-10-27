export type ShopCustomerView = {
  id: string;
  websiteId: string;
  email: string;
  fullName: string;
  phone: string | null;
  emailVerified: boolean;
  createdAt: string;
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
