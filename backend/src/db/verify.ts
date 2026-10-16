import { verifyDatabaseConnection, getPool, closeDb } from "../config/db.js";

async function main() {
  const status = await verifyDatabaseConnection();
  if (!status.connected) {
    console.error(`[db:verify] Connection failed: ${status.error}`);
    process.exitCode = 1;
    await closeDb();
    return;
  }

  console.log(`[db:verify] Connected to PostgreSQL database "${status.database}".`);

  try {
    const pool = getPool();
    const migrationsTable = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_migrations'
      ) AS exists
    `);

    if (!migrationsTable.rows[0]?.exists) {
      console.log("[db:verify] Table `_migrations` does not exist yet. Run `npm run db:migrate`.");
    } else {
      const applied = await pool.query<{ filename: string; applied_at: string }>(
        "SELECT filename, applied_at FROM _migrations ORDER BY filename ASC",
      );
      console.log(`[db:verify] Applied migrations (${applied.rows.length}):`);
      for (const row of applied.rows) {
        console.log(`  - ${row.filename} (${row.applied_at})`);
      }
    }
  } finally {
    await closeDb();
  }
}

await main();
