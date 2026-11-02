import { redis } from "../../../config/redis.js";
import { VERIFICATION_CODE_TTL_SECONDS } from "../../auth/utils/verification-code.js";

/** Signup details kept in Redis until the email OTP is confirmed. No ShopCustomer row yet. */
export type PendingShopSignup = {
  websiteId: string;
  clientId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
};

const pendingKey = (websiteId: string, email: string) =>
  `shop:pending-signup:${websiteId}:${email.toLowerCase()}`;

/** Stable id for OTP / cooldown keys (not a real customer id). */
export function pendingSignupSubject(websiteId: string, email: string): string {
  return `pending:${websiteId}:${email.toLowerCase()}`;
}

export async function storePendingShopSignup(data: PendingShopSignup): Promise<void> {
  await redis.set(
    pendingKey(data.websiteId, data.email),
    JSON.stringify({
      ...data,
      email: data.email.toLowerCase(),
    } satisfies PendingShopSignup),
    "EX",
    VERIFICATION_CODE_TTL_SECONDS,
  );
}

export async function getPendingShopSignup(
  websiteId: string,
  email: string,
): Promise<PendingShopSignup | null> {
  const raw = await redis.get(pendingKey(websiteId, email));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingShopSignup;
    if (!parsed?.email || !parsed?.passwordHash || !parsed?.fullName) return null;
    if (parsed.websiteId !== websiteId) return null;
    return { ...parsed, email: parsed.email.toLowerCase() };
  } catch {
    return null;
  }
}

export async function clearPendingShopSignup(websiteId: string, email: string): Promise<void> {
  await redis.del(pendingKey(websiteId, email));
}
