import { redis } from "../../../config/redis.js";
import { VERIFICATION_CODE_TTL_SECONDS } from "./verification-code.js";

/** The address a signed-in user asked to switch to, held until they confirm the emailed code. */
const pendingKey = (userId: string) => `auth:email-change:pending:${userId}`;

export async function storePendingEmail(userId: string, email: string): Promise<void> {
  await redis.set(pendingKey(userId), email, "EX", VERIFICATION_CODE_TTL_SECONDS);
}

export async function getPendingEmail(userId: string): Promise<string | null> {
  return redis.get(pendingKey(userId));
}

export async function clearPendingEmail(userId: string): Promise<void> {
  await redis.del(pendingKey(userId));
}
