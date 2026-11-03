import { NextResponse } from "next/server";
import { CatalogError, readCatalog, writeProduct, removeProduct, readCatalogConfig, writeCatalogConfig } from "@/server/catalog";
import { getAdminSession, requirePermission } from "@/server/adminSession";
import { hasPermission } from "@/admin/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json({ products: await readCatalog(), config: await readCatalogConfig() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Catalog unavailable. Please retry." }, { status: 503 }); }
}

function failure(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "ADMIN_UNAUTHORIZED") return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (error instanceof Error && error.message === "ADMIN_FORBIDDEN") return NextResponse.json({ error: "Your role cannot perform this action." }, { status: 403 });
  return NextResponse.json({ error: error instanceof CatalogError ? error.message : fallback }, { status: error instanceof CatalogError ? error.status : 500 });
}

export async function POST(request: Request) {
  try {
    const { product, isNew, reason, config } = await request.json();
    if (config) {
      await requirePermission("settings.write");
      await writeCatalogConfig(config);
      return NextResponse.json({ ok: true });
    }
    const session = await getAdminSession();
    if (!session) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
    const canCatalog = hasPermission(session.role, "catalog.write");
    const canInventory = hasPermission(session.role, "inventory.write");
    if (!canCatalog && !canInventory) return NextResponse.json({ error: "Your role cannot edit products." }, { status: 403 });
    return NextResponse.json({ product: await writeProduct(product, Boolean(isNew), typeof reason === "string" ? reason.slice(0, 200) : undefined, !canCatalog && canInventory) });
  } catch (error) {
    return failure(error, "Could not save the product. Please retry.");
  }
}

export async function DELETE(request: Request) {
  try {
    await requirePermission("catalog.write");
    const { slug, version } = await request.json();
    if (typeof slug !== "string" || !Number.isSafeInteger(version)) return NextResponse.json({ error: "Invalid product." }, { status: 400 });
    await removeProduct(slug, version);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error, "Could not delete the product.");
  }
}
