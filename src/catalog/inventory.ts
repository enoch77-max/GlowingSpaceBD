import type { InventoryMode, Product, ProductVariant } from "../data";

export type VariantChoice = string | number;
export interface InventoryLine { slug: string; qty: number; variantId?: string; unitsPerPack?: number }
export const INVENTORY_MODES: { id: InventoryMode; title: string; hint: string }[] = [
  { id: "single", title: "No variants", hint: "One price and one stock count." },
  { id: "shared_units", title: "Packs · shared pieces", hint: "1, 3, 5 or 10 cells use the same pool. Stock ÷ pieces per pack." },
  { id: "independent", title: "Separate variant stock", hint: "Different models, sizes or power ratings. Each variant has its own stock." },
  { id: "shared_stock", title: "One shared stock count", hint: "Every variant consumes one item from the same pool." },
];

export const inventoryMode = (p: Product): InventoryMode => p.inventoryMode ?? "shared_units";
const count = (n: number | undefined) => Math.max(0, Math.floor(Number.isFinite(n) ? n! : 0));

export function getVariants(p: Product): ProductVariant[] {
  if (inventoryMode(p) === "single") return [{ id: "default", label: "Standard", unitsPerPack: 1, price: p.price, compareAtPrice: p.mrp, cost: p.cost }];
  if (p.variants?.length) return p.variants;
  // Backward compatibility only. New products have an explicit mode and editable variants.
  return [1, 2, 3, 4].map(units => ({ id: `pack-${units}`, label: `${units} ${p.category === "batteries" ? (units === 1 ? "Cell" : "Cells") : (units === 1 ? "Piece" : "Pieces")}`, unitsPerPack: units, price: p.price * units, compareAtPrice: p.mrp ? p.mrp * units : undefined }));
}

export function findVariant(p: Product, choice?: VariantChoice): ProductVariant | undefined {
  const variants = getVariants(p);
  if (typeof choice === "string") return variants.find(v => v.id === choice);
  if (typeof choice === "number") return variants.find(v => v.unitsPerPack === choice);
  return variants.find(v => v.enabled !== false && variantStock(p, v) > 0) ?? variants.find(v => v.enabled !== false);
}

export function lineVariant(p: Product, line: InventoryLine): ProductVariant | undefined {
  return findVariant(p, line.variantId ?? line.unitsPerPack ?? 1);
}

export function variantStock(p: Product, v: ProductVariant): number {
  if (v.enabled === false) return 0;
  const mode = inventoryMode(p);
  if (mode === "independent") return count(v.stock);
  return Math.floor(count(p.stock) / (mode === "shared_units" ? Math.max(1, v.unitsPerPack) : 1));
}

export function productAvailable(p: Product): boolean {
  return getVariants(p).some(v => variantStock(p, v) > 0);
}

export function variantComparison(p: Product, v: ProductVariant): number | undefined {
  // An Original product is never shown as a discount — the authenticity mark replaces it.
  if (p.original) return undefined;
  if (v.compareAtPrice !== undefined) return v.compareAtPrice > v.price ? v.compareAtPrice : undefined;
  if (inventoryMode(p) === "shared_units") {
    const single = getVariants(p).find(other => other.unitsPerPack === 1 && other.enabled !== false);
    if (!single) return undefined;
    const reference = single.price * v.unitsPerPack;
    return reference > v.price ? reference : undefined;
  }
  return undefined;
}

export function variantSavings(p: Product, v: ProductVariant) {
  const reference = variantComparison(p, v);
  const amount = reference ? reference - v.price : 0;
  return { amount, percent: reference ? Math.round(amount / reference * 100) : 0 };
}

export function variantIsLow(p: Product, v: ProductVariant): boolean {
  const mode = inventoryMode(p);
  const stock = mode === "independent" ? count(v.stock) : count(p.stock);
  const threshold = mode === "independent" ? v.lowStockAt ?? p.lowStockAt ?? 5 : p.lowStockAt ?? 5;
  return stock > 0 && threshold > 0 && stock < threshold;
}

export function maxVariantQuantity(lines: InventoryLine[], p: Product, v: ProductVariant): number {
  if (v.enabled === false) return 0;
  const mode = inventoryMode(p);
  let usedByOthers = 0;
  for (const line of lines) {
    if (line.slug !== p.slug) continue;
    const other = lineVariant(p, line);
    if (!other || other.id === v.id || (mode === "independent")) continue;
    usedByOthers += count(line.qty) * (mode === "shared_units" ? other.unitsPerPack : 1);
  }
  const pool = mode === "independent" ? count(v.stock) : count(p.stock);
  const consumption = mode === "shared_units" ? v.unitsPerPack : 1;
  return Math.max(0, Math.floor((pool - usedByOthers) / Math.max(1, consumption)));
}

export function normalizeProduct(p: Product): Product {
  const mode = inventoryMode(p);
  if (mode === "single") return { ...p, inventoryMode: mode };
  const variants = getVariants(p).map(v => ({ ...v, unitsPerPack: mode === "shared_units" ? v.unitsPerPack : 1 }));
  const active = variants.filter(v => v.enabled !== false);
  return {
    ...p, inventoryMode: mode, variants,
    stock: mode === "independent" ? active.reduce((sum, v) => sum + count(v.stock), 0) : p.stock,
    price: active.length === 0 ? p.price : Math.min(...active.map(v => v.price)),
  };
}

