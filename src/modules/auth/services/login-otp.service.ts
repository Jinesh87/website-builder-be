import { randomUUID } from "node:crypto";
import { AppError } from "../../../common/errors/AppError.js";
import { isProduction } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { redis } from "../../../config/redis.js";
import { emailService } from "../../email/services/email.service.js";
import type { LoginOtpChallenge } from "../types/auth.types.js";
import {
  assertCodeAccepted,
  checkVerificationCode,
  clearVerificationCode,
  generateVerificationCode,
  getResendCooldownSeconds,
  RESEND_COOLDOWN_SECONDS,
  storeVerificationCode,
  VERIFICATION_CODE_TTL_SECONDS,
} from "../utils/verification-code.js";
import { loginOtpRecipientsService } from "./login-otp-recipients.service.js";

/** What a password-verified login is waiting on; the session is only issued once the code matches. */
type PendingLogin = { userId: string; remember: boolean };

type OtpUser = { id: string; email: string | null; fullName: string; role: string };

const challengeKey = (challengeId: string) => `auth:login-otp:challenge:${challengeId}`;

const CHALLENGE_EXPIRED = () =>
  new AppError(400, "Your login code has expired. Please log in again.", "LOGIN_CHALLENGE_EXPIRED");

/** "john.doe@gmail.com" -> "jo•••@gmail.com", so the login page can say where codes went without leaking the list. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, Math.min(2, local.length))}•••@${domain}`;
}

async function loadChallenge(challengeId: string): Promise<PendingLogin> {
  const raw = await redis.get(challengeKey(challengeId));
  if (!raw) throw CHALLENGE_EXPIRED();
  return JSON.parse(raw) as PendingLogin;
}

async function clearChallenge(challengeId: string): Promise<void> {
  await Promise.all([redis.del(challengeKey(challengeId)), clearVerificationCode(challengeId, "login")]);
}

/** Sends one code to every recipient. Fails only when no inbox could be reached (outside production the code is logged instead). */
async function sendCode(challengeId: string, user: OtpUser): Promise<string[]> {
  const recipients = await loginOtpRecipientsService.recipientsFor(user);
  const code = generateVerificationCode();
  await storeVerificationCode(challengeId, code, "login");

  const results = await Promise.allSettled(
    recipients.map((to) =>
      emailService.sendLoginOtp({
        to,
        fullName: user.fullName,
        code,
        expiresInMinutes: VERIFICATION_CODE_TTL_SECONDS / 60,
        accountEmail: user.email ?? "",
      }),
    ),
  );
  const sent = recipients.filter((_, index) => results[index].status === "fulfilled");
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      logger.error({ err: result.reason, userId: user.id, to: recipients[index] }, "Failed to send login code");
    }
  });

  if (!isProduction) {
    // Lets the OTP flow be tested locally without a working mail setup.
    logger.warn({ userId: user.id, recipients, code }, "Login code (development only)");
    return recipients;
  }
  if (sent.length === 0) {
    await clearChallenge(challengeId);
    throw new AppError(503, "We couldn't send your login code. Please try again shortly.", "LOGIN_OTP_SEND_FAILED");
  }
  return sent;
}

function toChallenge(challengeId: string, sentTo: string[]): LoginOtpChallenge {
  return {
    otpRequired: true,
    challengeId,
    sentTo: sentTo.map(maskEmail),
    expiresInMinutes: VERIFICATION_CODE_TTL_SECONDS / 60,
    resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
  };
}

export class LoginOtpService {
  /** Called after the password is verified: parks the login and emails the code. */
  async start(user: OtpUser, remember: boolean): Promise<LoginOtpChallenge> {
    const challengeId = randomUUID();
    const pending: PendingLogin = { userId: user.id, remember };
    await redis.set(challengeKey(challengeId), JSON.stringify(pending), "EX", VERIFICATION_CODE_TTL_SECONDS);
    const sentTo = await sendCode(challengeId, user);
    logger.info({ userId: user.id, recipients: sentTo.length }, "Login code sent");
    return toChallenge(challengeId, sentTo);
  }

  async resend(challengeId: string, loadUser: (userId: string) => Promise<OtpUser>): Promise<LoginOtpChallenge> {
    const pending = await loadChallenge(challengeId);
    const cooldown = await getResendCooldownSeconds(challengeId, "login");
    if (cooldown > 0) {
      throw new AppError(429, `Please wait ${cooldown}s before requesting another code.`, "RESEND_COOLDOWN", {
        retryAfterSeconds: cooldown,
      });
    }
    const user = await loadUser(pending.userId);
    // A new code gets the full lifetime, so the pending login must last as long.
    await redis.expire(challengeKey(challengeId), VERIFICATION_CODE_TTL_SECONDS);
    return toChallenge(challengeId, await sendCode(challengeId, user));
  }

  /**
   * Checks the code and ends the challenge on success. `onWrongCode` lets the caller count the miss
   * toward the account's login lockout, so codes can't be brute-forced by restarting logins.
   */
  async verify(challengeId: string, code: string, onWrongCode: (userId: string) => Promise<void>): Promise<PendingLogin> {
    const pending = await loadChallenge(challengeId);
    const result = await checkVerificationCode(challengeId, code, "login");
    if (result === "invalid") await onWrongCode(pending.userId);
    if (result === "too_many_attempts" || result === "expired") await clearChallenge(challengeId);
    assertCodeAccepted(result);
    await clearChallenge(challengeId);
    return pending;
  }
}

export const loginOtpService = new LoginOtpService();
