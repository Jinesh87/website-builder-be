import { Router } from "express";
import Joi from "joi";
import { CONFIGURABLE_PRICE_MODELS } from "../../common/constants/ai-models.js";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { clientController } from "./controllers/client.controller.js";
import {
  clientIdParamsSchema,
  createClientSchema,
  listClientsQuerySchema,
  setClientPasswordSchema,
  updateClientSchema,
} from "./validators/client.validator.js";

const clientsRouter = Router();
const byId = validate(clientIdParamsSchema, "params");

clientsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

clientsRouter.get("/", validate(listClientsQuerySchema, "query"), clientController.list);
clientsRouter.post("/", validate(createClientSchema), clientController.create);
const usdPerMillion = Joi.number().min(0).max(100_000).precision(4).required();
const updateClientPricingSchema = Joi.object({
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

clientsRouter.get("/:id", byId, clientController.get);
clientsRouter.get("/:id/ai-prices", byId, clientController.aiPrices);
clientsRouter.put("/:id/ai-prices", byId, validate(updateClientPricingSchema), clientController.updateAiPrices);
clientsRouter.patch("/:id", byId, validate(updateClientSchema), clientController.update);
clientsRouter.post("/:id/suspend", byId, clientController.suspend);
clientsRouter.post("/:id/reactivate", byId, clientController.reactivate);
clientsRouter.post(
  "/:id/password",
  rateLimit({ name: "client-set-password", max: 30, windowSeconds: 60 * 60 }),
  byId,
  validate(setClientPasswordSchema),
  clientController.setPassword,
);
clientsRouter.post(
  "/:id/resend-email",
  rateLimit({ name: "client-resend-email", max: 30, windowSeconds: 60 * 60 }),
  byId,
  clientController.resendEmail,
);

export default clientsRouter;
