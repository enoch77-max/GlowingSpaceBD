import type { Product } from "../data";
import { findVariant, lineVariant, maxVariantQuantity, type VariantChoice } from "../catalog/inventory";

/** Quantity is always independent of the variant. unitsPerPack supports legacy carts. */
export interface CartLine {
  slug: string;
  qty: number;
  variantId?: string;
  unitsPerPack?: number;
}

export function changeVariantQuantity(lines: CartLine[], product: Product, choice: VariantChoice | undefined, quantity: number, mode: "add" | "replace" = "add"): { ok: true; lines: CartLine[] } | { ok: false; max: number } {
  const variant = findVariant(product, choice);
  if (!variant || variant.enabled === false || !Number.isSafeInteger(quantity) || quantity < 1) return { ok: false, max: 0 };
  const matching = lines.filter(line => line.slug === product.slug && lineVariant(product, line)?.id === variant.id);
  const existingQty = matching.reduce((sum, line) => sum + line.qty, 0);
  const nextQty = mode === "add" ? existingQty + quantity : quantity;
  const max = maxVariantQuantity(lines, product, variant);
  if (nextQty > max) return { ok: false, max: Math.max(0, max - (mode === "add" ? existingQty : 0)) };
  const next = lines.filter(line => !(line.slug === product.slug && lineVariant(product, line)?.id === variant.id));
  next.push({ slug: product.slug, variantId: variant.id, unitsPerPack: variant.unitsPerPack, qty: nextQty });
  return { ok: true, lines: next };
}

/**
 * Remove cart lines for one product. `variantId` targets a single variant;
 * `undefined` clears every line of that product — which is how a deleted or
 * hidden product is purged, even when its old lines no longer resolve to a
 * catalog variant.
 */
export function removeCartLines(
  lines: CartLine[],
  slug: string,
  variantId: string | undefined,
  resolveVariantId?: (line: CartLine) => string | undefined,
): CartLine[] {
  return lines.filter((line) => {
    if (line.slug !== slug) return true;
    if (variantId === undefined) return false;
    return line.variantId !== variantId && resolveVariantId?.(line) !== variantId;
  });
}

export function packUnits(value: number | undefined): number {
  return Number.isFinite(value) && Number.isInteger(value) && (value ?? 0) > 0 ? value! : 1;
}

export function packLabel(product: Pick<Product, "category">, units: number): string {
  const count = packUnits(units);
  const noun = product.category === "batteries" ? (count === 1 ? "Cell" : "Cells") : (count === 1 ? "Piece" : "Pieces");
  return `${count} ${noun}`;
}

export function unitsInCart(lines: CartLine[], slug: string, excludingPack?: number): number {
  return lines.reduce((total, line) => {
    const size = packUnits(line.unitsPerPack);
    if (line.slug !== slug || (excludingPack !== undefined && size === packUnits(excludingPack))) return total;
    return total + Math.max(0, Math.floor(line.qty || 0)) * size;
  }, 0);
}

export function maxPackQuantity(lines: CartLine[], slug: string, units: number, stock: number): number {
  const size = packUnits(units);
  return Math.max(0, Math.min(99, Math.floor((stock - unitsInCart(lines, slug, size)) / size)));
}

/** Insert or update one distinct product + pack-size line without overselling across other packs. */
export function changePackQuantity(
  lines: CartLine[],
  slug: string,
  units: number,
  quantity: number,
  stock: number,
  mode: "add" | "replace" = "add",
): { ok: true; lines: CartLine[] } | { ok: false; max: number } {
  const size = packUnits(units);
  if (!Number.isFinite(quantity) || quantity < 1 || !Number.isInteger(quantity)) return { ok: false, max: 0 };
  const existing = lines.find((line) => line.slug === slug && packUnits(line.unitsPerPack) === size);
  const nextQuantity = mode === "add" ? (existing?.qty ?? 0) + quantity : quantity;
  const max = maxPackQuantity(lines, slug, size, stock);
  if (nextQuantity > max) return { ok: false, max: Math.max(0, max - (mode === "add" ? existing?.qty ?? 0 : 0)) };
  const nextLine: CartLine = { slug, qty: nextQuantity, unitsPerPack: size };
  return {
    ok: true,
    lines: existing
      ? lines.map((line) => line === existing ? nextLine : line)
      : [...lines, nextLine],
  };
}
