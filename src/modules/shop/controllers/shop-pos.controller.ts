import type { NextFunction, Request, Response } from "express";
import { htmlToPdf } from "../utils/html-to-pdf.js";
import { shopInvoiceService } from "../services/shop-invoice.service.js";
import { shopPosReportsService } from "../services/shop-pos-reports.service.js";
import { shopPosService } from "../services/shop-pos.service.js";
import type { PosSaleInput } from "../types/shop-pos.types.js";

type WebsiteParams = { id: string };
type OrderParams = WebsiteParams & { orderId: string };

/** In-store till (POS) for one website's shop. Mounted under /api/websites/:id/shop/pos. */
export class ShopPosController {
  catalog = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await shopPosService.catalog(req.params.id, req.user!));
    } catch (error) {
      next(error);
    }
  };

  createSale = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      res.status(201).json(await shopPosService.createSale(req.params.id, req.body as PosSaleInput, req.user!));
    } catch (error) {
      next(error);
    }
  };

  checkQr = async (req: Request<OrderParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await shopPosService.checkQr(req.params.id, req.params.orderId, req.user!));
    } catch (error) {
      next(error);
    }
  };

  cancelQr = async (req: Request<OrderParams>, res: Response, next: NextFunction) => {
    try {
      res.json(await shopPosService.cancelQrSale(req.params.id, req.params.orderId, req.user!));
    } catch (error) {
      next(error);
    }
  };

  receipt = async (req: Request<OrderParams>, res: Response, next: NextFunction) => {
    try {
      res.json({ receipt: await shopPosReportsService.receipt(req.params.id, req.params.orderId, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  emailInvoice = async (req: Request<OrderParams>, res: Response, next: NextFunction) => {
    try {
      const { to } = req.body as { to?: string };
      res.json(await shopPosReportsService.emailInvoice(req.params.id, req.params.orderId, to, req.user!));
    } catch (error) {
      next(error);
    }
  };

  summary = async (req: Request<WebsiteParams>, res: Response, next: NextFunction) => {
    try {
      const { date } = req.query as { date?: string };
      res.json({ summary: await shopPosReportsService.summary(req.params.id, date, req.user!) });
    } catch (error) {
      next(error);
    }
  };

  /** Any order's A4 invoice for the shop owner: a PDF, or the HTML with ?format=html. */
  downloadInvoice = async (req: Request<OrderParams>, res: Response, next: NextFunction) => {
    try {
      const invoice = await shopInvoiceService.renderStoreInvoice(req.params.id, req.params.orderId, req.user!);
      if (req.query.format === "html") {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.status(200).send(invoice.html);
        return;
      }
      const pdf = await htmlToPdf(invoice.html);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${invoice.filename}"`);
      res.status(200).send(pdf);
    } catch (error) {
      next(error);
    }
  };
}

export const shopPosController = new ShopPosController();
