import type { IconName } from "../icons";
import type { Permission } from "./rbac";

export const ADMIN_NAV = [
  { key: "overview", label: "Dashboard", group: "Workspace", icon: "chart", permission: "analytics.read" },
  { key: "orders", label: "Orders", group: "Workspace", icon: "bag", permission: "orders.read" },
  { key: "returns", label: "Returns", group: "Workspace", icon: "return", permission: "returns.manage" },
  { key: "customers", label: "Customers", group: "Workspace", icon: "users", permission: "customers.read" },
  { key: "reviews", label: "Reviews", group: "Workspace", icon: "star", permission: "reviews.moderate" },
  { key: "messages", label: "Messages", group: "Workspace", icon: "mail", permission: "messages.read" },
  { key: "dispatch", label: "Dispatch", group: "Workspace", icon: "truck", permission: "dispatch.manage" },
  { key: "products", label: "Products", group: "Catalog", icon: "box", permission: "catalog.read" },
  { key: "categories", label: "Categories", group: "Catalog", icon: "grid", permission: "catalog.read" },
  { key: "brands", label: "Brands", group: "Catalog", icon: "tag", permission: "catalog.read" },
  { key: "attributes", label: "Attributes", group: "Catalog", icon: "sliders", permission: "catalog.read" },
  { key: "tags", label: "Tags", group: "Catalog", icon: "tag", permission: "catalog.read" },
  { key: "coupons", label: "Coupons", group: "Marketing", icon: "tag", permission: "marketing.write" },
  { key: "discounts", label: "Discounts", group: "Marketing", icon: "percent", permission: "marketing.write" },
  { key: "banners", label: "Banners", group: "Marketing", icon: "image", permission: "storefront.write" },
  { key: "flash", label: "Flash Sale", group: "Marketing", icon: "bolt", permission: "marketing.write" },
  { key: "newsletter", label: "Newsletter", group: "Marketing", icon: "mail", permission: "marketing.write" },
  { key: "home-sections", label: "Homepage Sections", group: "Content", icon: "layers", permission: "storefront.write" },
  { key: "pages", label: "Pages", group: "Content", icon: "book", permission: "content.write" },
  { key: "blog", label: "Blog Posts", group: "Content", icon: "edit", permission: "content.write" },
  { key: "testimonials", label: "Testimonials", group: "Content", icon: "headphones", permission: "content.write" },
  { key: "media", label: "Media Library", group: "Content", icon: "download", permission: "media.write" },
  { key: "providers", label: "Delivery Providers", group: "Delivery", icon: "truck", permission: "delivery.write" },
  { key: "zones", label: "Delivery Zones", group: "Delivery", icon: "map-pin", permission: "delivery.write" },
  { key: "tracking", label: "Shipment Tracking", group: "Delivery", icon: "pin", permission: "dispatch.manage" },
  { key: "pay-methods", label: "Payment Methods", group: "Payments", icon: "card", permission: "payments.write" },
  { key: "pay-settings", label: "Payment Settings", group: "Payments", icon: "sliders", permission: "payments.write" },
  { key: "transactions", label: "Transactions", group: "Payments", icon: "receipt", permission: "orders.payment" },
  { key: "reports", label: "Reports", group: "Reports", icon: "chart", permission: "reports.read" },
  { key: "settings", label: "Settings", group: "Settings", icon: "settings", permission: "settings.write" },
  { key: "system", label: "System", group: "Administration", icon: "server", permission: "team.manage" },
  { key: "team", label: "Admin Users", group: "Administration", icon: "users", permission: "team.manage" },
  { key: "roles", label: "Roles & Permissions", group: "Administration", icon: "lock", permission: "team.manage" },
  { key: "audit", label: "Activity Log", group: "Administration", icon: "clock", permission: "audit.read" },
  { key: "secrets", label: "Vault", group: "Administration", icon: "key", permission: "secrets.manage" },
] as const satisfies readonly { key: string; label: string; group: string; icon: IconName; permission: Permission }[];

export type AdminSectionKey = (typeof ADMIN_NAV)[number]["key"];
export const adminHref = (key: AdminSectionKey) => (key === "overview" ? "/admin" : `/admin/${key}`);
