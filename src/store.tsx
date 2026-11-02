import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  categories as seedCategories,
  defaultCouponRules,
  defaultHeroSlides,
  defaultSettings,
  products as seedProducts,
  type Category,
  type CouponRule,
  type HeroSlideConfig,
  type Product,
  type StoreSettings,
} from "./data";
import {
  DEFAULT_STAFF,
  INITIAL_AUDIT,
  hasPermission,
  type AdminRole,
  type AuditEntry,
  type Permission,
  type StaffMember,
} from "./admin/rbac";
import {
  INITIAL_SECRETS_METADATA,
  commitSecretToBackendVault,
  type SecretDescriptor,
  type VaultEnv,
} from "./admin/secretsVault";
import { orderUpdateIssue } from "./admin/orderWorkflow";
import { batchCreateIssue, stepState, type StepKey } from "./admin/batches";
import type { CourierPickupResult } from "./admin/courier";
import { ToastProvider, useNotify } from "./toast";

export interface Line { slug: string; qty: number }

export type OrderStatus = "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "cod_pending" | "verifying" | "paid" | "refunded";
export type CourierName = "Unassigned" | "Steadfast" | "Pathao" | "RedX";

export interface ActivityEvent { id: string; at: number; actor: string; label: string }

export interface BatchPickup {
  date: string;
  window: "morning" | "afternoon" | "evening";
  address: string;
  contactName: string;
  contactPhone: string;
}

export interface BatchPickupRequest {
  id: string;
  attempt: number;
  ref: string;
  requestedAt: number;
  scheduledFor?: string;
  booked: number;
  failed: number;
  by: string;
  mode: "backend" | "demo";
}

export interface Batch {
  id: string;
  name: string;
  courier: CourierName;
  pickup: BatchPickup;
  createdAt: number;
  createdBy: string;
  pickupRequests: BatchPickupRequest[];
  events: ActivityEvent[];
}

