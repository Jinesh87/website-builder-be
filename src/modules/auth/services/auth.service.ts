import { randomUUID } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import { ClientSource, UserRole, UserStatus } from "../../../common/constants/roles.js";
import type { AuthTokens } from "../../../common/utils/cookies.js";
import { parseDurationMs } from "../../../common/utils/duration.js";
import { hashPassword, sha256, verifyPassword } from "../../../common/utils/hash.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../../common/utils/jwt.js";
import { env, isProduction } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { Prisma, type User } from "../../../generated/prisma/client.js";
import { emailService } from "../../email/services/email.service.js";
import type {
  AuthResult,
  ChangePasswordInput,
  LoginInput,
  PublicUser,
  SignupInput,
  VerificationDispatch,
} from "../types/auth.types.js";
import { clearLoginLockout, getLoginLockStatus, recordFailedLoginAttempt } from "../utils/login-lockout.js";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  getPasswordResetUserId,
  INVITE_TOKEN_TTL_SECONDS,
  RESET_TOKEN_TTL_SECONDS,
} from "../utils/password-reset.js";
import {
  checkVerificationCode,
  generateVerificationCode,
  getResendCooldownSeconds,
  RESEND_COOLDOWN_SECONDS,
  storeVerificationCode,
  VERIFICATION_CODE_TTL_SECONDS,
} from "../utils/verification-code.js";

type UserWithClient = User & { client: { id: string; businessName: string } | null };

const clientSelect = { select: { id: true, businessName: true } } as const;

/** Compared against when the email is unknown so response time doesn't reveal which accounts exist. */
const dummyPasswordHash = hashPassword(randomUUID());

const INVALID_CREDENTIALS = () =>
  new AppError(401, "Email/username or password is incorrect.", "INVALID_CREDENTIALS");
const INVALID_RESET_LINK = () =>
  new AppError(400, "This reset link is invalid or has expired.", "INVALID_RESET_TOKEN");
const INVALID_REFRESH = () =>
  new AppError(401, "Your session has expired. Please log in again.", "INVALID_TOKEN");

function toPublicUser(user: UserWithClient): PublicUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    status: user.status,
    emailVerified: user.emailVerifiedAt !== null,
    client: user.client,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Suspended accounts can't use password links; pending ones can (it verifies their email). */
function canUsePasswordLink(status: UserStatus): boolean {
  return status === UserStatus.ACTIVE || status === UserStatus.PENDING_VERIFICATION;
}

/** Usernames can't contain "@", so anything with one is treated as an email. */
function identifierWhere(identifier: string): Prisma.UserWhereUniqueInput {
  return identifier.includes("@") ? { email: identifier } : { username: identifier };
}

/** Prefixed so a typed identifier can never collide with a known account's user-id key. */
function userLockoutKey(userId: string): string {
  return `user:${userId}`;
}

function lockoutKey(user: { id: string } | null, identifier: string): string {
  return user ? userLockoutKey(user.id) : `identifier:${identifier}`;
}

function lockedError(lockedUntil: Date) {
  return new AppError(429, "Too many failed attempts. Try again in 15 minutes.", "LOGIN_LOCKED", {
    lockedUntil: lockedUntil.toISOString(),
  });
}

export class AuthService {
  async signup(input: SignupInput): Promise<VerificationDispatch> {
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new AppError(409, "An account with this email already exists.", "EMAIL_TAKEN");
    }

