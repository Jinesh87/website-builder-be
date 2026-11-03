import type {
  CommissionSource,
  CommissionStatus,
  PartnerActivityKind,
  PartnerReferralStatus,
  PartnerStatus,
} from "../../../generated/prisma/client.js";

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
  contactName: string;
  email: string;
  phone: string;
  businessType: string;
  partnershipType: string;
  status: PartnerStatus;
  referralCode: string | null;
  commissionRate: number;
  isCommissionActive: boolean;
  totalReferrals: number;
  convertedReferrals: number;
  totalCommissionPaise: number;
  approvedAt: string | null;
  createdAt: string;
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
  };
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
  activities: {
    id: string;
    kind: PartnerActivityKind;
    body: string;
    actorName: string | null;
    createdAt: string;
  }[];
};

