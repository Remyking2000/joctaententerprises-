import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error.middleware.js";
import { AuthService, SESSION_COOKIE_NAME } from "../services/auth.service.js";

/**
 * Extracts optional session user from cookie or Authorization header.
 */
export function getSessionUserFromRequest(req: Request) {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const headerAuth = req.headers.authorization;
  const bearerToken =
    headerAuth && headerAuth.startsWith("Bearer ")
      ? headerAuth.substring(7).trim()
      : undefined;

  const token = cookieToken || bearerToken;
  if (!token) return null;

  try {
    return AuthService.verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Middleware that protects administrative endpoints.
 * Requires a valid, server-verified session belonging to an approved administrator.
 *
 * Unauthenticated requests return 401.
 * Authenticated users who are not administrators return 403.
 */
export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
    const headerAuth = req.headers.authorization;
    const bearerToken =
      headerAuth && headerAuth.startsWith("Bearer ")
        ? headerAuth.substring(7).trim()
        : undefined;

    const token = cookieToken || bearerToken;

    if (!token) {
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Authentication required. Please sign in to access this resource.",
      );
    }

    const user = AuthService.verifySessionToken(token);

    if (!user.isAdmin) {
      throw new AppError(
        403,
        "FORBIDDEN",
        `Access denied. Account "${user.email}" is not authorized as an administrator.`,
      );
    }

    res.locals.user = user;
    (req as Request & { user?: typeof user }).user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware for general authenticated endpoints.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
    const headerAuth = req.headers.authorization;
    const bearerToken =
      headerAuth && headerAuth.startsWith("Bearer ")
        ? headerAuth.substring(7).trim()
        : undefined;

    const token = cookieToken || bearerToken;

    if (!token) {
      throw new AppError(
        401,
        "UNAUTHENTICATED",
        "Authentication required. Please sign in.",
      );
    }

    const user = AuthService.verifySessionToken(token);
    res.locals.user = user;
    (req as Request & { user?: typeof user }).user = user;
    next();
  } catch (err) {
    next(err);
  }
}
