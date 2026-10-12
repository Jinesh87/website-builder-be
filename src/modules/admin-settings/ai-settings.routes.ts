import { Router } from "express";
import Joi from "joi";
import { AI_MODELS } from "../../common/constants/ai-models.js";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { validate } from "../../common/middleware/validate.js";
import { aiSettingsController } from "./controllers/ai-settings.controller.js";

const updateAiConfigSchema = Joi.object({
  openaiApiKey: Joi.string().trim().allow("").optional(),
  model: Joi.string()
    .valid(...AI_MODELS.map((model) => model.id))
    .required()
    .messages({ "any.only": "Choose one of the available AI models." }),
});

const aiSettingsRouter = Router();

aiSettingsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

aiSettingsRouter.get("/", aiSettingsController.getConfig);
aiSettingsRouter.put("/", validate(updateAiConfigSchema), aiSettingsController.updateConfig);

export default aiSettingsRouter;
