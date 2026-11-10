import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeState } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureCatalog } from "@/server/catalog";
import { seedContent, type ContentState, type Subscriber } from "@/commerce";

export const dynamic = "force-dynamic";

const CONTENT_KEY = "content:v1";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    }
    await ensureCatalog();
    const [row] = await db.select().from(storeState).where(eq(storeState.key, CONTENT_KEY));
    const current = (row?.value as ContentState | undefined) ?? seedContent();
    const existing = current.subscribers.find(s => s.email === email);
    const subscriber: Subscriber = { email, subscribedAt: existing?.subscribedAt ?? Date.now(), active: true };
    const subscribers = [...current.subscribers.filter(s => s.email !== email), subscriber].slice(0, 5000);
    const next = { ...current, subscribers };
    await db.insert(storeState).values({ key: CONTENT_KEY, value: next, updatedAt: new Date() }).onConflictDoUpdate({ target: storeState.key, set: { value: next, updatedAt: new Date() } });
    return NextResponse.json({ ok: true, already: Boolean(existing) });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not subscribe right now. Please retry." }, { status: 500 });
  }
}
