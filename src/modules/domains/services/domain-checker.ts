import { logger } from "../../../config/logger.js";
import { domainService } from "./domain.service.js";

const INTERVAL_MS = 5 * 60 * 1000;

/** Re-checks pending domains every few minutes so they go live without the client clicking Verify. */
class DomainChecker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await domainService.checkPending();
    } catch (error) {
      logger.warn({ err: error }, "Pending domain check failed");
    } finally {
      this.running = false;
    }
  }
}

export const domainChecker = new DomainChecker();
