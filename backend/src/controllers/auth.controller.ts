import type { NextFunction, Request, Response } from "express";
import {
  AuthService,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from "../services/auth.service.js";
import { getSessionUserFromRequest } from "../middleware/auth.middleware.js";
import { AppError } from "../middleware/error.middleware.js";

export const AuthController = {
  /**
   * Exchanges a verified Google Identity Services ID token for a secure HTTP-only
   * session cookie. Sets isAdmin based on the administrator allowlist.
   * If invoked under the admin route prefix (/api/admin), requires isAdmin to be true.
   */
  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { credential } = res.locals.validated?.body ?? req.body;
      if (!credential) {
        throw new AppError(
          400,
          "BAD_REQUEST",
          "Google ID token credential is required.",
        );
      }

      const user = await AuthService.verifyGoogleIdToken(credential);

      if (req.baseUrl.includes("/admin") && !user.isAdmin) {
        throw new AppError(
          403,
          "FORBIDDEN",
          `Access denied. Google account "${user.email}" is not authorized as an administrator.`,
        );
      }

      const sessionToken = AuthService.generateSessionToken(user);

      res.cookie(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

      res.json({
        success: true,
        data: {
          user,
          token: sessionToken,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Returns current authenticated user session information.
   */
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = res.locals.user || getSessionUserFromRequest(req);
      if (!user) {
        throw new AppError(401, "UNAUTHENTICATED", "No active session.");
      }

      const sessionToken = AuthService.generateSessionToken(user);
      res.cookie(SESSION_COOKIE_NAME, sessionToken, getSessionCookieOptions());

      res.json({
        success: true,
        data: {
          user,
          token: sessionToken,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Invalidates the server-verified session and clears the HTTP-only cookie.
   */
  async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      const cookieOpts = getSessionCookieOptions();
      res.clearCookie(SESSION_COOKIE_NAME, {
        httpOnly: cookieOpts.httpOnly,
        secure: cookieOpts.secure,
        sameSite: cookieOpts.sameSite,
        path: cookieOpts.path,
      });

      res.json({
        success: true,
        data: {
          message: "Signed out successfully.",
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
