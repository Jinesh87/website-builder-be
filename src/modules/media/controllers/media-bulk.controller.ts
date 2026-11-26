import type { NextFunction, Request, Response } from "express";
import { mediaBulkService } from "../services/media-bulk.service.js";

export class MediaBulkController {
  /** Deletes the chosen files, keeping any still in use. */
  remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ids } = req.body as { ids: string[] };
      res.json(await mediaBulkService.remove(ids, req.user!));
    } catch (error) {
      next(error);
    }
  };
}

export const mediaBulkController = new MediaBulkController();
