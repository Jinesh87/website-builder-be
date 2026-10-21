import { Router } from "express";
import Joi from "joi";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { validate } from "../../common/middleware/validate.js";
import { notificationController } from "./controllers/notification.controller.js";

const listQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(20),
});

const idParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

/** The signed-in user's notification feed (client workspace or Super Admin). */
const notificationsRouter = Router();
notificationsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT));
notificationsRouter.get("/", validate(listQuerySchema, "query"), notificationController.list);
notificationsRouter.post("/read-all", notificationController.markAllRead);
notificationsRouter.post("/:id/read", validate(idParamsSchema, "params"), notificationController.markRead);

export default notificationsRouter;
