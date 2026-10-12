import { randomUUID } from "node:crypto";
import { MediaKind } from "../../../common/constants/media.js";
import { UserRole } from "../../../common/constants/roles.js";
import { AppError } from "../../../common/errors/AppError.js";
import type { AuthUser } from "../../../common/middleware/authenticate.js";
import { deleteObject, putObject } from "../../../common/storage/object-storage.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { prisma } from "../../../config/prisma.js";
import type { MediaFile, Prisma } from "../../../generated/prisma/client.js";
import type {
  CreateFolderInput,
  FolderListQuery,
  GenerateVariationsInput,
  ImageSample,
  MediaFileView,
  MediaFolderView,
  MediaListQuery,
  MediaListResult,
  MediaUsage,
  StorageUsage,
  UpdateFolderInput,
  UpdateMediaInput,
  UploadedFile,
  UploadMediaInput,
} from "../types/media.types.js";
import { aiSettingsService } from "../../admin-settings/services/ai-settings.service.js";
import { detectFile, type DetectedFile } from "./file-signature.js";
import { generateImageVariations } from "./openai-image-variations.client.js";

const MB = 1024 * 1024;
const VARIATION_SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Largest accepted upload per kind; the multipart parser enforces the overall maximum. */
export const MAX_BYTES_BY_KIND: Record<MediaKind, number> = {
  [MediaKind.IMAGE]: 10 * MB,
  [MediaKind.VIDEO]: 50 * MB,
  [MediaKind.DOCUMENT]: 20 * MB,
};
export const MAX_UPLOAD_BYTES = Math.max(...Object.values(MAX_BYTES_BY_KIND));
export const CLIENT_STORAGE_LIMIT_BYTES = 1024 * MB;
const MAX_FOLDERS_PER_CLIENT = 50;

const NOT_FOUND = () => new AppError(404, "File not found", "MEDIA_NOT_FOUND");
const FOLDER_NOT_FOUND = () => new AppError(404, "Folder not found", "FOLDER_NOT_FOUND");

type MediaFileWithClient = MediaFile & { client: { businessName: string } };

export function mediaUrl(id: string): string {
  return `${env.API_PUBLIC_URL}/api/media/files/${id}`;
}

