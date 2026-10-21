import { randomUUID } from "node:crypto";
import { logger } from "../../../config/logger.js";
import { redis } from "../../../config/redis.js";
import { hostingBillingService } from "./hosting-billing.service.js";

const INTERVAL_MS = 10 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 30 * 1000;
const LOCK_KEY = "hosting-billing:lock";
const LOCK_TTL_MS = 9 * 60 * 1000;

/** Releases the lock only if this instance still holds it. */
const RELEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

/**
 * Runs hosting billing every few minutes. The Redis lock keeps API instances from duplicating work;
 * if Redis is down the pass still runs, because every billing step is idempotent.
 */
class HostingBillingWorker {
  private timer: NodeJS.Timeout | null = null;
  private firstRun: NodeJS.Timeout | null = null;
  private running = false;

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
    if (this.running) return;
    this.running = true;
    const token = randomUUID();
    let locked = true;
    try {
      locked = (await redis.set(LOCK_KEY, token, "PX", LOCK_TTL_MS, "NX")) === "OK";
    } catch (error) {
      logger.warn({ err: error }, "Hosting billing lock unavailable; running without it");
    }
    try {
      if (locked) await hostingBillingService.runOnce();
    } catch (error) {
      logger.error({ err: error }, "Hosting billing pass failed");
    } finally {
      if (locked) await redis.eval(RELEASE_SCRIPT, 1, LOCK_KEY, token).catch(() => undefined);
      this.running = false;
    }
  }
}

export const hostingBillingWorker = new HostingBillingWorker();
