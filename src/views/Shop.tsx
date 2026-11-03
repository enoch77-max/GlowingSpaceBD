import { useEffect, useMemo, useRef, useState } from "react";
import { Link, usePageState, useRouter } from "../router";
import { useStore } from "../store";
import { fmt, type Product } from "../data";
import { ProductCard, Crumbs, btnPrimary, btnGhost, SectionHead, QtyStepper } from "../components";
import { CATEGORY_ICON, Icon, type IconName } from "../icons";
import { getVariants, productAvailable, inventoryMode, lineVariant, maxVariantQuantity, variantComparison, variantIsLow, variantSavings, variantStock } from "../catalog/inventory";
import { useDeliveryRegion } from "../hooks/useDeliveryRegion";
import { useSeo, breadcrumbLd, SITE } from "../seo";
import { Select } from "../ui/Select";
import { ResponsiveImage } from "../ResponsiveImage";
import { Reveal, flyToCart } from "../motion";
import { search as searchCatalog } from "../search";

/* ============================= CATALOG ============================= */

const PRICES: [string, number, number][] = [["Any price", 0, Infinity], ["Under ৳200", 0, 200], ["৳200 – ৳1,000", 200, 1000], ["Over ৳1,000", 1000, Infinity]];
const chip = (on: boolean) => `shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${on ? "bg-stone-900 text-white" : "bg-[#f2f1ed] text-stone-600 hover:bg-[#eae8e1] hover:text-stone-900"}`;

