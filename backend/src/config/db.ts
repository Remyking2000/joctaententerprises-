import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { env } from "./env.js";
import * as schema from "../db/schema.js";

let poolInstance: pg.Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;

/**
 * Returns the shared PostgreSQL connection pool.
 * Throws a clear configuration error if `DATABASE_URL` has not been set.
 */
export function getPool(): pg.Pool {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not configured. Copy .env.example to .env and set your local PostgreSQL connection string.",
    );
  }

  if (!poolInstance) {
    const wantsSsl = /[?&]sslmode=(require|verify-ca|verify-full)/.test(
      env.DATABASE_URL,
    );

    poolInstance = new pg.Pool({
      connectionString: env.DATABASE_URL,
      ssl: wantsSsl ? { rejectUnauthorized: false } : undefined,
      max: env.PGPOOL_MAX,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    poolInstance.on("error", (err) => {
      console.error("[db] Unexpected error on idle PostgreSQL client:", err.message);
    });
  }

  return poolInstance;
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
}
