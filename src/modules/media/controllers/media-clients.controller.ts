import type { NextFunction, Request, Response } from "express";
import { mediaClientsService } from "../services/media-clients.service.js";
import type { MediaClientQuery } from "../types/media.types.js";

export class MediaClientsController {
  /** Clients with their file counts and storage, for the Super Admin media page. */
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await mediaClientsService.list(req.query as unknown as MediaClientQuery));
    } catch (error) {
      next(error);
    }
  };
}

export const mediaClientsController = new MediaClientsController();
