import { logger } from "../../../config/logger.js";
import { redis } from "../../../config/redis.js";
import { refreshExpiringShopTokens } from "./shop-razorpay-auth.js";

const INTERVAL_MS = 6 * 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 2 * 60 * 1000;
const LOCK_KEY = "shop-razorpay-tokens:lock";
const LOCK_TTL_MS = 30 * 60 * 1000;

/**
 * Refreshes Razorpay OAuth tokens before they expire. Refresh tokens last 180 days, so a shop with no orders
 * would otherwise lose its connection. The Redis lock keeps two API instances from refreshing the same token.
 */
class ShopRazorpayTokenWorker {
  private timer: NodeJS.Timeout | null = null;
  private firstRun: NodeJS.Timeout | null = null;

  start(): void {
    if (this.timer) return;
    this.firstRun = setTimeout(() => void this.tick(), FIRST_RUN_DELAY_MS);
    this.firstRun.unref();
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.firstRun) clearTimeout(this.firstRun);
    if (this.timer) clearInterval(this.timer);
    this.firstRun = null;
    this.timer = null;
  }

  private async tick(): Promise<void> {
    try {
      if ((await redis.set(LOCK_KEY, "1", "PX", LOCK_TTL_MS, "NX")) !== "OK") return;
    } catch (error) {
      // Without Redis, skip: a token refreshed twice at once would break, and the next run catches up.
      logger.warn({ err: error }, "Shop Razorpay token refresh skipped: lock unavailable");
      return;
    }
    try {
      await refreshExpiringShopTokens();
    } catch (error) {
      logger.error({ err: error }, "Shop Razorpay token refresh pass failed");
    } finally {
      await redis.del(LOCK_KEY).catch(() => undefined);
    }
  }
}

export const shopRazorpayTokenWorker = new ShopRazorpayTokenWorker();
