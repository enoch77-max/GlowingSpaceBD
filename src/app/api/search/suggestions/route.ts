import { NextResponse } from "next/server";
import { products, categories } from "@/data";
import { search as searchCatalog } from "@/search";
import { fmt } from "@/data";

export const dynamic = "force-dynamic";

/** Live search suggestions JSON used by the header search dropdown. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const result = searchCatalog(q, 5, products.filter(p => p.published !== false), categories.filter(c => c.visible !== false));
  return NextResponse.json({
    products: result.products.map(h => ({
      name: h.product.name,
      url: `/product/${h.product.slug}`,
      image: h.product.images[0],
      price: fmt(h.product.price),
      old_price: h.product.mrp && h.product.mrp > h.product.price ? fmt(h.product.mrp) : null,
    })),
    categories: result.categories.map(c => ({ name: c.name, url: `/shop/${c.slug}` })),
    all_url: `/shop?q=${encodeURIComponent(q.trim())}`,
  }, { headers: { "Cache-Control": "no-store" } });
}
