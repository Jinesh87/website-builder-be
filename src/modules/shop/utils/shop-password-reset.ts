import { randomBytes } from "node:crypto";
import { sha256 } from "../../../common/utils/hash.js";
import { redis } from "../../../config/redis.js";

export const SHOP_RESET_TOKEN_TTL_SECONDS = 60 * 60;

const tokenKey = (tokenHash: string) => `shop:reset:token:${tokenHash}`;
const customerKey = (customerId: string) => `shop:reset:customer:${customerId}`;

export async function createShopPasswordResetToken(customerId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const previousHash = await redis.get(customerKey(customerId));
  const tx = redis.multi();
  if (previousHash) tx.del(tokenKey(previousHash));
  tx.set(tokenKey(tokenHash), customerId, "EX", SHOP_RESET_TOKEN_TTL_SECONDS);
  tx.set(customerKey(customerId), tokenHash, "EX", SHOP_RESET_TOKEN_TTL_SECONDS);
  await tx.exec();
  return token;
}

export async function consumeShopPasswordResetToken(token: string): Promise<string | null> {
  const tokenHash = sha256(token);
  const customerId = await redis.getdel(tokenKey(tokenHash));
  if (customerId) await redis.del(customerKey(customerId));
  return customerId;
}
