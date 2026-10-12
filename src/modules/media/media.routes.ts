import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import { UserRole } from "../../common/constants/roles.js";
import { AppError } from "../../common/errors/AppError.js";
import { authenticate, authorize } from "../../common/middleware/authenticate.js";
import { rateLimit } from "../../common/middleware/rate-limit.js";
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

const singleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10, fieldSize: 4 * 1024 },
  defParamCharset: "utf8",
}).single("file");

/** Runs multer and turns its errors into API errors. */
function receiveFile(req: Request, res: Response, next: NextFunction) {
  singleFile(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      next(
        error.code === "LIMIT_FILE_SIZE"
          ? new AppError(413, `This file is too large. The limit is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`, "FILE_TOO_LARGE")
          : new AppError(400, "Upload one file in the “file” field", "INVALID_UPLOAD"),
      );
      return;
    }
    next(error);
  });
}

const mediaRouter = Router();
const byId = validate(mediaIdParamsSchema, "params");
const byFolderId = validate(folderIdParamsSchema, "params");

// Public: website pages embed these URLs. Must stay above the auth middleware.
mediaRouter.get("/files/:id", byId, mediaController.serve);

/** Shared by Super Admin and clients; the service limits clients to their own media. */
mediaRouter.use(authenticate, authorize(UserRole.SUPER_ADMIN, UserRole.CLIENT));

mediaRouter.get("/", validate(listMediaQuerySchema, "query"), mediaController.list);
mediaRouter.post(
  "/",
  rateLimit({ name: "media-upload", max: 200, windowSeconds: 60 * 60 }),
  receiveFile,
  validate(uploadMediaSchema),
  mediaController.upload,
);
mediaRouter.post(
  "/variations",
  rateLimit({ name: "media-variations", max: 30, windowSeconds: 60 * 60 }),
  receiveFile,
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