    let user: UserWithClient;
    try {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: await hashPassword(input.password),
          fullName: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          role: UserRole.CLIENT,
          status: UserStatus.PENDING_VERIFICATION,
          client: {
            create: { businessName: input.businessName.trim(), source: ClientSource.SELF_SIGNUP },
          },
        },
        include: { client: clientSelect },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError(409, "An account with this email already exists.", "EMAIL_TAKEN");
      }
      throw error;
    }

    logger.info({ userId: user.id, clientId: user.clientId }, "Client signed up");
    return this.dispatchVerificationCode({ id: user.id, email, fullName: user.fullName });
  }

  async resendVerification(rawEmail: string): Promise<VerificationDispatch> {
    const email = rawEmail.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, include: { client: clientSelect } });

    // Unknown or already-verified addresses get the same response, without sending anything.
    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      return { email, emailSent: true, resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS };
    }

    const cooldown = await getResendCooldownSeconds(user.id);
    if (cooldown > 0) {
      throw new AppError(429, `Please wait ${cooldown}s before requesting another code.`, "RESEND_COOLDOWN", {
        retryAfterSeconds: cooldown,
      });
    }
    return this.dispatchVerificationCode({ id: user.id, email, fullName: user.fullName });
  }

  async verifyEmail(rawEmail: string, code: string): Promise<AuthResult> {
    const email = rawEmail.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, include: { client: clientSelect } });

    if (!user) {
      throw new AppError(400, "The code is incorrect.", "INVALID_CODE");
    }
    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      throw new AppError(409, "This email is already verified. Please log in.", "ALREADY_VERIFIED");
    }

    const result = await checkVerificationCode(user.id, code);
    if (result === "expired") {
      throw new AppError(400, "The code has expired. Request a new one.", "CODE_EXPIRED");
    }
    if (result === "too_many_attempts") {
      throw new AppError(429, "Too many incorrect attempts. Request a new code.", "CODE_ATTEMPTS_EXCEEDED");
    }
    if (result === "invalid") {
      throw new AppError(400, "The code is incorrect.", "INVALID_CODE");
    }

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date(), lastSignedInAt: new Date() },
      include: { client: clientSelect },
    });
    logger.info({ userId: user.id }, "Email verified");

    return this.createSession(verified, true);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const identifier = input.identifier.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: identifierWhere(identifier),
      include: { client: clientSelect },
    });
    const lockKey = lockoutKey(user, identifier);

    const lock = await getLoginLockStatus(lockKey);
    if (lock.locked) throw lockedError(lock.lockedUntil);

    const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? (await dummyPasswordHash));

    if (!user || !passwordOk) {
      const afterFail = await recordFailedLoginAttempt(lockKey);
      if (afterFail.locked) throw lockedError(afterFail.lockedUntil);
      throw INVALID_CREDENTIALS();
    }

    // Account state is only revealed once the password is proven correct.
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(403, "Your account is suspended. Contact support.", "ACCOUNT_SUSPENDED");
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new AppError(403, "Please verify your email first.", "EMAIL_NOT_VERIFIED", { email: user.email });
    }

    await clearLoginLockout(lockKey);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { lastSignedInAt: new Date() },
      include: { client: clientSelect },
    });
    return this.createSession(updated, input.remember);
  }

  /** Rotates the refresh token. Reusing an already-rotated token revokes every session of that user. */
  async refresh(rawRefreshToken: string): Promise<AuthResult> {
    let payload;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw INVALID_REFRESH();
    }

    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
    if (!stored || stored.tokenHash !== sha256(rawRefreshToken) || stored.userId !== payload.sub) {
      throw INVALID_REFRESH();
    }
    if (stored.revokedAt) {
      await this.revokeAllSessions(stored.userId);
      logger.warn({ userId: stored.userId, tokenId: stored.id }, "Refresh token reuse detected; sessions revoked");
      throw INVALID_REFRESH();
    }
    if (stored.expiresAt < new Date()) {
      throw INVALID_REFRESH();
    }

    const user = await prisma.user.findUnique({
      where: { id: stored.userId },
      include: { client: clientSelect },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.revokeAllSessions(stored.userId);
      throw new AppError(403, "Your account is not active.", "ACCOUNT_INACTIVE");
    }

    const revoked = await prisma.refreshToken.updateMany({
      where: { id: stored.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) {
      // A concurrent request rotated this token first.
      throw INVALID_REFRESH();
    }

    return this.createSession(user, payload.remember);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) return;
    try {
      const payload = verifyRefreshToken(rawRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { id: payload.tokenId, tokenHash: sha256(rawRefreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // Invalid or expired token: nothing to revoke.
    }
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { client: clientSelect } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    }
    return toPublicUser(user);
  }

  /** Always resolves without revealing whether the account exists. */
  async requestPasswordReset(rawEmail: string): Promise<void> {
    const email = rawEmail.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !canUsePasswordLink(user.status)) {
      logger.info({ email }, "Password reset requested for unknown or suspended account");
      return;
    }

    const token = await createPasswordResetToken(user.id);
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await emailService.sendPasswordReset({
        to: email,
        fullName: user.fullName,
        resetLink,
        expiresInMinutes: RESET_TOKEN_TTL_SECONDS / 60,
      });
    } catch (error) {
      logger.error({ err: error, userId: user.id }, "Failed to send password reset email");
      if (!isProduction) {
        logger.warn({ resetLink }, "Password reset link (development fallback)");
      }
    }
  }

  /** `isInvite` is true for accounts that haven't set a password / verified their email yet. */
  async getPasswordResetPreview(token: string): Promise<{ email: string; isInvite: boolean }> {
    const userId = await getPasswordResetUserId(token);
    if (!userId) throw INVALID_RESET_LINK();
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, status: true } });
    if (!user?.email || !canUsePasswordLink(user.status)) throw INVALID_RESET_LINK();
    return { email: user.email, isInvite: user.status === UserStatus.PENDING_VERIFICATION };
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    const userId = await consumePasswordResetToken(token);
    if (!userId) throw INVALID_RESET_LINK();

    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!existing || !canUsePasswordLink(existing.status)) throw INVALID_RESET_LINK();

    // Opening the emailed link proves ownership of the address, so pending accounts become active.
    const activating = existing.status === UserStatus.PENDING_VERIFICATION;
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        lastSignedInAt: new Date(),
        ...(activating ? { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() } : {}),
      },
      include: { client: clientSelect },
    });
    await this.revokeAllSessions(user.id);
    await clearLoginLockout(userLockoutKey(user.id));
    logger.info({ userId: user.id, activated: activating }, "Password set from emailed link");

    return this.createSession(user, false);
  }

  /** Signed-in password change; every session is replaced by a fresh one for the current device. */
  async changePassword(userId: string, input: ChangePasswordInput, remember: boolean): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, status: true } });
    if (!existing || existing.status !== UserStatus.ACTIVE) {
      throw new AppError(401, "Authentication required", "UNAUTHORIZED");
    }
    if (await verifyPassword(input.newPassword, existing.passwordHash)) {
      throw new AppError(400, "Choose a password different from your current one.", "PASSWORD_UNCHANGED");
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(input.newPassword) },
      include: { client: clientSelect },
    });
    await this.revokeAllSessions(user.id);
    logger.info({ userId: user.id }, "Password changed");

    return this.createSession(user, remember);
  }

  /** Sets a password chosen by a Super Admin and signs the user out everywhere. */
  async setPasswordByAdmin(userId: string, newPassword: string): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(newPassword) } });
    await this.revokeAllSessions(userId);
    await clearLoginLockout(userLockoutKey(userId));
  }

  /** Emails an admin-created client a link to set their password. Returns whether the email was sent. */
  async sendInvite(user: { id: string; email: string; fullName: string }): Promise<boolean> {
    const token = await createPasswordResetToken(user.id, INVITE_TOKEN_TTL_SECONDS);
    const inviteLink = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
    try {
      await emailService.sendClientInvite({
        to: user.email,
        fullName: user.fullName,
        inviteLink,
        expiresInHours: INVITE_TOKEN_TTL_SECONDS / 3600,
      });
      return true;
    } catch (error) {
      logger.error({ err: error, userId: user.id }, "Failed to send invite email");
      if (!isProduction) {
        logger.warn({ email: user.email, inviteLink }, "Invite link (development fallback)");
      }
      return false;
    }
  }

  private async dispatchVerificationCode(user: {
    id: string;
    email: string;
    fullName: string;
  }): Promise<VerificationDispatch> {
    const code = generateVerificationCode();
    await storeVerificationCode(user.id, code);

    let emailSent = true;
    try {
      await emailService.sendVerificationCode({
        to: user.email,
        fullName: user.fullName,
        code,
        expiresInMinutes: VERIFICATION_CODE_TTL_SECONDS / 60,
      });
    } catch (error) {
      emailSent = false;
      logger.error({ err: error, userId: user.id }, "Failed to send verification email");
      if (!isProduction) {
        logger.warn({ email: user.email, code }, "Verification code (development fallback)");
      }
    }

    return { email: user.email, emailSent, resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS };
  }

  private async createSession(user: UserWithClient, remember: boolean): Promise<AuthResult> {
    const tokens = await this.issueTokens(user, remember);
    return { user: toPublicUser(user), tokens, remember };
  }

  private async issueTokens(user: User, remember: boolean): Promise<AuthTokens> {
    const tokenId = randomUUID();
    const refreshToken = signRefreshToken({ sub: user.id, tokenId, remember });
    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
    });

    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN)),
      },
    });

    return { accessToken, refreshToken };
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

export const authService = new AuthService();
