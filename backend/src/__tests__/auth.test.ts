import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import express from "express";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import type { OAuth2Client } from "google-auth-library";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import {
  AuthService,
  SESSION_COOKIE_NAME,
} from "../services/auth.service.js";
import {
  setCatalogDatasetForTesting,
  type CatalogDataset,
} from "../services/catalog.service.js";

async function invokeApp(
  app: express.Express,
  options: {
    method?: string;
    url: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): Promise<{
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, any>;
}> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.method = options.method ?? "GET";
    req.url = options.url;

    const jsonStr =
      options.body !== undefined ? JSON.stringify(options.body) : "";
    const buf = Buffer.from(jsonStr, "utf8");

    req.headers = {
      host: "localhost",
      ...(options.body !== undefined
        ? {
            "content-type": "application/json",
            "content-length": String(buf.length),
          }
        : {}),
      ...options.headers,
    };

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: unknown, ...args: unknown[]) => {
      if (chunk) {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
        );
      }
      return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...args);
    }) as typeof res.write;

    res.end = ((chunk?: unknown, ...args: unknown[]) => {
      if (chunk && typeof chunk !== "function") {
        chunks.push(
          Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)),
        );
      }
      (originalEnd as (...a: unknown[]) => ServerResponse)(chunk, ...args);
      const rawBody = Buffer.concat(chunks).toString("utf8");
      resolve({
        status: res.statusCode,
        headers: res.getHeaders() as Record<string, string | string[] | undefined>,
        body: rawBody ? JSON.parse(rawBody) : {},
      });
      return res;
    }) as typeof res.end;

    try {
      if (options.body !== undefined) {
        req.push(buf);
      }
      req.push(null);
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

function createDummyMockClient(payloadsByToken: Record<string, any>): OAuth2Client {
  return {
    async verifyIdToken({ idToken }: { idToken: string }) {
      const payload = payloadsByToken[idToken];
      if (!payload) {
        throw new Error("Invalid or unverified token signature");
      }
      return {
        getPayload: () => payload,
      };
    },
  } as unknown as OAuth2Client;
}

function createTestDataset(): CatalogDataset {
  return {
    categories: [
      {
        id: "cat-1",
        slug: "toners",
        name: "Toners",
        description: "",
        imageUrl: "",
        sortOrder: 1,
        isActive: true,
      },
    ],
    brands: [
      {
        id: "brand-1",
        slug: "hp",
        name: "HP",
        logoUrl: "",
        isActive: true,
      },
    ],
    printerModels: [],
    products: [
      {
        id: "prod-1",
        slug: "test-product",
        name: "Test Toner",
        description: "Test description",
        categoryId: "cat-1",
        brandId: "brand-1",
        sku: "TEST-01",
        oemPartNumber: "TEST-OEM",
        productType: "toner",
        condition: "new",
        authenticity: "original",
        pageYield: 2000,
        color: "Black",
        priceKes: "5000.00",
        comparePriceKes: null,
        stockQuantity: 10,
        images: [],
        thumbnailUrl: "",
        isPublished: true,
        isFeatured: false,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    variants: [],
    compatibilityLinks: [],
  };
}

describe("Google Authentication & Administrator Access Control", () => {
  let app: express.Express;

  beforeEach(() => {
    setCatalogDatasetForTesting(createTestDataset());
    app = createApp();
  });

  afterEach(() => {
    setCatalogDatasetForTesting(null);
    AuthService.setOAuthClientForTesting(null);
  });

  describe("POST /api/admin/auth/google", () => {
    it("successfully authenticates authorized administrator (ycremy2000@gmail.com) and sets HTTP-only cookie", async () => {
      const mockClient = createDummyMockClient({
        "valid-admin-token": {
          email: "ycremy2000@gmail.com",
          email_verified: true,
          name: "Remy Admin",
          picture: "https://example.com/avatar.jpg",
        },
      });
      AuthService.setOAuthClientForTesting(mockClient);

      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/auth/google",
        body: { credential: "valid-admin-token" },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("ycremy2000@gmail.com");
      expect(res.body.data.user.name).toBe("Remy Admin");

      // Verify Set-Cookie header
      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? setCookie[0] : String(setCookie);
      expect(cookieStr).toContain(SESSION_COOKIE_NAME);
      expect(cookieStr).toContain("HttpOnly");
      expect(cookieStr).toContain("Path=/");
    });

    it("rejects valid Google account that is not on the administrator allowlist with 403 Forbidden", async () => {
      const mockClient = createDummyMockClient({
        "valid-unauthorized-token": {
          email: "stranger@gmail.com",
          email_verified: true,
          name: "Unauthorized Stranger",
        },
      });
      AuthService.setOAuthClientForTesting(mockClient);

      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/auth/google",
        body: { credential: "valid-unauthorized-token" },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(res.body.error.message).toMatch(/not authorized as an administrator/i);
    });

    it("rejects Google account with unverified email with 401 Unauthorized", async () => {
      const mockClient = createDummyMockClient({
        "unverified-email-token": {
          email: "ycremy2000@gmail.com",
          email_verified: false,
          name: "Unverified Remy",
        },
      });
      AuthService.setOAuthClientForTesting(mockClient);

      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/auth/google",
        body: { credential: "unverified-email-token" },
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("EMAIL_NOT_VERIFIED");
    });

    it("rejects invalid or tampered Google ID tokens with 401 Unauthorized", async () => {
      const mockClient = createDummyMockClient({});
      AuthService.setOAuthClientForTesting(mockClient);

      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/auth/google",
        body: { credential: "bogus-google-token" },
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_TOKEN");
    });

    it("rejects empty credential payloads with 400 Bad Request", async () => {
      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/auth/google",
        body: { credential: "" },
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Protected Admin API endpoints", () => {
    it("returns 401 Unauthorized when unauthenticated request attempts to access GET /api/admin/stats", async () => {
      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/stats",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 401 Unauthorized when unauthenticated request attempts to access GET /api/admin/products", async () => {
      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/products",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 401 Unauthorized when unauthenticated request attempts to adjust inventory", async () => {
      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/inventory/adjust",
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("returns 401 Unauthorized when session token has expired", async () => {
      const expiredToken = jwt.sign(
        { email: "ycremy2000@gmail.com", name: "Remy" },
        env.SESSION_SECRET,
        { expiresIn: -10 }, // expired 10s ago
      );

      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/stats",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${expiredToken}`,
        },
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SESSION_EXPIRED");
    });

    it("returns 401 Unauthorized when session token is signed with wrong secret", async () => {
      const wrongSecretToken = jwt.sign(
        { email: "ycremy2000@gmail.com", name: "Remy" },
        "wrong-secret-that-does-not-match",
      );

      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/stats",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${wrongSecretToken}`,
        },
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_SESSION");
    });

    it("returns 403 Forbidden when a valid session token contains an email not on allowlist", async () => {
      const revokedToken = jwt.sign(
        { email: "removed-admin@example.com", name: "Former Admin" },
        env.SESSION_SECRET,
        { expiresIn: "1h" },
      );

      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/stats",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${revokedToken}`,
        },
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows access to protected admin endpoints when valid cookie is provided", async () => {
      const validToken = AuthService.generateSessionToken({
        email: "ycremy2000@gmail.com",
        name: "Remy Admin",
        isAdmin: true,
      });

      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/stats",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalProducts).toBe(1);
    });

    it("allows access using Authorization Bearer header as fallback", async () => {
      const validToken = AuthService.generateSessionToken({
        email: "ycremy2000@gmail.com",
        name: "Remy Admin",
        isAdmin: true,
      });

      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/stats",
        headers: {
          authorization: `Bearer ${validToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalProducts).toBe(1);
    });
  });

  describe("Session lifecycle: GET /api/admin/auth/me & POST /api/admin/auth/logout", () => {
    it("returns user details from GET /api/admin/auth/me when authenticated", async () => {
      const validToken = AuthService.generateSessionToken({
        email: "ycremy2000@gmail.com",
        name: "Remy Admin",
        isAdmin: true,
      });

      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/admin/auth/me",
        headers: {
          cookie: `${SESSION_COOKIE_NAME}=${validToken}`,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("ycremy2000@gmail.com");
    });

    it("clears the session cookie on POST /api/admin/auth/logout", async () => {
      const res = await invokeApp(app, {
        method: "POST",
        url: "/api/admin/auth/logout",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? setCookie[0] : String(setCookie);
      expect(cookieStr).toContain(SESSION_COOKIE_NAME);
      // Cookie is cleared with expired date or empty
      expect(cookieStr).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
    });
  });

  describe("Public Storefront API accessibility", () => {
    it("allows unauthenticated public access to GET /api/products", async () => {
      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/products",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
    });

    it("allows unauthenticated public access to GET /api/categories", async () => {
      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/categories",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("allows unauthenticated public access to GET /api/brands", async () => {
      const res = await invokeApp(app, {
        method: "GET",
        url: "/api/brands",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
