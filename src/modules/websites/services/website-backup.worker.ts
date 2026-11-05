import { randomUUID } from "node:crypto";
import { logger } from "../../../config/logger.js";
import { redis } from "../../../config/redis.js";
import { websiteBackupService } from "./website-backup.service.js";

const INTERVAL_MS = 6 * 60 * 60 * 1000;
const FIRST_RUN_DELAY_MS = 60 * 1000;
const LOCK_KEY = "website-backup:lock";
const LOCK_TTL_MS = 5 * 60 * 1000;

const RELEASE_SCRIPT = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;

class WebsiteBackupWorker {
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
      logger.warn({ err: error }, "Website backup lock unavailable; running without it");
    }
    try {
      if (locked) await websiteBackupService.runOnce();
    } catch (error) {
      logger.error({ err: error }, "Website backup pass failed");
    } finally {
      if (locked) await redis.eval(RELEASE_SCRIPT, 1, LOCK_KEY, token).catch(() => undefined);
      this.running = false;
    }
  }
}

export const websiteBackupWorker = new WebsiteBackupWorker();
