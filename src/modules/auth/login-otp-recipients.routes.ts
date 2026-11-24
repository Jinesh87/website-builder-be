import { Router, type NextFunction, type Request, type Response } from "express";
import Joi from "joi";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { validate } from "../../common/middleware/validate.js";
import { env } from "../../config/env.js";
import { loginOtpRecipientsService } from "./services/login-otp-recipients.service.js";
import { addLoginOtpRecipientSchema } from "./validators/auth.validator.js";

/** Super Admin: extra inboxes that receive the Super Admin login code. Mounted at /api/admin/settings/login-otp. */
const loginOtpRecipientsRouter = Router();

loginOtpRecipientsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

loginOtpRecipientsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await loginOtpRecipientsService.list(req.user!.id, env.LOGIN_OTP_ENABLED));
  } catch (error) {
    next(error);
  }
});

loginOtpRecipientsRouter.post(
  "/recipients",
  validate(addLoginOtpRecipientSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(201).json({ recipient: await loginOtpRecipientsService.add(req.user!.id, req.body) });
    } catch (error) {
      next(error);
    }
  },
);

const idParamsSchema = Joi.object({ id: Joi.string().uuid().required() });

loginOtpRecipientsRouter.delete("/recipients/:id", validate(idParamsSchema, "params"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await loginOtpRecipientsService.remove(String(req.params.id));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default loginOtpRecipientsRouter;
