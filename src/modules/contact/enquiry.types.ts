import type {
  ContactInquiryActivityKind,
  ContactInquiryStatus,
  InquiryEmailStatus,
} from "../../common/constants/contact.js";

export type EnquiryView = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactInquiryStatus;
  /** False until a Super Admin opens it. */
  read: boolean;
  emailStatus: InquiryEmailStatus;
  emailError: string | null;
  createdAt: string;
};

export type EnquiryActivityView = {
  id: string;
  kind: ContactInquiryActivityKind;
  body: string | null;
  /** Null for automatic entries, or when the admin account was removed. */
  actorName: string | null;
  createdAt: string;
};

export type EnquiryDetail = {
  enquiry: EnquiryView;
  /** Newest first. */
  activity: EnquiryActivityView[];
};

export type CreateEnquiryInput = {
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
};

export type EnquiryReplyInput = {
  subject: string;
  message: string;
};

export type UpdateEnquiryInput = {
  status?: ContactInquiryStatus;
  read?: boolean;
};

export type EnquiryListQuery = {
  search?: string;
  /** Omitted means every enquiry except spam. */
  status?: ContactInquiryStatus;
  page: number;
  pageSize: number;
};

/** Per-status totals for the tabs; ALL excludes spam. */
export type EnquiryCounts = Record<ContactInquiryStatus | "ALL", number>;

export type EnquiryListResult = {
  items: EnquiryView[];
  total: number;
  page: number;
  pageSize: number;
  counts: EnquiryCounts;
};
