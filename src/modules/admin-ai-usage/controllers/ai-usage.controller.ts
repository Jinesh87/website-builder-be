import type { NextFunction, Request, Response } from "express";
import { aiUsageService } from "../services/ai-usage.service.js";
import type { AiUsageSortBy, ClientAiCallsQuery, SortOrder } from "../types/ai-usage.types.js";

export class AiUsageController {
  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const month = req.query.month ? Number(req.query.month) : undefined;
      const year = req.query.year ? Number(req.query.year) : undefined;
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
      const pageSize = req.query.pageSize ? Math.min(100, Math.max(1, Number(req.query.pageSize))) : 20;
      const sortBy = (req.query.sortBy as AiUsageSortBy) || "totalTokens";
      const sortOrder = (req.query.sortOrder as SortOrder) || "desc";

      const result = await aiUsageService.list({
        month,
        year,
        search,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  listClientCalls = async (req: Request<{ clientId: string }>, res: Response, next: NextFunction) => {
    try {
      res.json(await aiUsageService.listClientCalls(req.params.clientId, req.query as unknown as ClientAiCallsQuery));
    } catch (error) {
      next(error);
    }
  };
}

export const aiUsageController = new AiUsageController();
