import "dotenv/config";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { db, pool } = require("../src/db/index.ts");
const { ensureCatalog, readCatalog } = require("../src/server/catalog.ts");

async function main() {
  console.log("Checking database connection and seeding catalog...");
  try {
    await ensureCatalog();
    const products = await readCatalog();
    console.log(`✓ Database connection successful. Catalog initialized with ${products.length} products.`);
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
