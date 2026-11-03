import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSession, destroyAdminSession, getAdminSession } from "@/server/adminSession";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ session: await getAdminSession() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const { staffId } = await request.json();
    if (typeof staffId !== "string") return NextResponse.json({ error: "Choose a staff account." }, { status: 400 });
    const result = await createAdminSession(staffId);
    if (!result) return NextResponse.json({ error: "That staff account is unavailable." }, { status: 403 });
    const response = NextResponse.json({ session: result.session });
    response.cookies.set(ADMIN_COOKIE, result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: result.maxAge,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Could not start the admin session." }, { status: 500 });
  }
}

export async function DELETE() {
  await destroyAdminSession();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
