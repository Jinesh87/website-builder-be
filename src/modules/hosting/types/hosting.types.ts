import type {
  AutopayStatus,
  BillingCycle,
  ClientSource,
  HostingPayer,
  HostingPaymentMethod,
  HostingPriceScope,
  HostingPriceUnit,
  HostingStatus,
  WebsiteOfflineReason,
  WebsiteStatus,
} from "../../../generated/prisma/enums.js";

/** Paise per period; null = can't be bought on that cycle. */
export type CyclePrices = Record<BillingCycle, number | null>;

export type HostingPackageView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  features: string[];
  featured: boolean;
  /** Priced per website: the website's own price, else `defaultPrices`. */
  isCustom: boolean;
  prices: CyclePrices;
  /** Custom package only: the price for websites without their own; null = none (always null on listed packages). */
  defaultPrices: CyclePrices;
};

export type AdminHostingPackageView = HostingPackageView & {
  active: boolean;
  sortOrder: number;
  /** Plans on this package, which a price change affects from their next payment. */
  plans: number;
  updatedAt: string;
};

export type HostingSubscriptionView = {
  id: string;
  packageId: string | null;
  packageName: string | null;
  isCustomPackage: boolean;
  cycle: BillingCycle;
  status: HostingStatus;
  autoRenew: boolean;
  /** This website's custom package price, in paise; null = the package's default. */
  customQuarterlyPaise: number | null;
  customYearlyPaise: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  suspendedAt: string | null;
};

/** Razorpay autopay on a website's plan, while it can still charge. */
export type HostingAutopayView = {
  status: AutopayStatus;
  packageName: string;
  cycle: BillingCycle;
  /** Charged each period, in paise. */
  amountPaise: number;
  /** First charge; null = it was charged on approval. */
  startAt: string | null;
  nextChargeAt: string | null;
};

export type HostingPaymentView = {
  id: string;
  websiteId: string | null;
  websiteName: string;
  client: { id: string; businessName: string };
  packageName: string | null;
  cycle: BillingCycle;
  amountPaise: number;
  /** Connects charged from the wallet; null when paid otherwise. */
  connects: number | null;
  periodStart: string;
  periodEnd: string;
  paidBy: HostingPayer;
  method: HostingPaymentMethod;
  collectedPaise: number | null;
  reference: string | null;
  note: string | null;
  recordedBy: { id: string; fullName: string } | null;
  createdAt: string;
};

export type CyclePeriods = Record<BillingCycle, { start: string; end: string }>;

export type HostingPaymentOptions = {
  /** Razorpay keys are set up, so the client can pay online. */
  razorpay: boolean;
  /** The Super Admin allows paying hosting from connects. */
  connects: boolean;
  connectsPerRupee: number;
  /** The client's wallet balance in connects. */
  balance: number;
};

export type WebsiteHostingView = {
  /** Off: hosting billing isn't enforced on the platform yet. */
  enabled: boolean;
  website: {
    id: string;
    name: string;
    subdomain: string;
    status: WebsiteStatus;
    offlineReason: WebsiteOfflineReason | null;
    clientId: string;
    clientName: string;
  };
  subscription: HostingSubscriptionView | null;
  autopay: HostingAutopayView | null;
  /** Packages this website can choose, priced for it; includes its current package even if since hidden. */
  packages: HostingPackageView[];
  /** The period a payment made now would cover, per cycle. */
  nextPeriods: CyclePeriods;
  /** Set while an ACTIVE plan is too far from its end to renew. */
  renewalOpensAt: string | null;
  payment: HostingPaymentOptions;
  payments: HostingPaymentView[];
};

export type PlanChoice = { packageId: string; cycle: BillingCycle };

export type UpdatePlanInput = {
  packageId?: string;
  cycle?: BillingCycle;
  autoRenew?: boolean;
  /** Super Admin only; null = the custom package's default price. */
  customQuarterlyPaise?: number | null;
  customYearlyPaise?: number | null;
};

export type CollectInput = PlanChoice & {
  /** WALLET charges the client's connects; the rest record the plan's price collected offline. */
  method: HostingPaymentMethod;
  reference?: string;
  note?: string;
};

export type RazorpayConfirmation = { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string };

/** What Razorpay Checkout needs to take the payment. */
export type HostingCheckoutView = {
  orderId: string;
  keyId: string;
  amountPaise: number;
  currency: string;
  businessName: string;
  description: string;
  prefill: { name: string; email?: string; contact?: string };
};

