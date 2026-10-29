import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { enquiryAdminController } from "./enquiry-admin.controller.js";
import {
  addEnquiryNoteSchema,
  enquiryIdParamsSchema,
  enquiryReplySchema,
  listEnquiriesQuerySchema,
  updateEnquirySchema,
} from "./contact.validator.js";

const adminEnquiriesRouter = Router();
const byId = validate(enquiryIdParamsSchema, "params");

adminEnquiriesRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

adminEnquiriesRouter.get("/", validate(listEnquiriesQuerySchema, "query"), enquiryAdminController.list);
adminEnquiriesRouter.get("/summary", enquiryAdminController.summary);
adminEnquiriesRouter.get("/:id", byId, enquiryAdminController.get);
adminEnquiriesRouter.patch("/:id", byId, validate(updateEnquirySchema), enquiryAdminController.update);
adminEnquiriesRouter.post("/:id/notes", byId, validate(addEnquiryNoteSchema), enquiryAdminController.addNote);
adminEnquiriesRouter.post(
  "/:id/reply",
  rateLimit({ name: "enquiry-reply", max: 60, windowSeconds: 60 * 60 }),
  byId,
  validate(enquiryReplySchema),
  enquiryAdminController.reply,
);
adminEnquiriesRouter.post(
  "/:id/resend-email",
  rateLimit({ name: "enquiry-resend-email", max: 20, windowSeconds: 60 * 60 }),
  byId,
  enquiryAdminController.resendEmail,
);
adminEnquiriesRouter.delete("/:id", byId, enquiryAdminController.remove);

export default adminEnquiriesRouter;
