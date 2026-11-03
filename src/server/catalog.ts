import { db } from "@/db";
import { storeState } from "@/db/schema";
import { eq, like, sql } from "drizzle-orm";
import { products as seeds, defaultSettings, defaultCouponRules, type Product, type StoreSettings, type CouponRule } from "@/data";
import { normalizeProduct, productInventoryIssue } from "@/catalog/inventory";

export const productKey = (slug: string) => `catalog:product:${slug}`;
export class CatalogError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

let initialization: Promise<void> | undefined;
export async function ensureCatalog() {
  initialization ??= db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(44771101)`);
    const [marker] = await tx.select().from(storeState).where(eq(storeState.key, "catalog:initialized:v1"));
    if (marker) return;
    await tx.insert(storeState).values(seeds.map(p => ({ key: productKey(p.slug), value: { ...normalizeProduct(p), inventoryVersion: 1 } }))).onConflictDoNothing();
    await tx.insert(storeState).values({ key: "catalog:initialized:v1", value: true }).onConflictDoNothing();
  }).catch(error => { initialization = undefined; throw error; });
  return initialization;
}

export async function readCatalog(): Promise<Product[]> {
  await ensureCatalog();
  const rows = await db.select().from(storeState).where(like(storeState.key, "catalog:product:%"));
  return rows.flatMap(row => {
    const value = row.value as Product & { deleted?: boolean };
    return value.deleted ? [] : [normalizeProduct(value)];
  }).sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug));
}

export async function writeProduct(input: Product, isNew = false, reason = "Product updated", inventoryOnly = false): Promise<Product> {
  const issue = productInventoryIssue(input);
  if (issue) throw new CatalogError(issue, 400);
  await ensureCatalog();
  return db.transaction(async tx => {
    const key = productKey(input.slug);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    const [row] = await tx.select().from(storeState).where(eq(storeState.key, key)).for("update");
    const previous = row?.value as (Product & { deleted?: boolean }) | undefined;
    // An archived record does not hold the slug: it can be reused for a new product,
    // and it is never a valid editing baseline.
    const prior = previous?.deleted ? undefined : previous;
    if (isNew && prior) throw new CatalogError("That product URL already exists. Choose another name or URL.");
    if (!isNew && !prior) throw new CatalogError("This product no longer exists. Refresh the catalog.");
    if (inventoryOnly && isNew) throw new CatalogError("Catalog write permission is required to create products.", 403);
    if (prior && (input.inventoryVersion ?? 0) !== (prior.inventoryVersion ?? 1)) throw new CatalogError("Stock or product details changed since this editor opened. Close and reopen the editor before saving.");
    if (inventoryOnly && prior) {
      const editable = (product: Product) => {
        const copy: Record<string, unknown> = { ...product };
        delete copy.stock;
        delete copy.lowStockAt;
        delete copy.inventoryVersion;
        return JSON.stringify(copy);
      };
      if (editable(prior) !== editable(input)) throw new CatalogError("Your role can change stock and low-stock thresholds only.", 403);
    }
    const saved = { ...normalizeProduct(input), inventoryVersion: (prior?.inventoryVersion ?? 0) + 1 };
    await tx.insert(storeState).values({ key, value: saved, updatedAt: new Date() }).onConflictDoUpdate({ target: storeState.key, set: { value: saved, updatedAt: new Date() } });
    await tx.insert(storeState).values({ key: `inventory:event:${crypto.randomUUID()}`, value: { at: Date.now(), source: "admin", reason, slug: input.slug, before: previous ?? null, after: saved } });
    return saved;
  });
}

export async function removeProduct(slug: string, version: number) {
  await ensureCatalog();
  return db.transaction(async tx => {
    const [row] = await tx.select().from(storeState).where(eq(storeState.key, productKey(slug))).for("update");
    const p = row?.value as Product | undefined;
    if (!p || p.inventoryVersion !== version) throw new CatalogError("Product changed. Refresh before deleting.");
    await tx.update(storeState).set({ value: { deleted: true, inventoryVersion: version + 1 }, updatedAt: new Date() }).where(eq(storeState.key, productKey(slug)));
    await tx.insert(storeState).values({ key: `inventory:event:${crypto.randomUUID()}`, value: { at: Date.now(), source: "admin", reason: "Product archived", before: p } });
  });
}

export async function readCatalogConfig() {
  await ensureCatalog();
  const [row] = await db.select().from(storeState).where(eq(storeState.key, "catalog:config"));
  return row?.value ?? { settings: defaultSettings, couponRules: defaultCouponRules };
}

export async function writeCatalogConfig(config: { settings: StoreSettings; couponRules: CouponRule[] }) {
  const settings = config?.settings;
  if (!settings || !Array.isArray(config.couponRules) || [settings.dhakaDeliveryFee, settings.outsideDeliveryFee, settings.freeDhakaThreshold, settings.autoPrepayAboveBdt].some(n => !Number.isSafeInteger(n) || n < 0)) throw new CatalogError("Invalid shipping or payment settings.", 400);
  if (config.couponRules.some(rule => !rule.code || !Number.isSafeInteger(rule.value) || rule.value <= 0 || (rule.type === "percent" && rule.value > 100))) throw new CatalogError("Invalid coupon rules.", 400);
  await db.insert(storeState).values({ key: "catalog:config", value: config, updatedAt: new Date() }).onConflictDoUpdate({ target: storeState.key, set: { value: config, updatedAt: new Date() } });
}