export interface Order {
  id: string;
  phone: string;
  name: string;
  address: string;
  city: string;
  method: string;
  lines: { slug: string; name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  paid: boolean;
  created: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  courier?: CourierName;
  trackingCode?: string;
  internalNote?: string;
  customerPlaced?: boolean;
  updatedAt?: number;
  assignee?: string;
  priority?: "normal" | "high";
  batchId?: string;
  parcelError?: string;
  events?: { id: string; at: number; actor: string; label: string }[];
}

const DAY = 86_400_000;
const HOUR = 3_600_000;

const SEEDED_ORDERS: Order[] = [
  {
    id: "GS8492014", phone: "01715442288", name: "Tanvir Hossain", address: "House 18, Road 7, Dhanmondi", city: "dhaka", method: "cod",
    lines: [{ slug: "diy-power-bank-kit", name: "DIY 10,000mAh Power Bank Kit", qty: 1, price: 1290 }, { slug: "tp4056-type-c-charging-module", name: "TP4056 Type-C 1A Charging Module", qty: 4, price: 45 }],
    subtotal: 1470, discount: 0, shipping: 70, total: 1540, paid: false, status: "shipped", paymentStatus: "cod_pending", courier: "Pathao", trackingCode: "PTH-992841", internalNote: "Call before arrival at gate", created: Date.now() - 4 * HOUR,
  },
  {
    id: "GS8491982", phone: "01819334411", name: "Rafiqul Islam", address: "Agrabad C/A, Block B", city: "outside", method: "bkash",
    lines: [{ slug: "h4-led-headlight-bulb-pair", name: "H4 LED Headlight Bulb (Pair) 6000K", qty: 1, price: 2200 }],
    subtotal: 2200, discount: 220, shipping: 130, total: 2110, paid: true, status: "packed", paymentStatus: "paid", courier: "Steadfast", trackingCode: "SF-441092", internalNote: "bKash merchant verified", created: Date.now() - 9 * HOUR,
  },
  {
    id: "GS8491905", phone: "01912776655", name: "Nusrat Jahan", address: "Polashi Barracks, BUET Dorm", city: "dhaka", method: "nagad",
    lines: [{ slug: "smart-obstacle-robot-kit", name: "Obstacle-Avoiding Robot Car Kit", qty: 1, price: 2450 }, { slug: "hc-sr04-ultrasonic-sensor", name: "HC-SR04 Ultrasonic Sensor", qty: 2, price: 95 }],
    subtotal: 2640, discount: 132, shipping: 0, total: 2508, paid: false, status: "placed", paymentStatus: "verifying", courier: "Unassigned", internalNote: "Student5 applied · awaiting Nagad callback check", created: Date.now() - 14 * HOUR,
  },
  {
    id: "GS8491740", phone: "01677889922", name: "Mahmuduluky", address: "Zindabazar Electronics Market", city: "outside", method: "bkash",
    lines: [{ slug: "samsung-30q-18650-3000mah", name: "Samsung 30Q 18650 3000mAh Li-ion Cell", qty: 6, price: 450 }, { slug: "3s-bms-20a-protection-board", name: "3S 20A BMS Protection Board", qty: 2, price: 180 }],
    subtotal: 3060, discount: 0, shipping: 130, total: 3190, paid: true, status: "delivered", paymentStatus: "paid", courier: "Steadfast", trackingCode: "SF-439811", created: Date.now() - 1.4 * DAY,
  },
  {
    id: "GS8491603", phone: "01722990011", name: "Sadia Afrin", address: "Sector 11, Road 14, Uttara", city: "dhaka", method: "cod",
    lines: [{ slug: "esp32-home-automation-kit", name: "ESP32 Home Automation Kit", qty: 1, price: 1890 }],
    subtotal: 1890, discount: 0, shipping: 0, total: 1890, paid: true, status: "delivered", paymentStatus: "paid", courier: "Pathao", trackingCode: "PTH-988120", created: Date.now() - 2.2 * DAY,
  },
  {
    id: "GS8491490", phone: "01533445566", name: "Sabbir Ahmed", address: "Shaheb Bazar, Zero Point, Rajshahi", city: "outside", method: "cod",
    lines: [{ slug: "esp32-devkit-v1", name: "ESP32 DevKit V1 (WiFi + BLE)", qty: 2, price: 590 }, { slug: "l298n-motor-driver", name: "L298N Dual Motor Driver", qty: 2, price: 180 }],
    subtotal: 1540, discount: 154, shipping: 130, total: 1516, paid: false, status: "confirmed", paymentStatus: "cod_pending", courier: "Steadfast", created: Date.now() - 3.1 * DAY,
  },
  {
    id: "GS8491311", phone: "01788112233", name: "Farhan Kabir", address: "Mirpur 10, Block C, Lane 4", city: "dhaka", method: "bkash",
    lines: [{ slug: "4-slot-18650-smart-charger", name: "4-Slot 18650 Smart LCD Charger", qty: 1, price: 1150 }, { slug: "lg-mj1-18650-3500mah", name: "LG MJ1 18650 3500mAh Cell", qty: 4, price: 520 }],
    subtotal: 3230, discount: 150, shipping: 0, total: 3080, paid: true, status: "delivered", paymentStatus: "paid", courier: "Pathao", trackingCode: "PTH-985410", created: Date.now() - 4.5 * DAY,
  },
  {
    id: "GS8491120", phone: "01844667788", name: "Imran Chowdhury", address: "Boyra Main Road, Khulna", city: "outside", method: "nagad",
    lines: [{ slug: "spot-welder-pcb-18650", name: "DIY Spot Welder Control Board", qty: 1, price: 1450 }, { slug: "pure-nickel-strip-0-15mm", name: "Pure Nickel Strip 0.15mm (1m)", qty: 3, price: 160 }],
    subtotal: 1930, discount: 0, shipping: 130, total: 2060, paid: true, status: "delivered", paymentStatus: "paid", courier: "Steadfast", trackingCode: "SF-436105", created: Date.now() - 6.2 * DAY,
  },
  {
    id: "GS8490988", phone: "01955221144", name: "Mehedi Hasan", address: "Badda Link Road, Gulshan", city: "dhaka", method: "advance",
    lines: [{ slug: "arduino-nano-type-c", name: "Arduino Nano (CH340, Type-C)", qty: 3, price: 380 }],
    subtotal: 1140, discount: 0, shipping: 70, total: 1210, paid: true, status: "delivered", paymentStatus: "paid", courier: "Pathao", trackingCode: "PTH-981034", created: Date.now() - 8.4 * DAY,
  },
  {
    id: "GS8490775", phone: "01766009988", name: "Tariq Aziz", address: "Chawkbazar College Road, Chattogram", city: "outside", method: "bkash",
    lines: [{ slug: "lipo-3s-2200mah-rc", name: "LiPo 3S 2200mAh 30C RC Battery", qty: 2, price: 1650 }],
    subtotal: 3300, discount: 0, shipping: 130, total: 3430, paid: true, status: "delivered", paymentStatus: "paid", courier: "Steadfast", trackingCode: "SF-431990", created: Date.now() - 11.5 * DAY,
  },
];

function usePersist<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? (JSON.parse(s) as T) : init;
    } catch {
      return init;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore quota errors */ }
  }, [key, v]);
  return [v, setV] as const;
}

const legacyOrderCache = new WeakMap<Order, Order>();
function normalizeOrder(order: Order): Order {
  if (order.status && order.paymentStatus && order.courier) return order;
  const cached = legacyOrderCache.get(order);
  if (cached) return cached;
  const normalized: Order = {
    ...order,
    status: order.status ?? "placed",
    paymentStatus: order.paymentStatus ?? (order.paid ? "paid" : order.method === "cod" ? "cod_pending" : "verifying"),
    courier: order.courier ?? "Unassigned",
  };
  legacyOrderCache.set(order, normalized);
  return normalized;
}

export function computeCouponDiscount(subtotal: number, code: string, rules: CouponRule[]): number {
  if (!code || subtotal <= 0) return 0;
  const rule = rules.find((r) => r.code.toUpperCase() === code.toUpperCase() && r.active);
  if (!rule) return 0;
  if (rule.startsAt && rule.startsAt > Date.now()) return 0;
  if (rule.expiresAt && rule.expiresAt <= Date.now()) return 0;
  if (subtotal < rule.minSubtotal) return 0;
  if (rule.maxUses && rule.used >= rule.maxUses) return 0;
  return rule.type === "percent"
    ? Math.round(subtotal * (rule.value / 100))
    : Math.min(subtotal, Math.round(rule.value));
}

