import { randomInt, timingSafeEqual } from "node:crypto";
import { sha256 } from "../../../common/utils/hash.js";
import { redis } from "../../../config/redis.js";

export const VERIFICATION_CODE_TTL_SECONDS = 10 * 60;
export const RESEND_COOLDOWN_SECONDS = 45;
const MAX_ATTEMPTS = 5;

/** Each purpose has its own keys, so a signup code can never confirm an email change (or the reverse). */
export type VerificationPurpose = "signup" | "email-change";

const KEY_PREFIX: Record<VerificationPurpose, string> = {
  signup: "auth:verify",
  "email-change": "auth:email-change",
};

const codeKey = (userId: string, purpose: VerificationPurpose) => `${KEY_PREFIX[purpose]}:code:${userId}`;
const attemptsKey = (userId: string, purpose: VerificationPurpose) => `${KEY_PREFIX[purpose]}:attempts:${userId}`;
const cooldownKey = (userId: string, purpose: VerificationPurpose) => `${KEY_PREFIX[purpose]}:cooldown:${userId}`;

export function generateVerificationCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

/** Seconds left before another code may be sent; 0 when allowed. */
export async function getResendCooldownSeconds(
  userId: string,
  purpose: VerificationPurpose = "signup",
): Promise<number> {
  const ttl = await redis.ttl(cooldownKey(userId, purpose));
  return ttl > 0 ? ttl : 0;
}

/** Stores only a hash of the code; replaces any previous code and resets attempts. */
export async function storeVerificationCode(
  userId: string,
  code: string,
  purpose: VerificationPurpose = "signup",
): Promise<void> {
  await redis
    .multi()
    .set(codeKey(userId, purpose), sha256(code), "EX", VERIFICATION_CODE_TTL_SECONDS)
    .del(attemptsKey(userId, purpose))
    .set(cooldownKey(userId, purpose), "1", "EX", RESEND_COOLDOWN_SECONDS)
    .exec();
}

export type VerifyCodeResult = "valid" | "invalid" | "expired" | "too_many_attempts";

export async function checkVerificationCode(
  userId: string,
  code: string,
  purpose: VerificationPurpose = "signup",
): Promise<VerifyCodeResult> {
  const storedHash = await redis.get(codeKey(userId, purpose));
  if (!storedHash) return "expired";

  const attempts = await redis.incr(attemptsKey(userId, purpose));
  if (attempts === 1) {
    await redis.expire(attemptsKey(userId, purpose), VERIFICATION_CODE_TTL_SECONDS);
  }
  if (attempts > MAX_ATTEMPTS) {
    await clearVerificationCode(userId, purpose);
    return "too_many_attempts";
  }

  const matches = timingSafeEqual(Buffer.from(storedHash), Buffer.from(sha256(code.trim())));
  if (!matches) return "invalid";

  await clearVerificationCode(userId, purpose);
  return "valid";
}

export async function clearVerificationCode(userId: string, purpose: VerificationPurpose = "signup"): Promise<void> {
  await redis.del(codeKey(userId, purpose), attemptsKey(userId, purpose));
}
