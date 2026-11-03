"use client";

import { useEffect, useState } from "react";

/** Where the parcel is headed: "dhaka" (inside Dhaka) or "outside" (rest of Bangladesh). */
export type DeliveryRegion = "dhaka" | "outside";

const CACHE_KEY = "gs_delivery_region";
const DRAFT_KEY = "gs_checkout_draft"; // the customer's chosen delivery area at checkout
let memory: DeliveryRegion | undefined;
let pending: Promise<DeliveryRegion> | undefined;

/** Synchronously known region: the customer's address choice first, then cached IP detection. */
export function getCachedRegion(): DeliveryRegion | undefined {
  if (memory) return memory;
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (draft?.city === "dhaka" || draft?.city === "outside") return draft.city;
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached === "dhaka" || cached === "outside") return cached;
  } catch { /* storage unavailable */ }
  return undefined;
}

/** Approximate the region from the visitor's IP (district level, no permission prompt). */
async function detectRegion(): Promise<DeliveryRegion> {
  const cached = getCachedRegion();
  if (cached) return cached;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);
    const res = await fetch("https://ipwho.is/?lang=en", { signal: controller.signal });
    window.clearTimeout(timer);
    const data = await res.json();
    if (data?.country_code === "BD") {
      const place = `${data.region ?? ""} ${data.city ?? ""}`.toLowerCase();
      return place.includes("dhaka") ? "dhaka" : "outside";
    }
    return "dhaka"; // default baseline for anything unknown
  } catch {
    return "dhaka";
  }
}

function ensureRegion(): Promise<DeliveryRegion> {
  pending ??= detectRegion().then((region) => {
    memory = region;
    try { sessionStorage.setItem(CACHE_KEY, region); } catch { /* ignore */ }
    return region;
  });
  return pending;
}

/**
 * The customer's delivery region: a saved address/area choice takes priority
 * (this is where a logged-in user's address will plug in), otherwise IP-level detection.
 */
export function useDeliveryRegion(): { region: DeliveryRegion; resolved: boolean } {
  const [state, setState] = useState<{ region: DeliveryRegion; resolved: boolean }>(() => ({
    region: getCachedRegion() ?? "dhaka",
    resolved: Boolean(memory),
  }));
  useEffect(() => {
    let alive = true;
    ensureRegion().then((region) => { if (alive) setState({ region, resolved: true }); });
    return () => { alive = false; };
  }, []);
  return state;
}
