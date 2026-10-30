import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { questionnaireController } from "./questionnaire.controller.js";
import { submitQuestionnaireSchema } from "./questionnaire.validator.js";

export const questionnaireRouter = Router();

questionnaireRouter.post(
  "/",
  rateLimit({ name: "questionnaire", max: 5, windowSeconds: 600 }),
  validate(submitQuestionnaireSchema),
  questionnaireController.submit,
);

questionnaireRouter.get(
  "/mine",
  authenticate,
  authorize(UserRole.CLIENT),
  questionnaireController.listMine,
);

export default questionnaireRouter;

