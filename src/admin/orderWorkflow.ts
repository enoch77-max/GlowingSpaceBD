import type { CourierName, Order, OrderStatus, PaymentStatus } from "../store";

export const STATUS = {
  placed: { label: "New", tone: "amber", next: "confirmed", action: "Confirm order" },
  confirmed: { label: "Confirmed", tone: "blue", next: "packed", action: "Mark as packed" },
  packed: { label: "Packed", tone: "purple", next: "shipped", action: "Mark as shipped" },
  shipped: { label: "Shipped", tone: "blue", next: "delivered", action: "Mark as delivered" },
  delivered: { label: "Delivered", tone: "green" },
  cancelled: { label: "Cancelled", tone: "gray" },
} satisfies Record<OrderStatus, { label: string; tone: string; next?: OrderStatus; action?: string }>;

export const PAYMENT: Record<PaymentStatus, { label: string; tone: string }> = {
  cod_pending: { label: "COD pending", tone: "gray" },
  verifying: { label: "Unverified", tone: "amber" },
  paid: { label: "Paid", tone: "green" },
  refunded: { label: "Refunded", tone: "gray" },
};
export const COURIERS: CourierName[] = ["Unassigned", "Pathao", "Steadfast", "RedX"];

export function orderUpdateIssue(order: Order, patch: Partial<Order>): string | null {
  const next = { ...order, ...patch };
  if (patch.status && ["delivered", "cancelled"].includes(order.status ?? "placed") && patch.status !== order.status) return "Completed orders cannot be reopened.";
  if ((patch.status === "shipped" || patch.status === "delivered") && patch.status !== order.status) {
    if (next.method !== "cod" && next.method !== "advance" && next.paymentStatus !== "paid") return "Verify advance payment before dispatch.";
    if (!next.courier || next.courier === "Unassigned" || !next.trackingCode?.trim()) return "Add a courier and tracking number before dispatch.";
  }
  if (patch.paymentStatus === "refunded" && (order.paymentStatus ?? (order.paid ? "paid" : "verifying")) !== "paid") return "Only a recorded payment can be refunded.";
  if (patch.phone && !/^01[3-9]\d{8}$/.test(patch.phone)) return "Enter an 11-digit Bangladesh phone number.";
  if (patch.name !== undefined && patch.name.trim().length < 2) return "Enter the customer's name.";
  if (patch.address !== undefined && patch.address.trim().length < 6) return "Enter a complete delivery address.";
  return null;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" });
export const orderDate = (timestamp: number) => dateFormatter.format(timestamp);
export const orderTime = (timestamp: number) => timeFormatter.format(timestamp);