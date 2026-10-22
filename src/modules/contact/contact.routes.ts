import { Router } from "express";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { contactController } from "./contact.controller.js";
import { contactInquirySchema } from "./contact.validator.js";

export const contactRouter = Router();

contactRouter.post(
  "/",
  rateLimit({ name: "contact_inquiry", max: 10, windowSeconds: 600 }),
  validate(contactInquirySchema),
  contactController.submitInquiry,
);

export default contactRouter;
