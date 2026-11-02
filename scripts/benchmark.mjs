import { performance } from "node:perf_hooks";
import { createServer } from "vite";

// Run with `node scripts/benchmark.mjs`. Synthetic records never touch app storage.
const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
try {
  const { products, categories } = await server.ssrLoadModule("/src/data.ts");
  const { search } = await server.ssrLoadModule("/src/search.ts");
  const { buildDailySeries } = await server.ssrLoadModule("/src/admin/charts.tsx");
  const catalog = Array.from({ length: 5000 }, (_, i) => ({
    ...products[i % products.length], slug: `product-${i}`, sku: `GS-${String(i).padStart(6, "0")}`,
    name: `Maker circuit ${i} 18650 charger`, aliases: ["power bank", "lithium charger"],
  }));
  const now = Date.now();
  const orders = Array.from({ length: 10000 }, (_, i) => ({
    id: `GS${i}`, created: now - (i % 90) * 86400000, total: 1500, status: "confirmed",
    lines: [{ slug: catalog[i % catalog.length].slug, qty: 2, price: 750 }],
  }));

  const measure = (label, task, iterations) => {
    for (let i = 0; i < 3; i++) task(i);
    const start = performance.now();
    for (let i = 0; i < iterations; i++) task(i);
    console.log(`${label}: ${((performance.now() - start) / iterations).toFixed(2)} ms/op (${iterations} runs)`);
  };

  const queries = ["maker", "18650 charger", "lithium charger", "power bank", "GS-003542"];
  measure("Search 5,000 products", i => search(queries[i % queries.length], 6, catalog, categories), 20);
  measure("Build 90-day chart from 10,000 orders", () => buildDailySeries(orders, catalog, 90, true), 20);
} finally {
  await server.close();
}