import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { validate } from "../../common/middleware/validate.js";
import { domainController } from "./controllers/domain.controller.js";
import { addDomainSchema, domainParamsSchema, websiteDomainsParamsSchema } from "./validators/domain.validator.js";

/** Mounted at /api/websites/:id/domains. */
export const websiteDomainsRouter = Router({ mergeParams: true });
const byWebsite = validate(websiteDomainsParamsSchema, "params");
const byDomain = validate(domainParamsSchema, "params");

websiteDomainsRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT));
websiteDomainsRouter.get("/", byWebsite, domainController.list);
websiteDomainsRouter.post(
  "/",
  byWebsite,
  rateLimit({ name: "domain-add", max: 20, windowSeconds: 60 * 60 }),
  validate(addDomainSchema),
  domainController.add,
);
websiteDomainsRouter.post(
  "/:domainId/verify",
  byDomain,
  rateLimit({ name: "domain-verify", max: 60, windowSeconds: 60 * 60 }),
  domainController.verify,
);
websiteDomainsRouter.post("/:domainId/primary", byDomain, domainController.makePrimary);
websiteDomainsRouter.delete("/:domainId", byDomain, domainController.remove);

/** Mounted at /api/internal/domains; read by the nginx domain-sync script on the server. */
export const domainSyncRouter = Router();
domainSyncRouter.get("/", domainController.syncList);
