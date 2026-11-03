import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
  });

pool.on("error", (err) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[PostgreSQL Pool Warning]", err.message);
  }
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
