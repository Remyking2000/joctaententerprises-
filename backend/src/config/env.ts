import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: [".env.local", ".env"] });

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
  DATABASE_URL_UNPOOLED: z.string().trim().optional(),
  PGPOOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173,http://localhost:4173"),
  JWT_SECRET: z.string().trim().optional(),
  SESSION_SECRET: z.string().trim().optional(),
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  ADMIN_EMAILS: z.string().trim().default("ycremy2000@gmail.com"),
  SESSION_MAX_AGE_HOURS: z.coerce.number().int().min(1).max(720).default(24),
});

export interface AppEnv {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  DATABASE_URL: string | undefined;
  DATABASE_URL_UNPOOLED: string | undefined;
  PGPOOL_MAX: number;
  CORS_ORIGINS: string[];
  JWT_SECRET: string | undefined;
  SESSION_SECRET: string;
  GOOGLE_CLIENT_ID: string | undefined;
  ADMIN_EMAILS: string[];
  SESSION_MAX_AGE_HOURS: number;
}

/**
 * Validates and normalizes environment configuration.
 * Fails fast if required production variables (`DATABASE_URL`, `JWT_SECRET`/`SESSION_SECRET`)
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

  const {
    NODE_ENV,
    PORT,
    DATABASE_URL,
    DATABASE_URL_UNPOOLED,
    PGPOOL_MAX,
    CORS_ORIGINS,
    JWT_SECRET,
    SESSION_SECRET,
    GOOGLE_CLIENT_ID,
    ADMIN_EMAILS,
    SESSION_MAX_AGE_HOURS,
  } = parsed.data;

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

  if (DATABASE_URL_UNPOOLED !== undefined && DATABASE_URL_UNPOOLED.length > 0) {
    const isPostgresUrl =
      DATABASE_URL_UNPOOLED.startsWith("postgres://") ||
      DATABASE_URL_UNPOOLED.startsWith("postgresql://");
    if (!isPostgresUrl) {
      throw new Error(
        "Invalid environment configuration: DATABASE_URL_UNPOOLED must start with postgres:// or postgresql://",
      );
    }
  }

  const effectiveSecret = SESSION_SECRET || JWT_SECRET;

  if (NODE_ENV === "production") {
    if (!DATABASE_URL) {
      throw new Error(
        "Missing required production environment variable: DATABASE_URL",
      );
    }
    if (!effectiveSecret || effectiveSecret.length < 32) {
      throw new Error(
        "Missing or weak production secret: JWT_SECRET or SESSION_SECRET must be at least 32 characters in production",
      );
    }
    if (PLACEHOLDER_SECRETS.has(effectiveSecret.toLowerCase())) {
      throw new Error(
        "Insecure production secret: JWT_SECRET or SESSION_SECRET cannot use a placeholder value",
      );
    }
  }

  const origins = CORS_ORIGINS.split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const adminEmails = ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return {
    NODE_ENV,
    PORT,
    DATABASE_URL: DATABASE_URL || undefined,
    DATABASE_URL_UNPOOLED: DATABASE_URL_UNPOOLED || undefined,
    PGPOOL_MAX,
    CORS_ORIGINS: origins,
    JWT_SECRET: JWT_SECRET || undefined,
    SESSION_SECRET:
      effectiveSecret || "jocta-dev-session-secret-at-least-32-chars-long",
    GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID || undefined,
    ADMIN_EMAILS: adminEmails,
    SESSION_MAX_AGE_HOURS,
  };
}

export const env = parseEnv();