export function Catalog({ category }: { category?: string }) {
  const { search, go } = useRouter();
  const { visibleProducts, visibleCategories, categoryLabel, settings } = useStore();
  const q = search.get("q") ?? "";
  const rawPrice = Number(search.get("price") ?? 0);
  const price = Number.isInteger(rawPrice) && rawPrice >= 0 && rawPrice < PRICES.length ? rawPrice : 0;
  const inStock = search.get("stock") === "1";
  const codOnly = search.get("pay") === "cod";
  const rawSort = search.get("sort");
  const sort = rawSort === "low" || rawSort === "high" ? rawSort : "popular";
  const [drawer, setDrawer] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const filterPanel = useRef<HTMLDivElement>(null);
  const activeCount = (price > 0 ? 1 : 0) + (inStock ? 1 : 0) + (codOnly ? 1 : 0);

  const filterUrl = (changes: Record<string, string | null>, nextCategory: string | null = category ?? null) => {
    const params = new URLSearchParams(search);
    for (const [key, value] of Object.entries(changes)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    if (nextCategory !== (category ?? null)) params.delete("q");
    const query = params.toString();
    return `/shop${nextCategory ? `/${nextCategory}` : ""}${query ? `?${query}` : ""}`;
  };
  const setFilters = (changes: Record<string, string | null>) => go(filterUrl(changes), { scroll: "preserve" });
  const categoryUrl = (nextCategory: string | null = null) => filterUrl({}, nextCategory);
  const clear = () => setFilters({ price: null, stock: null, pay: null, sort: null });

  const list = useMemo(() => {
    const [, lo, hi] = PRICES[price];
    const matching = q ? searchCatalog(q, visibleProducts.length, visibleProducts, visibleCategories).products.map((hit) => hit.product) : visibleProducts;
    const r = matching.filter((p) => (!category || p.category === category)
      && p.price >= lo && p.price < hi && (!inStock || productAvailable(p)) && (!codOnly || p.pay === "cod"));
    if (sort === "low") r.sort((a, b) => a.price - b.price);
    else if (sort === "high") r.sort((a, b) => b.price - a.price);
    else if (!q) r.sort((a, b) => b.reviews - a.reviews);
    return r;
  }, [category, q, price, inStock, codOnly, sort, visibleProducts, visibleCategories]);

  const title = category ? categoryLabel(category) : q ? `“${q}”` : "All products";
  const crumbs: [string, string][] = [["Home", "/"], ["Shop", "/shop"], ...(category ? [[categoryLabel(category), `/shop/${category}`] as [string, string]] : [])];
  useSeo({ title: category ? `${categoryLabel(category)} in Bangladesh` : "Shop all electronics", description: `Buy ${title.toLowerCase()} online in Bangladesh. Tested stock, COD, bKash & Nagad.`, path: category ? `/shop/${category}` : "/shop", jsonLd: [breadcrumbLd(crumbs)] });
  useEffect(() => {
    if (!drawer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    filterPanel.current?.querySelector<HTMLButtonElement>('button[aria-label="Close filters"]')?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
      if (event.key !== "Tab" || !filterPanel.current) return;
      const focusable = Array.from(filterPanel.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled)'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (filterTrigger.current?.isConnected) filterTrigger.current.focus({ preventScroll: true });
    };
  }, [drawer]);

  const filters = (
    <>
      <div className="border-b border-stone-100 px-4 py-4">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-stone-500">Category</p>
        <div className="space-y-0.5">
          <Link to={categoryUrl()} className={`flex items-center justify-between rounded-lg px-2 py-2 text-[13px] font-semibold ${!category ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"}`}>
            <span className="flex items-center gap-2"><Icon name="grid" className="h-4 w-4" />All products</span><span className="text-[11px] opacity-60">{visibleProducts.length}</span>
          </Link>
          {visibleCategories.map((c) => {
            const n = visibleProducts.filter((p) => p.category === c.slug).length;
            const ic = c.icon ?? CATEGORY_ICON[c.slug] ?? "box";
            return (
              <Link key={c.slug} to={categoryUrl(c.slug)} className={`flex items-center justify-between rounded-lg px-2 py-2 text-[13px] font-semibold ${category === c.slug ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"}`}>
                <span className="flex items-center gap-2"><Icon name={ic} className="h-4 w-4 opacity-70" />{c.name}</span><span className="text-[11px] opacity-60">{n}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="border-b border-stone-100 px-4 py-4">
        <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-stone-500">Price</p>
        <div className="space-y-1">
          {PRICES.map(([n], i) => (
            <label key={n} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-stone-700 hover:bg-stone-50">
                <input type="radio" name={`price-${drawer ? "m" : "d"}`} checked={price === i} onChange={() => setFilters({ price: i ? String(i) : null })} className="h-4 w-4 accent-stone-900" />{n}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-4 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-stone-700">In stock only</span>
          <button type="button" role="switch" aria-checked={inStock} onClick={() => setFilters({ stock: inStock ? null : "1" })} aria-label="In stock only" className={`relative h-5 w-9 shrink-0 rounded-full transition ${inStock ? "bg-stone-900" : "bg-stone-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${inStock ? "left-[18px]" : "left-0.5"}`} /></button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-stone-700">Cash on Delivery</span>
          <button type="button" role="switch" aria-checked={codOnly} onClick={() => setFilters({ pay: codOnly ? null : "cod" })} aria-label="Cash on delivery only" className={`relative h-5 w-9 shrink-0 rounded-full transition ${codOnly ? "bg-stone-900" : "bg-stone-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${codOnly ? "left-[18px]" : "left-0.5"}`} /></button>
        </div>
        {activeCount > 0 && <button type="button" onClick={clear} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-stone-300 py-2 text-xs font-bold text-stone-700 hover:border-stone-900">Clear {activeCount} filter{activeCount > 1 ? "s" : ""}<Icon name="close" className="h-3 w-3" /></button>}
      </div>
    </>
  );

  return (
    <div>
      <div className="border-b border-stone-200 bg-white">
        <div className="shell pb-5 pt-5">
          <Crumbs items={crumbs} />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[28px] font-extrabold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-1 text-sm text-stone-500">{list.length} products · tested & photographed in-house</p>
            </div>
            <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-2 rounded-full border border-stone-200 bg-paper px-3.5 py-2 text-xs font-bold text-stone-700 hover:border-stone-400 sm:flex"><Icon name="whatsapp" className="h-4 w-4 text-[#25D366]" />Can't find a part?</a>
          </div>
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="navigation" aria-label="Categories">
            <Link to={categoryUrl()} className={chip(!category)}>All</Link>
            {visibleCategories.map((c) => {
              const ic = c.icon ?? CATEGORY_ICON[c.slug] ?? "box";
              return (
                <Link key={c.slug} to={categoryUrl(c.slug)} className={`${chip(category === c.slug)} flex items-center gap-1.5`}>
                  <Icon name={ic} className="h-3.5 w-3.5" />{c.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="shell grid gap-8 pt-6 lg:grid-cols-[236px_1fr] lg:pt-8">
        <aside className="hidden lg:block">
          <div className="sticky top-[124px] overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-extrabold"><Icon name="sliders" className="h-4 w-4" />Filters</p>
              <button onClick={clear} className="text-[11px] font-bold text-stone-500 hover:text-stone-900">Reset</button>
            </div>
            {filters}
            <div className="bg-paper px-4 py-4">
              <div className="flex items-start gap-2.5">
                <Icon name="headphones" className="mt-0.5 h-4 w-4 shrink-0 text-stone-600" />
                <p className="text-[11px] leading-relaxed text-stone-500">Not sure which module fits? <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="font-bold text-stone-800 underline underline-offset-2">Ask a maker.</a></p>
              </div>
            </div>
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <button ref={filterTrigger} type="button" onClick={() => setDrawer(true)} className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-100 lg:hidden">
              <Icon name="sliders" className="h-4 w-4" />Filters{activeCount > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-stone-900 px-1 text-[9px] text-white">{activeCount}</span>}
            </button>
            <div className="hidden flex-wrap items-center gap-1.5 sm:flex">
              {q && <button type="button" aria-label={`Remove search ${q}`} onClick={() => setFilters({ q: null })} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold ring-1 ring-stone-200">“{q}”<Icon name="close" className="h-3 w-3" /></button>}
              {price > 0 && <button type="button" aria-label="Remove price filter" onClick={() => setFilters({ price: null })} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold ring-1 ring-stone-200">{PRICES[price][0]}<Icon name="close" className="h-3 w-3" /></button>}
              {inStock && <button type="button" aria-label="Remove stock filter" onClick={() => setFilters({ stock: null })} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold ring-1 ring-stone-200">In stock<Icon name="close" className="h-3 w-3" /></button>}
              {codOnly && <button type="button" aria-label="Remove COD filter" onClick={() => setFilters({ pay: null })} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold ring-1 ring-stone-200">COD<Icon name="close" className="h-3 w-3" /></button>}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="sort" className="sr-only">Sort products</label>
              <Select id="sort" variant="pill" value={sort} onChange={(e) => setFilters({ sort: e.target.value === "popular" ? null : e.target.value })} className="appearance-none rounded-full border border-stone-300 bg-white py-2 pl-3.5 pr-8 text-xs font-semibold outline-none focus:border-stone-900">
                  <option value="popular">Most popular</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option>
                </Select>
            </div>
          </div>

          {list.length ? (
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:gap-x-5 lg:gap-y-9">
              {list.map((p) => <ProductCard key={p.slug} p={p} />)}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sand"><Icon name="search" className="h-5 w-5 text-stone-500" /></span>
              <p className="mt-4 font-extrabold">No parts match those filters.</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-stone-500">Try clearing a filter, or ask us — we source unique components across Bangladesh.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => go(category ? `/shop/${category}` : "/shop", { scroll: "preserve" })} className={btnPrimary}>Clear search and filters</button>
                <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className={btnGhost}>Ask on WhatsApp</a>
              </div>
            </div>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-stone-900/40" aria-label="Close filters" onClick={() => setDrawer(false)} />
          <div ref={filterPanel} role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white rise">
            <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3">
              <p className="text-sm font-extrabold">Filters</p>
              <button onClick={clear} className="text-xs font-bold text-stone-500">Reset all</button>
              <button onClick={() => setDrawer(false)} className="grid h-8 w-8 place-items-center rounded-full bg-stone-100" aria-label="Close filters"><Icon name="close" className="h-4 w-4" /></button>
            </div>
            {filters}
            <div className="sticky bottom-0 flex gap-2 border-t border-stone-100 bg-white p-3 safe-bottom">
              <button onClick={() => { setDrawer(false); }} className="flex-1 rounded-full bg-stone-900 px-5 py-3 text-sm font-bold text-white">Show {list.length} products</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================= PRODUCT ============================= */

type Tab = "overview" | "specs" | "reviews";

const SPEC_ICONS: { match: string[]; icon: IconName }[] = [
  { match: ["capacity", "mah", "battery", "cell", "backup"], icon: "battery" },
  { match: ["volt", "discharge", "current", "amp", "power", "watt", "output", "input", "charge"], icon: "bolt" },
  { match: ["mcu", "chip", "processor", "bluetooth", "wifi", "wireless", "sensor", "interface", "protocol", "canbus", "i2c"], icon: "chip" },
  { match: ["socket", "connector", "usb", "type", "plug", "port", "mount", "top", "fit"], icon: "wrench" },
  { match: ["size", "dimension", "weight", "thickness", "width", "length", "range", "distance", "slot", "beam"], icon: "gauge" },
  { match: ["protection", "balance", "origin", "warranty", "skill", "guide", "genuine"], icon: "shield" },
  { match: ["includes", "package", "kit", "case", "quantity"], icon: "package" },
];

function specIcon(label: string): IconName {
  const l = label.toLowerCase();
  return SPEC_ICONS.find((e) => e.match.some((m) => l.includes(m)))?.icon ?? "check";
}

export function ProductPage({ slug }: { slug: string }) {
  const { add, selectForCheckout, cart, catalogReady, findProduct, visibleProducts, categoryLabel, settings } = useStore();
  const p = findProduct(slug);
  const { go, back, previous } = useRouter();
  const [img, setImg] = usePageState(`${slug}:image`, 0);
  const [qty, setQty] = usePageState(`${slug}:quantity`, 1);
  const [selectedVariant, setSelectedVariant] = usePageState(`${slug}:variant-id`, "");
  const { region: deliveryRegion } = useDeliveryRegion();
  const [tab, setTab] = usePageState<Tab>(`${slug}:tab`, "overview");
  const mainImg = useRef<HTMLImageElement>(null);
  const crumbs: [string, string][] = p ? [["Home", "/"], [categoryLabel(p.category), `/shop/${p.category}`], [p.name, `/product/${p.slug}`]] : [];
  useSeo({
    title: p?.name ?? "Product not found", description: p ? `${p.short} ${fmt(p.price)} — buy online in Bangladesh.` : "", image: p?.images[0], path: `/product/${slug}`,
    jsonLd: p ? [breadcrumbLd(crumbs), {
      "@context": "https://schema.org", "@type": "Product", name: p.name, sku: p.sku, image: p.images, description: p.short, brand: { "@type": "Brand", name: "Glowing Space BD" },
      aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews },
      offers: { "@type": "Offer", priceCurrency: "BDT", price: p.price, url: `${SITE}/product/${p.slug}`, availability: p.stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
    }] : [],
  });
  if (!p) return <div className="py-32 text-center"><h1 className="text-2xl font-extrabold">Product not found</h1><Link to="/shop" className={`${btnPrimary} mt-4`}>Back to shop</Link></div>;

  const related = visibleProducts.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, 4);
  const mode = inventoryMode(p);
  const isPack = mode === "shared_units";
  const packs = getVariants(p).filter(v => v.enabled !== false).map(v => ({
    ...v, units: v.unitsPerPack, stock: variantStock(p, v), savings: variantSavings(p, v), comparison: variantComparison(p, v), available: maxVariantQuantity(cart, p, v) > 0,
  }));
  const selectedOption = packs.find(v => v.id === selectedVariant) ?? packs.find(v => v.stock > 0) ?? packs[0];
  const maxQty = maxVariantQuantity(cart, p, selectedOption);
  const quantity = Math.max(1, Math.min(Number.isInteger(qty) ? qty : 1, Math.max(1, maxQty)));
  const selectedTotal = selectedOption.price * quantity;
  const cartLine = cart.find(line => line.slug === p.slug && lineVariant(p, line)?.id === selectedOption.id);
  const selectedInCart = cart.filter(line => line.slug === p.slug && lineVariant(p, line)?.id === selectedOption.id).reduce((sum, line) => sum + line.qty, 0);
  const canAdd = selectedInCart + quantity <= maxQty;
  const lowStock = variantIsLow(p, selectedOption);
  const lowStockCount = mode === "independent" ? selectedOption.stock : p.stock;
  const saveAmount = selectedOption.savings.amount;
  const qualityNote = p.original ? "" : p.qualityNote?.trim() ?? "";
  const deliverDays = deliveryRegion === "dhaka" ? 2 : 4;
  const etaBy = new Date(Date.now() + deliverDays * 864e5).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const feeHere = deliveryRegion === "dhaka" ? settings.dhakaDeliveryFee : settings.outsideDeliveryFee;
  const freeHere = deliveryRegion === "dhaka" && settings.freeDhakaThreshold > 0 && selectedTotal >= settings.freeDhakaThreshold;
  const showReviews = () => {
    setTab("reviews");
    requestAnimationFrame(() => document.getElementById("product-details")?.scrollIntoView({ block: "start", behavior: "instant" }));
  };
  const backLabel = previous?.startsWith("/shop") ? "Results" : previous === "/cart" ? "Cart" : previous === "/" ? "Home" : null;
  const chooseVariant = (id: string) => {
    const next = packs.find(v => v.id === id)!;
    const nextMax = maxVariantQuantity(cart, p, next);
    setSelectedVariant(id);
    if (nextMax > 0 && quantity > nextMax) setQty(nextMax);
  };
  const addWithFx = () => {
    if (add(p.slug, quantity, selectedOption.id)) flyToCart(mainImg.current, p.images[0]);
  };
  const buyNow = () => {
    if (selectForCheckout(p.slug, quantity, selectedOption.id)) go("/checkout");
  };

  return (
    <div className="pb-36 lg:pb-24">
      <div className="shell pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <Crumbs items={crumbs} />
          {backLabel && <button type="button" onClick={() => back(`/shop/${p.category}`)} className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-stone-500 transition hover:text-stone-900"><Icon name="arrow-left" className="h-3.5 w-3.5" />{backLabel}</button>}
        </div>

        <div className="mt-1 grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-10 xl:gap-14">
          {/* Gallery */}
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-[20px] bg-[#efede8]">
              <ResponsiveImage key={img} ref={mainImg} src={p.images[img] ?? p.images[0]} alt={p.name} width={900} height={900} sizes="(max-width: 1023px) 100vw, 55vw" className="anim-fade aspect-[4/3.2] w-full object-cover" />
              {p.original && <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-md bg-[#e5f0e5] px-2.5 py-1.5 text-[11px] font-bold leading-none text-[#275e43]"><Icon name="check-circle" className="h-3.5 w-3.5" />Original</span>}
              {p.images.length > 1 && <span className="absolute bottom-3.5 right-3.5 rounded-md bg-stone-900/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-white tnum">{img + 1} / {p.images.length}</span>}
              {!productAvailable(p) && <div className="absolute inset-0 grid place-items-center bg-white/60"><span className="rounded-full bg-stone-900 px-4 py-1.5 text-xs font-bold text-white">Out of stock</span></div>}
            </div>
            {p.images.length > 1 && (
              <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
                {p.images.map((src, i) => (
                  <button key={`${src}-${i}`} onClick={() => setImg(i)} aria-label={`View image ${i + 1}`} aria-pressed={i === img}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl ring-1 transition sm:h-[68px] sm:w-[68px] ${i === img ? "ring-2 ring-stone-900" : "ring-stone-200 hover:ring-stone-400"}`}>
                    <ResponsiveImage src={src} alt="" loading="lazy" sizes="68px" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product information and pack choices */}
          <div className="min-w-0 rounded-[24px] bg-white p-5 sm:p-6 lg:p-7">
            <Link to={`/shop/${p.category}`} className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-stone-500 transition hover:text-stone-900">
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-amber-50 text-amber-700"><Icon name={CATEGORY_ICON[p.category] ?? "box"} className="h-3.5 w-3.5" /></span>
              {categoryLabel(p.category)}
            </Link>

            <h1 className="mt-3 text-[24px] font-extrabold leading-[1.13] tracking-[-0.035em] text-stone-900 sm:text-[30px]">{p.name}</h1>
            <button type="button" onClick={showReviews} className="mt-2.5 inline-flex items-center gap-2 text-left" aria-label={`Rated ${p.rating} from ${p.reviews} reviews. Read reviews.`}>
              <span className="flex gap-0.5 text-amber-500" aria-hidden="true">{Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" className={`h-3.5 w-3.5 ${i < Math.round(p.rating) ? "" : "text-stone-300"}`} />)}</span>
              <span className="text-[12px] font-bold text-stone-900 tnum">{p.rating.toFixed(1)}</span>
              <span className="text-[12px] font-medium text-stone-500 underline decoration-stone-300 underline-offset-4">{p.reviews} reviews</span>
            </button>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-t border-stone-100 pt-4">
              <div className="min-w-0" aria-live="polite">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-stone-900 tnum sm:text-[34px]">{fmt(selectedOption.price)}</span>
                  {selectedOption.comparison && <span className="text-[13px] text-stone-400 line-through tnum">{fmt(selectedOption.comparison)}</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
                  <span className="text-stone-500">{isPack ? `Per pack · ${fmt(selectedOption.price / selectedOption.units)} per ${p.category === "batteries" ? "cell" : "piece"}` : `Price for ${selectedOption.label}`}</span>
                  {saveAmount > 0 && <span className="font-semibold text-[#527455]">Save {fmt(saveAmount)}</span>}
                </div>
              </div>
              {selectedOption.stock === 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500"><span className="h-1.5 w-1.5 rounded-full bg-stone-400" />Out of stock</span>
              ) : lowStock ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#a36525]"><span className="h-1.5 w-1.5 rounded-full bg-[#d99b42]" />Low stock · {lowStockCount} left</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#527455]"><span className="h-1.5 w-1.5 rounded-full bg-[#78a579]" />In stock</span>
              )}
            </div>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-stone-600">{p.short}</p>

            {/* Pack size is independent of the quantity selected in the bottom bar. */}
            {mode !== "single" && <fieldset aria-label={isPack ? "Choose your pack" : "Choose a variant"} className="mt-5 border-t border-stone-100 pt-4">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold text-stone-900">{isPack ? "Choose your pack" : "Choose a variant"}</span>
                <span className="text-[11px] font-medium text-stone-500">Selected: <strong className="text-stone-800">{selectedOption.label}</strong></span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {packs.map((option) => {
                  const active = selectedOption.id === option.id;
                  return (
                    <label key={option.id} className={`relative flex min-w-0 cursor-pointer flex-col rounded-xl px-3 py-2.5 transition focus-within:ring-2 focus-within:ring-amber-600 focus-within:ring-offset-2 ${active ? "bg-[#fff2d5]" : "bg-[#f6f5f1] hover:bg-[#efede7]"} ${!option.available ? "cursor-not-allowed opacity-45" : ""}`}>
                      <input type="radio" name={`variant-${slug}`} value={option.id} checked={active} disabled={!option.available || !catalogReady} onChange={() => chooseVariant(option.id)} className="sr-only" />
                      <span className="flex min-w-0 items-start justify-between gap-2">
                        <span className="min-w-0 break-words text-[11.5px] font-bold leading-tight text-stone-900">{option.label}</span>
                        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${active ? "bg-stone-900 text-white" : "bg-[#e4e2db]"}`}>
                          {active && <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />}
                        </span>
                      </span>
                      <span className="mt-1.5 flex min-w-0 flex-wrap items-baseline gap-x-1 gap-y-0.5">
                        <span className="min-w-0 text-[13px] font-extrabold leading-tight text-stone-900 tnum [overflow-wrap:anywhere]">{fmt(option.price)}</span>
                        <span className="text-[10px] font-medium text-stone-500">/ {isPack ? "pack" : "item"}</span>
                      </span>
                      {option.savings.amount > 0 && <span className="mt-1 text-[10px] font-semibold leading-snug text-[#527455]">Save {fmt(option.savings.amount)} · {option.savings.percent}%</span>}
                      {option.stock === 0 && <span className="mt-1 text-[10px] text-stone-500">Out of stock</span>}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] leading-snug text-stone-500"><Icon name="info" className="h-3.5 w-3.5 text-stone-400" />{isPack ? `Includes ${selectedOption.units} ${p.category === "batteries" ? (selectedOption.units === 1 ? "cell" : "cells") : (selectedOption.units === 1 ? "piece" : "pieces")} per pack · quantity set below` : `${selectedOption.label} · quantity set below`}</p>
            </fieldset>}

            {/* Delivery: arrival summary first, then a clean comparison of both rates. */}
            <section aria-label="Delivery information" className="mt-5 overflow-hidden rounded-2xl bg-[#f6f5f1]">
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-stone-700"><Icon name="truck" className="h-[18px] w-[18px]" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] text-stone-500">Delivery</p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-5 text-stone-900">Order now, get it by <span className="whitespace-nowrap">{etaBy}</span></p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-extrabold leading-none text-stone-900 tnum">{freeHere ? "Free" : fmt(feeHere)}</p>
                    <p className="mt-1 whitespace-nowrap text-[10px] font-medium leading-none text-stone-500">{deliveryRegion === "dhaka" ? "in Dhaka" : "outside Dhaka"}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 border-t border-[#e8e5dc] pt-2.5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium leading-4 text-stone-500">Inside Dhaka</p>
                    <p className="mt-0.5 whitespace-nowrap text-[11px] font-semibold leading-4 text-stone-800">{fmt(settings.dhakaDeliveryFee)} <span className="font-normal text-stone-400">·</span> <span className="font-medium text-stone-500">1–2 days</span></p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium leading-4 text-stone-500">Outside Dhaka</p>
                    <p className="mt-0.5 whitespace-nowrap text-[11px] font-semibold leading-4 text-stone-800">{fmt(settings.outsideDeliveryFee)} <span className="font-normal text-stone-400">·</span> <span className="font-medium text-stone-500">2–4 days</span></p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-[#e8e5dc] bg-white/60 px-4 py-2.5">
                <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold text-stone-800"><Icon name="return" className="h-4 w-4 text-emerald-700" />7-day returns</span>
                <span className="shrink-0 text-[10px] font-medium text-stone-500">Ships from Dhaka</span>
              </div>
            </section>

            <ul className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[10.5px] font-semibold text-stone-500">
              {[["beaker", "Bench tested"], ["shield", "Secure checkout"], ["headphones", "Maker support"]].map(([icon, label]) => (
                <li key={label} className="inline-flex items-center gap-1.5"><Icon name={icon as "beaker"} className="h-3.5 w-3.5 text-stone-500" />{label}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Details */}
        <section id="product-details" className="mt-12 scroll-mt-28 lg:mt-16">
          <div role="tablist" aria-label="Product details" className="flex gap-7 border-b border-stone-200">
            {([["overview", "Details"], ["specs", "Specifications"], ["reviews", `Reviews (${p.reviews})`]] as [Tab, string][]).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={`relative -mb-px pb-3 text-[13px] font-bold transition ${tab === key ? "text-stone-900" : "text-stone-400 hover:text-stone-700"}`}>
                {label}{tab === key && <span className="absolute inset-x-0 -bottom-px h-[2px] bg-stone-900" />}
              </button>
            ))}
          </div>

          <div className="py-7">
            {tab === "overview" && (
              <div className="grid max-w-4xl gap-5 md:grid-cols-[0.9fr_1.1fr] md:gap-8">
                <div className="space-y-3">
                  {p.original ? (
                    <div className="flex items-center gap-2 rounded-xl bg-[#edf4eb] px-3 py-2.5 text-[12px] font-bold text-[#275e43]"><Icon name="check-circle" className="h-4 w-4" />Original product</div>
                  ) : qualityNote ? (
                    <div className="rounded-xl bg-[#faf5e9] p-3">
                      <p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-amber-800">Product quality</p>
                      <p className="mt-1 text-[12px] font-semibold leading-relaxed text-stone-800">{qualityNote}</p>
                    </div>
                  ) : null}
                  <div><h2 className="text-[15px] font-extrabold tracking-tight">Built for real benches</h2><p className="mt-1.5 text-[13px] leading-relaxed text-stone-600">Checked in small batches, photographed as-shipped, and packed to survive the courier. If it arrives dead, we replace it — no forms, no argument.</p></div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4">
                  {p.specs.slice(0, 4).map(([k, v]) => (
                    <div key={k} className="border-b border-stone-200 py-2">
                      <dt className="text-[9px] font-bold uppercase tracking-[0.12em] text-stone-400">{k}</dt>
                      <dd className="mt-0.5 text-[12px] font-semibold leading-snug text-stone-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {tab === "specs" && (
              <div className="max-w-4xl space-y-3">
                {(p.original || qualityNote) && <div className={`flex items-start gap-2.5 rounded-xl p-3 ${p.original ? "bg-[#edf4eb]" : "bg-[#faf5e9]"}`}>
                  <Icon name={p.original ? "check-circle" : "info"} className={`mt-0.5 h-4 w-4 shrink-0 ${p.original ? "text-[#275e43]" : "text-amber-800"}`} />
                  <div><p className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-stone-500">{p.original ? "Authenticity" : "Product quality"}</p><p className="mt-0.5 text-[12px] font-semibold leading-relaxed text-stone-800">{p.original ? "Original product" : qualityNote}</p></div>
                </div>}
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {p.specs.map(([k, v]) => (
                    <div key={k} className="min-w-0 rounded-xl bg-white px-3 py-2.5">
                      <dt className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-stone-500"><Icon name={specIcon(k)} className="h-3 w-3 shrink-0 text-stone-400" />{k}</dt>
                      <dd className="mt-1 break-words text-[12px] font-semibold leading-snug text-stone-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {tab === "reviews" && (
              <div className="grid max-w-4xl gap-8 md:grid-cols-[0.55fr_1.45fr] md:gap-12">
                <div>
                  <p className="text-5xl font-extrabold leading-none tracking-tight tnum">{p.rating.toFixed(1)}</p>
                  <div className="mt-2 flex gap-0.5 text-amber-500">{Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" className="h-4 w-4" />)}</div>
                  <p className="mt-2 text-xs text-stone-500">{p.reviews} verified orders</p>
                </div>
                <div className="space-y-6">
                  {([["Arif K.", "Exactly as described and well packed. The capacity test sheet was included with the cells."], ["Sadia R.", "Works great for the project I needed it for. Delivery took two days to Rajshahi."]] as const).map(([n, t]) => (
                    <figure key={n}>
                      <figcaption className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-stone-100 text-[10px] font-bold text-stone-600">{n.split(" ").map((w) => w[0]).join("")}</span>
                        <span className="text-[12px] font-bold">{n}</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><Icon name="check-circle" className="h-3 w-3" />Verified</span>
                      </figcaption>
                      <blockquote className="mt-1.5 max-w-xl text-sm leading-relaxed text-stone-600">“{t}”</blockquote>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {related.length > 0 && (
          <section className="mt-12 pb-2 lg:mt-16">
            <SectionHead title="Pairs well with" sub={undefined} href={`/shop/${p.category}`} label={`All ${categoryLabel(p.category).toLowerCase()}`} />
            <Reveal stagger className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">{related.map((r) => <ProductCard key={r.slug} p={r} />)}</Reveal>
          </section>
        )}
      </div>

      {/* One purchase bar: quantity counts packs, not individual pieces. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 shadow-[0_-10px_35px_rgba(40,35,25,0.08)] backdrop-blur-xl">
        <div className="shell flex flex-col gap-2.5 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-2.5 md:flex-row md:items-center md:gap-6 md:py-3">
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-sand md:block"><ResponsiveImage src={p.images[0]} alt="" sizes="48px" className="h-full w-full object-cover" /></span>
              <div className="min-w-0" aria-live="polite">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">Your selection</p>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[18px] font-extrabold leading-none tracking-tight text-stone-900 tnum">{fmt(selectedTotal)}</span>
                  <span className="text-[11px] font-medium text-stone-500">{isPack ? `${quantity} ${quantity === 1 ? "pack" : "packs"} · ${quantity * selectedOption.units} ${p.category === "batteries" ? "cells" : "pieces"}` : `${selectedOption.label} · Qty ${quantity}`}</span>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500">Qty</span>
              <QtyStepper qty={quantity} setQty={setQty} max={Math.max(maxQty, 1)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 md:w-[340px] lg:w-[380px]">
            <button
              type="button"
              onClick={addWithFx}
              disabled={!catalogReady || !canAdd}
              aria-label={cartLine ? `${selectedOption.label} added to cart. Add more` : `Add ${selectedOption.label} to cart`}
              title={cartLine && !canAdd ? "All available stock is already in your cart" : cartLine ? "Add more of this pack" : "Add to cart"}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-2 text-[12px] font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[13px] ${cartLine ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-stone-300 bg-white text-stone-900 hover:border-stone-900 hover:bg-stone-50"}`}
            >
              <Icon name={cartLine ? "check-circle" : "bag"} className="h-4 w-4" />
              <span>{cartLine ? "Added to cart" : "Add to cart"}</span>
            </button>
            <button type="button" disabled={!catalogReady || maxQty === 0} onClick={buyNow} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-[13px] font-extrabold text-stone-900 shadow-sm transition hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400">
              Buy now <Icon name="arrow-right" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export type { Product, IconName };
