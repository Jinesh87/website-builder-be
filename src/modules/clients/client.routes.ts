import { Router } from "express";
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
clientsRouter.get("/:id", byId, clientController.get);
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
