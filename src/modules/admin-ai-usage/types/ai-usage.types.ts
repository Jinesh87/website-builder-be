export type AiUsageSortBy = "totalTokens" | "estimatedCost" | "totalRequests" | "businessName" | "lastUsedAt";
export type SortOrder = "asc" | "desc";

export type AiUsageListQuery = {
  month?: number;
  year?: number;
  search?: string;
  page: number;
  pageSize: number;
  sortBy: AiUsageSortBy;
  sortOrder: SortOrder;
};

export type ClientAiUsageSummary = {
  clientId: string;
  businessName: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  totalRequests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  topModel: string | null;
  lastUsedAt: string | null;
};

export type AiUsageTotals = {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalEstimatedCost: number;
  activeClientsCount: number;
};

export type ClientAiCallsQuery = {
  month?: number | null;
  year?: number;
  page: number;
  pageSize: number;
};

export type AiCallDetail = {
  id: string;
  createdAt: string;
  /** Which feature made the call, e.g. "site_copilot". */
  scope: string;
  model: string;
  websiteId: string | null;
  websiteName: string | null;
  userName: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  inputCost: number;
  outputCost: number;
  cost: number;
};

export type ClientAiCallsResult = {
  client: { id: string; businessName: string };
  calls: AiCallDetail[];
  byFeature: Array<{ scope: string; calls: number; totalTokens: number; cost: number }>;
  total: number;
  totalCost: number;
  page: number;
  pageSize: number;
};

export type AiUsageListResult = {
  items: ClientAiUsageSummary[];
  summary: AiUsageTotals;
  total: number;
  page: number;
  pageSize: number;
  selectedMonth: number | null;
  selectedYear: number;
};
