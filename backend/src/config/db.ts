import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { env } from "./env.js";
import * as schema from "../db/schema.js";

let poolInstance: pg.Pool | null = null;
let migrationPoolInstance: pg.Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

function createPoolForUrl(rawUrl: string, max: number): pg.Pool {
  const wantsSsl =
    /[?&]sslmode=(require|verify-ca|verify-full)/.test(rawUrl) ||
    rawUrl.includes(".neon.tech") ||
    rawUrl.includes(".neon.com");

  const pool = new pg.Pool({
    connectionString: rawUrl,
    ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  });

  pool.on("error", (err) => {
    console.error("[db] Unexpected error on idle PostgreSQL client:", err.message);
  });

  return pool;
}

/**
 * Returns the shared PostgreSQL connection pool (prefers pooled `DATABASE_URL`).
 * Throws a clear configuration error if `DATABASE_URL` has not been set.
 */
export function getPool(): pg.Pool {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Run `neon deploy` / `neon env pull` or set DATABASE_URL in .env.local / .env.",
    );
  }

  if (!poolInstance) {
    poolInstance = createPoolForUrl(env.DATABASE_URL, env.PGPOOL_MAX);
  }

  return poolInstance;
}

/**
 * Returns a direct (unpooled) PostgreSQL connection pool for schema migrations.
 * Falls back to `DATABASE_URL` if `DATABASE_URL_UNPOOLED` is not set.
 */
export function getMigrationPool(): pg.Pool {
  const migrationUrl = env.DATABASE_URL_UNPOOLED ?? env.DATABASE_URL;
  if (!migrationUrl) {
    throw new Error(
      "Neither DATABASE_URL_UNPOOLED nor DATABASE_URL is configured.",
    );
  }

  if (!migrationPoolInstance) {
    migrationPoolInstance = createPoolForUrl(migrationUrl, 2);
  }

  return migrationPoolInstance;
}

/**
 * Returns the Drizzle ORM instance bound to the PostgreSQL pool.
 */
export function getDb(): NodePgDatabase<typeof schema> {
  if (!dbInstance) {
    dbInstance = drizzle(getPool(), { schema });
  }
  return dbInstance;
}

/**
 * Verifies connectivity to PostgreSQL with a lightweight query.
 */
export async function verifyDatabaseConnection(): Promise<{
  connected: boolean;
  database?: string;
  error?: string;
}> {
  if (!env.DATABASE_URL) {
    return {
      connected: false,
      error: "DATABASE_URL is not configured",
    };
  }

  try {
    const pool = getPool();
    const res = await pool.query<{ current_database: string }>(
      "SELECT current_database()",
    );
    return {
      connected: true,
      database: res.rows[0]?.current_database,
    };
  } catch (err) {
    return {
      connected: false,
      error: (err as Error).message,
    };
  }
}

export async function closeDb(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
    dbInstance = null;
  }
  if (migrationPoolInstance) {
    await migrationPoolInstance.end();
    migrationPoolInstance = null;
  }
}
