import type {
  BusinessType,
  DomainOption,
  FeatureOption,
  LogoOption,
  LookOption,
  NeededOption,
  PaletteOption,
  PhotosOption,
  QuestionnaireActivityKind,
  QuestionnaireStatus,
  StyleOption,
  TextOption,
  WebsitePage,
} from "../../common/constants/questionnaire.js";
import type { InquiryEmailStatus } from "../../common/constants/contact.js";
import type { MediaKind } from "../../generated/prisma/enums.js";

export type ReachMethod = {
  enabled: boolean;
  differentContact?: string | null;
};

export type QuestionnaireAnswers = {
  businessType: BusinessType;
  pages: WebsitePage[];
  look: LookOption;
  style: StyleOption;
  palette: PaletteOption;
  reach: {
    call: ReachMethod;
    whatsapp: ReachMethod;
    enquiryForm: ReachMethod;
    mapLocation?: ReachMethod;
    socialLinks?: string[];
  };
  features: FeatureOption[];
  logo: LogoOption;
  text: TextOption;
  photos: PhotosOption;
  domain: DomainOption;
  needed: NeededOption;
  /** Platform theme preset; null = let the team choose. */
  themeId?: string | null;
  /** Platform template key; null = no starting template. */
  templateKey?: string | null;
  /** Media library files of the submitting client. */
  logoMediaId?: string | null;
  mediaIds?: string[];
};

export type QuestionnaireMediaRef = {
  id: string;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  url: string;
};

/** Names and URLs for the ids stored in the answers; missing ones were deleted since. */
export type QuestionnaireAssets = {
  theme: { id: string; name: string; settings: unknown } | null;
  template: { key: string; name: string; category: string; thumbnailUrl: string | null; themeId: string | null } | null;
  logo: QuestionnaireMediaRef | null;
  files: QuestionnaireMediaRef[];
};

export type CreateQuestionnaireInput = {
  businessName: string;
  name: string;
  phone: string;
  email: string;
  answers: QuestionnaireAnswers;
  filesLink?: string | null;
  notes?: string | null;
  ref?: string | null;
  website?: string;
  clientId?: string | null;
};

export type QuestionnaireView = {
  id: string;
  businessName: string;
  name: string;
  phone: string;
  email: string;
  answers: QuestionnaireAnswers;
  filesLink: string | null;
  notes: string | null;
  ref: string | null;
  clientId: string | null;
  clientBusinessName?: string | null;
  websiteId: string | null;
  websiteName?: string | null;
  status: QuestionnaireStatus;
  read: boolean;
  emailStatus: InquiryEmailStatus;
  emailError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionnaireActivityView = {
  id: string;
  kind: QuestionnaireActivityKind;
  body: string | null;
  actorName: string | null;
  createdAt: string;
};

export type QuestionnaireDetail = {
  questionnaire: QuestionnaireView;
  activity: QuestionnaireActivityView[];
  assets: QuestionnaireAssets;
};

export type QuestionnaireListQuery = {
  search?: string;
  status?: QuestionnaireStatus;
  page: number;
  pageSize: number;
};

export type QuestionnaireCounts = Record<QuestionnaireStatus | "ALL", number>;

export type QuestionnaireListResult = {
  items: QuestionnaireView[];
  total: number;
  page: number;
  pageSize: number;
  counts: QuestionnaireCounts;
};

export type UpdateQuestionnaireInput = {
  status?: QuestionnaireStatus;
  read?: boolean;
  clientId?: string | null;
  websiteId?: string | null;
};

