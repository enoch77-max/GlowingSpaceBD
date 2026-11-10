import { getVariants, productAvailable, variantComparison, variantIsLow, variantSavings } from "./catalog/inventory";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useRouter } from "./router";
import { useStore } from "./store";
import { useToastMessage } from "./toast";
import { useCartPanel } from "./cart/cartPanel";
import { fmt, type Product } from "./data";
import { CATEGORY_ICON, Icon, Logo, type IconName } from "./icons";
import { POPULAR, search as searchCatalog, tokenize } from "./search";
import { flyToCart } from "./motion";
import { ResponsiveImage } from "./ResponsiveImage";

/* ---------- primitives ---------- */

export function PayBadge({ pay, compact = false }: { pay: Product["pay"]; compact?: boolean }) {
  const isCod = pay === "cod";
  return (
    <span title={isCod ? "Cash on Delivery available" : "Advance payment via bKash or Nagad"}
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${compact ? "px-2 py-[3px] text-[10px]" : "px-2.5 py-1 text-[11px]"} ${isCod ? "bg-emerald-50/90 text-emerald-800 ring-emerald-200/80" : "bg-violet-50/90 text-violet-800 ring-violet-200/80"}`}>
      {!compact && <Icon name={isCod ? "cash" : "shield"} className="h-3.5 w-3.5" strokeWidth={1.8} />}
      {isCod ? "COD" : "Advance"}
    </span>
  );
}

export function StockBadge({ stock }: { stock: number }) {
  if (stock === 0) return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500"><i className="h-1.5 w-1.5 rounded-full bg-stone-400" />Out of stock</span>;
  if (stock < 10) return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700"><i className="h-1.5 w-1.5 rounded-full bg-amber-500" />Only {stock} left</span>;
  return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />In stock</span>;
}

export function Stars({ r, n, className = "" }: { r: number; n?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${className}`} aria-label={`Rated ${r} out of 5${n ? ` from ${n} reviews` : ""}`}>
      <Icon name="star" className="h-3.5 w-3.5 text-amber-500" />
      <span className="font-semibold text-stone-800">{r.toFixed(1)}</span>
      {n !== undefined && <span className="text-stone-500">({n})</span>}
    </span>
  );
}

export const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none";
export const btnAccent = "inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-stone-900 shadow-sm transition hover:bg-amber-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400 disabled:shadow-none";
export const btnGhost = "inline-flex items-center justify-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-900 hover:bg-stone-50";
export const inputCls = "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 shadow-[0_1px_1px_rgba(20,20,16,0.02)] outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:ring-4 focus:ring-amber-200/50";

