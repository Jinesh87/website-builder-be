import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { partnerController } from "./controllers/partner.controller.js";
import {
  partnerApplicationSchema,
  partnerPayoutDetailsSchema,
  partnerPayoutRequestSchema,
} from "./validators/partner.validator.js";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

const partnerRouter = Router();

// Public: Apply to become a partner
partnerRouter.post(
  "/apply",
  rateLimit({ name: "partner-apply", max: 10, windowSeconds: HOUR }),
  validate(partnerApplicationSchema),
  partnerController.apply,
);

// Partner protected: Dashboard data (accessible by partner)
partnerRouter.get("/dashboard", authenticate, partnerController.getDashboard);

// Partner protected: Commissions list
partnerRouter.get("/commissions", authenticate, partnerController.getCommissions);

// Partner protected: Save / update bank & UPI payout details
partnerRouter.put(
  "/payout-details",
  authenticate,
  validate(partnerPayoutDetailsSchema),
  partnerController.updatePayoutDetails,
);

// Partner protected: Submit payout withdrawal request
partnerRouter.post(
  "/payout-requests",
  authenticate,
  validate(partnerPayoutRequestSchema),
  partnerController.requestPayout,
);

export default partnerRouter;

