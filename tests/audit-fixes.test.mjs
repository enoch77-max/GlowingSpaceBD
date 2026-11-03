import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { removeCartLines, changeVariantQuantity } = require("../src/cart/variants.ts");
const { escapeCssUrl } = require("../src/motion.tsx");
const { lineVariant } = require("../src/catalog/inventory.ts");

const product = {
  slug: "p1", sku: "P1", name: "Test product", category: "modules", price: 100, stock: 20,
  pay: "cod", images: [], short: "", specs: [], rating: 5, reviews: 1,
  inventoryMode: "independent",
  variants: [
    { id: "a", label: "Variant A", unitsPerPack: 1, price: 100, stock: 5 },
    { id: "b", label: "Variant B", unitsPerPack: 1, price: 150, stock: 3 },
  ],
};
const resolve = (line) => lineVariant(product, line)?.id;

test("removing one variant keeps the other variants and other products", () => {
  const lines = [
    { slug: "p1", variantId: "a", qty: 1 },
    { slug: "p1", variantId: "b", qty: 2 },
    { slug: "other", variantId: "a", qty: 1 },
  ];
  const out = removeCartLines(lines, "p1", "a", resolve);
  assert.deepEqual(out.map((l) => [l.slug, l.variantId, l.qty]), [["p1", "b", 2], ["other", "a", 1]]);
});

test("removing a legacy pack line matches through product variant resolution", () => {
  const pack = {
    ...product, slug: "pack", inventoryMode: "shared_units",
    variants: [{ id: "pack-3", label: "3 Pieces", unitsPerPack: 3, price: 300, stock: 0 }],
  };
  const lines = [{ slug: "pack", unitsPerPack: 3, qty: 2 }];
  const out = removeCartLines(lines, "pack", "pack-3", (line) => lineVariant(pack, line)?.id);
  assert.equal(out.length, 0);
});

test("a deleted or unknown product can always have its lines removed", () => {
  const lines = [
    { slug: "gone", variantId: "x", qty: 1 },
    { slug: "gone", unitsPerPack: 2, qty: 1 },
    { slug: "keep", qty: 1 },
  ];
  // No product resolves any more, so `resolveVariantId` returns undefined.
  const out = removeCartLines(lines, "gone", undefined, () => undefined);
  assert.deepEqual(out, [{ slug: "keep", qty: 1 }]);
});

test("removing without a variant choice clears the whole product", () => {
  const lines = [{ slug: "p1", variantId: "a", qty: 1 }, { slug: "p1", variantId: "b", qty: 1 }];
  assert.equal(removeCartLines(lines, "p1", undefined, resolve).length, 0);
});

test("removal composes with variant quantity updates", () => {
  const added = changeVariantQuantity([], product, "b", 2);
  assert.equal(added.ok, true);
  const removed = removeCartLines(added.lines, "p1", "b", resolve);
  assert.equal(removed.length, 0);
});

test("css url escaping neutralises quotes and backslashes", () => {
  assert.equal(escapeCssUrl('https://x.test/a".jpg'), 'https://x.test/a\\".jpg');
  assert.equal(escapeCssUrl("C:\\img\\a.jpg"), "C:\\\\img\\\\a.jpg");
  assert.equal(escapeCssUrl("https://x.test/a.jpg"), "https://x.test/a.jpg");
});

test("escaped url cannot break out of a css url() string", () => {
  const malicious = 'x"); background-image: url("https://evil.test/p.png';
  const escaped = escapeCssUrl(malicious);
  // Escaping neutralises quotes; it does not remove them. The invariant is that
  // no double quote is left unescaped, so the css string can never be closed early.
  assert(!/(^|[^\\])"/.test(escaped), "every double quote must be backslash-escaped");
  assert.equal(escaped, 'x\\"); background-image: url(\\"https://evil.test/p.png');
});