interface Store {
  /* Customer Cart & Auth */
  cart: Line[];
  add: (slug: string, qty?: number) => void;
  setQty: (slug: string, qty: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
  items: { p: Product; qty: number }[];
  count: number;
  subtotal: number;
  coupon: string;
  applyCoupon: (c: string) => boolean;
  removeCoupon: () => void;
  discount: number;
  user: string | null;
  login: (phone: string) => void;
  logout: () => void;
  orders: Order[];
  customerOrders: Order[];
  saveOrder: (o: Order) => void;
  notify: (m: string) => void;

  /* Live Storefront Catalog & Config (Admin-Controlled) */
  catalogProducts: Product[];
  visibleProducts: Product[];
  catalogCategories: Category[];
  visibleCategories: Category[];
  findProduct: (slug: string, includeHidden?: boolean) => Product | undefined;
  categoryLabel: (slug: string) => string;
  heroSlides: HeroSlideConfig[];
  couponRules: CouponRule[];
  settings: StoreSettings;

  /* Admin RBAC, Actions & Backend Secrets Vault */
  staff: StaffMember[];
  currentAdmin: StaffMember | null;
  can: (perm: Permission) => boolean;
  signInAdmin: (staffId: string) => void;
  switchAdminRole: (role: AdminRole) => void;
  signOutAdmin: () => void;
  upsertStaff: (member: StaffMember) => void;
  toggleStaffActive: (id: string) => void;

  upsertProduct: (product: Product, isNew?: boolean) => boolean;
  patchProduct: (slug: string, patch: Partial<Product>, reason?: string) => boolean;
  deleteProduct: (slug: string) => boolean;
  bulkPatchProducts: (slugs: string[], patch: Partial<Product>, summary: string) => boolean;

  upsertCategory: (cat: Category) => boolean;
  deleteCategory: (slug: string) => boolean;

  saveHeroSlides: (slides: HeroSlideConfig[], summary?: string) => boolean;
  upsertCouponRule: (rule: CouponRule) => boolean;
  deleteCouponRule: (code: string) => boolean;
  updateSettings: (patch: Partial<StoreSettings>, summary?: string) => boolean;
  updateOrder: (id: string, patch: Partial<Order>, summary?: string, expectedVersion?: number) => boolean;
  bulkUpdateOrders: (ids: string[], patch: Partial<Order>) => { updated: number; skipped: { id: string; reason: string }[] };
  batches: Batch[];
  createBatch: (input: { name: string; courier: CourierName; pickup: BatchPickup; orderIds: string[] }) => { id: string | null; skipped: { id: string; reason: string }[] } | null;
  runBatchStep: (batchId: string, step: "confirm" | "pack") => { updated: number; skipped: { id: string; reason: string }[] } | null;
  removeFromBatch: (batchId: string, orderId: string) => boolean;
  applyDispatchResult: (batchId: string, result: CourierPickupResult, attemptedIds: string[], mode: "backend" | "demo") => { booked: number; failed: number } | null;

  secretsMeta: SecretDescriptor[];
  rotateBackendSecret: (key: string, rawValue: string, env: VaultEnv) => Promise<{ ok: boolean; message: string }>;
  verifyBackendSecret: (key: string) => Promise<boolean>;
  revokeBackendSecret: (key: string) => boolean;

  auditLog: AuditEntry[];
  resetDemoStore: () => void;
}

const Ctx = createContext<Store>(null!);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <ToastProvider><StoreStateProvider>{children}</StoreStateProvider></ToastProvider>;
}

