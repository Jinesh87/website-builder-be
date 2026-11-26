import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../errors/AppError.js";

type ReceiveFileOptions = {
  maxBytes: number;
  /** Error for a file over `maxBytes`; gets the limit in MB. */
  tooLarge: (limitMb: number) => { message: string; code: string };
  fields?: number;
  fieldSize?: number;
};

/** Middleware that keeps one uploaded file (form field "file") in memory and turns multer errors into API errors. */
export function receiveFile({ maxBytes, tooLarge, fields = 10, fieldSize = 4 * 1024 }: ReceiveFileOptions) {
  const single = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1, fields, fieldSize },
    defParamCharset: "utf8",
  }).single("file");

  return (req: Request, res: Response, next: NextFunction) => {
    single(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          const { message, code } = tooLarge(maxBytes / (1024 * 1024));
          next(new AppError(413, message, code));
        } else next(new AppError(400, "Upload one file in the “file” field", "INVALID_UPLOAD"));
        return;
      }
      next(error);
    });
  };
}