export function QtyStepper({ qty, setQty, max = 99, small = false }: { qty: number; setQty: (n: number) => void; max?: number; small?: boolean }) {
  const h = small ? "h-8 w-8" : "h-10 w-10";
  // Keep the running total here so two taps in the same frame both count.
  const pending = useRef(qty);
  useEffect(() => { pending.current = qty; }, [qty]);
  const step = (delta: number) => {
    const next = Math.max(1, Math.min(max, pending.current + delta));
    pending.current = next;
    setQty(next);
  };
  return (
    <div className="inline-flex items-center rounded-full border border-stone-300 bg-white">
      <button type="button" className={`${h} grid place-items-center rounded-full text-stone-600 transition hover:text-stone-900 disabled:opacity-30`} aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => step(-1)}>
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span className="w-7 text-center text-sm font-semibold tnum" aria-live="polite">{qty}</span>
      <button type="button" className={`${h} grid place-items-center rounded-full text-stone-600 transition hover:text-stone-900 disabled:opacity-30`} aria-label="Increase quantity" disabled={qty >= max} onClick={() => step(1)}>
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------- product card ---------- */

export function ProductCard({ p }: { p: Product }) {
  const { add, categoryLabel, wishlist, compare, toggleWishlist, toggleCompare } = useStore();
  const { go } = useRouter();
  const [quickView, setQuickView] = useState(false);
  const activeVariants = getVariants(p).filter((variant) => variant.enabled !== false);
  const hasOptions = activeVariants.length > 1;
  const available = productAvailable(p);
  const cheapest = [...activeVariants].sort((a, b) => a.price - b.price)[0];
  const saving = cheapest ? variantSavings(p, cheapest) : { amount: 0, percent: 0 };
  const hasDiscount = saving.amount > 0 && !p.original;
  const wished = wishlist.includes(p.slug);
  const comparing = compare.includes(p.slug);

  return (
    <article className="group relative flex min-w-0 flex-col transition duration-300 ease-out hover:-translate-y-1">
      <div className="relative block aspect-square overflow-hidden rounded-[18px] bg-[#efede8]">
        <Link to={`/product/${p.slug}`} aria-label={p.name}>
          <img src={p.images[0]} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:opacity-0" />
          {p.images[1] && <img src={p.images[1]} alt="" loading="lazy" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />}
        </Link>
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
          {hasDiscount && <span className="rounded-md bg-stone-900 px-2 py-0.5 text-[10px] font-extrabold text-white">-{saving.percent}%</span>}
          {p.isNew && <span className="rounded-md bg-[#5b8dd9] px-2 py-0.5 text-[10px] font-extrabold text-white">New</span>}
          {!available && <span className="rounded-md bg-white/95 px-2 py-0.5 text-[10px] font-bold text-stone-700 ring-1 ring-stone-200">Sold out</span>}
        </div>
        <div className="absolute right-2.5 top-2.5 flex translate-y-1 flex-col gap-1.5 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100">
          <button type="button" onClick={() => toggleWishlist(p.slug)} aria-label={wished ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`} title="Wishlist"
            className={`grid h-8 w-8 place-items-center rounded-full shadow-sm ring-1 transition ${wished ? "bg-[#e5484d] text-white ring-[#e5484d]" : "bg-white text-stone-700 ring-stone-200 hover:bg-stone-100"}`}>
            <Icon name="heart" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setQuickView(true)} aria-label={`Quick view ${p.name}`} title="Quick view" className="grid h-8 w-8 place-items-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-100">
            <Icon name="eye" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => toggleCompare(p.slug)} aria-label={comparing ? `Remove ${p.name} from compare` : `Compare ${p.name}`} title="Compare" disabled={compare.length >= 4 && !comparing}
            className={`grid h-8 w-8 place-items-center rounded-full shadow-sm ring-1 transition disabled:opacity-40 ${comparing ? "bg-stone-900 text-white ring-stone-900" : "bg-white text-stone-700 ring-stone-200 hover:bg-stone-100"}`}>
            <Icon name="sliders" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col pt-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[10.5px] font-medium text-stone-500">{p.brand ? p.brand : categoryLabel(p.category)}</span>
          <span aria-label={`Rated ${p.rating.toFixed(1)} out of 5, ${p.reviews} reviews`} title={`${p.rating.toFixed(1)} · ${p.reviews} reviews`} className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-stone-700">
            <Icon name="star" className="h-3 w-3 text-amber-500" />{p.rating.toFixed(1)}
          </span>
        </div>
        <Link to={`/product/${p.slug}`} className="mt-1.5 line-clamp-2 min-h-[2.45rem] text-[13.5px] font-semibold leading-[1.4] text-stone-900 transition hover:text-stone-600 sm:text-sm">
          {p.name}
        </Link>
        <div className="mt-auto grid min-h-11 grid-cols-[minmax(0,1fr)_40px] items-end gap-x-2 pt-2">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-1 leading-tight">
            {hasOptions && <span className="text-[10px] font-medium text-stone-500">From</span>}
            <span className="min-w-0 text-[15px] font-extrabold tracking-tight text-stone-900 tnum [overflow-wrap:anywhere]">{fmt(p.price)}</span>
            {hasDiscount && <span className="min-w-0 text-[11px] text-stone-400 line-through tnum [overflow-wrap:anywhere]">{fmt(cheapest ? variantComparison(p, cheapest)! : p.price)}</span>}
          </div>
          <button type="button" disabled={!available} aria-label={hasOptions ? `Choose options for ${p.name}` : `Add ${p.name} to cart`}
            onClick={(e) => { if (hasOptions) { go(`/product/${p.slug}`); return; } if (add(p.slug)) flyToCart(e.currentTarget.closest("article")?.querySelector("img") ?? null, p.images[0]); }}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#eeece7] text-stone-800 transition duration-200 hover:bg-stone-900 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40">
            <Icon name="bag" className="h-4 w-4" />
          </button>
        </div>
      </div>
      {quickView && <QuickView slug={p.slug} onClose={() => setQuickView(false)} />}
    </article>
  );
}

/** Quick-view modal: image, price, rating, variant pick, add to cart — without leaving the catalog. */
export function QuickView({ slug, onClose }: { slug: string; onClose: () => void }) {
  const { findProduct, add, wishlist, toggleWishlist, content } = useStore();
  const p = findProduct(slug);
  const variants = p ? getVariants(p).filter(v => v.enabled !== false) : [];
  const [choice, setChoice] = useState<string>(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  if (!p) return null;
  const selected = variants.find(v => v.id === choice) ?? variants[0];
  const price = selected?.price ?? p.price;
  const brand = content.brands.find(b => b.slug === p.brand || b.name === p.brand);
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-stone-950/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={`Quick view ${p.name}`} className="panel-in w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="grid sm:grid-cols-2">
          <div className="relative bg-[#efede8]"><img src={p.images[0]} alt={p.name} className="aspect-square h-full w-full object-cover" />
            <button type="button" onClick={onClose} aria-label="Close quick view" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-stone-200"><Icon name="close" className="h-4 w-4" /></button>
          </div>
          <div className="flex flex-col p-5 sm:p-6">
            {brand && <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">{brand.name}</p>}
            <h3 className="mt-1 text-lg font-extrabold leading-snug">{p.name}</h3>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="flex gap-0.5 text-amber-500">{Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" className={`h-3.5 w-3.5 ${i < Math.round(p.rating) ? "" : "text-stone-300"}`} />)}</span>
              <b className="tnum">{p.rating.toFixed(1)}</b><span className="text-stone-500">({p.reviews} reviews{p.sold ? ` · ${p.sold} sold` : ""})</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold tnum">{fmt(price)}</span>
              {selected && variantComparison(p, selected) && <span className="text-sm text-stone-400 line-through tnum">{fmt(variantComparison(p, selected)!)}</span>}
            </div>
            <p className="mt-2 line-clamp-3 text-[13px] text-stone-600">{p.short}</p>
            {variants.length > 1 && (
              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-bold text-stone-700">Option: <span className="text-stone-500">{selected?.label}</span></p>
                <div className="flex flex-wrap gap-1.5">
                  {variants.map(v => <button key={v.id} type="button" onClick={() => setChoice(v.id)} className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ring-1 ${choice === v.id ? "bg-stone-900 text-white ring-stone-900" : "bg-white ring-stone-200 hover:ring-stone-400"}`}>{v.label}</button>)}
                </div>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <QtyStepper small qty={qty} setQty={setQty} max={Math.max(1, p.stock)} />
              <button type="button" disabled={!p.stock} onClick={() => { if (add(p.slug, qty, selected?.id)) { setAdded(true); setTimeout(() => setAdded(false), 1500); } }} className={`${btnPrimary} h-10 flex-1`}>
                <Icon name={added ? "check" : "bag"} className="h-4 w-4" />{added ? "Added" : "Add to cart"}
              </button>
              <button type="button" onClick={() => toggleWishlist(p.slug)} aria-label="Toggle wishlist" className={`grid h-10 w-10 place-items-center rounded-full ring-1 ${wishlist.includes(p.slug) ? "bg-[#e5484d] text-white ring-[#e5484d]" : "ring-stone-300 hover:ring-stone-900"}`}>
                <Icon name="heart" className="h-4 w-4" />
              </button>
            </div>
            <Link to={`/product/${p.slug}`} onClick={onClose} className="mt-3 text-center text-xs font-bold text-stone-600 underline underline-offset-4">View full details</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- smart search ---------- */

const RECENT_KEY = "gs_recent_searches";

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ }
}

