import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { templateCategoryController } from "./controllers/template-category.controller.js";
import {
  deleteTemplateCategoryQuerySchema,
  templateCategoryIdParamsSchema,
  templateCategoryInputSchema,
} from "./validators/template-category.validator.js";

/** Super Admin only: categories the platform template gallery is grouped by. */
const templateCategoriesRouter = Router();
const byCategoryId = validate(templateCategoryIdParamsSchema, "params");
const writeLimit = rateLimit({ name: "admin-template-category-write", max: 120, windowSeconds: 60 * 60 });

templateCategoriesRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

templateCategoriesRouter.get("/", templateCategoryController.list);
templateCategoriesRouter.post("/", writeLimit, validate(templateCategoryInputSchema), templateCategoryController.create);
templateCategoriesRouter.patch(
  "/:categoryId",
  byCategoryId,
  writeLimit,
  validate(templateCategoryInputSchema),
  templateCategoryController.rename,
);
templateCategoriesRouter.delete(
  "/:categoryId",
  byCategoryId,
  writeLimit,
  validate(deleteTemplateCategoryQuerySchema, "query"),
  templateCategoryController.remove,
);

export default templateCategoriesRouter;
