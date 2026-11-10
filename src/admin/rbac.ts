export type AdminRole = "owner" | "manager" | "fulfillment" | "support";

export type Permission =
  | "analytics.read"
  | "finance.read"
  | "reports.read"
  | "orders.read"
  | "orders.write"
  | "orders.payment"
  | "dispatch.manage"
  | "orders.note"
  | "returns.manage"
  | "customers.read"
  | "reviews.moderate"
  | "messages.read"
  | "catalog.read"
  | "catalog.write"
  | "inventory.write"
  | "storefront.write"
  | "content.write"
  | "marketing.write"
  | "delivery.write"
  | "payments.write"
  | "media.write"
  | "settings.write"
  | "team.manage"
  | "audit.read"
  | "secrets.manage";

export interface RoleDefinition {
  role: AdminRole;
  label: string;
  shortLabel: string;
  summary: string;
  badgeCls: string;
  dotCls: string;
  permissions: Permission[];
}

export const ROLE_DEFINITIONS: Record<AdminRole, RoleDefinition> = {
  owner: {
    role: "owner",
    label: "Owner · Super Admin",
    shortLabel: "Owner",
    summary: "Unrestricted control over catalog, margins, storefront, team roles, and backend secrets vault.",
    badgeCls: "bg-amber-100 text-amber-950 ring-amber-300/80",
    dotCls: "bg-amber-500",
    permissions: [
      "analytics.read", "finance.read", "reports.read", "orders.read", "orders.write", "orders.payment", "orders.note", "dispatch.manage", "returns.manage",
      "customers.read", "reviews.moderate", "messages.read",
      "catalog.read", "catalog.write", "inventory.write", "storefront.write", "content.write",
      "marketing.write", "delivery.write", "payments.write", "media.write",
      "settings.write", "team.manage", "audit.read", "secrets.manage",
    ],
  },
  manager: {
    role: "manager",
    label: "Operations Manager",
    shortLabel: "Ops Manager",
    summary: "Manages products, pricing, orders, coupons, storefront hero, and delivery rules. No access to backend secrets.",
    badgeCls: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    dotCls: "bg-emerald-500",
    permissions: [
      "analytics.read", "finance.read", "reports.read", "orders.read", "orders.write", "orders.payment", "orders.note", "dispatch.manage", "returns.manage",
      "customers.read", "reviews.moderate", "messages.read",
      "catalog.read", "catalog.write", "inventory.write", "storefront.write", "content.write",
      "marketing.write", "delivery.write", "payments.write", "media.write",
      "settings.write", "audit.read",
    ],
  },
  fulfillment: {
    role: "fulfillment",
    label: "Fulfillment & Inventory",
    shortLabel: "Fulfillment",
    summary: "Packs and dispatches orders, assigns Pathao/Steadfast couriers, and updates stock quantities.",
    badgeCls: "bg-sky-50 text-sky-900 ring-sky-200",
    dotCls: "bg-sky-500",
    permissions: [
      "analytics.read", "orders.read", "orders.write", "orders.note", "dispatch.manage", "returns.manage",
      "customers.read", "messages.read",
      "catalog.read", "inventory.write", "media.write",
    ],
  },
  support: {
    role: "support",
    label: "Support Specialist",
    shortLabel: "Support",
    summary: "Looks up customer orders, adds support notes, and views product stock & specs. Read-only on store settings.",
    badgeCls: "bg-violet-50 text-violet-900 ring-violet-200",
    dotCls: "bg-violet-500",
    permissions: [
      "orders.read", "orders.note", "returns.manage", "customers.read", "reviews.moderate", "messages.read", "catalog.read",
    ],
  },
};

