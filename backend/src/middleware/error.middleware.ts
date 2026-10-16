import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { env } from "../config/env.js";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Express middleware that validates `req.params`, `req.query`, and `req.body`
 * against Zod schemas and stores parsed values on `res.locals.validated`.
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated: Record<string, unknown> = {};
      if (schemas.params) {
        validated.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        validated.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        validated.body = schemas.body.parse(req.body);
      }
      res.locals.validated = validated;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function notFoundHandler(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  next(
    new AppError(
      404,
      "NOT_FOUND",
      `Route not found: ${req.method} ${req.originalUrl}`,
    ),
  );
}

/**
 * Centralized error handler.
 * Never exposes stack traces, SQL internals, or secrets in production responses.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const isProd = env.NODE_ENV === "production";

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined && !isProd ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Malformed JSON request body",
      },
    });
    return;
  }

  if (env.NODE_ENV !== "test") {
    console.error("[error]", err instanceof Error ? err.message : err);
  }

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isProd
        ? "An unexpected error occurred"
        : err instanceof Error
          ? err.message
          : "Unknown internal error",
    },
  });
}
