import "dotenv/config";
import { z } from "zod";

const PLACEHOLDER_SECRETS = new Set([
  "fallback-secret",
  "changeme",
  "secret",
  "replace_with_at_least_32_random_characters_in_production",
]);

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().trim().optional(),
  PGPOOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:4173"),
  JWT_SECRET: z.string().trim().optional(),
});

export interface AppEnv {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  DATABASE_URL: string | undefined;
  PGPOOL_MAX: number;
  CORS_ORIGINS: string[];
  JWT_SECRET: string | undefined;
}

/**
 * Validates and normalizes environment configuration.
 * Fails fast if required production variables (`DATABASE_URL`, `JWT_SECRET`)
 * are missing, too short, or set to known insecure placeholders.
 */
export function parseEnv(source: Record<string, string | undefined> = process.env): AppEnv {
  const parsed = rawEnvSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const { NODE_ENV, PORT, DATABASE_URL, PGPOOL_MAX, CORS_ORIGINS, JWT_SECRET } =
    parsed.data;

  if (DATABASE_URL !== undefined && DATABASE_URL.length > 0) {
    const isPostgresUrl =
      DATABASE_URL.startsWith("postgres://") ||
      DATABASE_URL.startsWith("postgresql://");
    if (!isPostgresUrl) {
      throw new Error(
        "Invalid environment configuration: DATABASE_URL must start with postgres:// or postgresql://",
      );
    }
  }

  if (NODE_ENV === "production") {
    if (!DATABASE_URL) {
      throw new Error(
        "Missing required production environment variable: DATABASE_URL",
      );
    }
    if (!JWT_SECRET || JWT_SECRET.length < 32) {
      throw new Error(
        "Missing or weak production secret: JWT_SECRET must be at least 32 characters in production",
      );
    }
    if (PLACEHOLDER_SECRETS.has(JWT_SECRET.toLowerCase())) {
      throw new Error(
        "Insecure production secret: JWT_SECRET cannot use a placeholder value",
      );
    }
  }

  const origins = CORS_ORIGINS.split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  return {
    NODE_ENV,
    PORT,
    DATABASE_URL: DATABASE_URL || undefined,
    PGPOOL_MAX,
    CORS_ORIGINS: origins,
    JWT_SECRET: JWT_SECRET || undefined,
  };
}

export const env = parseEnv();
