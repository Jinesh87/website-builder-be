import type { Request, Response } from "express";
import { partnerService } from "../services/partner.service.js";
import { partnerCommissionService } from "../services/partner-commission.service.js";

export const partnerController = {
  /**
   * Public: Submit partner application
   */
  async apply(req: Request, res: Response) {
    const result = await partnerService.apply(req.body);
    res.status(201).json(result);
  },

  /**
   * Partner: Get own partner profile, stats, referrals, commissions
   */
  async getDashboard(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const data = await partnerService.getPartnerDashboard(userId);
    res.json(data);
  },

  /**
   * Partner: Paginated commissions list
   */
  async getCommissions(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const dashboard = await partnerService.getPartnerDashboard(userId);
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 20;
    const result = await partnerCommissionService.listPartnerCommissions(
      dashboard.partner.id,
      page,
      pageSize,
    );
    res.json(result);
  },

  /**
   * Partner: Update Bank / UPI payout details
   */
  async updatePayoutDetails(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const result = await partnerService.updatePartnerPayoutDetails(userId, req.body);
    res.json(result);
  },

  /**
   * Partner: Request commission withdrawal
   */
  async requestPayout(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }
    const result = await partnerService.requestPayout(userId, req.body);
    res.status(201).json(result);
  },
};

