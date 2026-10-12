import { pipeline } from "node:stream/promises";
import type { NextFunction, Request, Response } from "express";
import { MediaKind } from "../../../common/constants/media.js";
import { AppError } from "../../../common/errors/AppError.js";
import { openObjectStream, type ByteRange } from "../../../common/storage/object-storage.js";
import { mediaService } from "../services/media.service.js";
import type { FolderListQuery, GenerateVariationsInput, MediaListQuery } from "../types/media.types.js";

type IdParams = { id: string };
type FolderParams = { folderId: string };

const CACHE_SECONDS = 30 * 24 * 60 * 60;

/** Parses a single `bytes=` range; multi-range requests are answered with the whole file. */
function parseRange(header: string | undefined, size: number): ByteRange | "invalid" | undefined {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (!match[1] && !match[2])) return undefined;
  const start = match[1] ? Number(match[1]) : Math.max(size - Number(match[2]), 0);
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  return start > end || start >= size ? "invalid" : { start, end };
}

export class MediaController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await mediaService.list(req.query as unknown as MediaListQuery, req.user!));
    } catch (error) {
      next(error);
    }
  };

  upload = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, "Choose a file to upload", "NO_FILE");
      const file = { buffer: req.file.buffer, originalName: req.file.originalname, size: req.file.size };
      res.status(201).json({ file: await mediaService.upload(file, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  generateVariations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, "Choose an image", "NO_FILE");
      const file = { buffer: req.file.buffer, originalName: req.file.originalname, size: req.file.size };
      res.json({ samples: await mediaService.generateVariations(file, req.body as GenerateVariationsInput, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ file: await mediaService.update(req.params.id, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  usage = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ usages: await mediaService.usage(req.params.id, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  remove = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      await mediaService.remove(req.params.id, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  listFolders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ folders: await mediaService.listFolders(req.query as FolderListQuery, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  createFolder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ folder: await mediaService.createFolder(req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  renameFolder = async (req: Request<FolderParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ folder: await mediaService.renameFolder(req.params.folderId, req.body, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  deleteFolder = async (req: Request<FolderParams>, res: Response, next: NextFunction) => {
    try {
      await mediaService.deleteFolder(req.params.folderId, req.user!);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  };

  /** Public: published sites and the editor load media from here. */
  serve = async (req: Request<IdParams>, res: Response, next: NextFunction) => {
    try {
      const file = await mediaService.findForDelivery(req.params.id);
      if (!file) throw new AppError(404, "File not found", "MEDIA_NOT_FOUND");

      const etag = `"${req.params.id}"`;
      res.setHeader("ETag", etag);
      res.setHeader("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      if (req.headers["if-none-match"] === etag) {
        res.status(304).end();
        return;
      }

      const range = parseRange(req.headers.range, file.sizeBytes);
      if (range === "invalid") {
        res.setHeader("Content-Range", `bytes */${file.sizeBytes}`);
        res.status(416).end();
        return;
      }

      const stream = req.method === "HEAD" ? null : await openObjectStream(file.storageKey, range);
      const disposition = file.kind === MediaKind.DOCUMENT ? "attachment" : "inline";
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
      res.setHeader("Last-Modified", file.updatedAt.toUTCString());
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      if (range) {
        res.status(206);
        res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${file.sizeBytes}`);
        res.setHeader("Content-Length", String(range.end - range.start + 1));
      } else {
        res.status(200);
        res.setHeader("Content-Length", String(file.sizeBytes));
      }

      if (!stream) {
        res.end();
        return;
      }
      await pipeline(stream, res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error instanceof Error ? error : undefined);
        return;
      }
      next(error);
    }
  };
}

export const mediaController = new MediaController();
