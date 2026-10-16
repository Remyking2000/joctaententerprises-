import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import express from "express";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { parseEnv } from "../config/env.js";
import {
  computeChecksum,
  runMigrations,
  type MigrationQueryClient,
} from "../db/migrate.js";
import { errorHandler } from "../middleware/error.middleware.js";

/**
 * Dispatches an HTTP request directly through an Express application in-memory
 * without opening a network socket.
 */
async function invokeApp(
  app: express.Express,
  options: { method?: string; url: string; headers?: Record<string, string> },
): Promise<{
  status: number;
  headers: Record<string, unknown>;
  body: Record<string, any>;
}> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.method = options.method ?? "GET";
    req.url = options.url;
    req.headers = {
      host: "localhost",
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
      let parsedBody: Record<string, any> = {};
      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = { raw: rawBody };
        }
      }
      resolve({
        status: res.statusCode,
        headers: res.getHeaders() as Record<string, unknown>,
        body: parsedBody,
      });
      return res;
    }) as typeof res.end;

    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

describe("Environment Configuration Validation (parseEnv)", () => {
  it("parses valid development defaults when optional variables are omitted", () => {
    const parsed = parseEnv({
      NODE_ENV: "development",
      PORT: "4000",
    });

    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.PORT).toBe(4000);
    expect(parsed.DATABASE_URL).toBeUndefined();
    expect(parsed.CORS_ORIGINS).toEqual([
      "http://localhost:5173",
      "http://localhost:4173",
    ]);
  });

  it("fails fast in production when DATABASE_URL is missing", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        JWT_SECRET: "a_very_secure_production_secret_with_over_32_chars",
      }),
    ).toThrow(/DATABASE_URL/);
  });

  it("fails fast in production when JWT_SECRET is missing, short, or a placeholder", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/jocta",
      }),
    ).toThrow(/JWT_SECRET/);

    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/jocta",
        JWT_SECRET: "too-short",
      }),
    ).toThrow(/at least 32 characters/);

    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/jocta",
        JWT_SECRET: "replace_with_at_least_32_random_characters_in_production",
      }),
    ).toThrow(/placeholder/);
  });

  it("rejects non-PostgreSQL DATABASE_URL values", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "development",
        DATABASE_URL: "mysql://localhost:3306/wrong",
      }),
    ).toThrow(/postgres:\/\/ or postgresql:\/\//);
  });
});

describe("API Health & Error Handling", () => {
  const app = createApp();

  it("returns 200 OK from GET /api/health", async () => {
    const res = await invokeApp(app, { url: "/api/health" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
    expect(res.body.data.service).toBe("jocta-enterprises-api");
    expect(typeof res.body.data.timestamp).toBe("string");
  });

  it("returns 404 structured JSON for unknown endpoints", async () => {
    const res = await invokeApp(app, { url: "/api/non-existent-endpoint" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found: GET /api/non-existent-endpoint",
      },
    });
  });

  it("returns 400 VALIDATION_ERROR when product query parameters are invalid", async () => {
    const res = await invokeApp(app, {
      url: "/api/products?productType=invalid_type&limit=999",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it("returns 400 VALIDATION_ERROR when product slug parameter is malformed", async () => {
    const res = await invokeApp(app, { url: "/api/products/INVALID_SLUG!" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("never leaks stack traces in error responses", async () => {
    const testApp = express();
    testApp.get("/boom", () => {
      throw new Error("Sensitive database failure details");
    });
    testApp.use(errorHandler);

    const res = await invokeApp(testApp, { url: "/boom" });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(res.body.stack).toBeUndefined();
    expect(res.body.error.stack).toBeUndefined();
  });
});

describe("Database Migration Runner Tracking Logic", () => {
  it("applies pending migrations inside a transaction and records SHA-256 checksums", async () => {
    const executedQueries: string[] = [];
    const appliedRows: { filename: string; checksum: string }[] = [];

    const mockClient: MigrationQueryClient = {
      async query<T = Record<string, unknown>>(text: string, values?: unknown[]) {
        const trimmed = text.trim();
        executedQueries.push(trimmed);

        if (trimmed.startsWith("SELECT filename, checksum FROM _migrations")) {
          return { rows: [...appliedRows] as unknown as T[] };
        }
        if (trimmed.startsWith("INSERT INTO _migrations")) {
          appliedRows.push({
            filename: String(values?.[0]),
            checksum: String(values?.[1]),
          });
          return { rows: [] as unknown as T[] };
        }
        return { rows: [] as unknown as T[] };
      },
    };

    const firstRun = await runMigrations(mockClient);
    expect(firstRun.totalFiles).toBe(1);
    expect(firstRun.newlyApplied).toEqual(["0001_initial_catalog.sql"]);
    expect(firstRun.skipped).toEqual([]);
    expect(executedQueries).toContain("BEGIN");
    expect(executedQueries).toContain("COMMIT");

    // Second run should skip the already-applied migration
    const secondRun = await runMigrations(mockClient);
    expect(secondRun.newlyApplied).toEqual([]);
    expect(secondRun.skipped).toEqual(["0001_initial_catalog.sql"]);
  });

  it("rolls back safely when a migration statement fails", async () => {
    const executedQueries: string[] = [];

    const failingClient: MigrationQueryClient = {
      async query<T = Record<string, unknown>>(text: string) {
        const trimmed = text.trim();
        executedQueries.push(trimmed);
        if (trimmed.includes("CREATE TABLE categories")) {
          throw new Error("Simulated SQL syntax error");
        }
        return { rows: [] as unknown as T[] };
      },
    };

    await expect(runMigrations(failingClient)).rejects.toThrow(
      /failed and was rolled back/,
    );
    expect(executedQueries).toContain("BEGIN");
    expect(executedQueries).toContain("ROLLBACK");
    expect(executedQueries).not.toContain("COMMIT");
  });

  it("computes deterministic checksums across CRLF and LF line endings", () => {
    const lf = "CREATE TABLE test (\n  id UUID PRIMARY KEY\n);\n";
    const crlf = "CREATE TABLE test (\r\n  id UUID PRIMARY KEY\r\n);\r\n";
    expect(computeChecksum(lf)).toBe(computeChecksum(crlf));
  });
});
