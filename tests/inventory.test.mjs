import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { getVariants, variantStock, variantSavings, maxVariantQuantity, normalizeProduct, productInventoryIssue, deductInventory, variantIsLow, productAvailable } = require("../src/catalog/inventory.ts");
const { changeVariantQuantity } = require("../src/cart/variants.ts");

const battery = { slug: "test-battery", sku: "BAT-TEST", name: "Test battery", category: "batteries", price: 500, stock: 50, lowStockAt: 5, pay: "cod", images: ["/img/18650.jpg"], short: "Battery", specs: [], rating: 4.8, reviews: 1, inventoryMode: "shared_units", variants: [1, 3, 5, 10].map(n => ({ id: `cell-${n}`, label: `${n} cells`, unitsPerPack: n, price: n === 10 ? 4500 : n * 500 })) };
const circuit = { ...battery, slug: "test-module", category: "modules", inventoryMode: "independent", variants: [5, 10, 15].map((w, index) => ({ id: `power-${w}`, label: `${w} W`, unitsPerPack: 1, price: 300 + index * 200, stock: 8 + index * 4 })) };

test("50 physical cells expose 50, 16, 10 and 5 alternative pack capacities", () => {
  assert.deepEqual(getVariants(battery).map(v => variantStock(battery, v)), [50, 16, 10, 5]);
  assert.equal(productInventoryIssue(battery), null);
});
test("10-cell pack has its own selling price and real savings", () => {
  assert.deepEqual(variantSavings(battery, battery.variants[3]), { amount: 500, percent: 10 });
  const r = changeVariantQuantity([], battery, "cell-10", 2);
  assert.equal(r.ok, true);
  assert.equal(r.lines[0].qty, 2);
  assert.equal(battery.variants[3].price * r.lines[0].qty, 9000);
});
test("mixed packs spend one stock pool, with floor rounding and no oversell", () => {
  const lines = [{ slug: battery.slug, variantId: "cell-10", qty: 4 }, { slug: battery.slug, variantId: "cell-3", qty: 3 }];
  const after = deductInventory(battery, lines);
  assert.equal(after.stock, 1);
  assert.deepEqual(after.variants.map(v => variantStock(after, v)), [1, 0, 0, 0]);
  assert.throws(() => deductInventory(battery, [...lines, { slug: battery.slug, variantId: "cell-5", qty: 1 }]), /shared stock/);
  assert.equal(maxVariantQuantity(lines, battery, battery.variants[1]), 3);
});
test("two different one-piece module variants do not merge in cart", () => {
  const a = changeVariantQuantity([], circuit, "power-5", 2);
  assert.equal(a.ok, true);
  const b = changeVariantQuantity(a.lines, circuit, "power-10", 3);
  assert.equal(b.ok, true);
  assert.equal(b.lines.length, 2);
  assert.deepEqual(b.lines.map(l => [l.variantId, l.qty]), [["power-5", 2], ["power-10", 3]]);
  const after = deductInventory(circuit, b.lines);
  assert.deepEqual(after.variants.map(v => v.stock), [6, 9, 16]);
  assert.equal(after.stock, 31);
});
test("an exhausted module never borrows another variant's stock", () => {
  assert.equal(changeVariantQuantity([], circuit, "power-5", 9).ok, false);
  assert.throws(() => deductInventory(circuit, [{ slug: circuit.slug, variantId: "power-5", qty: 9 }]), /only 8/);
});
test("shared-stock variants consume one pool item regardless of price", () => {
  const p = { ...circuit, inventoryMode: "shared_stock", stock: 10 };
  const lines = [{ slug: p.slug, variantId: "power-5", qty: 4 }, { slug: p.slug, variantId: "power-10", qty: 5 }];
  assert.equal(deductInventory(p, lines).stock, 1);
  assert.throws(() => deductInventory(p, [...lines, { slug: p.slug, variantId: "power-15", qty: 2 }]), /shared stock/);
});
test("disabled or removed variants cannot be bought, even from an old cart", () => {
  const p = { ...battery, variants: battery.variants.map(v => ({ ...v, enabled: v.id !== "cell-10" })) };
  assert.equal(changeVariantQuantity([], p, "cell-10", 1).ok, false);
  assert.throws(() => deductInventory(p, [{ slug: p.slug, variantId: "cell-10", qty: 1 }]), /no longer available/);
  assert.throws(() => deductInventory(p, [{ slug: p.slug, variantId: "missing", qty: 1 }]), /no longer available/);
});
test("separate low-stock threshold overrides and zero disables warning", () => {
  const p = { ...circuit, variants: [{ ...circuit.variants[0], stock: 3, lowStockAt: 4 }] };
  assert.equal(variantIsLow(p, p.variants[0]), true);
  assert.equal(variantIsLow(p, { ...p.variants[0], lowStockAt: 0 }), false);
});
test("negative/fractional stock, duplicate IDs and invalid comparison prices are rejected", () => {
  assert.match(productInventoryIssue({ ...battery, stock: -1 }), /non-negative/);
  assert.match(productInventoryIssue({ ...battery, stock: 2.5 }), /whole number/);
  assert.match(productInventoryIssue({ ...battery, variants: [battery.variants[0], battery.variants[0]] }), /unique/);
  assert.match(productInventoryIssue({ ...circuit, variants: [{ ...circuit.variants[0], stock: -1 }] }), /stock count/);
  assert.match(productInventoryIssue({ ...battery, variants: [{ ...battery.variants[0], compareAtPrice: 1 }] }), /comparison price/);
});
test("normalization calculates independent total and from-price without multiplying prices", () => {
  const normalized = normalizeProduct(circuit);
  assert.equal(normalized.stock, 36);
  assert.equal(normalized.price, 300);
  assert.equal(normalized.variants[2].price, 700);
});

test("leftover loose pieces cannot be sold as an incomplete pack", () => {
  const p = { ...battery, stock: 2, variants: [battery.variants[1]] };
  assert.equal(productAvailable(p), false);
  assert.equal(variantStock(p, p.variants[0]), 0);
  assert.equal(changeVariantQuantity([], p, "cell-3", 1).ok, false);
});

test("pack savings need a real reference, never an inferred made-up price", () => {
  const p = { ...battery, variants: [battery.variants[3]] };
  assert.deepEqual(variantSavings(p, p.variants[0]), { amount: 0, percent: 0 });
  assert.deepEqual(variantSavings(p, { ...p.variants[0], compareAtPrice: 5000 }), { amount: 500, percent: 10 });
});
