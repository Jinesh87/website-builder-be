import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { validate } from "../../common/middleware/validate.js";
import { shopController } from "./controllers/shop.controller.js";
import {
  shopCategoryParamsSchema,
  shopCategorySchema,
  shopProductParamsSchema,
  shopProductQuerySchema,
  shopProductSchema,
  shopWebsiteParamsSchema,
} from "./validators/shop.validator.js";

const shopRouter = Router({ mergeParams: true });

const websiteParams = validate(shopWebsiteParamsSchema, "params");

shopRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT));

shopRouter.get("/categories", websiteParams, shopController.listCategories);
shopRouter.post("/categories", websiteParams, validate(shopCategorySchema), shopController.createCategory);
shopRouter.patch(
  "/categories/:categoryId",
  validate(shopCategoryParamsSchema, "params"),
  validate(shopCategorySchema),
  shopController.updateCategory,
);
shopRouter.delete("/categories/:categoryId", validate(shopCategoryParamsSchema, "params"), shopController.deleteCategory);

shopRouter.get("/products", websiteParams, validate(shopProductQuerySchema, "query"), shopController.listProducts);
shopRouter.post("/products", websiteParams, validate(shopProductSchema), shopController.createProduct);
shopRouter.patch(
  "/products/:productId",
  validate(shopProductParamsSchema, "params"),
  validate(shopProductSchema),
  shopController.updateProduct,
);
shopRouter.delete("/products/:productId", validate(shopProductParamsSchema, "params"), shopController.deleteProduct);

export default shopRouter;
