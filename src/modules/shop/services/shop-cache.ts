import { DomainStatus } from "../../../common/constants/website.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";

/** Published pages bake the catalogue into HTML, so a shop change has to drop that cache. */
export function purgeShopPages(websiteId: string): void {
  void (async () => {
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: {
        subdomain: true,
        domains: { where: { status: DomainStatus.ACTIVE }, select: { hostname: true } },
      },
    });
    if (!website) return;
    // Loaded on demand so the live-site engine can call the shop catalogue without a startup cycle.
    const { liveSiteEngineService } = await import("../../websites/services/live-site-engine.service.js");
    await liveSiteEngineService.purgeWebsiteCache(
      website.subdomain,
      website.domains.map((domain) => domain.hostname),
    );
  })().catch((error: unknown) => {
    logger.warn({ err: error, websiteId }, "Shop page cache was not cleared");
  });
}
