import { redis } from "../../../config/redis.js";
import { logger } from "../../../config/logger.js";

/** How long a checkout keeps stock reserved before other shoppers can take it. */
export const SHOP_STOCK_HOLD_TTL_SECONDS = 10 * 60;

const holdsKey = (websiteId: string, variantId: string) => `shop:stock:holds:${websiteId}:${variantId}`;

/**
 * ZSET member `{orderId}|{qty}` with score = expiry time (ms).
 * Expired members are dropped whenever we reserve or read reserved qty.
 */
const RESERVE_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local orderId = ARGV[2]
local qty = tonumber(ARGV[3])
local stock = tonumber(ARGV[4])
local ttlMs = tonumber(ARGV[5])
local expiry = now + ttlMs
local prefix = orderId .. '|'

redis.call('ZREMRANGEBYSCORE', key, '-inf', now)

local members = redis.call('ZRANGE', key, 0, -1)
for _, member in ipairs(members) do
  if string.sub(member, 1, #prefix) == prefix then
    redis.call('ZREM', key, member)
  end
end

members = redis.call('ZRANGE', key, 0, -1)
local reserved = 0
for _, member in ipairs(members) do
  local q = string.match(member, '|(%d+)$')
  reserved = reserved + tonumber(q or '0')
end

if stock - reserved < qty then
  return 0
end

redis.call('ZADD', key, expiry, orderId .. '|' .. tostring(qty))
redis.call('PEXPIRE', key, ttlMs + 60000)
return 1
`;

const RELEASE_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local orderId = ARGV[2]
local prefix = orderId .. '|'

redis.call('ZREMRANGEBYSCORE', key, '-inf', now)

local members = redis.call('ZRANGE', key, 0, -1)
local removed = 0
for _, member in ipairs(members) do
  if string.sub(member, 1, #prefix) == prefix then
    removed = removed + redis.call('ZREM', key, member)
  end
end
return removed
`;

const RESERVED_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
redis.call('ZREMRANGEBYSCORE', key, '-inf', now)
local members = redis.call('ZRANGE', key, 0, -1)
local reserved = 0
for _, member in ipairs(members) do
  local q = string.match(member, '|(%d+)$')
  reserved = reserved + tonumber(q or '0')
end
return reserved
`;

export type StockHoldLine = { variantId: string; quantity: number; productName: string };

/**
 * How many units of this variant are currently held by in-progress checkouts.
 * Returns 0 if Redis is unavailable (availability checks then rely on DB stock only).
 */
export async function getReservedQty(websiteId: string, variantId: string): Promise<number> {
  try {
    const reserved = await redis.eval(RESERVED_SCRIPT, 1, holdsKey(websiteId, variantId), Date.now());
    return Number(reserved) || 0;
  } catch (error) {
    logger.warn({ err: error, websiteId, variantId }, "Shop stock reserved qty read failed");
    return 0;
  }
}

/**
 * Reserves cart lines for `orderId` for {@link SHOP_STOCK_HOLD_TTL_SECONDS}.
 * Rolls back any lines already reserved for this order if a later line cannot be held.
 */
export async function reserveStockForOrder(
  websiteId: string,
  orderId: string,
  lines: StockHoldLine[],
  onHandByVariant: Map<string, number>,
): Promise<{ ok: true } | { ok: false; productName: string }> {
  const reserved: string[] = [];
  const ttlMs = SHOP_STOCK_HOLD_TTL_SECONDS * 1000;
  const now = Date.now();

  try {
    for (const line of lines) {
      const stock = onHandByVariant.get(line.variantId) ?? 0;
      const result = await redis.eval(
        RESERVE_SCRIPT,
        1,
        holdsKey(websiteId, line.variantId),
        now,
        orderId,
        line.quantity,
        stock,
        ttlMs,
      );
      if (Number(result) !== 1) {
        await releaseStockForOrder(websiteId, orderId, reserved.map((variantId) => ({ variantId })));
        return { ok: false, productName: line.productName };
      }
      reserved.push(line.variantId);
    }
    return { ok: true };
  } catch (error) {
    logger.error({ err: error, websiteId, orderId }, "Shop stock reserve failed");
    await releaseStockForOrder(websiteId, orderId, reserved.map((variantId) => ({ variantId }))).catch(() => undefined);
    throw error;
  }
}

/** Drops this order's holds so other shoppers can buy the units again. */
export async function releaseStockForOrder(
  websiteId: string,
  orderId: string,
  lines: { variantId: string | null }[],
): Promise<void> {
  const now = Date.now();
  const variantIds = [...new Set(lines.map((line) => line.variantId).filter((id): id is string => Boolean(id)))];
  if (variantIds.length === 0) return;
  try {
    await Promise.all(
      variantIds.map((variantId) => redis.eval(RELEASE_SCRIPT, 1, holdsKey(websiteId, variantId), now, orderId)),
    );
  } catch (error) {
    logger.warn({ err: error, websiteId, orderId }, "Shop stock hold release failed");
  }
}