/** Wraps the characters the shopper actually typed in <mark>. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const clean = terms.filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "$&"));
  if (!clean.length) return <>{text}</>;
  const parts = text.split(new RegExp(`(${clean.join("|")})`, "ig"));
  return (
    <>
      {parts.map((part, i) =>
        clean.some((t) => part.toLowerCase() === t.toLowerCase())
          ? <mark key={i} className="rounded-[3px] bg-amber-200/80 px-[1px] text-stone-900">{part}</mark>
          : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

type Opt = { id: string; href: string; kind: "product" | "category" | "all" };

/**
 * Typeahead search with a live preview panel.
 * Results appear as you type; arrow keys, Enter and Escape all work, and
 * choosing a row saves the term to recent searches.
 */
export function SmartSearch({
  variant = "desktop",
  autoFocus = false,
  onClose,
}: {
  variant?: "desktop" | "mobile" | "header";
  autoFocus?: boolean;
  onClose?: () => void;
}) {
  const { go, search } = useRouter();
  const { visibleProducts, visibleCategories, categoryLabel, settings } = useStore();
  const urlQ = search.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const [open, setOpen] = useState(autoFocus);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = `search-list-${variant}`;
  const terms = tokenize(q);

  useEffect(() => { setQ(urlQ); }, [urlQ]);

  useEffect(() => {
    if (autoFocus) {
      setOpen(true);
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [autoFocus]);

  const results = useMemo(() => searchCatalog(q, 6, visibleProducts, visibleCategories), [q, visibleProducts, visibleCategories]);
  const options = useMemo<Opt[]>(() => {
    const out: Opt[] = [];
    if (!terms.length) {
      visibleCategories.forEach(category => out.push({ id: `${listId}-cat-${category.slug}`, href: `/shop/${category.slug}`, kind: "category" }));
      return out;
    }
    results.products.forEach((h, i) => out.push({ id: `${listId}-p${i}`, href: `/product/${h.product.slug}`, kind: "product" }));
    results.categories.forEach((c, i) => out.push({ id: `${listId}-c${i}`, href: `/shop/${c.slug}`, kind: "category" }));
    out.push({ id: `${listId}-all`, href: `/shop?q=${encodeURIComponent(q.trim())}`, kind: "all" });
    return out;
  }, [results, terms.length, q, listId, visibleCategories]);

  const remember = (term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    const next = [t, ...recent.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 5);
    writeRecent(next);
    setRecent(next);
  };

  const choose = (href: string, term?: string) => {
    remember(term ?? q);
    setOpen(false);
    setActive(-1);
    onClose?.();
    go(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const opt = options[active];
    if (opt) { choose(opt.href, opt.kind === "all" ? q : undefined); return; }
    const term = q.trim();
    remember(term);
    setOpen(false);
    onClose?.();
    go(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => (options.length ? (a + 1) % options.length : -1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (options.length ? (a - 1 + options.length) % options.length : -1)); }
    else if (e.key === "Home" && open && options.length) { e.preventDefault(); setActive(0); }
    else if (e.key === "End" && open && options.length) { e.preventDefault(); setActive(options.length - 1); }
    else if (e.key === "Escape") {
      e.preventDefault();
      if (q) {
        setQ("");
        input.current?.focus();
      } else {
        setOpen(false);
        setActive(-1);
        onClose?.();
      }
    }
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (active < 0) return;
    const list = box.current?.querySelector<HTMLElement>("[role='listbox']");
    const item = document.getElementById(options[active]?.id);
    if (!list || !item) return;
    const viewport = list.getBoundingClientRect();
    const row = item.getBoundingClientRect();
    if (row.top < viewport.top) list.scrollTop += row.top - viewport.top;
    else if (row.bottom > viewport.bottom) list.scrollTop += row.bottom - viewport.bottom;
  }, [active, options]);

  const rowBase = "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors";
  const isActive = (i: number) => active === i;
  let cursor = 0;
  const noProducts = terms.length > 0 && results.products.length === 0;

  return (
    <div ref={box} className="relative w-full" onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setOpen(false);
        setActive(-1);
      }
    }}>
      <form role="search" onSubmit={submit} className="w-full">
        <label htmlFor={`search-${variant}`} className="sr-only">Search products by name, SKU or keyword</label>
        <div className={`flex items-center gap-2.5 rounded-full border bg-[#f4f1ea] px-4 py-2.5 transition focus-within:border-stone-900 focus-within:bg-white ${open ? "border-stone-900 bg-white shadow-sm" : "border-stone-200"}`}>
          <Icon name="search" className="h-4 w-4 shrink-0 text-stone-500" />
          <input
            id={`search-${variant}`}
            ref={input}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? options[active]?.id : undefined}
            autoComplete="off"
            spellCheck={false}
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search 18650 cells, TP4056, car LEDs, kits or SKU…"
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-500"
          />
          {q ? (
            <button type="button" onClick={() => { setQ(""); input.current?.focus(); }} aria-label="Clear search" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-stone-200 text-stone-600 hover:bg-stone-300">
              <Icon name="close" className="h-3 w-3" />
            </button>
          ) : (
            <kbd className="hidden shrink-0 rounded border border-stone-300 bg-white px-1.5 py-0.5 text-[10px] font-bold text-stone-500 sm:block">ESC</kbd>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Hide search bar"
              className="ml-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-stone-500 transition hover:bg-stone-200 hover:text-stone-900"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </form>

      {open && (
        <>
          <div className="pointer-events-none fixed inset-0 z-40 bg-stone-900/20 md:bg-stone-900/10" aria-hidden="true" />
          <div
            className="panel-in absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-[min(72vh,560px)] overflow-y-auto overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl shadow-stone-900/15"
          >
            <div id={listId} role="listbox" aria-label="Search results" className="max-h-[min(72vh,560px)] overflow-y-auto">
              {/* nothing typed yet */}
              {!terms.length && (
                <div className="p-3">
                  {recent.length > 0 && (
                    <div className="mb-4">
                      <p className="eyebrow mb-2 px-1 text-stone-400">Recent</p>
                      <div className="flex flex-wrap gap-1.5">
                        {recent.map((r) => (
                          <span key={r} className="flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-3 pr-1 text-xs font-semibold text-stone-700">
                            <button type="button" onClick={() => { setQ(r); input.current?.focus(); }} className="transition hover:text-stone-900">{r}</button>
                            <button type="button" aria-label={`Remove ${r} from recent searches`}
                              onClick={() => { const next = recent.filter((x) => x !== r); writeRecent(next); setRecent(next); }}
                              className="grid h-5 w-5 place-items-center rounded-full text-stone-400 hover:bg-stone-200 hover:text-stone-700">
                              <Icon name="close" className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mb-4">
                    <p className="eyebrow mb-2 px-1 text-stone-400">Popular right now</p>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR.map((t, i) => (
                        <button key={t} type="button" onClick={() => { setQ(t); input.current?.focus(); }}
                          className={`row-in flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition hover:-translate-y-0.5 hover:ring-stone-400 ${i < 3 ? "bg-amber-100 text-amber-900 ring-amber-200" : "bg-white text-stone-700 ring-stone-200"}`}
                          style={{ ["--i" as string]: i } as React.CSSProperties}>
                          {i < 3 && <Icon name="bolt" className="h-3 w-3" />}{t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="eyebrow mb-2 px-1 text-stone-400">Browse</p>
                  <div className="grid gap-0.5">
                    {visibleCategories.map((c) => {
                      const i = cursor++;
                      const n = visibleProducts.filter((p) => p.category === c.slug).length;
                      const ic = c.icon ?? CATEGORY_ICON[c.slug] ?? "box";
                      return (
                        <button key={c.slug} type="button" id={`${listId}-cat-${c.slug}`} role="option" aria-selected={isActive(i)}
                          onMouseEnter={() => setActive(i)} onClick={() => choose(`/shop/${c.slug}`)}
                          className={`${rowBase} rounded-xl ${isActive(i) ? "bg-stone-100" : "hover:bg-stone-50"}`}>
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sand text-stone-700"><Icon name={ic} className="h-4 w-4" /></span>
                          <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold">{c.name}</span><span className="block truncate text-[11px] text-stone-500">{c.blurb}</span></span>
                          <span className="shrink-0 text-[11px] font-semibold text-stone-400">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                  {variant === "desktop" && (
                    <p className="mt-3 flex items-center gap-1.5 border-t border-stone-100 px-3 pt-3 text-[11px] text-stone-400">
                      <Icon name="info" className="h-3.5 w-3.5" />Try “load shedding”, “wifi board” or a SKU like GS-BAT-001
                    </p>
                  )}
                </div>
              )}

              {/* typed something */}
              {terms.length > 0 && (
                <div className="p-3">
                  {results.products.length > 0 && (
                    <>
                      <p className="eyebrow mb-2 flex items-center justify-between px-1 text-stone-400">
                        <span>Products</span><span className="normal-case tracking-normal">{results.total} match{results.total === 1 ? "" : "es"}</span>
                      </p>
                      <div className="grid gap-0.5">
                        {results.products.map((h, i) => {
                          const p = h.product;
                          const hasOptions = getVariants(p).filter((variant) => variant.enabled !== false).length > 1;
                          const optIndex = cursor++;
                          return (
                            <button key={p.slug} type="button" id={`${listId}-p${i}`} role="option" aria-selected={isActive(optIndex)}
                              onMouseEnter={() => setActive(optIndex)} onClick={() => choose(`/product/${p.slug}`)}
                              className={`${rowBase} row-in rounded-xl ${isActive(optIndex) ? "bg-stone-100" : "hover:bg-stone-50"}`}
                              style={{ ["--i" as string]: i } as React.CSSProperties}>
                              <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-sand">
                                <ResponsiveImage src={p.images[0]} alt="" loading="lazy" sizes="44px" className="h-full w-full object-cover" />
                                {!productAvailable(p) && <span className="absolute inset-0 bg-white/60" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="line-clamp-2 text-[13px] font-semibold leading-snug"><Highlight text={p.name} terms={terms} /></span>
                                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-stone-500">
                                  <span>{categoryLabel(p.category)}</span><span className="h-2.5 w-px bg-stone-300" />
                                  <span className="font-mono">{p.sku}</span>
                                  {results.exactSku?.slug === p.slug && <span className="rounded bg-stone-900 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-white">Exact SKU</span>}
                                  {productAvailable(p) && p.stock < (p.lowStockAt ?? 5) && <span className="font-bold text-amber-700">Only {p.stock} left</span>}
                                  {!productAvailable(p) && <span className="font-semibold text-stone-400">Sold out</span>}
                                </span>
                              </span>
                              <span className="flex shrink-0 flex-col items-end gap-1">
                                <span className="text-[13px] font-extrabold tnum">{hasOptions ? "From " : ""}{fmt(p.price)}</span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500"><Icon name="star" className="h-2.5 w-2.5 text-amber-500" />{p.rating.toFixed(1)}</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {results.categories.length > 0 && (
                    <div className={results.products.length ? "mt-4" : ""}>
                      <p className="eyebrow mb-2 px-1 text-stone-400">Categories</p>
                      <div className="grid gap-0.5">
                        {results.categories.map((c, i) => {
                          const optIndex = cursor++;
                          return (
                            <button key={c.slug} type="button" id={`${listId}-c${i}`} role="option" aria-selected={isActive(optIndex)}
                              onMouseEnter={() => setActive(optIndex)} onClick={() => choose(`/shop/${c.slug}`)}
                              className={`${rowBase} rounded-xl ${isActive(optIndex) ? "bg-stone-100" : "hover:bg-stone-50"}`}>
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sand text-stone-700"><Icon name={CATEGORY_ICON[c.slug]} className="h-4 w-4" /></span>
                              <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold"><Highlight text={c.name} terms={terms} /></span><span className="block text-[11px] text-stone-500">{c.count} products</span></span>
                              <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-stone-400" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {noProducts && (
                    <div className="px-3 py-6 text-center">
                      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-sand text-stone-500"><Icon name="search" className="h-5 w-5" /></span>
                      <p className="mt-3 text-sm font-bold">Nothing matches “{q.trim()}”.</p>
                      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-stone-500">We source unique parts across Bangladesh — ask us and we'll find it.</p>
                      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                        {POPULAR.slice(0, 4).map((t) => (
                          <button key={t} type="button" onClick={() => { setQ(t); input.current?.focus(); }} className="rounded-full bg-stone-100 px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-200">{t}</button>
                        ))}
                      </div>
                      <a href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(`Hi Glowing Space! I'm looking for: ${q.trim()}`)}`} target="_blank" rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-2 text-[11px] font-bold text-stone-900">
                        <Icon name="whatsapp" className="h-3.5 w-3.5" />Ask us to source it
                      </a>
                    </div>
                  )}

                  {results.total > 0 && (
                    <button type="button" id={`${listId}-all`} role="option" aria-selected={isActive(cursor)}
                      onMouseEnter={() => setActive(cursor)} onClick={() => choose(`/shop?q=${encodeURIComponent(q.trim())}`, q)}
                      className={`${rowBase} mt-2 justify-center gap-2 rounded-xl border-t border-stone-100 pt-3 text-xs font-bold text-stone-700 ${isActive(cursor) ? "bg-stone-100" : "hover:bg-stone-50"}`}>
                      See all {results.total} result{results.total === 1 ? "" : "s"} for “{q.trim()}”
                      <Icon name="arrow-right" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- header ---------- */

export function Header() {
  const { count, user, visibleCategories, settings, wishlist, compare } = useStore();
  const { path } = useRouter();
  const { openCart } = useCartPanel();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);
  const [megaOpen, setMegaOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const menuPanel = useRef<HTMLDivElement>(null);

  const catLinks = useMemo(
    () => visibleCategories.map((c) => [c.name, `/shop/${c.slug}`, c.icon ?? CATEGORY_ICON[c.slug] ?? "box"] as const),
    [visibleCategories],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const bump = () => setBumpKey((k) => k + 1);
    document.addEventListener("cart:bump", bump);
    return () => document.removeEventListener("cart:bump", bump);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menuPanel.current?.querySelector<HTMLButtonElement>('button[aria-label="Close menu"]')?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !menuPanel.current) return;
      const focusable = Array.from(menuPanel.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)'));
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (window.location.pathname === path && menuTrigger.current?.isConnected) menuTrigger.current.focus({ preventScroll: true });
    };
  }, [open, path]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-stone-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white">Skip to content</a>
      <div className="bg-stone-900 text-white">
        <div className="shell flex h-9 items-center justify-between gap-3 text-[11px] font-medium text-stone-300">
          <p className="flex min-w-0 items-center gap-2"><Icon name="truck" className="h-3.5 w-3.5 text-amber-400" /><span className="truncate">{settings.announcementText}</span></p>
          <div className="flex shrink-0 items-center gap-4">
            {settings.enableCod && <span className="hidden items-center gap-1.5 sm:flex"><Icon name="shield" className="h-3.5 w-3.5 text-emerald-400" />Cash on Delivery available</span>}
            <a href={`tel:${settings.contactPhone}`} className="hidden items-center gap-1.5 md:flex"><Icon name="phone" className="h-3.5 w-3.5 text-amber-400" />{settings.contactPhone}</a>
            <a href={`mailto:${settings.contactEmail}`} className="hidden items-center gap-1.5 lg:flex"><Icon name="mail" className="h-3.5 w-3.5 text-amber-400" />{settings.contactEmail}</a>
            <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-300 transition hover:bg-white/20">
              <Icon name="settings" className="h-3 w-3" />
              <span>Admin</span>
            </Link>
          </div>
        </div>
      </div>
      <header className={`sticky top-0 z-40 border-b border-stone-200/90 bg-white/95 backdrop-blur-md transition-shadow duration-300 ${scrolled ? "shadow-[0_10px_30px_-18px_rgba(24,24,20,0.45)]" : ""}`}>
        <div className="shell">
          <div className="flex h-[62px] items-center gap-2 sm:gap-3">
            <button ref={menuTrigger} onClick={() => setOpen(true)} className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-stone-700 hover:bg-stone-100 lg:hidden" aria-label="Open menu" aria-expanded={open}>
              <Icon name="menu" />
            </button>
            <Link to="/" scroll="top" aria-label="Glowing Space BD home" className="shrink-0"><Logo /></Link>

            <nav className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Account">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label={searchOpen ? "Close search" : "Open search"}
                aria-expanded={searchOpen}
                aria-controls="header-search-panel"
                className={`flex items-center gap-2 rounded-full px-2.5 py-2 text-xs font-semibold transition sm:px-3 ${
                  searchOpen
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-700 ring-1 ring-stone-200/80 hover:bg-stone-100 hover:ring-stone-300"
                }`}
              >
                <Icon name={searchOpen ? "close" : "search"} className="h-[18px] w-[18px]" />
                <span className="hidden sm:inline">{searchOpen ? "Close" : "Search"}</span>
              </button>
              <Link to="/wishlist" aria-label={`Wishlist, ${wishlist.length} items`} className="relative hidden items-center gap-2 rounded-full px-2.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 md:flex">
                <Icon name="heart" className="h-[18px] w-[18px]" /><span className="hidden xl:inline">Wishlist</span>
                {wishlist.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9px] font-extrabold text-stone-900 tnum">{wishlist.length}</span>}
              </Link>
              <Link to="/compare" aria-label={`Compare, ${compare.length} products`} className="relative hidden items-center gap-2 rounded-full px-2.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 xl:flex">
                <Icon name="sliders" className="h-[18px] w-[18px]" /><span className="hidden 2xl:inline">Compare</span>
                {compare.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9px] font-extrabold text-stone-900 tnum">{compare.length}</span>}
              </Link>
              <Link to="/track" className="hidden items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 lg:flex">
                <Icon name="box" className="h-[18px] w-[18px]" /><span>Track</span>
              </Link>
              <Link to="/login" className="flex items-center gap-2 rounded-full px-2.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100">
                <Icon name="user" className="h-[20px] w-[20px]" /><span className="hidden xl:inline">{user ? "Account" : "Sign in"}</span>
              </Link>
              <button type="button" onClick={(event) => openCart(event.currentTarget)} aria-label={`Cart, ${count} items`} className="hidden items-center gap-2 rounded-full bg-stone-900 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-stone-700 lg:inline-flex">
                <span id="cart-header-target" className={`relative flex items-center ${bumpKey ? "cart-pop" : ""}`} key={bumpKey}><Icon name="cart" className="h-[18px] w-[18px]" />
                  {count > 0 && <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9px] font-extrabold text-stone-900 tnum">{count}</span>}
                </span>
                <span>Cart</span>
              </button>
            </nav>
          </div>
          {searchOpen && (
            <div id="header-search-panel" className="panel-in border-t border-stone-100 py-3">
              <div className="mx-auto max-w-2xl">
                <SmartSearch variant="header" autoFocus onClose={() => setSearchOpen(false)} />
              </div>
            </div>
          )}
        </div>
        <div className="hidden border-t border-stone-100 lg:block">
          <nav aria-label="Categories" className="shell flex h-11 items-center gap-1">
            <Link to="/shop" className="mr-1.5 flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-stone-900 hover:bg-stone-100">
              <Icon name="grid" className="h-4 w-4" /><span>All products</span>
            </Link>
            <div className="relative" onMouseEnter={() => setMegaOpen(true)} onMouseLeave={() => setMegaOpen(false)}>
              <button type="button" aria-expanded={megaOpen} onClick={() => setMegaOpen(v => !v)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${megaOpen ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-100"}`}>
                <Icon name="grid" className="h-4 w-4" /><span>All Categories</span><Icon name="chevron-down" className={`h-3.5 w-3.5 transition ${megaOpen ? "rotate-180" : ""}`} />
              </button>
              {megaOpen && (
                <div className="panel-in absolute left-0 top-[calc(100%+8px)] z-50 grid w-[560px] grid-cols-2 gap-1 rounded-2xl border border-stone-200 bg-white p-3 shadow-2xl shadow-stone-900/10">
                  {visibleCategories.filter(c => !c.parent).map(parent => {
                    const children = visibleCategories.filter(c => c.parent === parent.slug);
                    return (
                      <div key={parent.slug}>
                        <Link to={`/shop/${parent.slug}`} onClick={() => setMegaOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-extrabold text-stone-900 hover:bg-stone-100">
                          <Icon name={parent.icon ?? CATEGORY_ICON[parent.slug] ?? "box"} className="h-4 w-4 text-amber-600" />{parent.name}
                        </Link>
                        {children.map(child => (
                          <Link key={child.slug} to={`/shop/${child.slug}`} onClick={() => setMegaOpen(false)} className="block rounded-lg px-2 py-1.5 pl-8 text-[11px] font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900">{child.name}</Link>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {catLinks.slice(0, 5).map(([name, href, icon]) => (
              <Link key={href} to={href} className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900">
                <Icon name={icon} className="h-4 w-4" /><span>{name}</span>
              </Link>
            ))}
            <Link to="/shop?sale=1" className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#b45309] hover:bg-amber-50"><Icon name="tag" className="h-4 w-4" /><span>Deals</span></Link>
            <Link to="/brands" className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"><span>Brands</span></Link>
            <Link to="/blog" className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"><span>Blog</span></Link>
            <Link to="/contact" className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"><span>Help</span></Link>
            <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="ml-auto flex shrink-0 items-center gap-1.5 pl-3 text-xs font-semibold text-stone-600 hover:text-stone-900">
              <Icon name="whatsapp" className="h-4 w-4 text-[#25D366]" /><span>Need help choosing?</span>
            </a>
          </nav>
        </div>
      </header>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="anim-fade absolute inset-0 bg-stone-900/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div ref={menuPanel} role="dialog" aria-modal="true" aria-label="Menu" className="drawer-in absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-paper shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <Logo />
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white ring-1 ring-stone-200" aria-label="Close menu"><Icon name="close" className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5">
              <p className="eyebrow text-stone-400">Shop by category</p>
              <div className="mt-3 grid gap-1">
                <Link to="/shop" onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-2 py-3 text-sm font-semibold hover:bg-white">
                  <span className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-stone-200"><Icon name="grid" className="h-4 w-4" /></span>All products</span>
                  <Icon name="chevron-right" className="h-4 w-4 text-stone-400" />
                </Link>
                {catLinks.map(([name, href, icon]) => (
                  <Link key={href} to={href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl px-2 py-3 text-sm font-semibold hover:bg-white">
                    <span className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white ring-1 ring-stone-200"><Icon name={icon} className="h-4 w-4" /></span>{name}</span>
                    <Icon name="chevron-right" className="h-4 w-4 text-stone-400" />
                  </Link>
                ))}
              </div>
              <p className="eyebrow mt-6 text-stone-400">Account & Management</p>
              <div className="mt-3 space-y-1">
                <Link to="/track" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium hover:bg-white"><Icon name="box" className="h-4 w-4" />Track an order</Link>
                <Link to="/login" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-medium hover:bg-white"><Icon name="user" className="h-4 w-4" />{user ? "My account" : "Sign in with phone"}</Link>
                <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-semibold text-stone-900 hover:bg-white"><Icon name="settings" className="h-4 w-4 text-amber-600" />Admin Console</Link>
              </div>
              <div className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-stone-200">
                <p className="text-sm font-bold">Can't find a part?</p>
                <p className="mt-1 text-xs text-stone-500">We source unique components across Bangladesh.</p>
                <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#25D366] py-2.5 text-xs font-bold text-stone-900"><Icon name="whatsapp" className="h-4 w-4" />WhatsApp us</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- mobile bottom nav + fab + toast ---------- */

const HIDE_NAV = [/^\/product\//, /^\/cart$/, /^\/checkout$/, /^\/order\//];

export function MobileNav() {
  const { path } = useRouter();
  const { count } = useStore();
  const { openCart } = useCartPanel();
  if (HIDE_NAV.some((r) => r.test(path))) return null;
  const tabs: { to: string; icon: IconName; label: string; badge?: number; onSelect?: () => void }[] = [
    { to: "/", icon: "home", label: "Home" },
    { to: "/shop", icon: "grid", label: "Shop" },
    { to: "/track", icon: "box", label: "Track" },
    { to: "/cart", icon: "cart", label: "Cart", badge: count, onSelect: openCart },
    { to: "/login", icon: "user", label: "Account" },
  ];
  const active = (to: string) => to === "/" ? path === "/" : to === "/shop" ? path.startsWith("/shop") : path === to;
  return (
    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex items-stretch justify-around">
        {tabs.map((t) => (
          <Link key={t.to} to={t.to} scroll={t.to === "/" || t.to === "/shop" ? "top" : undefined} aria-label={t.label} aria-current={active(t.to) ? "page" : undefined}
            onClick={t.onSelect ? (event) => { event.preventDefault(); openCart(event.currentTarget); } : undefined}
            className={`relative flex flex-1 flex-col items-center gap-1 pb-2 pt-2.5 text-[10px] font-semibold ${active(t.to) ? "text-stone-900" : "text-stone-500"}`}>
            <span className={`grid h-8 w-12 place-items-center rounded-full transition ${active(t.to) ? "bg-amber-100" : ""}`}>
              <Icon name={t.icon} className="h-[19px] w-[19px]" strokeWidth={active(t.to) ? 2 : 1.7} />
              {!!t.badge && <span className="absolute right-4 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[9px] font-extrabold text-stone-900">{t.badge}</span>}
            </span>
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Toast() {
  const toast = useToastMessage();
  const { path } = useRouter();
  const isAdmin = path.startsWith("/admin");
  return (
    <div role="status" aria-live="polite" className={`fixed left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-2xl bg-stone-900 py-3 pl-3 pr-4 text-sm text-white shadow-xl transition duration-300 ${isAdmin ? "bottom-6" : "bottom-[11rem] md:bottom-6"} ${toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400"><Icon name="check" className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1 truncate font-medium">{toast || "Saved"}</span>
      {!isAdmin && <Link to="/cart" className="shrink-0 text-xs font-bold text-amber-400">View cart</Link>}
    </div>
  );
}

/* ---------- footer ---------- */

export function Footer() {
  const { visibleCategories, settings } = useStore();
  return (
    <footer className="mt-16 bg-stone-900 text-stone-300">
      <div className="shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link to="/" scroll="top" aria-label="Glowing Space BD home"><Logo light /></Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-stone-400">Tested batteries, charging circuits and hard-to-find modules for Bangladesh's students, hobbyists and repair pros.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"><Icon name="whatsapp" className="h-4 w-4 text-[#25D366]" />WhatsApp</a>
            <a href={`tel:+${settings.whatsappNumber}`} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/20"><Icon name="phone" className="h-4 w-4" />Call</a>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Shop</p>
          <div className="mt-3 grid gap-2.5 text-sm">
            {visibleCategories.map((c) => <Link key={c.slug} to={`/shop/${c.slug}`} className="text-stone-300 transition hover:text-amber-400">{c.name}</Link>)}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Help</p>
          <div className="mt-3 grid gap-2.5 text-sm">
            <Link to="/track" className="transition hover:text-amber-400">Track an order</Link>
            <Link to="/login" className="transition hover:text-amber-400">Sign in / register</Link>
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-amber-300 transition hover:text-amber-200"><Icon name="settings" className="h-3.5 w-3.5" />Admin Console</Link>
            <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="transition hover:text-amber-400">Returns & warranty</a>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-stone-500">Delivery</p>
          <p className="mt-3 text-xs leading-relaxed text-stone-400">Pathao & Steadfast courier.<br />Inside Dhaka {fmt(settings.dhakaDeliveryFee)} · outside Dhaka {fmt(settings.outsideDeliveryFee)}.<br />Dhaka 1–2 days · nationwide 2–4 days{settings.freeDhakaThreshold > 0 ? ` · free Dhaka delivery over ${fmt(settings.freeDhakaThreshold)}` : ""}.</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="shell flex flex-col gap-2 py-4 pb-24 text-[11px] text-stone-500 sm:flex-row sm:items-center sm:justify-between md:pb-4">
          <p>© {new Date().getFullYear()} Glowing Space BD. All rights reserved.</p>
          <p className="flex items-center gap-1"><Icon name="shield" className="h-3.5 w-3.5 text-emerald-500" />Frontend preview · No payment is collected</p>
        </div>
      </div>
    </footer>
  );
}

/* ---------- small shared pieces ---------- */

export function Crumbs({ items }: { items: [string, string][] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-stone-500">
      {items.map(([n, h], i) => (
        <span key={h} className="flex items-center gap-1.5">
          {i > 0 && <Icon name="chevron-right" className="h-3 w-3 text-stone-400" />}
          {i < items.length - 1 ? <Link to={h} className="transition hover:text-stone-900">{n}</Link> : <span aria-current="page" className="max-w-[190px] truncate text-stone-800">{n}</span>}
        </span>
      ))}
    </nav>
  );
}

export function SectionHead({ title, sub, href, label = "View all" }: { title: string; sub?: string; href?: string; label?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">{title}</h2>
        {sub && <p className="mt-1 text-sm text-stone-500">{sub}</p>}
      </div>
      {href && <Link to={href} className="group flex shrink-0 items-center gap-1.5 text-xs font-bold text-stone-700 transition hover:text-stone-900">{label}<Icon name="arrow-right" className="h-4 w-4 transition group-hover:translate-x-0.5" /></Link>}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 flex items-center justify-between gap-2 font-semibold text-stone-800">{label}{hint && <span className="text-[11px] font-normal text-stone-500">{hint}</span>}</span>
      {children}
    </label>
  );
}

export function TrustRow({ compact = false }: { compact?: boolean }) {
  const items: [IconName, string, string][] = [
    ["shield", "Tested stock", "Every cell checked"],
    ["truck", "Fast delivery", "Dhaka 1–2 days"],
    ["return", "7-day returns", "DOA replaced free"],
    ["headphones", "Maker support", "Real humans on WhatsApp"],
  ];
  return (
    <ul className={`grid ${compact ? "grid-cols-2 gap-3" : "grid-cols-2 gap-x-4 gap-y-5 lg:grid-cols-4"}`}>
      {items.map(([icon, t, s]) => (
        <li key={t} className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-stone-800 ring-1 ring-stone-200"><Icon name={icon} className="h-[17px] w-[17px]" /></span>
          <span><span className="block text-[13px] font-bold leading-tight">{t}</span><span className="mt-0.5 block text-[11px] text-stone-500">{s}</span></span>
        </li>
      ))}
    </ul>
  );
}

/* ---------- reading progress ---------- */

export function ScrollProgress() {
  const { path, search } = useRouter();
  const query = search.toString();
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const paint = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${ratio})`;
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    paint();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(queue) : null;
    const main = document.getElementById("main");
    if (main) observer?.observe(main);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [path, query]);
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div ref={bar} className="h-full origin-left bg-amber-400" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}
