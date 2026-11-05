import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import type { AdminUser } from "@jocta/shared";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.middleware.js";

export const SESSION_COOKIE_NAME = "jocta_admin_session";

export interface SessionPayload {
  email: string;
  name?: string;
  picture?: string;
  isAdmin?: boolean;
  iat?: number;
  exp?: number;
}

export function getSessionCookieOptions() {
  const isProd = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? "strict" : "lax") as "strict" | "lax",
    path: "/",
    maxAge: env.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000,
  };
}

export class AuthService {
  private static oauthClient: OAuth2Client | null = null;

  private static getOAuthClient(): OAuth2Client {
    if (!this.oauthClient) {
      this.oauthClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
    }
    return this.oauthClient;
  }

  /**
   * Allows test suites to provide a mock OAuth2Client.
   */
  public static setOAuthClientForTesting(client: OAuth2Client | null) {
    this.oauthClient = client;
  }

  /**
   * Checks whether an email address is authorized in the administrator allowlist.
   */
  public static isEmailAuthorized(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    return env.ADMIN_EMAILS.includes(normalized);
  }

  /**
   * Verifies a Google ID token credential using Google's official library.
   * Ensures the audience matches GOOGLE_CLIENT_ID and email_verified is true.
   * Determines whether the user is an authorized administrator based on ADMIN_EMAILS.
   */
  public static async verifyGoogleIdToken(idToken: string): Promise<AdminUser> {
    if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
      throw new AppError(400, "BAD_REQUEST", "Google ID token credential is required.");
    }

    if (!env.GOOGLE_CLIENT_ID && env.NODE_ENV === "production") {
      throw new AppError(
        500,
        "CONFIG_ERROR",
        "GOOGLE_CLIENT_ID is not configured on the server.",
      );
    }

    let payload: import("google-auth-library").TokenPayload | undefined;
    try {
      const client = this.getOAuthClient();
      const ticket = await client.verifyIdToken({
        idToken: idToken.trim(),
        audience: env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      throw new AppError(
        401,
        "INVALID_TOKEN",
        `Google token verification failed: ${err instanceof Error ? err.message : "Invalid token."}`,
      );
    }

    if (!payload || !payload.email) {
      throw new AppError(
        401,
        "INVALID_TOKEN",
        "Google ID token did not contain an email address.",
      );
    }

    if (!payload.email_verified) {
      throw new AppError(
        401,
        "EMAIL_NOT_VERIFIED",
        "Your Google account email address is not verified by Google.",
      );
    }

    const email = payload.email.trim().toLowerCase();
    const isAdmin = this.isEmailAuthorized(email);

    return {
      email,
      name: payload.name ?? undefined,
      picture: payload.picture ?? undefined,
      isAdmin,
    };
  }

  /**
   * Generates a signed cryptographic session token.
   */
  public static generateSessionToken(user: AdminUser): string {
    const payload: SessionPayload = {
      email: user.email.toLowerCase(),
      name: user.name,
      picture: user.picture,
      isAdmin: user.isAdmin,
    };

    return jwt.sign(payload, env.SESSION_SECRET, {
      expiresIn: `${env.SESSION_MAX_AGE_HOURS}h`,
    });
  }

  /**
   * Verifies and decodes a signed session token.
   * Throws 401 if invalid or expired.
   */
  public static verifySessionToken(token: string): AdminUser {
    let decoded: SessionPayload;
    try {
      decoded = jwt.verify(token, env.SESSION_SECRET) as SessionPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AppError(
          401,
          "SESSION_EXPIRED",
          "Your session has expired. Please sign in again.",
        );
      }
      throw new AppError(
        401,
        "INVALID_SESSION",
        "Invalid session token. Please sign in again.",
      );
    }

    if (!decoded || !decoded.email) {
      throw new AppError(401, "INVALID_SESSION", "Malformed session token.");
    }

    const email = decoded.email.trim().toLowerCase();
    const isAdmin = this.isEmailAuthorized(email);

    return {
      email,
      name: decoded.name,
      picture: decoded.picture,
      isAdmin,
    };
  }
}
