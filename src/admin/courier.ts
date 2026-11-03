import type { BatchPickup, CourierName, Order } from "../store";
import { codAmount, pickupWindowLabel } from "./batches";

/**
 * Courier adapter. The browser never holds courier credentials. When the backend is
 * connected (VITE_ADMIN_API_URL), pickups go to your server, which calls the courier API
 * with secrets from the vault. Without a backend, a local demo responds so the workflow
 * can be exercised; no request leaves the browser.
 */

export type CourierKey = Exclude<CourierName, "Unassigned">;

export interface CourierParcel {
  orderId: string;
  recipient: { name: string; phone: string; address: string; area: "dhaka" | "outside" };
  codAmount: number;
  weightKg: number;
  itemSummary: string;
}

export interface CourierPickupInput {
  batchId: string;
  courier: CourierKey;
  attempt: number;
  idempotencyKey: string;
  pickup: BatchPickup;
  parcels: CourierParcel[];
}

export interface CourierPickupResult {
  pickupRef?: string;
  scheduledFor?: string;
  parcels: { orderId: string; ok: boolean; consignmentId?: string; trackingCode?: string; error?: string }[];
}

const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL?.replace(/\/$/, "");

export const courierMode = (): "backend" | "demo" => (API_BASE ? "backend" : "demo");

const PREFIX: Record<CourierKey, string> = { Steadfast: "SF", Pathao: "PTH", RedX: "RX" };

export function toParcel(order: Order): CourierParcel {
  const units = order.lines.reduce((sum, line) => sum + line.qty * (line.unitsPerPack ?? 1), 0);
  return {
    orderId: order.id,
    recipient: {
      name: order.name,
      phone: order.phone,
      address: order.address,
      area: order.city === "dhaka" ? "dhaka" : "outside",
    },
    codAmount: codAmount(order),
    weightKg: Math.max(0.5, Number((units * 0.25).toFixed(2))),
    // Internal staff notes are never sent to couriers.
    itemSummary: order.lines.map((line) => `${line.name}${line.variantLabel ? ` (${line.variantLabel})` : ""} x${line.qty}`).join(", ").slice(0, 180),
  };
}

export async function requestCourierPickup(input: CourierPickupInput): Promise<CourierPickupResult> {
  if (API_BASE) {
    const response = await fetch(`${API_BASE}/admin/couriers/${input.courier.toLowerCase()}/pickups`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(`Courier service responded HTTP ${response.status}. Check the courier dashboard before retrying.`);
    }
    return (await response.json()) as CourierPickupResult;
  }

  await new Promise((resolve) => setTimeout(resolve, 900));
  const seq = Date.now().toString().slice(-6);
  return {
    pickupRef: `${PREFIX[input.courier]}-PU-${seq}`,
    scheduledFor: pickupWindowLabel(input.pickup),
    parcels: input.parcels.map((parcel, i) => {
      // Deterministic demo rejection so both paths can be exercised.
      const checksum = [...parcel.orderId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
      if (checksum % 9 === 0) {
        return { orderId: parcel.orderId, ok: false, error: "Courier rejected address: area not serviceable" };
      }
      const code = `${PREFIX[input.courier]}${seq}${String(i + 1).padStart(3, "0")}`;
      return { orderId: parcel.orderId, ok: true, consignmentId: code, trackingCode: code };
    }),
  };
}
