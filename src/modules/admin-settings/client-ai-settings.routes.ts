import { Router } from "express";
import Joi from "joi";
import { AI_MODELS } from "../../common/constants/ai-models.js";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { validate } from "../../common/middleware/validate.js";
import { clientAiSettingsController } from "./controllers/client-ai-settings.controller.js";

const updateClientAiSettingsSchema = Joi.object({
  model: Joi.string()
    .valid(...AI_MODELS.map((model) => model.id))
    .allow(null)
    .required(),
});

const clientAiSettingsRouter = Router();

clientAiSettingsRouter.use(authenticate, authorize(UserRole.CLIENT, UserRole.PARTNER));

clientAiSettingsRouter.get("/", clientAiSettingsController.get);
clientAiSettingsRouter.put("/", validate(updateClientAiSettingsSchema), clientAiSettingsController.update);

export default clientAiSettingsRouter;
