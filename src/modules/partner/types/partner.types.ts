import type {
  CommissionSource,
  CommissionStatus,
  PartnerActivityKind,
  PartnerCommissionPolicy,
  PartnerReferralStatus,
  PartnerStatus,
} from "../../../generated/prisma/client.js";

export type PartnerProgramConfigView = {
  defaultCommissionRate: number;
  defaultCommissionPolicy: PartnerCommissionPolicy;
  updatedAt: string | null;
};

export type UpdatePartnerProgramConfigInput = {
  defaultCommissionRate?: number;
  defaultCommissionPolicy?: PartnerCommissionPolicy;
};

export type PartnerApplicationInput = {
  companyName: string;
  registrationNumber?: string | null;
  website?: string | null;
  businessType: string;
  yearEstablished: string;
  country: string;
  state: string;
  city: string;
  businessAddress: string;

  contactName: string;
  designation: string;
  email: string;
  phone: string;
  alternatePhone?: string | null;

  partnershipType: string;
  targetCategories: string[];
  expectedReferrals: string;
  marketingChannels: string[];
  reason: string;
  previousExperience: boolean;
};

export type PartnerSummary = {
  id: string;
  partnerNumber: number;
  applicationId: string;
  companyName: string;
  city: string;
  state: string;
  country: string;
  contactName: string;
  email: string;
  phone: string;
  businessType: string;
  partnershipType: string;
  status: PartnerStatus;
  referralCode: string | null;
  commissionRate: number;
  isCommissionActive: boolean;
  commissionPolicy: PartnerCommissionPolicy;
  effectiveCommissionPolicy?: PartnerCommissionPolicy;
  totalReferrals: number;
  convertedReferrals: number;
  totalCommissionPaise: number;
  approvedAt: string | null;
  createdAt: string;
  lastCommissionChange?: string;
};

export type PartnerListResponse = {
  items: PartnerSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  counts: {
    ALL: number;
    PENDING: number;
    APPROVED: number;
    REJECTED: number;
    SUSPENDED: number;
    COMMISSIONS: number;
    AUDIT_LOGS: number;
  };
};

export type PartnerAuditLogItem = {
  id: string;
  createdAt: string;
  kind: PartnerActivityKind;
  body: string;
  actorName: string;
  partnerId: string;
  reference: string;
  companyName: string;
  actionBadge: {
    label: string;
    variant: "orange" | "slate" | "blue" | "emerald" | "rose";
  };
  details: string;
};

export type PartnerAuditLogsResponse = {
  items: PartnerAuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PartnerDetail = PartnerSummary & {
  registrationNumber: string | null;
  website: string | null;
  yearEstablished: string;
  country: string;
  state: string;
  city: string;
  businessAddress: string;
  designation: string;
  alternatePhone: string | null;
  targetCategories: string[];
  expectedReferrals: string;
  marketingChannels: string[];
  reason: string;
  previousExperience: boolean;
  rejectionReason: string | null;
  suspensionReason: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  suspendedAt: string | null;
  userId: string | null;
  inviteLink?: string;
  accountHolderName?: string | null;
  bankAccountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  panNumber?: string | null;
  bankDetails?: {
    accountHolderName?: string;
    bankAccountNumber?: string;
    ifscCode?: string;
    upiId?: string;
    panNumber?: string;
  };
  stats?: {
    totalReferrals: number;
    convertedReferrals: number;
    totalEarnedPaise: number;
    approvedCommissionPaise: number;
    paidCommissionPaise: number;
    pendingPayoutRequestsPaise: number;
    availableForWithdrawalPaise: number;
  };
  referrals?: {
    id: string;
    customerName: string;
    customerEmail: string;
    status: PartnerReferralStatus;
    planName: string;
    totalSpentPaise: number;
    paymentAmountPaise: number | null;
    commissionAmountPaise: number | null;
    registeredAt: string;
    convertedAt: string | null;
  }[];
  commissions?: {
    id: string;
    orderAmountPaise: number;
    commissionRate: number;
    commissionAmountPaise: number;
    status: CommissionStatus;
    customerName: string;
    createdAt: string;
    paidAt: string | null;
  }[];
  payoutRequests?: PartnerPayoutRequestView[];
  activities: {
    id: string;
    kind: PartnerActivityKind;
    body: string;
    actorName: string | null;
    createdAt: string;
  }[];
};

export type PartnerPayoutDetailsInput = {
  accountHolderName?: string | null;
  bankAccountNumber?: string | null;
  ifscCode?: string | null;
  upiId?: string | null;
  panNumber?: string | null;
};

export type PartnerPayoutRequestInput = {
  amountPaise: number;
  payoutMethod?: "BANK_TRANSFER" | "UPI";
};

export type AdminResolvePayoutRequestInput = {
  status: "APPROVED" | "REJECTED";
  payoutMethod?: "BANK_TRANSFER" | "UPI";
  transactionReference?: string | null;
  invoiceNumber?: string | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
};

export type PartnerPayoutRequestView = {
  id: string;
  requestNumber: number;
  formattedId: string;
  partnerId: string;
  partnerName?: string;
  partnerEmail?: string;
  amountPaise: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  processedAt: string | null;
  payoutMethod: "BANK_TRANSFER" | "UPI";
  accountHolderName: string | null;
  bankAccountNumber: string | null;
  ifscCode: string | null;
  upiId: string | null;
  transactionReference: string | null;
  invoiceNumber: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  actorName: string | null;
};


