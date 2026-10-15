import { Router } from "express";
import Joi from "joi";
import { AI_MODELS, CONFIGURABLE_PRICE_MODELS } from "../../common/constants/ai-models.js";
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

const usdPerMillion = Joi.number().min(0).max(100_000).precision(4).required();

const updatePricingSchema = Joi.object({
  prices: Joi.array()
    .items(
      Joi.object({
        modelId: Joi.string()
          .valid(...CONFIGURABLE_PRICE_MODELS.map((model) => model.id))
          .required()
          .messages({ "any.only": "Unknown AI model." }),
        inputPerMillion: usdPerMillion,
        outputPerMillion: usdPerMillion,
      }),
    )
    .min(1)
    .unique("modelId")
    .required(),
});

const aiSettingsRouter = Router();

aiSettingsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

aiSettingsRouter.get("/", aiSettingsController.getConfig);
aiSettingsRouter.put("/", validate(updateAiConfigSchema), aiSettingsController.updateConfig);
aiSettingsRouter.get("/pricing", aiSettingsController.getPricing);
aiSettingsRouter.put("/pricing", validate(updatePricingSchema), aiSettingsController.updatePricing);

export default aiSettingsRouter;