/** Validate input before normalizing; never silently repair a negative or fractional stock value. */
export function productInventoryIssue(p: Product): string | null {
  const integer = (n: unknown, min = 0) => typeof n === "number" && Number.isSafeInteger(n) && n >= min && n <= 100_000_000;
  if (!p || typeof p.slug !== "string" || !/^[a-z0-9][a-z0-9-]{0,120}$/.test(p.slug)) return "Use a valid product URL slug.";
  if (typeof p.name !== "string" || p.name.trim().length < 3) return "Enter a descriptive product name.";
  if (typeof p.sku !== "string" || p.sku.trim().length < 3) return "Enter a valid product SKU.";
  if (!INVENTORY_MODES.some(mode => mode.id === inventoryMode(p))) return "Choose a valid inventory mode.";
  if (p.original !== undefined && typeof p.original !== "boolean") return "Choose a valid original-product setting.";
  if (p.qualityNote !== undefined && (typeof p.qualityNote !== "string" || p.qualityNote.length > 160)) return "The quality note must be 160 characters or fewer.";
  if (!integer(p.price, 1)) return "Base price must be a positive whole BDT amount.";
  if (!integer(p.stock)) return "Stock must be a non-negative whole number.";
  if (p.lowStockAt !== undefined && !integer(p.lowStockAt)) return "Low-stock threshold must be a non-negative whole number.";
  if (p.cost !== undefined && !integer(p.cost)) return "Unit cost must be a non-negative whole BDT amount.";
  if (p.mrp !== undefined && !integer(p.mrp)) return "Compare-at price must be a non-negative whole BDT amount.";
  if (inventoryMode(p) === "single") return null;
  if (p.inventoryMode !== undefined && !Array.isArray(p.variants)) return "Add at least one variant for this inventory mode.";
  if (p.variants !== undefined && (!Array.isArray(p.variants) || p.variants.length < 1 || p.variants.length > 32)) return "Add between 1 and 32 variants.";
  const variants = getVariants(p);
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const v of variants) {
    if (!v || typeof v.id !== "string" || !/^[a-zA-Z0-9_.-]{1,80}$/.test(v.id) || ids.has(v.id)) return "Every variant needs a unique, stable ID.";
    if (typeof v.label !== "string" || !v.label.trim() || names.has(v.label.trim().toLowerCase())) return "Every variant needs a unique name.";
    ids.add(v.id); names.add(v.label.trim().toLowerCase());
    if (!integer(v.price, 1)) return `Set a positive whole BDT price for ${v.label}.`;
    if (!integer(v.unitsPerPack, 1)) return `Set the pieces per pack for ${v.label}.`;
    if (inventoryMode(p) !== "shared_units" && v.unitsPerPack !== 1) return "Non-pack variants must consume one item per quantity.";
    if (v.compareAtPrice !== undefined && (!integer(v.compareAtPrice, 1) || v.compareAtPrice < v.price)) return `The comparison price for ${v.label} must be at least its selling price.`;
    if (inventoryMode(p) === "independent" && !integer(v.stock)) return `Set a whole-number stock count for ${v.label}.`;
    if (v.lowStockAt !== undefined && !integer(v.lowStockAt)) return `Check the low-stock threshold for ${v.label}.`;
    if (v.cost !== undefined && !integer(v.cost)) return `Check the cost for ${v.label}.`;
  }
  if (!variants.some(v => v.enabled !== false)) return "Keep at least one variant enabled.";
  return null;
}

/** Validates mixed variants together, then deducts from exactly the right stock source. */
export function deductInventory(p: Product, lines: InventoryLine[]): Product {
  const selected = lines.filter(line => line.slug === p.slug);
  const demand = new Map<string, number>();
  let sharedDemand = 0;
  const mode = inventoryMode(p);
  for (const line of selected) {
    const v = lineVariant(p, line);
    if (!v || v.enabled === false) throw new Error(`${p.name}: this variant is no longer available. Remove it from your cart.`);
    if (!Number.isSafeInteger(line.qty) || line.qty < 1) throw new Error("Quantity must be a positive whole number.");
    demand.set(v.id, (demand.get(v.id) ?? 0) + line.qty);
    sharedDemand += line.qty * (mode === "shared_units" ? v.unitsPerPack : 1);
  }
  if (mode === "independent") {
    const variants = getVariants(p).map(v => {
      const used = demand.get(v.id) ?? 0;
      if (used > count(v.stock)) throw new Error(`${p.name} · ${v.label}: only ${count(v.stock)} available.`);
      return { ...v, stock: count(v.stock) - used };
    });
    return normalizeProduct({ ...p, variants });
  }
  if (sharedDemand > p.stock) throw new Error(`${p.name}: only ${p.stock} ${mode === "shared_units" ? "pieces" : "items"} remain in the shared stock.`);
  return normalizeProduct({ ...p, stock: p.stock - sharedDemand });
}
