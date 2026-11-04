import type { Request, Response } from "express";
import { partnerService } from "../services/partner.service.js";
import { partnerCommissionService } from "../services/partner-commission.service.js";
import type { CommissionStatus } from "../../../generated/prisma/client.js";

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? val[0] : (val ?? "");
}

function getActorName(req: Request): string {
  if (req.body?.actorName && typeof req.body.actorName === "string") {
    return req.body.actorName.startsWith("Admin") ? req.body.actorName : `Admin (${req.body.actorName})`;
  }
  if (req.user?.email) {
    const name = req.user.email.split("@")[0];
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    return `Admin (${capitalized})`;
  }
  return "Admin (Priya S.)";
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

  async listAuditLogs(req: Request, res: Response) {
    const query = {
      search: req.query.search as string | undefined,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 25,
    };
    const result = await partnerService.listAuditLogs(query);
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
    const actorName = getActorName(req);
    const result = await partnerService.approve(id, {
      commissionRate: Number(req.body.commissionRate) || 15.0,
      commissionPolicy: req.body.commissionPolicy,
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
    const actorName = getActorName(req);
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
    const actorName = getActorName(req);
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
    const actorName = getActorName(req);
    const result = await partnerService.reactivate(id, { actorId, actorName });
    res.json(result);
  },

  async updateCommission(req: Request, res: Response) {
    const id = getParam(req, "id");
    const actorId = req.user?.id;
    const actorName = getActorName(req);
    const result = await partnerService.updateCommission(id, {
      commissionRate: req.body.commissionRate !== undefined ? Number(req.body.commissionRate) : undefined,
      isCommissionActive: req.body.isCommissionActive,
      commissionPolicy: req.body.commissionPolicy,
      actorId,
      actorName,
    });
    res.json(result);
  },

  async getProgramConfig(_req: Request, res: Response) {
    const config = await partnerService.getProgramConfig();
    res.json(config);
  },

  async updateProgramConfig(req: Request, res: Response) {
    const config = await partnerService.updateProgramConfig({
      defaultCommissionRate:
        req.body.defaultCommissionRate !== undefined ? Number(req.body.defaultCommissionRate) : undefined,
      defaultCommissionPolicy: req.body.defaultCommissionPolicy,
    });
    res.json(config);
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

  async listPayoutRequests(req: Request, res: Response) {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 25;
    const result = await partnerService.adminListPayoutRequests({
      status,
      search,
      page,
      pageSize,
    });
    res.json(result);
  },

  async resolvePayoutRequest(req: Request, res: Response) {
    const requestId = getParam(req, "requestId");
    const actorId = req.user?.id;
    const actorName = req.user?.email || "Admin";
    const result = await partnerService.adminResolvePayoutRequest(
      requestId,
      req.body,
      actorId ? { id: actorId, name: actorName } : undefined,
    );
    res.json(result);
  },
};
