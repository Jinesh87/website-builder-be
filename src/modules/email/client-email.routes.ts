import { Router } from "express";
import Joi from "joi";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { clientEmailController } from "./controllers/client-email.controller.js";

const updateSchema = Joi.object({
  provider: Joi.string().valid("RESEND", "BREVO").required(),
  apiKey: Joi.string().trim().max(400).allow("").optional(),
  fromEmail: Joi.string().trim().email().max(255).required(),
  fromName: Joi.string().trim().min(1).max(255).required(),
  enabled: Joi.boolean().required(),
});

const testSchema = Joi.object({
  to: Joi.string().trim().email().max(255).required(),
});

const clientEmailRouter = Router();
clientEmailRouter.use(authenticate, authorize(UserRole.CLIENT));
clientEmailRouter.get("/", clientEmailController.get);
clientEmailRouter.put("/", validate(updateSchema), clientEmailController.update);
clientEmailRouter.post(
  "/test",
  rateLimit({ name: "client-email-test", max: 10, windowSeconds: 60 * 60 }),
  validate(testSchema),
  clientEmailController.sendTest,
);

export default clientEmailRouter;
