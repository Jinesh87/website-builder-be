import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { adminTemplateController } from "./controllers/admin-template.controller.js";
import {
  createPlatformTemplateSchema,
  createStudioWebsiteSchema,
  listAdminTemplatesQuerySchema,
  listTemplateDraftsQuerySchema,
  patchPlatformTemplateSchema,
  sourceWebsiteParamsSchema,
  templateIdParamsSchema,
  updatePlatformTemplateSchema,
} from "./validators/admin-template.validator.js";

/** Super Admin only: manages the platform template gallery every client starts from. */
const adminTemplatesRouter = Router();
const byTemplateId = validate(templateIdParamsSchema, "params");
const writeLimit = rateLimit({ name: "admin-template-write", max: 120, windowSeconds: 60 * 60 });

adminTemplatesRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN));

adminTemplatesRouter.get("/", validate(listAdminTemplatesQuerySchema, "query"), adminTemplateController.list);
adminTemplatesRouter.get("/drafts", validate(listTemplateDraftsQuerySchema, "query"), adminTemplateController.listDrafts);
adminTemplatesRouter.delete(
  "/drafts/:websiteId",
  validate(sourceWebsiteParamsSchema, "params"),
  writeLimit,
  adminTemplateController.discardDraft,
);
adminTemplatesRouter.get(
  "/by-website/:websiteId",
  validate(sourceWebsiteParamsSchema, "params"),
  adminTemplateController.getBySourceWebsite,
);
adminTemplatesRouter.post(
  "/studio-websites",
  rateLimit({ name: "admin-template-studio", max: 30, windowSeconds: 60 * 60 }),
  validate(createStudioWebsiteSchema),
  adminTemplateController.createStudioWebsite,
);
adminTemplatesRouter.post("/", writeLimit, validate(createPlatformTemplateSchema), adminTemplateController.create);
adminTemplatesRouter.put(
  "/:templateId",
  byTemplateId,
  writeLimit,
  validate(updatePlatformTemplateSchema),
  adminTemplateController.updateFromSource,
);
adminTemplatesRouter.patch(
  "/:templateId",
  byTemplateId,
  writeLimit,
  validate(patchPlatformTemplateSchema),
  adminTemplateController.updateDetails,
);
adminTemplatesRouter.get("/:templateId/preview", byTemplateId, adminTemplateController.preview);
adminTemplatesRouter.delete("/:templateId", byTemplateId, writeLimit, adminTemplateController.archive);
adminTemplatesRouter.delete("/:templateId/permanent", byTemplateId, writeLimit, adminTemplateController.deletePermanently);
adminTemplatesRouter.post("/:templateId/restore", byTemplateId, writeLimit, adminTemplateController.restore);

export default adminTemplatesRouter;
