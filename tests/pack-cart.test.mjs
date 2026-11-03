import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { changePackQuantity, maxPackQuantity, packLabel, packUnits, unitsInCart } = require("../src/cart/variants.ts");

const slug = "tp4056-type-c-charging-module";

test("three-piece variant is one pack at quantity one", () => {
  const result = changePackQuantity([], slug, 3, 1, 20);
  assert.equal(result.ok, true);
  assert.deepEqual(result.lines, [{ slug, unitsPerPack: 3, qty: 1 }]);
  assert.equal(unitsInCart(result.lines, slug), 3);
  assert.equal(45 * result.lines[0].unitsPerPack * result.lines[0].qty, 135);
});

test("two packs of three are six pieces with the correct total", () => {
  const result = changePackQuantity([], slug, 3, 2, 20);
  assert.equal(result.ok, true);
  assert.equal(result.lines[0].qty, 2);
  assert.equal(unitsInCart(result.lines, slug), 6);
  assert.equal(45 * result.lines[0].unitsPerPack * result.lines[0].qty, 270);
});

test("different pack sizes stay on separate cart lines", () => {
  const first = changePackQuantity([], slug, 2, 1, 20);
  assert.equal(first.ok, true);
  const second = changePackQuantity(first.lines, slug, 3, 2, 20);
  assert.equal(second.ok, true);
  assert.deepEqual(second.lines.map(({ unitsPerPack, qty }) => [unitsPerPack, qty]), [[2, 1], [3, 2]]);
  assert.equal(unitsInCart(second.lines, slug), 8);
  const third = changePackQuantity(second.lines, slug, 2, 1, 20);
  assert.equal(third.ok, true);
  assert.deepEqual(third.lines.map(({ unitsPerPack, qty }) => [unitsPerPack, qty]), [[2, 2], [3, 2]]);
});

test("stock limits count pieces across all pack variants", () => {
  const first = changePackQuantity([], slug, 3, 2, 8);
  assert.equal(first.ok, true);
  assert.equal(maxPackQuantity(first.lines, slug, 2, 8), 1);
  assert.equal(changePackQuantity(first.lines, slug, 3, 1, 8).ok, false);
  const last = changePackQuantity(first.lines, slug, 2, 1, 8);
  assert.equal(last.ok, true);
  assert.equal(unitsInCart(last.lines, slug), 8);
  assert.equal(changePackQuantity(last.lines, slug, 1, 1, 8).ok, false);
});

test("buy now replaces the selected pack quantity instead of double adding", () => {
  const first = changePackQuantity([], slug, 3, 1, 20);
  assert.equal(first.ok, true);
  const again = changePackQuantity(first.lines, slug, 3, 1, 20, "replace");
  assert.equal(again.ok, true);
  assert.equal(again.lines[0].qty, 1);
  const updated = changePackQuantity(again.lines, slug, 3, 2, 20, "replace");
  assert.equal(updated.ok, true);
  assert.equal(updated.lines[0].qty, 2);
  assert.equal(unitsInCart(updated.lines, slug), 6);
});

test("legacy cart lines remain single-piece packs", () => {
  const legacy = [{ slug, qty: 2 }];
  assert.equal(packUnits(legacy[0].unitsPerPack), 1);
  assert.equal(unitsInCart(legacy, slug), 2);
  const added = changePackQuantity(legacy, slug, 1, 1, 20);
  assert.equal(added.ok, true);
  assert.equal(added.lines.length, 1);
  assert.equal(added.lines[0].qty, 3);
  assert.equal(packLabel({ category: "batteries" }, 3), "3 Cells");
});
