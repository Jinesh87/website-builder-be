import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { validate } from "../../common/middleware/validate.js";
import { adminPartnerController } from "./controllers/admin-partner.controller.js";
import {
  adminCommissionStatusSchema,
  adminPartnerApproveSchema,
  adminPartnerCommissionUpdateSchema,
  adminPartnerQuerySchema,
  adminPartnerRejectSchema,
  adminPartnerSuspendSchema,
} from "./validators/partner.validator.js";

const adminPartnerRouter = Router();

// All admin partner routes require SUPER_ADMIN role
adminPartnerRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

// List partners with filters & pagination
adminPartnerRouter.get(
  "/",
  validate(adminPartnerQuerySchema, "query"),
  adminPartnerController.list,
);

// Get single partner full details
adminPartnerRouter.get("/:id", adminPartnerController.getDetail);

// Approve application
adminPartnerRouter.post(
  "/:id/approve",
  validate(adminPartnerApproveSchema),
  adminPartnerController.approve,
);

// Reject application
adminPartnerRouter.post(
  "/:id/reject",
  validate(adminPartnerRejectSchema),
  adminPartnerController.reject,
);

// Suspend partner
adminPartnerRouter.post(
  "/:id/suspend",
  validate(adminPartnerSuspendSchema),
  adminPartnerController.suspend,
);

// Reactivate partner
adminPartnerRouter.post("/:id/reactivate", adminPartnerController.reactivate);

// Update commission settings
adminPartnerRouter.patch(
  "/:id/commission",
  validate(adminPartnerCommissionUpdateSchema),
  adminPartnerController.updateCommission,
);

// List commissions for a partner
adminPartnerRouter.get("/:id/commissions", adminPartnerController.listCommissions);

// Update a commission's payout status
adminPartnerRouter.patch(
  "/commissions/:commissionId",
  validate(adminCommissionStatusSchema),
  adminPartnerController.updateCommissionStatus,
);

export default adminPartnerRouter;

