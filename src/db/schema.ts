import { pgTable, text, integer, boolean, bigint, jsonb, timestamp } from "drizzle-orm/pg-core";

export const storeOrders = pgTable("store_orders", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  method: text("method").notNull(),
  lines: jsonb("lines").$type<{ slug: string; name: string; qty: number; price: number; unitsPerPack?: number; variantId?: string; variantLabel?: string; cost?: number; inventoryMode?: string }[]>().notNull(),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  shipping: integer("shipping").notNull().default(0),
  total: integer("total").notNull(),
  paid: boolean("paid").notNull().default(false),
  status: text("status").notNull().default("placed"),
  paymentStatus: text("payment_status").notNull().default("cod_pending"),
  courier: text("courier").notNull().default("Unassigned"),
  trackingCode: text("tracking_code"),
  internalNote: text("internal_note"),
  customerPlaced: boolean("customer_placed").default(true),
  assignee: text("assignee"),
  priority: text("priority").notNull().default("normal"),
  batchId: text("batch_id"),
  parcelError: text("parcel_error"),
  events: jsonb("events").$type<{ id: string; at: number; actor: string; label: string }[]>().notNull().default([]),
  created: bigint("created", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }),
});

export const storeState = pgTable("store_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