export const ALL_PERMISSIONS: { key: Permission; label: string; group: string }[] = [
  { key: "analytics.read", label: "View sales & traffic analytics", group: "Analytics" },
  { key: "finance.read", label: "View unit cost, profit margins & capital", group: "Analytics" },
  { key: "reports.read", label: "View sales, product, customer & order reports", group: "Analytics" },
  { key: "orders.read", label: "View customer orders & timelines", group: "Orders" },
  { key: "orders.write", label: "Update order status, payment & courier", group: "Orders" },
  { key: "orders.payment", label: "Verify payments and record refunds", group: "Orders" },
  { key: "dispatch.manage", label: "Create batches, pack and request courier pickups", group: "Orders" },
  { key: "orders.note", label: "Write internal order notes", group: "Orders" },
  { key: "returns.manage", label: "Approve / reject return requests", group: "Orders" },
  { key: "customers.read", label: "View customers, groups & addresses", group: "Customers" },
  { key: "reviews.moderate", label: "Approve / reject product reviews", group: "Customers" },
  { key: "messages.read", label: "Read contact messages", group: "Customers" },
  { key: "catalog.read", label: "Inspect products, categories, brands & attributes", group: "Catalog" },
  { key: "catalog.write", label: "Create/edit products, prices & categories", group: "Catalog" },
  { key: "inventory.write", label: "Adjust stock counts & restock levels", group: "Catalog" },
  { key: "storefront.write", label: "Control hero slides, homepage sections & banners", group: "Storefront" },
  { key: "content.write", label: "Edit pages, blog posts & testimonials", group: "Storefront" },
  { key: "marketing.write", label: "Manage coupons, discounts & flash sales", group: "Marketing" },
  { key: "delivery.write", label: "Manage delivery providers, zones & charges", group: "Delivery" },
  { key: "payments.write", label: "Manage payment methods & transactions", group: "Payments" },
  { key: "media.write", label: "Upload & organize media library", group: "Content" },
  { key: "settings.write", label: "Edit store, SEO, tax & shipping settings", group: "Platform" },
  { key: "team.manage", label: "Manage staff accounts & roles", group: "Security" },
  { key: "audit.read", label: "Inspect administrative audit trail", group: "Security" },
  { key: "secrets.manage", label: "Write/rotate backend-only API secrets", group: "Security" },
];

export function hasPermission(role: AdminRole | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_DEFINITIONS[role]?.permissions.includes(perm) ?? false;
}

export interface StaffMember {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  role: AdminRole;
  active: boolean;
  twoFactor: boolean;
  lastActive: string;
}

export const DEFAULT_STAFF: StaffMember[] = [
  {
    id: "stf-owner",
    name: "Arafat Rahman",
    initials: "AR",
    email: "arafat@glowingspace.com.bd",
    phone: "01711223344",
    role: "owner",
    active: true,
    twoFactor: true,
    lastActive: "Online now",
  },
  {
    id: "stf-mgr",
    name: "Nadia Islam",
    initials: "NI",
    email: "nadia@glowingspace.com.bd",
    phone: "01819556677",
    role: "manager",
    active: true,
    twoFactor: true,
    lastActive: "18m ago",
  },
  {
    id: "stf-ful",
    name: "Kamrul Hasan",
    initials: "KH",
    email: "kamrul@glowingspace.com.bd",
    phone: "01914889900",
    role: "fulfillment",
    active: true,
    twoFactor: true,
    lastActive: "42m ago",
  },
  {
    id: "stf-sup",
    name: "Maliha Chowdhury",
    initials: "MC",
    email: "maliha@glowingspace.com.bd",
    phone: "01612334455",
    role: "support",
    active: true,
    twoFactor: false,
    lastActive: "2h ago",
  },
];

export interface AuditEntry {
  id: string;
  at: number;
  actorName: string;
  actorRole: AdminRole;
  action: string;
  target: string;
  category: "catalog" | "orders" | "storefront" | "settings" | "security" | "team";
}

export const INITIAL_AUDIT: AuditEntry[] = [
  {
    id: "aud-1",
    at: Date.now() - 22 * 60_000,
    actorName: "Arafat Rahman",
    actorRole: "owner",
    action: "Verified backend vault health for bKash & Steadfast",
    target: "BKASH_APP_SECRET · v3",
    category: "security",
  },
  {
    id: "aud-2",
    at: Date.now() - 95 * 60_000,
    actorName: "Kamrul Hasan",
    actorRole: "fulfillment",
    action: "Assigned Steadfast tracking & marked shipped",
    target: "Order GS8492014",
    category: "orders",
  },
  {
    id: "aud-3",
    at: Date.now() - 4 * 3600_000,
    actorName: "Nadia Islam",
    actorRole: "manager",
    action: "Restocked Samsung 30Q 18650 cells (+30 units)",
    target: "GS-BAT-001",
    category: "catalog",
  },
  {
    id: "aud-4",
    at: Date.now() - 19 * 3600_000,
    actorName: "Nadia Islam",
    actorRole: "manager",
    action: "Updated Hero Slide #2 headline & Save 15% badge",
    target: "H4 LED Headlight Pair",
    category: "storefront",
  },
];
