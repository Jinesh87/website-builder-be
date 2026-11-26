import { Router } from "express";
import { UserRole } from "../../common/constants/roles.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
import { receiveFile } from "../../common/middleware/receive-file.js";
import { validate } from "../../common/middleware/validate.js";
import { mediaController } from "./controllers/media.controller.js";
import { MAX_UPLOAD_BYTES } from "./services/media.service.js";
import {
  createFolderSchema,
  folderIdParamsSchema,
  generateVariationsSchema,
  listFoldersQuerySchema,
  listMediaQuerySchema,
  mediaIdParamsSchema,
  updateFolderSchema,
  updateMediaSchema,
  uploadMediaSchema,
} from "./validators/media.validator.js";

const receiveUpload = receiveFile({
  maxBytes: MAX_UPLOAD_BYTES,
  tooLarge: (mb) => ({ message: `This file is too large. The limit is ${mb} MB.`, code: "FILE_TOO_LARGE" }),
});

const mediaRouter = Router();
const byId = validate(mediaIdParamsSchema, "params");
const byFolderId = validate(folderIdParamsSchema, "params");

// Public: website pages embed these URLs. Must stay above the auth middleware.
mediaRouter.get("/files/:id", byId, mediaController.serve);

/** Shared by Super Admin and clients; the service limits clients to their own media. */
mediaRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT, UserRole.PARTNER));

mediaRouter.get("/", validate(listMediaQuerySchema, "query"), mediaController.list);
mediaRouter.post(
  "/",
  rateLimit({ name: "media-upload", max: 200, windowSeconds: 60 * 60 }),
  receiveUpload,
  validate(uploadMediaSchema),
  mediaController.upload,
);
mediaRouter.post(
  "/variations",
  rateLimit({ name: "media-variations", max: 30, windowSeconds: 60 * 60 }),
  receiveUpload,
  validate(generateVariationsSchema),
  mediaController.generateVariations,
);
mediaRouter.patch("/:id", byId, validate(updateMediaSchema), mediaController.update);
mediaRouter.get("/:id/usage", byId, mediaController.usage);
mediaRouter.delete("/:id", byId, mediaController.remove);

mediaRouter.get("/folders", validate(listFoldersQuerySchema, "query"), mediaController.listFolders);
mediaRouter.post("/folders", validate(createFolderSchema), mediaController.createFolder);
mediaRouter.patch("/folders/:folderId", byFolderId, validate(updateFolderSchema), mediaController.renameFolder);
mediaRouter.delete("/folders/:folderId", byFolderId, mediaController.deleteFolder);

export default mediaRouter;
