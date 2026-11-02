import { useEffect, useMemo, useRef, useState } from "react";
import { Link, usePageState, useRouter } from "../router";
import { useStore } from "../store";
import { fmt, type Product } from "../data";
import { ProductCard, Crumbs, btnPrimary, btnAccent, btnGhost, SectionHead, QtyStepper } from "../components";
import { CATEGORY_ICON, Icon, type IconName } from "../icons";
import { useSeo, breadcrumbLd, SITE } from "../seo";
import { Select } from "../ui/Select";
import { ResponsiveImage } from "../ResponsiveImage";
import { Reveal, flyToCart } from "../motion";
import { search as searchCatalog } from "../search";

/* ============================= CATALOG ============================= */

const PRICES: [string, number, number][] = [["Any price", 0, Infinity], ["Under ৳200", 0, 200], ["৳200 – ৳1,000", 200, 1000], ["Over ৳1,000", 1000, Infinity]];
const chip = (on: boolean) => `shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${on ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:ring-stone-400"}`;

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
      && p.price >= lo && p.price < hi && (!inStock || p.stock > 0) && (!codOnly || p.pay === "cod"));
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
            <button ref={filterTrigger} type="button" onClick={() => setDrawer(true)} className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-bold lg:hidden">
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
  const { add, findProduct, visibleProducts, categoryLabel, settings } = useStore();
  const p = findProduct(slug);
  const { go, back, previous } = useRouter();
  const [img, setImg] = usePageState(`${slug}:image`, 0);
  const [qty, setQty] = usePageState(`${slug}:quantity`, 1);
  const [tab, setTab] = usePageState<Tab>(`${slug}:tab`, "overview");
  const mainImg = useRef<HTMLImageElement>(null);
  const [added, setAdded] = useState(false);
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
  const packSizes = p.price > 800 ? [1, 2, 3] : [1, 3, 5];
  const packs = packSizes.map((units) => ({ units, total: p.price * units, available: p.stock >= units }));
  const bestPack = Math.max(0, ...packs.filter((o) => o.available && o.units > 1).map((o) => o.units));
  const lowStock = p.stock > 0 && p.stock < (p.lowStockAt ?? 12);
  const saveAmount = p.mrp && p.mrp > p.price ? p.mrp - p.price : 0;
  const eta = new Date(Date.now() + 2 * 864e5).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const isCod = p.pay === "cod";
  const showReviews = () => {
    setTab("reviews");
    requestAnimationFrame(() => document.getElementById("product-details")?.scrollIntoView({ block: "start", behavior: "instant" }));
  };
  const backLabel = previous?.startsWith("/shop") ? "Results" : previous === "/cart" ? "Cart" : previous === "/" ? "Home" : null;
  const addWithFx = () => {
    if (!p.stock) return;
    add(p.slug, qty);
    flyToCart(mainImg.current, p.images[0]);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="pb-24 md:pb-0">
      <div className="shell pt-4 sm:pt-5">
        <div className="flex items-start justify-between gap-3">
          <Crumbs items={crumbs} />
          {backLabel && <button type="button" onClick={() => back(`/shop/${p.category}`)} className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-stone-500 transition hover:text-stone-900"><Icon name="arrow-left" className="h-3.5 w-3.5" />{backLabel}</button>}
        </div>

        <div className="mt-1 grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-10 xl:gap-14">
          {/* Gallery */}
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200/80">
              <ResponsiveImage key={img} ref={mainImg} src={p.images[img] ?? p.images[0]} alt={p.name} width={900} height={900} sizes="(max-width: 1023px) 100vw, 55vw" className="anim-fade aspect-[4/3.2] w-full object-cover" />
              <div className="absolute left-3.5 top-3.5 flex flex-col items-start gap-1.5">
                {saveAmount > 0 && <span className="rounded-lg bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-stone-900 shadow-sm">Save {fmt(saveAmount)}</span>}
                {lowStock && <span className="rounded-lg bg-white/95 px-2.5 py-1 text-[11px] font-bold text-amber-800 shadow-sm ring-1 ring-amber-200">Only {p.stock} left</span>}
              </div>
              {p.images.length > 1 && <span className="absolute bottom-3.5 right-3.5 rounded-md bg-stone-900/70 px-2 py-0.5 font-mono text-[10px] font-semibold text-white tnum">{img + 1} / {p.images.length}</span>}
              {p.stock === 0 && <div className="absolute inset-0 grid place-items-center bg-white/60"><span className="rounded-full bg-stone-900 px-4 py-1.5 text-xs font-bold text-white">Out of stock</span></div>}
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

          {/* Buy panel */}
          <div className="min-w-0 lg:sticky lg:top-[104px] lg:self-start">
            <Link to={`/shop/${p.category}`} className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 transition hover:text-stone-900">{categoryLabel(p.category)}</Link>
            <h1 className="mt-1.5 text-balance text-[26px] font-extrabold leading-[1.06] tracking-tight sm:text-[32px]">{p.name}</h1>
            <button type="button" onClick={showReviews} className="mt-2 inline-flex items-center gap-1.5" aria-label={`Rated ${p.rating} from ${p.reviews} reviews. Read reviews.`}>
              <span className="flex gap-px text-amber-500" aria-hidden="true">{Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" className={`h-3.5 w-3.5 ${i < Math.round(p.rating) ? "" : "text-stone-300"}`} />)}</span>
              <span className="text-[13px] font-bold text-stone-800 tnum">{p.rating.toFixed(1)}</span>
              <span className="text-[13px] text-stone-400 underline decoration-stone-300 underline-offset-2">{p.reviews} reviews</span>
            </button>
            <p className="mt-2.5 max-w-md text-[13.5px] leading-relaxed text-stone-600">{p.short}</p>

            <div className="mt-3.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[30px] font-extrabold leading-none tracking-tight tnum sm:text-[34px]">{fmt(p.price)}</span>
              {p.mrp && p.mrp > p.price && <span className="text-[15px] text-stone-400 line-through tnum">{fmt(p.mrp)}</span>}
            </div>

            {/* Variant: pack size */}
            <div className="mt-4">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-xs font-bold text-stone-800">Pack size</span>
                <span className="text-[11px] text-stone-500 tnum">{fmt(p.price)} / pc</span>
              </div>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Pack size">
                {packs.map((o) => {
                  const active = qty === o.units;
                  return (
                    <button key={o.units} type="button" role="radio" aria-checked={active} disabled={!o.available || !p.stock}
                      onClick={() => setQty(o.units)}
                      className={`relative rounded-xl px-2 py-2 text-center ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-900 ring-stone-200 hover:ring-stone-400"}`}>
                      {o.units === bestPack && !active && <Icon name="star" className="absolute right-1.5 top-1.5 h-3 w-3 text-amber-500" />}
                      <span className="block text-[13px] font-extrabold leading-tight">{o.units === 1 ? "Single" : `${o.units}-pack`}</span>
                      <span className={`mt-0.5 block text-[11px] tnum ${active ? "text-stone-300" : "text-stone-500"}`}>{fmt(o.total)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability + delivery, one compact card */}
            <div className="mt-4 divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`h-2 w-2 shrink-0 rounded-full ${p.stock === 0 ? "bg-stone-300" : lowStock ? "bg-amber-500" : "bg-emerald-500"}`} />
                <p className="text-[13px] font-semibold text-stone-800">
                  {p.stock === 0 ? "Out of stock" : lowStock ? `In stock — only ${p.stock} left` : "In stock, ready to ship"}
                </p>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <Icon name="truck-fast" className="h-5 w-5 shrink-0 text-stone-500" />
                <p className="text-[13px] text-stone-600"><strong className="font-semibold text-stone-800">Get it by {eta}</strong> · Dhaka {fmt(settings.dhakaDeliveryFee)} · Outside {fmt(settings.outsideDeliveryFee)}, 2–4 days</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <Icon name="return" className="h-5 w-5 shrink-0 text-stone-500" />
                <p className="text-[13px] text-stone-600"><strong className="font-semibold text-stone-800">7-day returns</strong> · dead-on-arrival replaced free</p>
              </div>
            </div>

            {/* Payment, icon-led, one line */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {isCod
                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200"><Icon name="cash" className="h-3.5 w-3.5" />Cash on Delivery</span>
                : <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800 ring-1 ring-violet-200"><Icon name="lock" className="h-3.5 w-3.5" />Advance payment</span>}
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-bold text-pink-700 ring-1 ring-pink-200">bKash</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 ring-1 ring-orange-200">Nagad</span>
              <span className="w-full text-[11px] text-stone-500">{isCod ? "Pay the courier, or pay online in advance." : "Paid online before dispatch · refunded if undeliverable."}</span>
            </div>

            <div className="mt-4 flex items-center gap-2.5">
              <QtyStepper qty={qty} setQty={setQty} max={Math.max(p.stock, 1)} />
              <button disabled={!p.stock} className={`${btnPrimary} h-12 flex-1`} onClick={addWithFx} aria-live="polite"><Icon name={added ? "check" : "bag"} className="h-4 w-4" />{added ? "Added to cart" : "Add to cart"}</button>
            </div>
            <button disabled={!p.stock} className={`${btnAccent} mt-2.5 h-12 w-full`} onClick={() => { add(p.slug, qty); go("/checkout"); }}>Buy now{qty > 1 ? ` · ${fmt(p.price * qty)}` : ""}<Icon name="arrow-right" className="h-4 w-4" /></button>

            <ul className="mt-5 grid grid-cols-3 gap-2 border-t border-stone-200 pt-4">
              {[["beaker", "Bench tested"], ["shield", "Secure checkout"], ["headphones", "Maker support"]].map(([icon, label]) => (
                <li key={label as string} className="flex flex-col items-center gap-1.5 py-1 text-center">
                  <Icon name={icon as "beaker"} className="h-5 w-5 text-stone-500" />
                  <span className="text-[11px] font-semibold leading-tight text-stone-600">{label as string}</span>
                </li>
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
              <div className="grid max-w-4xl gap-8 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
                <div>
                  <h2 className="text-base font-extrabold tracking-tight">Built for real benches</h2>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">Checked in small batches, photographed as-shipped, and packed to survive the courier. If it arrives dead, we replace it — no forms, no argument.</p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6">
                  {p.specs.slice(0, 4).map(([k, v]) => (
                    <div key={k} className="border-b border-stone-200 py-2.5">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">{k}</dt>
                      <dd className="mt-0.5 text-[13px] font-semibold text-stone-900">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {tab === "specs" && (
              <dl className="grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-stone-200 bg-stone-200 sm:grid-cols-2">
                {p.specs.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 bg-white px-4 py-3.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-600"><Icon name={specIcon(k)} className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">{k}</dt>
                      <dd className="truncate text-[13px] font-semibold text-stone-900">{v}</dd>
                    </div>
                  </div>
                ))}
              </dl>
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

      {/* mobile buy bar */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-stone-200 bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-[15px] font-extrabold leading-none tnum">{fmt(p.price * qty)}</p>
            <p className="mt-1 text-[10px] font-semibold text-stone-500">{p.stock > 0 ? (qty > 1 ? `${qty} pcs · In stock` : "In stock") : "Out of stock"}</p>
          </div>
          <button disabled={!p.stock} onClick={() => { add(p.slug, qty); go("/checkout"); }} className={`${btnAccent} h-11 flex-1 justify-center px-4 text-[13px]`}>Buy now<Icon name="arrow-right" className="h-4 w-4" /></button>
          <button disabled={!p.stock} onClick={addWithFx} aria-label="Add to cart" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-stone-100 ring-1 ring-stone-200 transition active:scale-95"><Icon name="bag" className="h-[18px] w-[18px]" /></button>
        </div>
      </div>
    </div>
  );
}


export type { Product, IconName };
