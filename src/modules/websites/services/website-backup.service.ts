import { WebsiteStatus } from "../../../common/constants/website.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import { PublishStatus, Prisma, WebsiteVersionSource } from "../../../generated/prisma/client.js";

type BackupCandidate = {
  id: string;
  name: string;
  status: WebsiteStatus;
  publishedAt: Date | null;
  client: { websiteBackupDaysOverride: number | null; isInternal: boolean };
  hosting: { package: { websiteBackupDays: number | null } | null } | null;
  liveVersion: { id: string; snapshot: Prisma.JsonValue; createdAt: Date } | null;
};

function effectiveBackupDays(website: BackupCandidate): number | null {
  const override = website.client.websiteBackupDaysOverride;
  if (override !== null) return override;
  return website.hosting?.package?.websiteBackupDays ?? null;
}

function shouldBackup(now: Date, baseline: Date, days: number): boolean {
  const ms = days * 24 * 60 * 60 * 1000;
  return now.getTime() - baseline.getTime() >= ms;
}

export class WebsiteBackupService {
  async runOnce(now = new Date()): Promise<{ scanned: number; backedUp: number }> {
    const websites = await prisma.website.findMany({
      where: { status: WebsiteStatus.PUBLISHED, liveVersionId: { not: null }, client: { isInternal: false } },
      select: {
        id: true,
        name: true,
        status: true,
        publishedAt: true,
        client: { select: { websiteBackupDaysOverride: true, isInternal: true } },
        hosting: { select: { package: { select: { websiteBackupDays: true } } } },
        liveVersion: { select: { id: true, snapshot: true, createdAt: true } },
      },
    });

    let backedUp = 0;
    for (const website of websites as BackupCandidate[]) {
      const liveVersion = website.liveVersion;
      if (!liveVersion || website.client.isInternal) continue;
      const everyDays = effectiveBackupDays(website);
      if (!everyDays || everyDays < 1) continue;

      const lastBackup = await prisma.websiteVersion.findFirst({
        where: {
          websiteId: website.id,
          source: WebsiteVersionSource.BACKUP,
          status: PublishStatus.SUCCEEDED,
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      const baseline = lastBackup?.createdAt ?? website.publishedAt ?? liveVersion.createdAt;
      if (!shouldBackup(now, baseline, everyDays)) continue;

      await prisma.$transaction(async (tx) => {
        const latest = await tx.websiteVersion.aggregate({ where: { websiteId: website.id }, _max: { version: true } });
        const nextVersion = (latest._max.version ?? 0) + 1;
        await tx.websiteVersion.create({
          data: {
            websiteId: website.id,
            version: nextVersion,
            status: PublishStatus.SUCCEEDED,
            source: WebsiteVersionSource.BACKUP,
            snapshot: liveVersion.snapshot as Prisma.InputJsonValue,
            completedAt: now,
          },
        });
      });
      backedUp += 1;
    }

    logger.info({ scanned: websites.length, backedUp }, "Website backup pass completed");
    return { scanned: websites.length, backedUp };
  }
}

export const websiteBackupService = new WebsiteBackupService();
