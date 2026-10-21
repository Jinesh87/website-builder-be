import type {
  BillingCycle,
  ClientSource,
  HostingPayer,
  HostingPaymentMethod,
  HostingPriceScope,
  HostingStatus,
  WebsiteOfflineReason,
  WebsiteStatus,
} from "../../../generated/prisma/enums.js";
import type { ResolvedPrice } from "../services/hosting-period.js";

export type CyclePriceInput = { quarterlyPrice: number | null; yearlyPrice: number | null };

export type HostingSubscriptionView = {
  id: string;
  cycle: BillingCycle;
  status: HostingStatus;
  autoRenew: boolean;
  /** This website's own prices; null = client or global price. */
  quarterlyPrice: number | null;
  yearlyPrice: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  graceEndsAt: string | null;
  suspendedAt: string | null;
};

export type HostingPaymentView = {
  id: string;
  websiteId: string | null;
  websiteName: string;
  client: { id: string; businessName: string };
  cycle: BillingCycle;
  amount: number;
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

export type CyclePrices = Record<BillingCycle, ResolvedPrice>;
export type CyclePeriods = Record<BillingCycle, { start: string; end: string }>;

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
  /** What this website pays per cycle, and where that price comes from. */
  prices: CyclePrices;
  /** What it would pay without its own prices (client price, else global). */
  inheritedPrices: CyclePrices;
  /** The price set at each level; null = not set there. */
  priceLevels: {
    website: CyclePriceInput;
    client: CyclePriceInput;
    global: { quarterlyPrice: number; yearlyPrice: number };
  };
  /** The period a payment made now would cover, per cycle. */
  nextPeriods: CyclePeriods;
  /** Set while an ACTIVE plan is too far from its end to renew. */
  renewalOpensAt: string | null;
  /** The client's wallet balance in connects. */
  balance: number;
  connectsPerRupee: number;
  payments: HostingPaymentView[];
};

export type UpdatePlanInput = {
  cycle?: BillingCycle;
  autoRenew?: boolean;
  /** Super Admin only; null = back to client or global price. */
  quarterlyPrice?: number | null;
  yearlyPrice?: number | null;
};

export type CollectInput = {
  cycle: BillingCycle;
  /** WALLET charges the client's existing connects; the rest record the plan's price collected offline. */
  method: HostingPaymentMethod;
  reference?: string;
  note?: string;
};

export type HostingSettingsView = {
  enabled: boolean;
  quarterlyPrice: number;
  yearlyPrice: number;
  reminderDays: number;
  graceDays: number;
  connectsPerRupee: number;
  updatedAt: string | null;
  /** Published websites with no hosting plan; covered by the backfill. */
  liveSitesWithoutPlan: number;
  /** Plans with no website or client price, which a global price change affects. */
  plansOnGlobalPrice: number;
  recentPriceChanges: HostingPriceChangeView[];
};

export type UpdateHostingSettingsInput = {
  enabled: boolean;
  quarterlyPrice: number;
  yearlyPrice: number;
  reminderDays: number;
  graceDays: number;
};

export type HostingPriceChangeView = {
  id: string;
  scope: HostingPriceScope;
  label: string;
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

export type ClientHostingView = {
  client: { id: string; businessName: string; source: ClientSource; createdAt: string; owner: ClientOwnerView | null };
  /** The client's own prices; null = global price. */
  clientPrices: CyclePriceInput;
  globalPrices: { quarterlyPrice: number; yearlyPrice: number };
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
    prices: CyclePrices;
    lastPayment: HostingPaymentView | null;
  }>;
  payments: HostingPaymentView[];
  totals: { payments: number; connects: number; collectedPaise: number };
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
  paid: { payments: number; connects: number; collectedPaise: number };
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
