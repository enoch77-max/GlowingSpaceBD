import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeState } from "@/db/schema";
import { eq } from "drizzle-orm";
import { defaultSettings, type StoreSettings } from "@/data";
import { seedContent, type ContentState } from "@/commerce";
import { ensureCatalog } from "@/server/catalog";
import { getAdminSession } from "@/server/adminSession";
import { hasPermission, type Permission } from "@/admin/rbac";

export const dynamic = "force-dynamic";

const CONTENT_KEY = "content:v1";
const SETTINGS_KEY = "catalog:config";

const KEY_PERMISSION: Partial<Record<keyof ContentState, Permission>> = {
  brands: "catalog.write",
  attributes: "catalog.write",
  tags: "catalog.write",
  blogCategories: "content.write",
  blogPosts: "content.write",
  pages: "content.write",
  banners: "storefront.write",
  testimonials: "content.write",
  messages: "messages.read",
  subscribers: "marketing.write",
  returns: "returns.manage",
  reviews: "reviews.moderate",
  paymentMethods: "payments.write",
  transactions: "payments.write",
  deliveryProviders: "delivery.write",
  deliveryZones: "delivery.write",
  discounts: "marketing.write",
  flashSale: "marketing.write",
  homeSections: "storefront.write",
};

async function readContent(): Promise<ContentState> {
  await ensureCatalog();
  const [row] = await db.select().from(storeState).where(eq(storeState.key, CONTENT_KEY));
  return row?.value ? { ...seedContent(), ...(row.value as ContentState) } : seedContent();
}

async function writeContent(patch: Partial<ContentState>): Promise<ContentState> {
  const current = await readContent();
  const next = { ...current, ...patch };
  await db.insert(storeState).values({ key: CONTENT_KEY, value: next, updatedAt: new Date() })
    .onConflictDoUpdate({ target: storeState.key, set: { value: next, updatedAt: new Date() } });
  return next;
}

export async function GET() {
  try {
    const [content, config] = await Promise.all([readContent(), db.select().from(storeState).where(eq(storeState.key, SETTINGS_KEY))]);
    const settings = (config[0]?.value as { settings?: StoreSettings } | undefined)?.settings ?? defaultSettings;
    return NextResponse.json({ content, settings }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ content: seedContent(), settings: defaultSettings }, { headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
    const body = await request.json();
    const patch = body?.patch && typeof body.patch === "object" ? body.patch as Partial<ContentState> : {};
    const keys = Object.keys(patch) as (keyof ContentState)[];
    if (!keys.length) return NextResponse.json({ error: "No changes were provided." }, { status: 400 });
    for (const key of keys) {
      const required = KEY_PERMISSION[key];
      if (required && !hasPermission(session.role, required)) {
        return NextResponse.json({ error: `Your role cannot edit ${String(key)}.` }, { status: 403 });
      }
    }
    const content = await writeContent(patch);
    return NextResponse.json({ ok: true, content });
  } catch {
    return NextResponse.json({ error: "Could not save content. Please retry." }, { status: 500 });
  }
}
