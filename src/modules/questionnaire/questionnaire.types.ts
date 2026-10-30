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

