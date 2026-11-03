import "dotenv/config";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { db, pool } = require("../src/db/index.ts");
const { storeState, storeOrders } = require("../src/db/schema.ts");
const { eq, inArray, or, sql } = require("drizzle-orm");
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const tag = `inventory-check-${Date.now()}`;
const slugs = [], orderIds = [];
async function api(path, body) {
  const response = await fetch(base + path, body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {});
  return { status: response.status, data: await response.json() };
}
function fixture(suffix, mode, stock, variants) {
  const slug = `${tag}-${suffix}`; slugs.push(slug);
  return { slug, sku: `TEST-${suffix}`, name: `Inventory check ${suffix}`, category: "batteries", price: 500, stock, pay: "cod", lowStockAt: 5, inventoryMode: mode, variants, images: ["/img/18650.jpg"], specs: [], short: "Temporary test", rating: 4.8, reviews: 1, published: true };
}
async function save(product, isNew = true) {
  const result = await api("/api/catalog", { product, isNew });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  return result.data.product;
}
function order(p, lines, subtotal) {
  const id = "GS" + crypto.randomUUID(); orderIds.push(id);
  return { id, name: "Inventory Test", phone: "01712345678", address: "House 10, Road 2, Dhaka", city: "dhaka", method: "bkash", lines: lines.map(line => ({ slug: p.slug, ...line })), subtotal };
}
async function current(slug) { return (await api("/api/catalog")).data.products.find(p => p.slug === slug); }

try {
  let p = await save(fixture("battery", "shared_units", 50, [1, 3, 5, 10].map(n => ({ id: `cell-${n}`, label: `${n} cells`, unitsPerPack: n, price: n === 10 ? 4500 : n * 500 }))));
  const stale = structuredClone(p);
  const payload = order(p, [{ variantId: "cell-10", qty: 2, price: 1 }], 9000);
  const result = await api("/api/orders", payload);
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.order.lines[0].price, 4500, "Server must ignore tampered per-line price");
  assert.equal((await current(p.slug)).stock, 30);
  const replay = await api("/api/orders", payload);
  assert.equal(replay.status, 200); assert.equal(replay.data.replayed, true);
  assert.equal((await current(p.slug)).stock, 30, "Retry must not deduct again");
  const conflict = await api("/api/catalog", { product: { ...stale, stock: 999 }, isNew: false });
  assert.equal(conflict.status, 409, "Stale admin edit must be rejected");
  console.log("PASS: custom prices, pack deductions, retry safety and stale-edit protection");

  p = await save({ ...await current(p.slug), stock: 10 }, false);
  const outcomes = await Promise.all([api("/api/orders", order(p, [{ variantId: "cell-10", qty: 1 }], 4500)), api("/api/orders", order(p, [{ variantId: "cell-10", qty: 1 }], 4500))]);
  assert.deepEqual(outcomes.map(r => r.status).sort(), [200, 409]);
  assert.equal((await current(p.slug)).stock, 0);
  console.log("PASS: concurrent buyers cannot spend the same final 10 cells");

  const independent = await save(fixture("module", "independent", 0, [5, 10, 15].map((w, i) => ({ id: `w-${w}`, label: `${w} W`, unitsPerPack: 1, price: 500 + i * 100, stock: 2 + i }))));
  const independentOrder = await api("/api/orders", order(independent, [{ variantId: "w-5", qty: 2 }, { variantId: "w-10", qty: 2 }], 2200));
  assert.equal(independentOrder.status, 200, JSON.stringify(independentOrder.data));
  const after = await current(independent.slug);
  assert.deepEqual(after.variants.map(v => v.stock), [0, 1, 4]);
  assert.equal(independentOrder.data.order.lines.length, 2);
  assert.notEqual(independentOrder.data.order.lines[0].variantId, independentOrder.data.order.lines[1].variantId);
  console.log("PASS: same-piece-count module variants retain separate identities and stock");

  const shared = await save(fixture("shared", "shared_stock", 5, ["A", "B"].map(id => ({ id, label: `Option ${id}`, unitsPerPack: 1, price: 500 }))));
  const sharedOrder = await api("/api/orders", order(shared, [{ variantId: "A", qty: 2 }, { variantId: "B", qty: 2 }], 2000));
  assert.equal(sharedOrder.status, 200); assert.equal((await current(shared.slug)).stock, 1);
  const invalid = await api("/api/catalog", { product: { ...shared, stock: 1.5 }, isNew: false });
  assert.equal(invalid.status, 400);
  console.log("PASS: fixed shared pool and invalid-stock validation");
} finally {
  if (orderIds.length) await db.delete(storeOrders).where(inArray(storeOrders.id, orderIds));
  if (slugs.length) {
    await db.delete(storeState).where(or(inArray(storeState.key, slugs.map(slug => `catalog:product:${slug}`)), sql`${storeState.value}->>'slug' in (${sql.join(slugs.map(slug => sql`${slug}`), sql`, `)})`));
  }
  await pool.end();
  console.log("Temporary test data removed.");
}
