import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { deleteObject } from "../../../common/storage/object-storage.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import type { MediaBulkDeleteResult } from "../types/media.types.js";
import { scopeFor } from "./media.service.js";
import { usedMediaIds } from "./media-usage.js";

/** Deleting several library files at once. */
export class MediaBulkService {
  /**
   * Deletes the chosen files the actor may manage, keeping any that a page, site, template or saved
   * section still uses (the same rule as deleting one file). Ids the actor can't see are ignored.
   */
  async remove(ids: string[], actor: AuthUser): Promise<MediaBulkDeleteResult> {
    const files = await prisma.mediaFile.findMany({
      where: { id: { in: ids }, ...scopeFor(actor) },
      select: { id: true, clientId: true, fileName: true, sizeBytes: true, storageKey: true, client: { select: { isInternal: true } } },
    });

    // One usage search per client among the chosen files.
    const clients = new Map(files.map((file) => [file.clientId, file.client.isInternal]));
    const usedByClient = new Map(
      await Promise.all([...clients].map(async ([clientId, internal]) => [clientId, await usedMediaIds(clientId, internal)] as const)),
    );
    const kept = files.filter((file) => usedByClient.get(file.clientId)?.has(file.id));
    const doomed = files.filter((file) => !usedByClient.get(file.clientId)?.has(file.id));

    if (doomed.length > 0) {
      await prisma.mediaFile.deleteMany({ where: { id: { in: doomed.map((file) => file.id) } } });
      await Promise.all(
        doomed.map((file) =>
          deleteObject(file.storageKey).catch((error: unknown) =>
            logger.error({ err: error, storageKey: file.storageKey }, "Media row deleted but object removal failed"),
          ),
        ),
      );
    }
    return {
      deleted: doomed.length,
      freedBytes: doomed.reduce((sum, file) => sum + file.sizeBytes, 0),
      kept: kept.map((file) => ({ id: file.id, fileName: file.fileName })),
    };
  }
}

export const mediaBulkService = new MediaBulkService();
