import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { validate } from "../../common/middleware/validate.js";
import { aiUsageController } from "./controllers/ai-usage.controller.js";
import { clientIdParamsSchema, listAiUsageQuerySchema, listClientCallsQuerySchema } from "./validators/ai-usage.validator.js";

const aiUsageRouter = Router();

aiUsageRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

aiUsageRouter.get("/", validate(listAiUsageQuerySchema, "query"), aiUsageController.list);
aiUsageRouter.get(
  "/clients/:clientId/calls",
  validate(clientIdParamsSchema, "params"),
  validate(listClientCallsQuerySchema, "query"),
  aiUsageController.listClientCalls,
);

export default aiUsageRouter;
