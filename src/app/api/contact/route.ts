import { NextResponse } from "next/server";
import { db } from "@/db";
import { storeState } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureCatalog } from "@/server/catalog";
import { seedContent, type ContactMessage, type ContentState } from "@/commerce";

export const dynamic = "force-dynamic";

const CONTENT_KEY = "content:v1";
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim();
    const subject = String(body?.subject ?? "").trim();
    const message = String(body?.message ?? "").trim();
    const website = String(body?.website ?? ""); // honeypot
    if (website) return NextResponse.json({ ok: true }); // silently accept bots
    if (name.length < 2 || !emailOk(email) || subject.length < 2 || message.length < 10) {
      return NextResponse.json({ ok: false, error: "Please fill in your name, a valid email, subject and a short message." }, { status: 400 });
    }
    await ensureCatalog();
    const [row] = await db.select().from(storeState).where(eq(storeState.key, CONTENT_KEY));
    const current = (row?.value as ContentState | undefined) ?? seedContent();
    const msg: ContactMessage = { id: `msg-${Date.now()}`, name, email, phone: String(body?.phone ?? "").trim() || undefined, subject, message, status: "unread", createdAt: Date.now() };
    const next = { ...current, messages: [msg, ...current.messages].slice(0, 200) };
    await db.insert(storeState).values({ key: CONTENT_KEY, value: next, updatedAt: new Date() }).onConflictDoUpdate({ target: storeState.key, set: { value: next, updatedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not send your message. Please try WhatsApp instead." }, { status: 500 });
  }
}
