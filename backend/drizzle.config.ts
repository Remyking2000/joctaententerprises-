import "dotenv/config";
import type { Config } from "drizzle-kit";

export default {
  schema: "./backend/src/db/schema.ts",
  out: "./backend/src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/jocta_dev",
  },
} satisfies Config;
