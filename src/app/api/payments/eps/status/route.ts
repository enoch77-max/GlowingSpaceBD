import { NextResponse } from "next/server";
import { getEpsConfig } from "@/server/eps";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getEpsConfig();
  return NextResponse.json({
    configured: Boolean(config),
    sandbox: config?.sandbox ?? true,
    docs: "https://www.eps.com.bd/eps-gateway",
    ipnDocs: "https://www.eps.com.bd/ipn",
    missing: config ? [] : ["EPS_USERNAME", "EPS_PASSWORD", "EPS_HASH_KEY", "EPS_MERCHANT_ID", "EPS_STORE_ID"].filter(key => !process.env[key]),
  }, { headers: { "Cache-Control": "no-store" } });
}
