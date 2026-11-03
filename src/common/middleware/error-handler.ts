import type { NextFunction, Request, Response } from "express";
import fs from "node:fs";
import { isProduction } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../errors/AppError.js";

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `Route not found: ${req.method} ${req.path}`, "NOT_FOUND"));
}

type BodyParserError = Error & { status: number; type: string };

function isBodyParserError(err: unknown): err is BodyParserError {
  if (!(err instanceof Error) || !("type" in err) || !("status" in err)) return false;
  const { status, type } = err as BodyParserError;
  return typeof type === "string" && type.startsWith("entity.") && status >= 400 && status < 500;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
    }
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // body-parser errors (malformed JSON, oversized body) are client errors, not server faults.
  if (isBodyParserError(err)) {
    res.status(err.status).json({
      error: {
        code: err.type === "entity.parse.failed" ? "INVALID_JSON" : "BAD_REQUEST",
        message: err.type === "entity.parse.failed" ? "Request body is not valid JSON" : "Invalid request body",
      },
    });
    return;
  }

  try {
    const errorLog = `[${new Date().toISOString()}] ${err instanceof Error ? err.stack || err.message : String(err)}\n`;
    fs.appendFileSync("/tmp/cms-backend-error.log", errorLog);
  } catch {}

  logger.error({ err }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction ? "Internal server error" : (err instanceof Error ? err.message : "Internal server error"),
      details: isProduction ? undefined : (err instanceof Error ? err.stack : undefined),
    },
  });
}
