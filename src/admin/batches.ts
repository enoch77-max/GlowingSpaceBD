import type { Order, OrderStatus } from "../store";

/**
 * Batch rules. A batch groups orders that will be confirmed, packed and handed to one
 * courier pickup. Every decision below is per order, so one blocked order never holds
 * back the rest of the batch.
 */

export type StepKey = "confirm" | "pack" | "dispatch";

export const STEPS: { key: StepKey; label: string; action: string; from: OrderStatus; to: OrderStatus }[] = [
  { key: "confirm", label: "Confirm", action: "Confirm all", from: "placed", to: "confirmed" },
  { key: "pack", label: "Pack", action: "Mark all packed", from: "confirmed", to: "packed" },
  { key: "dispatch", label: "Dispatch & pickup", action: "Dispatch & request pickup", from: "packed", to: "shipped" },
];

const PIPE: OrderStatus[] = ["placed", "confirmed", "packed", "shipped", "delivered"];
const LATE_REASON: Partial<Record<OrderStatus, string>> = {
  placed: "Not confirmed yet",
  confirmed: "Not packed yet",
};

/**
 * ready   - this step can run on the order now
 * done    - the order already passed this step
 * waiting - an earlier step has not happened yet (neutral, not a problem)
 * blocked - something must be fixed (payment, address, cancelled)
 */
export type StepState =
  | { state: "ready" }
  | { state: "done" }
  | { state: "waiting"; reason: string }
  | { state: "blocked"; reason: string };

export function stepState(order: Order, step: StepKey): StepState {
  const status = order.status ?? "placed";
  const meta = STEPS.find((s) => s.key === step)!;
  if (status === "cancelled") return { state: "blocked", reason: "Cancelled" };
  const reachedIndex = PIPE.indexOf(status);
  if (reachedIndex >= PIPE.indexOf(meta.to)) return { state: "done" };
  if (status !== meta.from) return LATE_REASON[status] ? { state: "waiting", reason: LATE_REASON[status]! } : { state: "blocked", reason: "Not ready" };
  if (step !== "pack" && order.method !== "cod" && order.paymentStatus !== "paid") {
    return { state: "blocked", reason: "Payment not verified" };
  }
  if (step === "dispatch") {
    if (!/^01[3-9]\d{8}$/.test(order.phone)) return { state: "blocked", reason: "Invalid phone number" };
    if (order.address.trim().length < 6) return { state: "blocked", reason: "Address incomplete" };
  }
  return { state: "ready" };
}

/** True once an order has passed the step (for progress counts). */
export function reached(order: Order, step: StepKey): boolean {
  const target = PIPE.indexOf(STEPS.find((s) => s.key === step)!.to);
  return PIPE.indexOf(order.status ?? "placed") >= target;
}

/** The first step that has at least one ready order. */
export function currentStep(members: Order[]): StepKey | "waiting" | "done" {
  for (const step of STEPS) {
    if (members.some((o) => stepState(o, step.key).state === "ready")) return step.key;
  }
  return members.every((o) => reached(o, "dispatch") || o.status === "cancelled") ? "done" : "waiting";
}

/** Whether an order may join a new batch. */
export function batchCreateIssue(order: Order): string | null {
  const status = order.status ?? "placed";
  if (status === "cancelled" || status === "delivered" || status === "shipped") {
    return status === "shipped" ? "Already dispatched" : `Already ${status}`;
  }
  if (order.batchId) return `Already in batch ${order.batchId}`;
  return null;
}

export const waitingOrder = (order: Order) =>
  !order.batchId && ["placed", "confirmed", "packed"].includes(order.status ?? "placed");

/** Cash to collect on delivery for one parcel. */
export function codAmount(order: Order): number {
  if (order.paymentStatus === "paid") return 0;
  if (order.method === "advance") return Math.max(0, order.total - order.shipping);
  return order.total;
}

export const PICKUP_WINDOWS = {
  morning: { label: "Morning", hours: "9:00–12:00" },
  afternoon: { label: "Afternoon", hours: "12:00–16:00" },
  evening: { label: "Evening", hours: "16:00–20:00" },
} as const;

/** Bangladesh time is UTC+6 with no daylight saving, so a fixed offset is exact. */
export const bdtToday = () => new Date(Date.now() + 6 * 3_600_000).toISOString().slice(0, 10);
export const bdtTomorrow = () => new Date(Date.now() + 30 * 3_600_000).toISOString().slice(0, 10);

export const dateLabel = (iso: string) =>
  new Date(`${iso}T12:00:00+06:00`).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", weekday: "short", day: "numeric", month: "short" });

export const pickupWindowLabel = (pickup: { date: string; window: keyof typeof PICKUP_WINDOWS }) =>
  `${dateLabel(pickup.date)} · ${PICKUP_WINDOWS[pickup.window].hours}`;
