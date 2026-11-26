import { prisma } from "../../../config/prisma.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import type { MediaClientList, MediaClientQuery } from "../types/media.types.js";
import { storageUsage } from "./media.service.js";

export const MEDIA_CLIENTS_PAGE_SIZE = 24;

/** Super Admin's way into the media library: one card per client, with how many files and how much storage. */
export class MediaClientsService {
  async list(query: MediaClientQuery): Promise<MediaClientList> {
    const search = query.search?.trim();
    const where: Prisma.ClientWhereInput = {
      ...(query.id ? { id: query.id } : {}),
      ...(search ? { businessName: { contains: search, mode: "insensitive" } } : {}),
    };
    const total = await prisma.client.count({ where });
    const pages = Math.max(1, Math.ceil(total / MEDIA_CLIENTS_PAGE_SIZE));
    const page = Math.min(Math.max(1, query.page ?? 1), pages);
    const rows = await prisma.client.findMany({
      where,
      // The Template Studio first, then clients A–Z.
      orderBy: [{ isInternal: "desc" }, { businessName: "asc" }, { id: "asc" }],
      skip: (page - 1) * MEDIA_CLIENTS_PAGE_SIZE,
      take: MEDIA_CLIENTS_PAGE_SIZE,
      select: { id: true, businessName: true, isInternal: true, _count: { select: { mediaFiles: true } } },
    });
    const usage = await Promise.all(rows.map((row) => storageUsage(row.id)));
    return {
      clients: rows.map((row, index) => ({
        id: row.id,
        name: row.businessName,
        internal: row.isInternal,
        files: row._count.mediaFiles,
        usedBytes: usage[index].usedBytes,
        limitBytes: usage[index].limitBytes,
      })),
      page,
      pageSize: MEDIA_CLIENTS_PAGE_SIZE,
      total,
    };
  }
}

export const mediaClientsService = new MediaClientsService();
