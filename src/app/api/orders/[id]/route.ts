import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeOrders, storeState } from "@/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { defaultSettings, type Product } from "@/data";
import { inventoryMode, normalizeProduct, productInventoryIssue } from "@/catalog/inventory";
import { ensureCatalog, productKey, CatalogError } from "@/server/catalog";
import { getAdminSession } from "@/server/adminSession";
import { hasPermission, type Permission } from "@/admin/rbac";
import { orderUpdateIssue } from "@/admin/orderWorkflow";
import type { Order } from "@/store";

export const dynamic = "force-dynamic";

const EDITABLE = new Set(["name", "phone", "address", "city", "courier", "trackingCode", "assignee", "priority", "status", "paymentStatus", "internalNote", "batchId", "parcelError"]);
const STATUSES = new Set(["placed", "confirmed", "packed", "shipped", "delivered", "cancelled"]);
const PAYMENTS = new Set(["cod_pending", "verifying", "paid", "refunded"]);
const COURIERS = new Set(["Unassigned", "Steadfast", "Pathao", "RedX"]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const patch = body?.patch && typeof body.patch === "object" ? body.patch as Record<string, unknown> : {};
    const keys = Object.keys(patch);
    if (!keys.length || keys.some(key => !EDITABLE.has(key))) return NextResponse.json({ error: "No supported order changes were provided." }, { status: 400 });
    const required: Permission = keys.every(key => key === "internalNote") ? "orders.note" : keys.some(key => key === "paymentStatus") ? "orders.payment" : "orders.write";
    if (!hasPermission(session.role, required)) return NextResponse.json({ error: "Your role cannot perform this update." }, { status: 403 });
    if (patch.status !== undefined && (typeof patch.status !== "string" || !STATUSES.has(patch.status))) throw new CatalogError("Invalid fulfillment status.", 400);
    if (patch.paymentStatus !== undefined && (typeof patch.paymentStatus !== "string" || !PAYMENTS.has(patch.paymentStatus))) throw new CatalogError("Invalid payment status.", 400);
    if (patch.courier !== undefined && (typeof patch.courier !== "string" || !COURIERS.has(patch.courier))) throw new CatalogError("Invalid courier.", 400);
    if (patch.city !== undefined && patch.city !== "dhaka" && patch.city !== "outside") throw new CatalogError("Invalid delivery area.", 400);
    if (patch.priority !== undefined && patch.priority !== "normal" && patch.priority !== "high") throw new CatalogError("Invalid priority.", 400);
    for (const [key, max] of [["name", 120], ["phone", 20], ["address", 500], ["trackingCode", 100], ["assignee", 80], ["internalNote", 4000], ["batchId", 100], ["parcelError", 500]] as const) {
      if (patch[key] !== undefined && patch[key] !== null && (typeof patch[key] !== "string" || patch[key].length > max)) throw new CatalogError(`Invalid ${key}.`, 400);
    }
    await ensureCatalog();
    const result = await db.transaction(async tx => {
      const [currentRow] = await tx.select().from(storeOrders).where(eq(storeOrders.id, id)).for("update");
      if (!currentRow) throw new CatalogError("Order no longer exists.", 404);
      const current = currentRow as Order;
      const expected = body.expectedVersion;
      if (expected !== undefined && expected !== (current.updatedAt ?? current.created)) throw new CatalogError("Order changed since it was opened. Reopen it before saving.");
      const issue = orderUpdateIssue(current, patch);
      if (issue) throw new CatalogError(issue, 400);
      if (keys.every(key => patch[key] === (current as unknown as Record<string, unknown>)[key])) return { order: current, products: [] as Product[] };
      const [config] = await tx.select().from(storeState).where(eq(storeState.key, "catalog:config"));
      const settings = (config?.value as { settings?: typeof defaultSettings } | undefined)?.settings ?? defaultSettings;
      const city = typeof patch.city === "string" ? patch.city : current.city;
      const shipping = city === "dhaka" ? (settings.freeDhakaThreshold > 0 && current.subtotal >= settings.freeDhakaThreshold ? 0 : settings.dhakaDeliveryFee) : settings.outsideDeliveryFee;
      const at = Math.max(Date.now(), (current.updatedAt ?? current.created) + 1);
      const action = typeof body.summary === "string" && body.summary.trim() ? body.summary.trim().slice(0, 200) : patch.status ? `Fulfillment changed to ${patch.status}` : patch.paymentStatus ? `Payment changed to ${patch.paymentStatus}` : "Order details updated";
      const events = [...(current.events ?? []), { id: crypto.randomUUID(), at, actor: session.name, label: action }].slice(-100);
      const products: Product[] = [];
      if (patch.status === "cancelled" && current.status !== "cancelled" && current.customerPlaced) {
        const slugs = [...new Set(current.lines.map(line => line.slug))];
        const rows = await tx.select().from(storeState).where(inArray(storeState.key, slugs.map(productKey))).orderBy(asc(storeState.key)).for("update");
        for (const row of rows) {
          const product = row.value as Product;
          const mode = inventoryMode(product);
          const lines = current.lines.filter(line => line.slug === product.slug);
          if (mode === "independent") {
            const variants = (product.variants ?? []).map(variant => {
              const qty = lines.filter(line => line.variantId === variant.id).reduce((sum, line) => sum + line.qty, 0);
              return qty ? { ...variant, stock: (variant.stock ?? 0) + qty } : variant;
            });
            const updated = { ...normalizeProduct({ ...product, variants }), inventoryVersion: (product.inventoryVersion ?? 1) + 1 };
            products.push(updated);
          } else {
            const units = lines.reduce((sum, line) => sum + line.qty * (mode === "shared_units" ? line.unitsPerPack ?? 1 : 1), 0);
            products.push({ ...normalizeProduct({ ...product, stock: product.stock + units }), inventoryVersion: (product.inventoryVersion ?? 1) + 1 });
          }
        }
        for (const product of products) {
          if (productInventoryIssue(product)) throw new CatalogError("Could not restore stock for this cancellation.");
          await tx.update(storeState).set({ value: product, updatedAt: new Date() }).where(eq(storeState.key, productKey(product.slug)));
          await tx.insert(storeState).values({ key: `inventory:event:cancel:${id}:${product.slug}`, value: { at, source: "order-cancel", orderId: id, slug: product.slug, after: product } });
        }
      }
      const update = {
        ...patch,
        shipping,
        total: current.subtotal - current.discount + shipping,
        paid: patch.paymentStatus !== undefined ? patch.paymentStatus === "paid" : current.paid,
        events,
        updatedAt: at,
      } as Partial<typeof storeOrders.$inferInsert>;
      const [order] = await tx.update(storeOrders).set(update).where(eq(storeOrders.id, id)).returning();
      return { order, products };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof CatalogError ? error.status : 500;
    return NextResponse.json({ ok: false, error: error instanceof CatalogError ? error.message : "Could not update the order. Please retry." }, { status });
  }
}