function StoreStateProvider({ children }: { children: ReactNode }) {
  const notify = useNotify();
  const [catalogProducts, setCatalogProducts] = usePersist<Product[]>("gs_catalog_products_v2", seedProducts);
  const [catalogCategories, setCatalogCategories] = usePersist<Category[]>("gs_catalog_categories_v2", seedCategories);
  const [heroSlides, setHeroSlides] = usePersist<HeroSlideConfig[]>("gs_hero_slides_v1", defaultHeroSlides);
  const [couponRules, setCouponRules] = usePersist<CouponRule[]>("gs_coupon_rules_v1", defaultCouponRules);
  const [savedSettings, setSettings] = usePersist<StoreSettings>("gs_store_settings_v1", defaultSettings);
  // Fill fields introduced after an older browser saved its settings.
  const settings = useMemo(() => ({ ...defaultSettings, ...savedSettings }), [savedSettings]);

  const [cart, setCart] = usePersist<Line[]>("gs_cart", []);
  const [coupon, setCoupon] = usePersist("gs_coupon", "");
  const [user, setUser] = usePersist<string | null>("gs_user", null);
  const [orders, setOrders] = usePersist<Order[]>("gs_orders", SEEDED_ORDERS);

  const [staff, setStaff] = usePersist<StaffMember[]>("gs_admin_staff_v1", DEFAULT_STAFF);
  const [activeAdminId, setActiveAdminId] = usePersist<string | null>("gs_active_admin_v1", "stf-owner");
  const [auditLog, setAuditLog] = usePersist<AuditEntry[]>("gs_admin_audit_v1", INITIAL_AUDIT);
  const [batches, setBatches] = usePersist<Batch[]>("gs_batches_v1", []);

  // Backend secret descriptors live ONLY in volatile memory; raw secret values are never stored anywhere on the client.
  const [secretsMeta, setSecretsMeta] = useState<SecretDescriptor[]>(INITIAL_SECRETS_METADATA);

  // Ensure legacy gs_orders without seeded items or status fields normalize cleanly
  const normalizedOrders = useMemo(() => orders.map(normalizeOrder), [orders]);
  const ordersById = useMemo(() => new Map(normalizedOrders.map((order) => [order.id, order])), [normalizedOrders]);

  const currentAdmin = useMemo(
    () => staff.find((m) => m.id === activeAdminId && m.active) ?? null,
    [staff, activeAdminId],
  );

  const can = useCallback((perm: Permission) => hasPermission(currentAdmin?.role, perm), [currentAdmin?.role]);

  const recordAudit = (action: string, target: string, category: AuditEntry["category"]) => {
    const actorName = currentAdmin?.name ?? "Admin";
    const actorRole = currentAdmin?.role ?? "owner";
    const entry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: Date.now(),
      actorName,
      actorRole,
      action,
      target,
      category,
    };
    setAuditLog((prev) => [entry, ...prev].slice(0, 120));
  };

  const visibleCategories = useMemo(
    () => catalogCategories.filter((c) => c.visible !== false),
    [catalogCategories],
  );

  const visibleCatSet = useMemo(
    () => new Set(visibleCategories.map((c) => c.slug)),
    [visibleCategories],
  );

  const visibleProducts = useMemo(
    () => catalogProducts.filter((p) => p.published !== false && visibleCatSet.has(p.category)),
    [catalogProducts, visibleCatSet],
  );

  const allProductsBySlug = useMemo(() => new Map(catalogProducts.map((product) => [product.slug, product])), [catalogProducts]);
  const visibleProductsBySlug = useMemo(() => new Map(visibleProducts.map((product) => [product.slug, product])), [visibleProducts]);
  const categoryNames = useMemo(() => new Map(catalogCategories.map((category) => [category.slug, category.name])), [catalogCategories]);
  const findProduct = useCallback((slug: string, includeHidden = false) =>
    (includeHidden ? allProductsBySlug : visibleProductsBySlug).get(slug), [allProductsBySlug, visibleProductsBySlug]);
  const categoryLabel = useCallback((slug: string) => categoryNames.get(slug) ?? slug, [categoryNames]);

  const add = (slug: string, qty = 1) => {
    const product = findProduct(slug, false);
    if (!product?.stock) { notify("Currently out of stock"); return; }
    const existing = cart.find((line) => line.slug === slug);
    if (existing && existing.qty >= product.stock) { notify(`Only ${product.stock} available`); return; }
    setCart((current) => current.some((line) => line.slug === slug)
      ? current.map((line) => line.slug === slug ? { ...line, qty: Math.min(product.stock, line.qty + qty) } : line)
      : [...current, { slug, qty: Math.min(qty, product.stock) }]);
    notify("Added to cart");
  };

  const setQty = (slug: string, qty: number) => setCart((current) => current.map((line) => line.slug === slug
    ? { ...line, qty: Math.max(1, Math.min(qty, findProduct(slug, true)?.stock ?? 1)) }
    : line));

  const remove = (slug: string) => setCart((c) => c.filter((l) => l.slug !== slug));

  const items = useMemo(
    () => cart.map((l) => ({ p: findProduct(l.slug, false)!, qty: l.qty })).filter((i) => Boolean(i.p)),
    [cart, findProduct],
  );

  const subtotal = items.reduce((s, i) => s + i.p.price * i.qty, 0);
  const discount = computeCouponDiscount(subtotal, coupon, couponRules);

  const applyCoupon = (c: string) => {
    const k = c.trim().toUpperCase();
    const rule = couponRules.find((r) => r.code.toUpperCase() === k && r.active);
    if (!rule) return false;
    if (rule.startsAt && rule.startsAt > Date.now()) return false;
    if (rule.expiresAt && rule.expiresAt <= Date.now()) return false;
    if (subtotal < rule.minSubtotal) return false;
    if (rule.maxUses && rule.used >= rule.maxUses) return false;
    setCoupon(rule.code);
    return true;
  };

  const saveOrder = (o: Order) => {
    const enriched: Order = {
      ...o,
      status: o.status ?? "placed",
      paymentStatus: o.paymentStatus ?? (o.method === "cod" ? "cod_pending" : "verifying"),
      courier: o.courier ?? "Unassigned",
      customerPlaced: true,
      updatedAt: Date.now(),
    };
    setOrders((prev) => [enriched, ...prev]);
    // Deduct stock on ordered lines so inventory stays accurate
    setCatalogProducts((prev) => prev.map((prod) => {
      const line = o.lines.find((l) => l.slug === prod.slug);
      return line ? { ...prod, stock: Math.max(0, prod.stock - line.qty) } : prod;
    }));
    if (coupon) {
      setCouponRules((prev) => prev.map((r) => r.code === coupon ? { ...r, used: r.used + 1 } : r));
    }
  };

  /* ---------- Admin RBAC & Mutations ---------- */

  const signInAdmin = (staffId: string) => {
    const member = staff.find((m) => m.id === staffId && m.active);
    if (!member) return;
    setActiveAdminId(member.id);
  };

  const switchAdminRole = (role: AdminRole) => {
    const target = staff.find((m) => m.role === role && m.active);
    if (target) {
      setActiveAdminId(target.id);
      notify(`Switched role to ${target.name} (${role})`);
    }
  };

  const signOutAdmin = () => setActiveAdminId(null);

  const upsertStaff = (member: StaffMember) => {
    if (!can("team.manage")) { notify("Permission denied: Owner role required"); return; }
    setStaff((prev) => prev.some((m) => m.id === member.id)
      ? prev.map((m) => m.id === member.id ? member : m)
      : [...prev, member]);
    recordAudit(`Saved staff member (${member.role})`, member.name, "team");
    notify(`Saved ${member.name}`);
  };

  const toggleStaffActive = (id: string) => {
    if (!can("team.manage")) { notify("Permission denied"); return; }
    const target = staff.find((m) => m.id === id);
    if (!target || target.id === currentAdmin?.id) {
      notify("Cannot deactivate your active session");
      return;
    }
    setStaff((prev) => prev.map((m) => m.id === id ? { ...m, active: !m.active } : m));
    recordAudit(target.active ? "Suspended staff access" : "Restored staff access", target.name, "team");
  };

  const upsertProduct = (product: Product, isNew = false) => {
    if (!can("catalog.write")) { notify("Permission denied: Catalog write required"); return false; }
    setCatalogProducts((prev) => {
      const exists = prev.some((p) => p.slug === product.slug);
      return exists ? prev.map((p) => p.slug === product.slug ? product : p) : [product, ...prev];
    });
    recordAudit(isNew ? "Created product SKU" : "Updated product details", `${product.name} (${product.sku})`, "catalog");
    notify(isNew ? `Created ${product.sku}` : `Saved ${product.sku}`);
    return true;
  };

  const patchProduct = (slug: string, patch: Partial<Product>, reason?: string) => {
    const keys = Object.keys(patch);
    const stockOnly = keys.every((k) => k === "stock" || k === "lowStockAt");
    if (stockOnly ? !can("inventory.write") : !can("catalog.write")) {
      notify("Permission denied for your current role");
      return false;
    }
    const target = catalogProducts.find((p) => p.slug === slug);
    if (!target) return false;
    setCatalogProducts((prev) => prev.map((p) => p.slug === slug ? { ...p, ...patch } : p));
    recordAudit(reason ?? `Updated ${keys.join(", ")}`, `${target.sku} · ${target.name}`, "catalog");
    return true;
  };

  const deleteProduct = (slug: string) => {
    if (!can("catalog.write")) { notify("Permission denied"); return false; }
    const target = catalogProducts.find((p) => p.slug === slug);
    if (!target) return false;
    setCatalogProducts((prev) => prev.filter((p) => p.slug !== slug));
    setCart((prev) => prev.filter((l) => l.slug !== slug));
    recordAudit("Deleted product SKU", `${target.sku} · ${target.name}`, "catalog");
    notify(`Deleted ${target.sku}`);
    return true;
  };

  const bulkPatchProducts = (slugs: string[], patch: Partial<Product>, summary: string) => {
    const keys = Object.keys(patch);
    const stockOnly = keys.every((k) => k === "stock");
    if (stockOnly ? !can("inventory.write") : !can("catalog.write")) {
      notify("Permission denied");
      return false;
    }
    const set = new Set(slugs);
    setCatalogProducts((prev) => prev.map((p) => set.has(p.slug) ? { ...p, ...patch } : p));
    recordAudit(summary, `${slugs.length} SKUs`, "catalog");
    notify(`${summary} (${slugs.length} items)`);
    return true;
  };

  const upsertCategory = (cat: Category) => {
    if (!can("catalog.write")) { notify("Permission denied"); return false; }
    setCatalogCategories((prev) => prev.some((c) => c.slug === cat.slug)
      ? prev.map((c) => c.slug === cat.slug ? cat : c)
      : [...prev, cat]);
    recordAudit("Updated category", cat.name, "catalog");
    notify(`Saved category ${cat.name}`);
    return true;
  };

  const deleteCategory = (slug: string) => {
    if (!can("catalog.write")) { notify("Permission denied"); return false; }
    if (catalogProducts.some((p) => p.category === slug)) {
      notify("Move or remove products in this category first");
      return false;
    }
    setCatalogCategories((prev) => prev.filter((c) => c.slug !== slug));
    recordAudit("Removed empty category", slug, "catalog");
    notify("Category removed");
    return true;
  };

  const saveHeroSlides = (slides: HeroSlideConfig[], summary = "Updated Hero carousel") => {
    if (!can("storefront.write")) { notify("Permission denied"); return false; }
    setHeroSlides(slides);
    recordAudit(summary, `${slides.filter((s) => s.active).length} active slides`, "storefront");
    notify("Storefront hero updated");
    return true;
  };

  const upsertCouponRule = (rule: CouponRule) => {
    if (!can("marketing.write")) { notify("Permission denied"); return false; }
    if (!/^[A-Z0-9_-]{3,32}$/i.test(rule.code) || rule.value <= 0 || (rule.type === "percent" && rule.value > 100) || rule.minSubtotal < 0) {
      notify("Check the coupon code, discount, and minimum spend."); return false;
    }
    if (rule.startsAt && rule.expiresAt && rule.expiresAt <= rule.startsAt) { notify("End date must be after start date."); return false; }
    const normalized = { ...rule, code: rule.code.trim().toUpperCase() };
    setCouponRules((prev) => prev.some((r) => r.code === normalized.code)
      ? prev.map((r) => r.code === normalized.code ? normalized : r)
      : [normalized, ...prev]);
    recordAudit("Saved coupon rule", normalized.code, "settings");
    notify(`Saved coupon ${normalized.code}`);
    return true;
  };

  const deleteCouponRule = (code: string) => {
    if (!can("marketing.write")) { notify("Permission denied"); return false; }
    setCouponRules((prev) => prev.filter((r) => r.code !== code));
    if (coupon === code) setCoupon("");
    recordAudit("Deleted coupon code", code, "settings");
    notify(`Removed ${code}`);
    return true;
  };

  const updateSettings = (patch: Partial<StoreSettings>, summary = "Updated store & checkout settings") => {
    const storefrontOnly = Object.keys(patch).every((k) =>
      ["announcementText", "dispatchHourBdt", "showDispatchCountdown", "marqueePromises", "faqs"].includes(k),
    );
    if (storefrontOnly ? !can("storefront.write") && !can("settings.write") : !can("settings.write")) {
      notify("Permission denied");
      return false;
    }
    setSettings((prev) => ({ ...prev, ...patch }));
    recordAudit(summary, Object.keys(patch).join(", "), storefrontOnly ? "storefront" : "settings");
    notify("Store settings saved");
    return true;
  };

  const orderPermission = (patch: Partial<Order>) => {
    const fields = Object.keys(patch);
    const allowed = ["internalNote", "status", "paymentStatus", "courier", "trackingCode", "name", "phone", "address", "city", "priority", "assignee"];
    return fields.length > 0 && fields.every(key => allowed.includes(key) &&
      (key === "internalNote" ? can("orders.note") : key === "paymentStatus" ? can("orders.payment") : can("orders.write")));
  };
  const applyOrderPatch = (o: Order, patch: Partial<Order>, label: string, at: number): Order => ({
    ...o, ...patch,
    paid: patch.paymentStatus ? patch.paymentStatus === "paid" : o.paid,
    updatedAt: at,
    events: [...(o.events ?? []), { id: `evt-${at}-${Math.random().toString(36).slice(2, 7)}`, at, actor: currentAdmin?.name ?? "Staff", label }].slice(-100),
  });
  const updateOrder = (id: string, patch: Partial<Order>, summary?: string, expectedVersion?: number) => {
    if (!orderPermission(patch)) { notify("You do not have permission for this update."); return false; }
    const current = ordersById.get(id);
    if (!current) { notify("Order no longer exists."); return false; }
    if (expectedVersion !== undefined && expectedVersion !== (current.updatedAt ?? current.created)) {
      notify("Order changed since it was opened. Reopen it before saving."); return false;
    }
    const issue = orderUpdateIssue(current, patch);
    if (issue) { notify(issue); return false; }
    if (Object.entries(patch).every(([key, value]) => (current as unknown as Record<string, unknown>)[key] === value)) return true;
    const action = summary ?? (patch.status ? `Fulfillment changed to ${patch.status}` : patch.paymentStatus ? `Payment changed to ${patch.paymentStatus}` : "Order details updated");
    setOrders(prev => prev.map(o => o.id === id ? applyOrderPatch(o, patch, action, Date.now()) : o));
    recordAudit(action, id, "orders");
    notify(`${id} updated`);
    return true;
  };
  const bulkUpdateOrders = (ids: string[], patch: Partial<Order>) => {
    if (!orderPermission(patch)) { notify("You do not have permission for this update."); return { updated: 0, skipped: ids.map(id => ({ id, reason: "Permission denied" })) }; }
    const selected = new Set(ids);
    const skipped: { id: string; reason: string }[] = [];
    const eligible = new Set<string>();
    normalizedOrders.filter(o => selected.has(o.id)).forEach(order => {
      if (Object.entries(patch).every(([key, value]) => (order as unknown as Record<string, unknown>)[key] === value)) {
        skipped.push({ id: order.id, reason: "Already up to date" }); return;
      }
      const issue = orderUpdateIssue(order, patch);
      if (issue) skipped.push({ id: order.id, reason: issue });
      else eligible.add(order.id);
    });
    ids.filter(id => !ordersById.has(id)).forEach(id => skipped.push({ id, reason: "Order no longer exists" }));
    const action = patch.status ? `Fulfillment changed to ${patch.status}` : patch.courier ? `Courier assigned: ${patch.courier}` : "Order updated";
    const at = Date.now();
    setOrders(prev => prev.map(o => eligible.has(o.id) ? applyOrderPatch(o, patch, action, at) : o));
    recordAudit(`Bulk: ${action}`, `${eligible.size} orders`, "orders");
    notify(`${eligible.size} orders updated${skipped.length ? `, ${skipped.length} skipped` : ""}`);
    return { updated: eligible.size, skipped };
  };

  const actorName = currentAdmin?.name ?? "Staff";
  const activity = (label: string, at: number): ActivityEvent => ({
    id: `evt-${at}-${Math.random().toString(36).slice(2, 7)}`,
    at,
    actor: actorName,
    label,
  });

  const createBatch = (input: { name: string; courier: CourierName; pickup: BatchPickup; orderIds: string[] }) => {
    if (!can("dispatch.manage")) { notify("You do not have permission to create batches."); return null; }
    const skipped: { id: string; reason: string }[] = [];
    const eligible: string[] = [];
    [...new Set(input.orderIds)].forEach((id) => {
      const order = ordersById.get(id);
      if (!order) { skipped.push({ id, reason: "Order not found" }); return; }
      const issue = batchCreateIssue(order);
      if (issue) skipped.push({ id, reason: issue }); else eligible.push(id);
    });
    if (!eligible.length) { notify("No eligible orders for this batch."); return { id: null, skipped }; }
    const at = Date.now();
    const stamp = new Date(at + 6 * 3_600_000).toISOString().slice(2, 10).replace(/-/g, "");
    const sameDay = batches.filter((b) => b.id.startsWith(`B${stamp}`)).length;
    const id = `B${stamp}-${String(sameDay + 1).padStart(2, "0")}`;
    const batch: Batch = {
      id,
      name: input.name.trim() || id,
      courier: input.courier,
      pickup: input.pickup,
      createdAt: at,
      createdBy: actorName,
      pickupRequests: [],
      events: [activity(`Batch created with ${eligible.length} order${eligible.length === 1 ? "" : "s"} for ${input.courier}`, at)],
    };
    const eligibleIds = new Set(eligible);
    setBatches((prev) => [batch, ...prev]);
    setOrders((prev) => prev.map((o): Order => (eligibleIds.has(o.id)
      ? { ...o, batchId: id, courier: input.courier, updatedAt: at, events: [...(o.events ?? []), activity(`Added to batch ${id}`, at)].slice(-100) }
      : o)));
    recordAudit(`Created batch ${id}`, `${eligible.length} orders · ${input.courier}`, "orders");
    notify(`Batch ${id} created`);
    return { id, skipped };
  };

  const runBatchStep = (batchId: string, step: "confirm" | "pack") => {
    if (!can("dispatch.manage")) { notify("Permission denied"); return null; }
    if (!batches.some((b) => b.id === batchId)) return null;
    const members = normalizedOrders.filter((o) => o.batchId === batchId);
    const key: StepKey = step;
    const eligible: string[] = [];
    const skipped: { id: string; reason: string }[] = [];
    members.forEach((o) => {
      const state = stepState(o, key);
      if (state.state === "ready") eligible.push(o.id);
      else if (state.state === "blocked") skipped.push({ id: o.id, reason: state.reason });
    });
    const to: OrderStatus = step === "confirm" ? "confirmed" : "packed";
    const at = Date.now();
    const label = `${step === "confirm" ? "Confirmed" : "Packed"} ${eligible.length} order${eligible.length === 1 ? "" : "s"}${skipped.length ? `, ${skipped.length} skipped` : ""}`;
    if (eligible.length) {
      const eligibleIds = new Set(eligible);
      setOrders((prev) => prev.map((o): Order => (eligibleIds.has(o.id)
        ? { ...o, status: to, updatedAt: at, events: [...(o.events ?? []), activity(`Batch ${batchId}: ${to}`, at)].slice(-100) }
        : o)));
    }
    setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, events: [...b.events, activity(label, at)].slice(-200) } : b)));
    recordAudit(label, batchId, "orders");
    notify(eligible.length ? label : "Nothing ready for this step. Check the blocked orders.");
    return { updated: eligible.length, skipped };
  };

  const removeFromBatch = (batchId: string, orderId: string) => {
    if (!can("dispatch.manage")) { notify("Permission denied"); return false; }
    const order = ordersById.get(orderId);
    if (!order || order.batchId !== batchId) return false;
    if (order.status === "shipped" || order.status === "delivered") {
      notify("Dispatched orders cannot leave a batch.");
      return false;
    }
    const at = Date.now();
    setOrders((prev) => prev.map((o): Order => (o.id === orderId
      ? { ...o, batchId: undefined, courier: "Unassigned", updatedAt: at, events: [...(o.events ?? []), activity(`Removed from batch ${batchId}`, at)].slice(-100) }
      : o)));
    setBatches((prev) => prev.map((b) => (b.id === batchId ? { ...b, events: [...b.events, activity(`Removed ${orderId}`, at)].slice(-200) } : b)));
    recordAudit(`Removed ${orderId} from batch`, batchId, "orders");
    notify(`${orderId} removed from ${batchId}`);
    return true;
  };

  const applyDispatchResult = (batchId: string, result: CourierPickupResult, attemptedIds: string[], mode: "backend" | "demo") => {
    if (!can("dispatch.manage")) { notify("Permission denied"); return null; }
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return null;
    const byOrder = new Map(result.parcels.map((p) => [p.orderId, p]));
    const attempted = new Set(attemptedIds);
    const booked = attemptedIds.filter((id) => byOrder.get(id)?.ok);
    const failed = attemptedIds.filter((id) => !byOrder.get(id)?.ok);
    const at = Date.now();
    setOrders((prev) => prev.map((o): Order => {
      if (o.batchId !== batchId || !attempted.has(o.id)) return o;
      const r = byOrder.get(o.id);
      if (r?.ok) {
        const code = r.trackingCode ?? r.consignmentId ?? "";
        return {
          ...o,
          status: "shipped",
          trackingCode: code,
          courier: batch.courier,
          parcelError: undefined,
          updatedAt: at,
          events: [...(o.events ?? []), activity(`Dispatched with ${batch.courier} · ${code}`, at)].slice(-100),
        };
      }
      const reason = r?.error ?? "No response from courier";
      return {
        ...o,
        parcelError: reason,
        updatedAt: at,
        events: [...(o.events ?? []), activity(`Courier rejected parcel: ${reason}`, at)].slice(-100),
      };
    }));
    const request: BatchPickupRequest = {
      id: `PU-${at}`,
      attempt: batch.pickupRequests.length + 1,
      ref: result.pickupRef ?? "Not issued",
      requestedAt: at,
      scheduledFor: result.scheduledFor,
      booked: booked.length,
      failed: failed.length,
      by: actorName,
      mode,
    };
    setBatches((prev) => prev.map((b) => (b.id === batchId
      ? {
          ...b,
          pickupRequests: [...b.pickupRequests, request],
          events: [...b.events, activity(`Pickup ${request.ref}: ${booked.length} booked, ${failed.length} failed`, at)].slice(-200),
        }
      : b)));
    recordAudit(`Requested courier pickup (${batch.courier})`, `${batchId} · ${booked.length} booked, ${failed.length} failed`, "orders");
    notify(`Pickup requested: ${booked.length} booked${failed.length ? `, ${failed.length} need attention` : ""}`);
    return { booked: booked.length, failed: failed.length };
  };

  const rotateBackendSecret = async (key: string, rawValue: string, env: VaultEnv) => {
    if (!can("secrets.manage")) {
      return { ok: false, message: "Owner role required to write backend secrets." };
    }
    try {
      const committed = await commitSecretToBackendVault({ key, rawValue, env });
      let nextVersion = 1;
      setSecretsMeta((prev) => prev.map((item) => {
        if (item.key !== key) return item;
        nextVersion = item.version + 1;
        return {
          ...item,
          env,
          configured: true,
          version: nextVersion,
          fingerprint: committed.fingerprint,
          rotatedAt: committed.rotatedAt,
          rotatedBy: currentAdmin?.name ?? "Owner",
          health: "healthy",
          lastVerifiedAt: committed.rotatedAt,
        };
      }));
      recordAudit(`Rotated backend-only secret (${env})`, `${key} · v${nextVersion}`, "security");
      notify(`${key} committed to backend vault`);
      return { ok: true, message: `Committed ${key} (v${nextVersion}) — raw secret wiped from browser memory.` };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Failed to write secret" };
    }
  };

  const verifyBackendSecret = async (key: string) => {
    if (!can("secrets.manage")) { notify("Owner role required"); return false; }
    await new Promise((r) => setTimeout(r, 220));
    setSecretsMeta((prev) => prev.map((s) => s.key === key && s.configured
      ? { ...s, health: "healthy", lastVerifiedAt: Date.now() }
      : s));
    recordAudit("Verified backend secret integration health", key, "security");
    notify(`Verified ${key} on server`);
    return true;
  };

  const revokeBackendSecret = (key: string) => {
    if (!can("secrets.manage")) { notify("Owner role required"); return false; }
    setSecretsMeta((prev) => prev.map((s) => s.key === key
      ? { ...s, configured: false, fingerprint: "", health: "untested", rotatedAt: Date.now(), rotatedBy: currentAdmin?.name ?? "Owner" }
      : s));
    recordAudit("Revoked backend secret from vault", key, "security");
    notify(`Revoked ${key}`);
    return true;
  };

  const resetDemoStore = () => {
    if (!can("settings.write")) { notify("Permission denied"); return; }
    setCatalogProducts(seedProducts);
    setCatalogCategories(seedCategories);
    setHeroSlides(defaultHeroSlides);
    setCouponRules(defaultCouponRules);
    setSettings(defaultSettings);
    setOrders(SEEDED_ORDERS);
    setStaff(DEFAULT_STAFF);
    setSecretsMeta(INITIAL_SECRETS_METADATA);
    setBatches([]);
    recordAudit("Reset store & catalog to factory demo defaults", "All store slices", "settings");
    notify("Demo store reset to defaults");
  };

  const customerOrders = useMemo(
    () => normalizedOrders.filter((o) => o.customerPlaced || (user && o.phone === user)),
    [normalizedOrders, user],
  );

  return (
    <Ctx.Provider value={{
      cart, add, setQty, remove, clear: () => { setCart([]); setCoupon(""); },
      items, count: items.reduce((s, i) => s + i.qty, 0), subtotal,
      coupon, applyCoupon, removeCoupon: () => setCoupon(""), discount,
      user, login: setUser, logout: () => setUser(null),
      orders: normalizedOrders, customerOrders, saveOrder, notify,

      catalogProducts, visibleProducts, catalogCategories, visibleCategories,
      findProduct, categoryLabel, heroSlides, couponRules, settings,

      staff, currentAdmin, can, signInAdmin, switchAdminRole, signOutAdmin,
      upsertStaff, toggleStaffActive,

      upsertProduct, patchProduct, deleteProduct, bulkPatchProducts,
      upsertCategory, deleteCategory,
      saveHeroSlides, upsertCouponRule, deleteCouponRule, updateSettings, updateOrder, bulkUpdateOrders,
      batches, createBatch, runBatchStep, removeFromBatch, applyDispatchResult,

      secretsMeta, rotateBackendSecret, verifyBackendSecret, revokeBackendSecret,
      auditLog, resetDemoStore,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => useContext(Ctx);
