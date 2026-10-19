import type { AuthTokens } from "../../../common/utils/cookies.js";
import type { UserRole, UserStatus } from "../../../common/constants/roles.js";

export type PublicUser = {
  id: string;
  email: string | null;
  username: string | null;
  fullName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  client: { id: string; businessName: string } | null;
  createdAt: string;
};

export type AuthResult = {
  user: PublicUser;
  tokens: AuthTokens;
  remember: boolean;
};

export type SignupInput = {
  fullName: string;
  businessName: string;
  email: string;
  password: string;
  phone?: string;
};

export type LoginInput = {
  /** Email or username, already lowercased by the validator. */
  identifier: string;
  password: string;
  remember: boolean;
};

export type ChangePasswordInput = {
  newPassword: string;
};

export type UpdateProfileInput = {
  /** Empty string clears the phone number. */
  phone: string;
};

export type VerificationDispatch = {
  email: string;
  emailSent: boolean;
  resendAvailableInSeconds: number;
};
