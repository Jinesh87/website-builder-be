import type { Request, Response } from "express";
import { partnerService } from "../services/partner.service.js";
import { partnerCommissionService } from "../services/partner-commission.service.js";
import type { CommissionStatus } from "../../../generated/prisma/client.js";

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

export const adminPartnerController = {
  async list(req: Request, res: Response) {
    const query = {
      search: req.query.search as string | undefined,
      status: req.query.status as string | undefined,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 25,
    };
    const result = await partnerService.listAdmin(query);
    res.json(result);
  },

  async getDetail(req: Request, res: Response) {
    const id = getParam(req, "id");
    const detail = await partnerService.getAdminDetail(id);
    res.json(detail);
  },

  async approve(req: Request, res: Response) {
    const id = getParam(req, "id");
    const actorId = req.user?.id;
    const actorName = req.user?.email || "Admin";
    const result = await partnerService.approve(id, {
      commissionRate: Number(req.body.commissionRate) || 15.0,
      customReferralCode: req.body.customReferralCode,
      temporaryPassword: req.body.temporaryPassword,
      actorId,
      actorName,
    });
    res.json(result);
  },

  async reject(req: Request, res: Response) {
    const id = getParam(req, "id");
    const actorId = req.user?.id;
    const actorName = req.user?.email || "Admin";
    const result = await partnerService.reject(id, {
      reason: req.body.reason,
      actorId,
      actorName,
    });
    res.json(result);
  },

  async suspend(req: Request, res: Response) {
    const id = getParam(req, "id");
    const actorId = req.user?.id;
    const actorName = req.user?.email || "Admin";
    const result = await partnerService.suspend(id, {
      reason: req.body.reason,
      actorId,
      actorName,
    });
    res.json(result);
  },

  async reactivate(req: Request, res: Response) {
    const id = getParam(req, "id");
    const actorId = req.user?.id;
    const actorName = req.user?.email || "Admin";
    const result = await partnerService.reactivate(id, { actorId, actorName });
    res.json(result);
  },

  async updateCommission(req: Request, res: Response) {
    const id = getParam(req, "id");
    const actorId = req.user?.id;
    const actorName = req.user?.email || "Admin";
    const result = await partnerService.updateCommission(id, {
      commissionRate: req.body.commissionRate !== undefined ? Number(req.body.commissionRate) : undefined,
      isCommissionActive: req.body.isCommissionActive,
      actorId,
      actorName,
    });
    res.json(result);
  },

  async listCommissions(req: Request, res: Response) {
    const id = getParam(req, "id");
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 25;
    const result = await partnerCommissionService.listPartnerCommissions(id, page, pageSize);
    res.json(result);
  },

  async updateCommissionStatus(req: Request, res: Response) {
    const commissionId = getParam(req, "commissionId");
    const actorId = req.user?.id;
    const actorName = req.user?.email || "Admin";
    const result = await partnerCommissionService.updateCommissionStatus(commissionId, {
      status: req.body.status as CommissionStatus,
      paymentReference: req.body.paymentReference,
      notes: req.body.notes,
      actorId,
      actorName,
    });
    res.json(result);
  },
};