/** A free plan is activated straight away; anything else goes through Razorpay. */
export type HostingCheckoutResult =
  | { status: "CHECKOUT"; checkout: HostingCheckoutView }
  | { status: "PAID"; hosting: WebsiteHostingView };

export type HostingSettingsView = {
  enabled: boolean;
  allowConnectsPayment: boolean;
  reminderDays: number;
  graceDays: number;
  connectsPerRupee: number;
  /** Clients can only pay online once Razorpay keys are saved. */
  razorpayConfigured: boolean;
  updatedAt: string | null;
  packages: AdminHostingPackageView[];
  /** Published websites with no hosting plan; covered by the backfill. */
  liveSitesWithoutPlan: number;
  recentPriceChanges: HostingPriceChangeView[];
};

export type UpdateHostingSettingsInput = {
  enabled: boolean;
  allowConnectsPayment: boolean;
  reminderDays: number;
  graceDays: number;
};

export type UpdatePackageInput = {
  name: string;
  description: string;
  features: string[];
  /** Ignored for the custom package. */
  quarterlyPricePaise: number;
  yearlyPricePaise: number;
  /** Custom package only: the default price; 0 = none. Omitted = unchanged. */
  defaultQuarterlyPaise?: number;
  defaultYearlyPaise?: number;
  featured: boolean;
  active: boolean;
};

export type BackfillInput = PlanChoice & { freeDays: number };

/** The public pricing page: list prices only, never a website's own price. */
export type PublicHostingPricingView = {
  packages: HostingPackageView[];
  /** Hosting can also be paid from connects. */
  allowConnectsPayment: boolean;
  reminderDays: number;
  graceDays: number;
};

export type HostingPriceChangeView = {
  id: string;
  scope: HostingPriceScope;
  label: string;
  unit: HostingPriceUnit;
  oldQuarterlyPrice: number | null;
  newQuarterlyPrice: number | null;
  oldYearlyPrice: number | null;
  newYearlyPrice: number | null;
  changedBy: string | null;
  createdAt: string;
};

export type ClientOwnerView = {
  fullName: string;
  email: string | null;
  username: string | null;
  phone: string | null;
};

export type PaidTotals = { payments: number; amountPaise: number; collectedPaise: number };

export type ClientHostingView = {
  client: { id: string; businessName: string; source: ClientSource; createdAt: string; owner: ClientOwnerView | null };
  balance: number;
  websites: Array<{
    id: string;
    name: string;
    subdomain: string;
    status: WebsiteStatus;
    offlineReason: WebsiteOfflineReason | null;
    publishedAt: string | null;
    updatedAt: string;
    subscription: HostingSubscriptionView | null;
    /** Paise for the plan's package and cycle; null = not payable yet. */
    price: number | null;
    lastPayment: HostingPaymentView | null;
  }>;
  payments: HostingPaymentView[];
  totals: PaidTotals;
};

/** Needs-attention filter on the client overview. */
export type ClientAttention = "DUE_SOON" | "GRACE" | "SUSPENDED" | "NO_PLAN";

export type ClientOverviewQuery = {
  search?: string;
  attention?: ClientAttention | "";
  page: number;
  pageSize: number;
};

export type ClientOverviewItem = {
  client: { id: string; businessName: string; source: ClientSource; createdAt: string };
  owner: ClientOwnerView | null;
  balance: number;
  websites: { total: number; published: number; draft: number; unpublished: number };
  hosting: { active: number; grace: number; suspended: number; awaitingPayment: number; withoutPlan: number; dueSoon: number };
  /** The soonest renewal among paid or grace plans. */
  nextRenewal: { websiteId: string; websiteName: string; date: string; status: HostingStatus } | null;
  paid: PaidTotals;
};

export type ClientOverviewList = {
  items: ClientOverviewItem[];
  /** Platform-wide, regardless of filters. */
  summary: { clients: number; websites: number; liveWebsites: number; dueSoon: number; suspended: number; dueSoonDays: number };
  total: number;
  page: number;
  pageSize: number;
};

export type SubscriptionListQuery = {
  search?: string;
  status?: HostingStatus | "";
  /** Only plans ending within this many days. */
  dueWithinDays?: number | "";
  page: number;
  pageSize: number;
};

export type PaymentListQuery = {
  search?: string;
  websiteId?: string;
  from?: string;
  to?: string;
  method?: HostingPaymentMethod | "";
  paidBy?: HostingPayer | "";
  page: number;
  pageSize: number;
};
