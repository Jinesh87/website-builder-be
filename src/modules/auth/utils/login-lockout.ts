import { redis } from "../../../config/redis.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;
const ATTEMPT_WINDOW_SECONDS = 15 * 60;

/**
 * `key` is the user id for known accounts, so an email and a username for the same account share one counter;
 * unknown identifiers are counted under the identifier itself.
 */
const attemptsKey = (key: string) => `auth:login:attempts:${key}`;
const lockKey = (key: string) => `auth:login:lock:${key}`;

export type LoginLockStatus = { locked: false } | { locked: true; lockedUntil: Date };

export async function getLoginLockStatus(key: string): Promise<LoginLockStatus> {
  const ttl = await redis.ttl(lockKey(key));
  return ttl > 0 ? { locked: true, lockedUntil: new Date(Date.now() + ttl * 1000) } : { locked: false };
}

export async function recordFailedLoginAttempt(key: string): Promise<LoginLockStatus> {
  const attempts = await redis.incr(attemptsKey(key));
  if (attempts === 1) {
    await redis.expire(attemptsKey(key), ATTEMPT_WINDOW_SECONDS);
  }
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    await redis.multi().set(lockKey(key), "1", "EX", LOCK_SECONDS).del(attemptsKey(key)).exec();
    return { locked: true, lockedUntil: new Date(Date.now() + LOCK_SECONDS * 1000) };
  }
  return { locked: false };
}

export async function clearLoginLockout(key: string): Promise<void> {
  await redis.del(attemptsKey(key), lockKey(key));
}
