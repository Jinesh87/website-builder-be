import type { NextFunction, Request, Response } from "express";
import { shopStockSheetService } from "../services/shop-stock-sheet.service.js";

type WebsiteParams = { id: string };

/** Stock list download and upload. Mounted under /api/websites/:id/shop/inventory/stock-list. */
export class ShopStockSheetController {
  /** Every variant and its stock as an Excel file to edit. */
  download = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const { content, filename } = await shopStockSheetService.download(req.params.id, req.user!);
      res
        .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        .setHeader("Content-Disposition", `attachment; filename="${filename}"`)
        .send(content);
    } catch (error) {
      next(error);
    }
  };

  /** What the edited list would change, without saving. */
  preview = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ upload: await shopStockSheetService.preview(req.params.id, req.file, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  /** Sets the stock; form field includeChanged=true also applies rows that changed since the download. */
  apply = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const includeChanged = (req.body as { includeChanged?: string } | undefined)?.includeChanged === "true";
      res.json({ upload: await shopStockSheetService.apply(req.params.id, req.file, includeChanged, req.user!) });
    } catch (error) {
      next(error);
    }
  };
}

export const shopStockSheetController = new ShopStockSheetController();