function toView(file: MediaFileWithClient): MediaFileView {
  return {
    id: file.id,
    clientId: file.clientId,
    clientName: file.client.businessName,
    websiteId: file.websiteId,
    folderId: file.folderId,
    kind: file.kind,
    fileName: file.fileName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    width: file.width,
    height: file.height,
    altText: file.altText,
    url: mediaUrl(file.id),
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

/** Display name only; storage keys never contain user input. */
function cleanFileName(raw: string, extension: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 255);
  return cleaned || `file.${extension}`;
}

function isAdmin(actor: AuthUser): boolean {
  return actor.role === UserRole.SUPER_ADMIN;
}

function ownClientId(actor: AuthUser): string {
  if (!actor.clientId) throw new AppError(403, "No client workspace for this account", "FORBIDDEN");
  return actor.clientId;
}

/** Clients always act on their own workspace; Super Admin must name the client. */
async function targetClientId(actor: AuthUser, requested: string | undefined): Promise<string> {
  if (!isAdmin(actor)) return ownClientId(actor);
  if (!requested) throw new AppError(400, "Choose a client for this file", "CLIENT_REQUIRED");
  const exists = await prisma.client.count({ where: { id: requested } });
  if (!exists) throw new AppError(404, "Client not found", "CLIENT_NOT_FOUND");
  return requested;
}

/** The single place that decides which media an actor may see or change. */
function scopeFor(actor: AuthUser): { clientId?: string } {
  return isAdmin(actor) ? {} : { clientId: ownClientId(actor) };
}

async function assertFolderBelongs(folderId: string, clientId: string): Promise<void> {
  const folder = await prisma.mediaFolder.count({ where: { id: folderId, clientId } });
  if (!folder) throw FOLDER_NOT_FOUND();
}

/**
 * Content stores media as `<API_PUBLIC_URL>/api/media/files/<id>`; matching on the path keeps this
 * working if the public URL changes. Only the owning client's content is searched, and older
 * (non-live) published versions are history, so they don't count.
 */
async function findUsages(mediaId: string, clientId: string): Promise<MediaUsage[]> {
  const pattern = `%/media/files/${mediaId}%`;
  return prisma.$queryRaw<MediaUsage[]>`
    SELECT 'PAGE' AS kind, w.id::text AS "websiteId", w.name AS "websiteName", p.name AS label
      FROM pages p JOIN websites w ON w.id = p."websiteId"
      WHERE p."clientId" = ${clientId}::uuid AND p.sections::text LIKE ${pattern}
    UNION ALL
    SELECT 'HEADER', w.id::text, w.name, NULL FROM websites w
      WHERE w."clientId" = ${clientId}::uuid AND w.header::text LIKE ${pattern}
    UNION ALL
    SELECT 'FOOTER', w.id::text, w.name, NULL FROM websites w
      WHERE w."clientId" = ${clientId}::uuid AND w.footer::text LIKE ${pattern}
    UNION ALL
    SELECT 'LOGO', w.id::text, w.name, NULL FROM websites w
      WHERE w."clientId" = ${clientId}::uuid AND w."logoMediaId" = ${mediaId}::uuid
    UNION ALL
    SELECT 'LIVE_SITE', w.id::text, w.name, NULL FROM websites w
      JOIN website_versions v ON v.id = w."liveVersionId"
      WHERE w."clientId" = ${clientId}::uuid AND v.snapshot::text LIKE ${pattern}
    UNION ALL
    SELECT 'TEMPLATE', NULL, NULL, t.name FROM website_templates t
      WHERE t."clientId" = ${clientId}::uuid
        AND (t.pages::text LIKE ${pattern} OR t.header::text LIKE ${pattern} OR t.footer::text LIKE ${pattern})
    UNION ALL
    SELECT 'SAVED_SECTION', NULL, NULL, s.name FROM saved_sections s
      WHERE s."clientId" = ${clientId}::uuid AND s.section::text LIKE ${pattern}
  `;
}

async function storageUsage(clientId: string): Promise<StorageUsage> {
  const { _sum } = await prisma.mediaFile.aggregate({ where: { clientId }, _sum: { sizeBytes: true } });
  return { usedBytes: _sum.sizeBytes ?? 0, limitBytes: CLIENT_STORAGE_LIMIT_BYTES };
}

export class MediaService {
  async list(query: MediaListQuery, actor: AuthUser): Promise<MediaListResult> {
    const clientId = isAdmin(actor) ? query.clientId : ownClientId(actor);
    const search = query.search?.trim();
    const where: Prisma.MediaFileWhereInput = {
      ...(clientId ? { clientId } : {}),
      ...(query.websiteId ? { websiteId: query.websiteId } : {}),
      ...(query.folderId ? { folderId: query.folderId === "none" ? null : query.folderId } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(search
        ? {
            OR: [
              { fileName: { contains: search, mode: "insensitive" } },
              { altText: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [files, total, usage] = await Promise.all([
      prisma.mediaFile.findMany({
        where,
        include: { client: { select: { businessName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.mediaFile.count({ where }),
      clientId ? storageUsage(clientId) : Promise.resolve(null),
    ]);

    return { files: files.map(toView), total, page: query.page, pageSize: query.pageSize, usage };
  }

  async upload(file: UploadedFile, input: UploadMediaInput, actor: AuthUser): Promise<MediaFileView> {
    const clientId = await targetClientId(actor, input.clientId);

    const detected = detectFile(file.buffer);
    if (!detected) {
      throw new AppError(
        415,
        "This file type isn't supported. Upload JPG, PNG, WebP, GIF or AVIF images, MP4 or WebM videos, or PDF documents.",
        "UNSUPPORTED_FILE_TYPE",
      );
    }
    const maxBytes = MAX_BYTES_BY_KIND[detected.kind];
    if (file.size > maxBytes) {
      throw new AppError(413, `This file is too large. The limit is ${maxBytes / MB} MB.`, "FILE_TOO_LARGE");
    }

    if (input.websiteId) {
      const website = await prisma.website.count({ where: { id: input.websiteId, clientId } });
      if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    }
    if (input.folderId) await assertFolderBelongs(input.folderId, clientId);

    return this.store(file, detected, {
      clientId,
      websiteId: input.websiteId ?? null,
      folderId: input.folderId ?? null,
      altText: input.altText ?? null,
      uploadedById: actor.id,
    });
  }

  /** Generates samples from an image without storing anything; the user saves the ones they want as uploads. */
  async generateVariations(file: UploadedFile, input: GenerateVariationsInput, actor: AuthUser): Promise<ImageSample[]> {
    const clientId = await targetClientId(actor, input.clientId);

    const detected = detectFile(file.buffer);
    if (!detected || !VARIATION_SOURCE_TYPES.has(detected.mimeType)) {
      throw new AppError(415, "Variations can only be made from JPG, PNG or WebP images.", "UNSUPPORTED_FILE_TYPE");
    }
    if (file.size > MAX_BYTES_BY_KIND[MediaKind.IMAGE]) {
      throw new AppError(413, `This file is too large. The limit is ${MAX_BYTES_BY_KIND[MediaKind.IMAGE] / MB} MB.`, "FILE_TOO_LARGE");
    }
    if (input.websiteId) {
      const website = await prisma.website.count({ where: { id: input.websiteId, clientId } });
      if (!website) throw new AppError(404, "Website not found", "WEBSITE_NOT_FOUND");
    }

    const { apiKey } = await aiSettingsService.getCredentials(clientId);
    if (!apiKey) {
      throw new AppError(503, "AI image generation isn't available yet. Ask the administrator to set it up.", "AI_NOT_CONFIGURED");
    }

    const images = await generateImageVariations(
      { apiKey, clientId, websiteId: input.websiteId ?? null, userId: actor.id },
      {
        source: { buffer: file.buffer, mimeType: detected.mimeType, fileName: `source.${detected.extension}` },
        count: input.count,
        instructions: input.instructions,
      },
    );
    return images.map((buffer) => ({ mimeType: "image/jpeg", data: buffer.toString("base64") }));
  }

  /** Saves an AI-generated image to the client's library, with the same checks as an upload. */
  async storeGeneratedImage(input: {
    clientId: string;
    websiteId: string | null;
    userId: string | null;
    buffer: Buffer;
    fileName: string;
    altText: string;
  }): Promise<MediaFileView> {
    const detected = detectFile(input.buffer);
    if (!detected || detected.kind !== MediaKind.IMAGE) {
      throw new AppError(502, "The AI returned an image in an unsupported format.", "AI_IMAGE_INVALID");
    }
    if (input.buffer.length > MAX_BYTES_BY_KIND[MediaKind.IMAGE]) {
      throw new AppError(502, "The AI returned an image that is too large to store.", "AI_IMAGE_TOO_LARGE");
    }
    const file = { buffer: input.buffer, size: input.buffer.length, originalName: input.fileName };
    return this.store(file, detected, {
      clientId: input.clientId,
      websiteId: input.websiteId,
      folderId: null,
      altText: input.altText,
      uploadedById: input.userId,
    });
  }

  private async store(
    file: Pick<UploadedFile, "buffer" | "size" | "originalName">,
    detected: DetectedFile,
    target: { clientId: string; websiteId: string | null; folderId: string | null; altText: string | null; uploadedById: string | null },
  ): Promise<MediaFileView> {
    const { clientId } = target;
    const usage = await storageUsage(clientId);
    if (usage.usedBytes + file.size > usage.limitBytes) {
      throw new AppError(409, "Your media storage is full. Delete some files first.", "STORAGE_LIMIT");
    }

    const id = randomUUID();
    const storageKey = `clients/${clientId}/media/${id}.${detected.extension}`;
    await putObject({ key: storageKey, body: file.buffer, contentType: detected.mimeType });

    try {
      const created = await prisma.mediaFile.create({
        data: {
          id,
          clientId,
          websiteId: target.websiteId,
          folderId: target.folderId,
          kind: detected.kind,
          fileName: cleanFileName(file.originalName, detected.extension),
          mimeType: detected.mimeType,
          sizeBytes: file.size,
          width: detected.width ?? null,
          height: detected.height ?? null,
          altText: target.altText?.trim().slice(0, 300) || null,
          storageKey,
          uploadedById: target.uploadedById,
        },
        include: { client: { select: { businessName: true } } },
      });
      return toView(created);
    } catch (error) {
      await deleteObject(storageKey).catch((cleanupError: unknown) =>
        logger.error({ err: cleanupError, storageKey }, "Failed to remove orphaned upload"),
      );
      throw error;
    }
  }

  async update(id: string, input: UpdateMediaInput, actor: AuthUser): Promise<MediaFileView> {
    const file = await prisma.mediaFile.findFirst({ where: { id, ...scopeFor(actor) } });
    if (!file) throw NOT_FOUND();
    if (input.folderId) await assertFolderBelongs(input.folderId, file.clientId);

    const updated = await prisma.mediaFile.update({
      where: { id: file.id },
      data: {
        ...(input.fileName !== undefined ? { fileName: cleanFileName(input.fileName, file.storageKey.split(".").pop() ?? "") } : {}),
        ...(input.altText !== undefined ? { altText: input.altText?.trim() || null } : {}),
        ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
      },
      include: { client: { select: { businessName: true } } },
    });
    return toView(updated);
  }

  async usage(id: string, actor: AuthUser): Promise<MediaUsage[]> {
    const file = await prisma.mediaFile.findFirst({ where: { id, ...scopeFor(actor) }, select: { id: true, clientId: true } });
    if (!file) throw NOT_FOUND();
    return findUsages(file.id, file.clientId);
  }

  /** Refuses while any draft, live site, template or saved section still references the file. */
  async remove(id: string, actor: AuthUser): Promise<void> {
    const file = await prisma.mediaFile.findFirst({
      where: { id, ...scopeFor(actor) },
      select: { id: true, clientId: true, storageKey: true },
    });
    if (!file) throw NOT_FOUND();
    const usages = await findUsages(file.id, file.clientId);
    if (usages.length > 0) {
      throw new AppError(409, "This file is still in use. Remove it from these places first.", "MEDIA_IN_USE", { usages });
    }
    await prisma.mediaFile.delete({ where: { id: file.id } });
    await deleteObject(file.storageKey).catch((error: unknown) =>
      logger.error({ err: error, storageKey: file.storageKey }, "Media row deleted but object removal failed"),
    );
  }

  /** Public lookup used to serve bytes; ids are random UUIDs and published sites embed them. */
  async findForDelivery(id: string): Promise<Pick<MediaFile, "storageKey" | "mimeType" | "sizeBytes" | "fileName" | "kind" | "updatedAt"> | null> {
    return prisma.mediaFile.findUnique({
      where: { id },
      select: { storageKey: true, mimeType: true, sizeBytes: true, fileName: true, kind: true, updatedAt: true },
    });
  }

  async listFolders(query: FolderListQuery, actor: AuthUser): Promise<MediaFolderView[]> {
    const clientId = isAdmin(actor) ? query.clientId : ownClientId(actor);
    if (!clientId) throw new AppError(400, "Choose a client to see folders", "CLIENT_REQUIRED");
    const folders = await prisma.mediaFolder.findMany({
      where: { clientId },
      include: { _count: { select: { files: true } } },
      orderBy: { name: "asc" },
    });
    return folders.map((folder) => ({
      id: folder.id,
      clientId: folder.clientId,
      name: folder.name,
      fileCount: folder._count.files,
      createdAt: folder.createdAt,
    }));
  }

  async createFolder(input: CreateFolderInput, actor: AuthUser): Promise<MediaFolderView> {
    const clientId = await targetClientId(actor, input.clientId);
    const name = input.name.trim();
    const [count, duplicate] = await Promise.all([
      prisma.mediaFolder.count({ where: { clientId } }),
      prisma.mediaFolder.count({ where: { clientId, name: { equals: name, mode: "insensitive" } } }),
    ]);
    if (count >= MAX_FOLDERS_PER_CLIENT) {
      throw new AppError(409, `You can have up to ${MAX_FOLDERS_PER_CLIENT} folders.`, "FOLDER_LIMIT");
    }
    if (duplicate) throw new AppError(409, "A folder with this name already exists", "FOLDER_EXISTS");

    const folder = await prisma.mediaFolder.create({ data: { clientId, name } });
    return { id: folder.id, clientId, name: folder.name, fileCount: 0, createdAt: folder.createdAt };
  }

  async renameFolder(folderId: string, input: UpdateFolderInput, actor: AuthUser): Promise<MediaFolderView> {
    const folder = await prisma.mediaFolder.findFirst({ where: { id: folderId, ...scopeFor(actor) } });
    if (!folder) throw FOLDER_NOT_FOUND();
    const name = input.name.trim();
    const duplicate = await prisma.mediaFolder.count({
      where: { clientId: folder.clientId, id: { not: folder.id }, name: { equals: name, mode: "insensitive" } },
    });
    if (duplicate) throw new AppError(409, "A folder with this name already exists", "FOLDER_EXISTS");

    const updated = await prisma.mediaFolder.update({
      where: { id: folder.id },
      data: { name },
      include: { _count: { select: { files: true } } },
    });
    return { id: updated.id, clientId: updated.clientId, name: updated.name, fileCount: updated._count.files, createdAt: updated.createdAt };
  }

  /** Files in the folder stay in the library, just without a folder. */
  async deleteFolder(folderId: string, actor: AuthUser): Promise<void> {
    const { count } = await prisma.mediaFolder.deleteMany({ where: { id: folderId, ...scopeFor(actor) } });
    if (count === 0) throw FOLDER_NOT_FOUND();
  }
}

export const mediaService = new MediaService();
