import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getPool, closeDb } from "../config/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MIGRATIONS_DIR = join(__dirname, "migrations");

export interface MigrationQueryClient {
  query<T = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: T[] }>;
}

export interface MigrationRunSummary {
  totalFiles: number;
  previouslyApplied: number;
  newlyApplied: string[];
  skipped: string[];
}

export function computeChecksum(content: string): string {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Executes all pending numbered `.sql` migrations inside individual transactions.
 * Tracks applied filenames and SHA-256 checksums in `_migrations`.
 * Rolls back and throws immediately if any migration fails or if an already-applied
 * migration file has been altered.
 */
export async function runMigrations(
  client: MigrationQueryClient,
  migrationsDir: string = DEFAULT_MIGRATIONS_DIR,
): Promise<MigrationRunSummary> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename   TEXT        PRIMARY KEY,
      checksum   TEXT        NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const existing = await client.query<{ filename: string; checksum: string }>(
    "SELECT filename, checksum FROM _migrations ORDER BY filename ASC",
  );

  const appliedMap = new Map<string, string>(
    existing.rows.map((r) => [r.filename, r.checksum]),
  );

  const newlyApplied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const rawSql = await readFile(join(migrationsDir, file), "utf8");
    const checksum = computeChecksum(rawSql);

    if (appliedMap.has(file)) {
      const recordedChecksum = appliedMap.get(file);
      if (recordedChecksum && recordedChecksum !== checksum) {
        throw new Error(
          `Migration checksum mismatch for ${file}: expected ${recordedChecksum}, found ${checksum}. Never modify an already-applied migration.`,
        );
      }
      skipped.push(file);
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(rawSql);
      await client.query(
        "INSERT INTO _migrations (filename, checksum) VALUES ($1, $2)",
        [file, checksum],
      );
      await client.query("COMMIT");
      newlyApplied.push(file);
    } catch (err) {
      await client.query("ROLLBACK");
      throw new Error(
        `Migration ${file} failed and was rolled back: ${(err as Error).message}`,
      );
    }
  }

  return {
    totalFiles: files.length,
    previouslyApplied: appliedMap.size,
    newlyApplied,
    skipped,
  };
}

async function main() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log("Checking and applying database migrations...");
    const summary = await runMigrations(client);
    for (const skippedFile of summary.skipped) {
      console.log(`  [skip] ${skippedFile} (already applied)`);
    }
    for (const appliedFile of summary.newlyApplied) {
      console.log(`  [ok]   ${appliedFile} (applied)`);
    }
    console.log(
      `Migrations complete: ${summary.newlyApplied.length} newly applied, ${summary.skipped.length} skipped (${summary.totalFiles} total).`,
    );
  } catch (err) {
    console.error(`[migrate] Error: ${(err as Error).message}`);
    process.exitCode = 1;
  } finally {
    client.release();
    await closeDb();
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  await main();
}
