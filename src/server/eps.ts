import { createHmac, randomInt } from "node:crypto";
import type { Order } from "@/store";

/** EPS endpoints/field contract, cross-checked with EPS's integration page and its community Node SDK.
 * EPS does not publish an official Node SDK. Merchant credentials must come from EPS.
 */
const endpoint = (sandbox: boolean, path: string) => `${sandbox ? "https://sandboxpgapi.eps.com.bd" : "https://pgapi.eps.com.bd"}/v1/${path}`;
const hash = (value: string, key: string) => createHmac("sha512", Buffer.from(key, "utf8")).update(value, "utf8").digest("base64");

export type EpsConfig = { username: string; password: string; hashKey: string; merchantId: string; storeId: string; sandbox: boolean };
export function getEpsConfig(): EpsConfig | null {
  const { EPS_USERNAME, EPS_PASSWORD, EPS_HASH_KEY, EPS_MERCHANT_ID, EPS_STORE_ID } = process.env;
  if (![EPS_USERNAME, EPS_PASSWORD, EPS_HASH_KEY, EPS_MERCHANT_ID, EPS_STORE_ID].every(v => typeof v === "string" && v.length > 0)) return null;
  return { username: EPS_USERNAME!, password: EPS_PASSWORD!, hashKey: EPS_HASH_KEY!, merchantId: EPS_MERCHANT_ID!, storeId: EPS_STORE_ID!, sandbox: process.env.EPS_SANDBOX !== "false" };
}

async function epsFetch(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof data?.ErrorMessage === "string" ? data.ErrorMessage : `EPS returned HTTP ${response.status}`);
    return data;
  } finally { clearTimeout(timer); }
}

export async function getEpsToken(config: EpsConfig): Promise<string> {
  const auth = await epsFetch(endpoint(config.sandbox, "Auth/GetToken"), {
    method: "POST", headers: { "Content-Type": "application/json", "x-hash": hash(config.username, config.hashKey) },
    body: JSON.stringify({ userName: config.username, password: config.password }),
  });
  if (auth.errorMessage || auth.errorCode || typeof auth.token !== "string" || !auth.token) throw new Error(auth.errorMessage || "EPS authentication failed");
  return auth.token;
}

export function makeMerchantTransactionId() {
  return `${Date.now()}${randomInt(1000, 9999)}`;
}

export async function initializeEpsPayment(config: EpsConfig, input: {
  order: Order; origin: string; merchantTransactionId: string; customerEmail?: string;
}) {
  const { order, origin, merchantTransactionId } = input;
  const token = await getEpsToken(config);
  const productName = order.lines.map(line => `${line.name} (${line.variantLabel ?? "Standard"}) ×${line.qty}`).join(", ").slice(0, 500);
  const productList = order.lines.map(line => ({ ProductName: `${line.name} (${line.variantLabel ?? "Standard"})`, NoOfItem: line.qty, ProductPrice: line.price, ProductProfile: "general", ProductCategory: "Electronics" }));
  const body = {
    merchantId: config.merchantId,
    storeId: config.storeId,
    CustomerOrderId: order.id,
    merchantTransactionId,
    transactionTypeId: 1,
    financialEntityId: 0,
    transitionStatusId: 0,
    totalAmount: order.total,
    ipAddress: "0.0.0.0",
    version: "1",
    successUrl: `${origin}/payment/eps/return?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`,
    failUrl: `${origin}/payment/eps/return?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`,
    cancelUrl: `${origin}/payment/eps/return?merchantTransactionId=${encodeURIComponent(merchantTransactionId)}`,
    customerName: order.name,
    customerEmail: input.customerEmail ?? "",
    CustomerAddress: order.address,
    CustomerAddress2: "",
    CustomerCity: order.city === "dhaka" ? "Dhaka" : "Bangladesh",
    CustomerState: order.city === "dhaka" ? "Dhaka" : "Bangladesh",
    CustomerPostcode: "",
    CustomerCountry: "BD",
    CustomerPhone: order.phone,
    ShipmentName: order.name,
    ShipmentAddress: order.address,
    ShipmentAddress2: "",
    ShipmentCity: order.city === "dhaka" ? "Dhaka" : "Bangladesh",
    ShipmentState: order.city === "dhaka" ? "Dhaka" : "Bangladesh",
    ShipmentPostcode: "",
    ShipmentCountry: "BD",
    ValueA: order.id,
    ValueB: "",
    ValueC: "",
    ValueD: "",
    ShippingMethod: "NO",
    NoOfItem: String(order.lines.reduce((n, line) => n + line.qty, 0)),
    ProductName: productName,
    ProductProfile: "general",
    ProductCategory: "Electronics",
    ProductList: productList,
  };
  const result = await epsFetch(endpoint(config.sandbox, "EPSEngine/InitializeEPS"), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hash": hash(merchantTransactionId, config.hashKey), Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (result.ErrorMessage || result.ErrorCode || typeof result.RedirectURL !== "string" || !/^https:\/\/(sandboxpg|pg)\.eps\.com\.bd\//.test(result.RedirectURL)) {
    throw new Error(result.ErrorMessage || "EPS did not return a valid hosted checkout URL");
  }
  return { redirectUrl: result.RedirectURL as string, epsTransactionId: typeof result.TransactionId === "string" ? result.TransactionId : "" };
}

export async function verifyEpsPayment(config: EpsConfig, merchantTransactionId: string) {
  const token = await getEpsToken(config);
  const query = new URLSearchParams({ merchantTransactionId });
  const data = await epsFetch(`${endpoint(config.sandbox, "EPSEngine/CheckMerchantTransactionStatus")}?${query}`, {
    headers: { "x-hash": hash(merchantTransactionId, config.hashKey), Authorization: `Bearer ${token}` },
  });
  if (data.ErrorMessage || data.ErrorCode) throw new Error(data.ErrorMessage || "EPS transaction verification failed");
  return data as { MerchantTransactionId?: string; EPSTransactionId?: string; EpsTransactionId?: string; Status?: string; TotalAmount?: string | number; TransactionDate?: string; FinancialEntity?: string; ErrorCode?: string; ErrorMessage?: string };
}
