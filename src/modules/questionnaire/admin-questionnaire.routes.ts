import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { questionnaireAdminController } from "./questionnaire-admin.controller.js";
import {
  addQuestionnaireNoteSchema,
  listQuestionnairesQuerySchema,
  questionnaireIdParamsSchema,
  updateQuestionnaireSchema,
} from "./questionnaire.validator.js";

const adminQuestionnairesRouter = Router();
const byId = validate(questionnaireIdParamsSchema, "params");

adminQuestionnairesRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

adminQuestionnairesRouter.get(
  "/",
  validate(listQuestionnairesQuerySchema, "query"),
  questionnaireAdminController.list,
);
adminQuestionnairesRouter.get("/summary", questionnaireAdminController.summary);
adminQuestionnairesRouter.get("/:id", byId, questionnaireAdminController.get);
adminQuestionnairesRouter.patch(
  "/:id",
  byId,
  validate(updateQuestionnaireSchema),
  questionnaireAdminController.update,
);
adminQuestionnairesRouter.post(
  "/:id/notes",
  byId,
  validate(addQuestionnaireNoteSchema),
  questionnaireAdminController.addNote,
);
adminQuestionnairesRouter.post(
  "/:id/resend-email",
  rateLimit({ name: "questionnaire-resend-email", max: 20, windowSeconds: 60 * 60 }),
  byId,
  questionnaireAdminController.resendEmail,
);
adminQuestionnairesRouter.delete("/:id", byId, questionnaireAdminController.remove);

export default adminQuestionnairesRouter;

