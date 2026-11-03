import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeOrders, storeState } from "@/db/schema";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { defaultCouponRules, defaultSettings, type Product } from "@/data";
import { deductInventory, inventoryMode, lineVariant, normalizeProduct, type InventoryLine } from "@/catalog/inventory";
import { CatalogError, ensureCatalog, productKey } from "@/server/catalog";
import { requirePermission } from "@/server/adminSession";

export const dynamic = "force-dynamic";

const normalizePhone = (value: string) => value.replace(/\D/g, "").replace(/^880/, "0");

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams;
    if (query.get("admin") === "1") {
      await requirePermission("orders.read");
      return NextResponse.json({ ok: true, orders: await db.select().from(storeOrders).orderBy(desc(storeOrders.created)) }, { headers: { "Cache-Control": "no-store" } });
    }
    const id = query.get("id")?.trim();
    const phone = normalizePhone(query.get("phone") ?? "");
    if (!id || !/^01[3-9]\d{8}$/.test(phone)) return NextResponse.json({ ok: false, error: "Enter a valid order number and mobile number." }, { status: 400 });
    const [order] = await db.select().from(storeOrders).where(eq(storeOrders.id, id));
    if (!order || order.phone !== phone) return NextResponse.json({ ok: false, error: "No order matches that number and phone." }, { status: 404 });
    // Public tracking is verified by order ID + phone, but staff-only data must never leave the server.
    const publicOrder = {
      ...order,
      internalNote: null,
      parcelError: null,
      assignee: null,
      lines: order.lines.map(({ cost, inventoryMode, ...line }) => line),
    };
    return NextResponse.json({ ok: true, order: publicOrder }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof Error && error.message === "ADMIN_UNAUTHORIZED" ? 401 : error instanceof Error && error.message === "ADMIN_FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ ok: false, error: status === 401 ? "Your admin session has expired." : status === 403 ? "Your role cannot view orders." : "Order lookup is temporarily unavailable." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.id !== "string" || !/^GS[a-zA-Z0-9-]{1,70}$/.test(body.id) || typeof body.name !== "string" || body.name.trim().length < 2 || body.name.length > 120 || typeof body.phone !== "string" || !/^01[3-9]\d{8}$/.test(body.phone) || typeof body.address !== "string" || body.address.trim().length < 8 || body.address.length > 500) throw new CatalogError("Check your name, phone and delivery address.", 400);
    if (!Array.isArray(body.lines) || body.lines.length < 1 || body.lines.length > 100) throw new CatalogError("Choose at least one item.", 400);
    const requested = body.lines as InventoryLine[];
    if (requested.some(line => !line || typeof line.slug !== "string" || !Number.isSafeInteger(line.qty) || line.qty < 1 || line.qty > 1_000_000)) throw new CatalogError("Invalid cart quantity.", 400);
    if (!["cod", "bkash", "nagad", "advance"].includes(body.method)) throw new CatalogError("Choose a payment method.", 400);
    await ensureCatalog();
    const result = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`order:${body.id}`}))`);
      const [existing] = await tx.select().from(storeOrders).where(eq(storeOrders.id, body.id));
      const keys = [...new Set(requested.map(line => productKey(line.slug)))].sort();
      const rows = await tx.select().from(storeState).where(inArray(storeState.key, keys)).orderBy(asc(storeState.key)).for("update");
      const products = rows.map(row => row.value as Product);
      const [config] = await tx.select().from(storeState).where(eq(storeState.key, "catalog:config")).for("update");
      const configured = config?.value as { settings?: typeof defaultSettings; couponRules?: typeof defaultCouponRules } | undefined;
      const settings = configured?.settings ?? defaultSettings;
      const rules = configured?.couponRules ?? defaultCouponRules;
      if (existing) {
        const identity = (lines: InventoryLine[]) => lines.map(line => {
          const product = products.find(p => p.slug === line.slug);
          const id = line.variantId ?? (product ? lineVariant(product, line)?.id : undefined) ?? line.unitsPerPack ?? 1;
          return `${line.slug}:${id}:${line.qty}`;
        }).sort().join("|");
        if (existing.phone !== body.phone || identity(existing.lines) !== identity(requested)) throw new CatalogError("This order reference was already used for a different cart. Start a fresh checkout.");
        return { order: existing, products, couponRules: rules, settings, replayed: true };
      }
      if (rows.length !== keys.length || products.some(p => !p.slug || p.published === false)) throw new CatalogError("A product is no longer available. Refresh your cart.");
      const lines = requested.map(line => {
        const p = products.find(product => product.slug === line.slug);
        const v = p && lineVariant(p, line);
        if (!p || !v || v.enabled === false) throw new CatalogError("A selected variant is no longer available. Please update your cart.");
        return { slug: p.slug, name: p.name, variantId: v.id, variantLabel: v.label, unitsPerPack: v.unitsPerPack, qty: line.qty, price: v.price, cost: v.cost ?? (p.cost === undefined ? undefined : p.cost * v.unitsPerPack), inventoryMode: inventoryMode(p) };
      });
      const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
      if (!Number.isSafeInteger(subtotal) || subtotal > 2_000_000_000) throw new CatalogError("This order exceeds the online order value limit.", 400);
      if (body.subtotal !== subtotal) throw new CatalogError("A variant price changed. Your cart has been refreshed; review the new total and try again.");
      const nextProducts = products.map(p => {
        try { return { ...deductInventory(p, lines), inventoryVersion: (p.inventoryVersion ?? 1) + 1 }; }
        catch (error) { throw new CatalogError(error instanceof Error ? error.message : "Stock changed. Update your cart."); }
      });
      const coupon = typeof body.coupon === "string" ? body.coupon.toUpperCase() : "";
      const rule = rules.find(r => r.active && r.code.toUpperCase() === coupon && subtotal >= r.minSubtotal && (!r.startsAt || r.startsAt <= Date.now()) && (!r.expiresAt || r.expiresAt > Date.now()) && (!r.maxUses || r.used < r.maxUses));
      const discount = rule ? Math.min(subtotal, rule.type === "percent" ? Math.round(subtotal * rule.value / 100) : rule.value) : 0;
      const city = body.city === "outside" ? "outside" : "dhaka";
      const freeDhaka = settings.freeDhakaThreshold > 0 && subtotal >= settings.freeDhakaThreshold;
      const shipping = city === "dhaka" ? (freeDhaka ? 0 : settings.dhakaDeliveryFee) : settings.outsideDeliveryFee;
      const needsPrepay = products.some(p => p.pay === "prepay") || !settings.enableCod || (settings.autoPrepayAboveBdt > 0 && subtotal >= settings.autoPrepayAboveBdt);
      if (body.method === "cod" && (!settings.enableCod || needsPrepay)) throw new CatalogError("Advance payment is required for this cart.", 400);
      if (body.method === "bkash" && !settings.enableBkash) throw new CatalogError("bKash is currently unavailable. Choose another payment method.", 400);
      if (body.method === "nagad" && !settings.enableNagad) throw new CatalogError("Nagad is currently unavailable. Choose another payment method.", 400);
      if (body.method === "advance" && (!settings.enableAdvanceShipping || needsPrepay || shipping === 0)) throw new CatalogError("Advance delivery payment is not available for this cart.", 400);
      const nextRules = rule ? rules.map(item => item.code === rule.code ? { ...item, used: item.used + 1 } : item) : rules;
      const order = { id: body.id, phone: body.phone, name: body.name.trim(), address: body.address.trim(), city, method: body.method, lines, subtotal, discount, shipping, total: subtotal - discount + shipping, paid: false, status: "placed", paymentStatus: body.method === "cod" ? "cod_pending" : "verifying", courier: "Unassigned", customerPlaced: true, created: Date.now() };
      await tx.insert(storeOrders).values(order);
      for (const product of nextProducts) {
        await tx.update(storeState).set({ value: normalizeProduct(product), updatedAt: new Date() }).where(eq(storeState.key, productKey(product.slug)));
        await tx.insert(storeState).values({ key: `inventory:event:${body.id}:${product.slug}`, value: { at: Date.now(), source: "order", orderId: body.id, slug: product.slug, mode: inventoryMode(product), lines: lines.filter(line => line.slug === product.slug), before: products.find(p => p.slug === product.slug), after: product } });
      }
      if (rule) await tx.insert(storeState).values({ key: "catalog:config", value: { settings, couponRules: nextRules }, updatedAt: new Date() }).onConflictDoUpdate({ target: storeState.key, set: { value: { settings, couponRules: nextRules }, updatedAt: new Date() } });
      return { order, products: nextProducts, couponRules: nextRules, settings, replayed: false };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof CatalogError ? error.message : "Could not place this order. No stock was deducted. Please retry." }, { status: error instanceof CatalogError ? error.status : 500 });
  }
}
