import type { ClientSource, UserStatus } from "../../../common/constants/roles.js";

export type ClientOwner = {
  id: string;
  fullName: string;
  email: string | null;
  /** Set only for clients whose login was created by a Super Admin. */
  username: string | null;
  phone: string | null;
  status: UserStatus;
  emailVerified: boolean;
  lastSignedInAt: string | null;
};

export type ClientView = {
  id: string;
  businessName: string;
  address: string | null;
  source: ClientSource;
  /** When true, the client may turn a shop on for each website. */
  shopFeatureEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  /** The client's login account. Null only if the user row was removed manually. */
  owner: ClientOwner | null;
};

export type ClientListQuery = {
  search?: string;
  source?: ClientSource;
  status?: UserStatus;
  page: number;
  pageSize: number;
};

export type ClientListResult = {
  items: ClientView[];
  total: number;
  page: number;
  pageSize: number;
};

export type ClientDetailsInput = {
  businessName: string;
  fullName: string;
  email?: string;
  /** Only for clients that already log in with a username. */
  username?: string;
  phone?: string;
  address?: string;
};

export type CreateClientInput = Omit<ClientDetailsInput, "username"> & {
  username: string;
  password: string;
};

export type CreateClientResult = {
  client: ClientView;
};
