import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { removeCartLines } = require("../src/cart/variants.ts");
const { escapeCssUrl } = require("../src/utils/css.ts");
const { variantComparison, variantSavings } = require("../src/catalog/inventory.ts");

const product = {
  slug: "p1", sku: "P1", name: "Product 1", category: "batteries", price: 100, stock: 10,
  pay: "cod", images: ["/img/18650.jpg"], short: "", specs: [], rating: 5, reviews: 1,
  inventoryMode: "shared_stock",
  variants: [
    { id: "a", label: "5 W", unitsPerPack: 1, price: 100 },
    { id: "b", label: "10 W", unitsPerPack: 1, price: 180, compareAtPrice: 200 },
  ],
};

test("stale cart line for an archived product can always be removed", () => {
  const lines = [{ slug: "gone", qty: 2, variantId: "old-v" }, { slug: "p1", qty: 1, variantId: "a" }];
  // No product object available (archived) — removal must still work.
  assert.deepEqual(removeCartLines(lines, "gone"), [{ slug: "p1", qty: 1, variantId: "a" }]);
  assert.deepEqual(removeCartLines(lines, "gone", "old-v"), [{ slug: "p1", qty: 1, variantId: "a" }]);
  // Removing one variant of a live product leaves the other variant alone.
  const mixed = [{ slug: "p1", qty: 1, variantId: "a" }, { slug: "p1", qty: 2, variantId: "b" }];
  assert.deepEqual(removeCartLines(mixed, "p1", "b", product), [{ slug: "p1", qty: 1, variantId: "a" }]);
  // No choice clears every line for the slug.
  assert.deepEqual(removeCartLines(mixed, "p1", undefined, product), []);
});

test("escapeCssUrl neutralizes CSS string breakout in admin-editable image URLs", () => {
  assert.equal(escapeCssUrl("https://x.test/a.jpg"), "https://x.test/a.jpg");
  const evil = 'a");background:red;url("b';
  assert.equal(escapeCssUrl(evil), 'a\\");background:red;url(\\"b');
  assert.equal(escapeCssUrl("a\\b"), "a\\\\b");
  assert.equal(escapeCssUrl("a\nb"), "a\\a b");
  const css = `url("${escapeCssUrl('x");evil:1')}")`;
  assert.equal(css, 'url("x\\");evil:1")');
  assert(!css.includes('evil:1"') || css.includes('\\"'), "quote must be escaped");
});

test("original products never expose a comparison price or savings", () => {
  const original = { ...product, original: true, variants: product.variants.map(v => ({ ...v, compareAtPrice: 999 })) };
  for (const v of original.variants) {
    assert.equal(variantComparison(original, v), undefined);
    assert.deepEqual(variantSavings(original, v), { amount: 0, percent: 0 });
  }
  // Non-original products still compute savings normally.
  assert.equal(variantComparison(product, product.variants[1]), 200);
  assert.deepEqual(variantSavings(product, product.variants[1]), { amount: 20, percent: 10 });
});
