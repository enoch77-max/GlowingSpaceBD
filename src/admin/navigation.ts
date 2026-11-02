import type { IconName } from "../icons";
import type { Permission } from "./rbac";

export const ADMIN_NAV = [
  { key: "overview", label: "Overview", group: "Workspace", icon: "chart", permission: "analytics.read" },
  { key: "orders", label: "Orders", group: "Workspace", icon: "bag", permission: "orders.read" },
  { key: "dispatch", label: "Dispatch", group: "Workspace", icon: "truck", permission: "dispatch.manage" },
  { key: "products", label: "Products", group: "Workspace", icon: "box", permission: "catalog.read" },
  { key: "storefront", label: "Storefront", group: "Manage", icon: "layers", permission: "storefront.write" },
  { key: "coupons", label: "Coupons", group: "Manage", icon: "tag", permission: "marketing.write" },
  { key: "settings", label: "Checkout", group: "Manage", icon: "sliders", permission: "settings.write" },
  { key: "team", label: "Team", group: "Administration", icon: "users", permission: "team.manage" },
  { key: "audit", label: "Activity log", group: "Administration", icon: "clock", permission: "audit.read" },
  { key: "secrets", label: "Vault", group: "Administration", icon: "key", permission: "secrets.manage" },
] as const satisfies readonly { key: string; label: string; group: string; icon: IconName; permission: Permission }[];

export type AdminSectionKey = (typeof ADMIN_NAV)[number]["key"];
export const adminHref = (key: AdminSectionKey) => (key === "overview" ? "/admin" : `/admin/${key}`);
