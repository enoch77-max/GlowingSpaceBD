import { Select } from "../ui/Select";
import { ProductInventoryEditor } from "./ProductInventoryEditor";
import { getVariants, inventoryMode, normalizeProduct, productInventoryIssue, variantIsLow } from "../catalog/inventory";
import { useEffect, useMemo, useState } from "react";
import { Link } from "../router";
import { STUDIO_GALLERY, fmt, type Category, type HeroSlideConfig, type HeroTheme, type Pay, type Product } from "../data";
import { useStore } from "../store";
import { Icon, CATEGORY_ICON } from "../icons";
import { ResponsiveImage } from "../ResponsiveImage";
import { IconBtn, SwitchToggle, adminInput, adminBtnPrimary, adminBtnAccent, adminBtnGhost, PageHeading } from "./ui";
export { IconBtn, SwitchToggle, adminInput, adminBtnPrimary, adminBtnAccent, adminBtnGhost } from "./ui";

/* ============================================================================
   2. PRODUCTS & INVENTORY SECTION
   ============================================================================ */

export function ProductsSection({ initialQuery = "" }: { initialQuery?: string }) {
  const {
    catalogProducts,
    catalogReady,
    catalogCategories,
    categoryLabel,
    patchProduct,
    upsertProduct,
    deleteProduct,
    bulkPatchProducts,
    can,
  } = useStore();

  const [q, setQ] = useState(initialQuery);
  const [catFilter, setCatFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out" | "hidden">("all");
  const [payFilter, setPayFilter] = useState<"all" | Pay>("all");
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ product: Product; isNew: boolean } | null>(null);

  const canWriteCatalog = can("catalog.write");
  const canWriteStock = can("inventory.write");
  const canViewFinance = can("finance.read");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return catalogProducts.filter((p) => {
      if (catFilter !== "all" && p.category !== catFilter) return false;
      if (payFilter !== "all" && p.pay !== payFilter) return false;
      if (stockFilter === "low" && !getVariants(p).some(v => v.enabled !== false && variantIsLow(p, v))) return false;
      if (stockFilter === "out" && p.stock !== 0) return false;
      if (stockFilter === "hidden" && p.published !== false) return false;
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        (p.aliases ?? []).some((a) => a.toLowerCase().includes(term))
      );
    });
  }, [catalogProducts, catFilter, payFilter, stockFilter, q]);

  const toggleSelect = (slug: string) => {
    setSelectedSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const openNewProduct = () => {
    const num = String(catalogProducts.length + 1).padStart(3, "0");
    setEditing({
      isNew: true,
      product: {
        slug: `new-maker-part-${num}`,
        sku: `GS-NEW-${num}`,
        name: "",
        category: catalogCategories[0]?.slug ?? "modules",
        price: 350,
        mrp: undefined,
        cost: 220,
        stock: 25,
        lowStockAt: 5,
        inventoryMode: "single",
        pay: "cod",
        images: [STUDIO_GALLERY[3].url],
        short: "",
        specs: [["Voltage", "5 V"], ["Package", "Tested module"]],
        rating: 4.8,
        reviews: 1,
        trending: false,
        kit: false,
        published: true,
        aliases: [],
      },
    });
  };

  const duplicateProduct = (p: Product) => {
    const copySlug = `${p.slug}-copy-${Date.now().toString().slice(-3)}`;
    setEditing({
      isNew: true,
      product: {
        ...p,
        slug: copySlug,
        sku: `${p.sku}-C`,
        name: `${p.name} (Copy)`,
      },
    });
  };

  return (
    <div className="space-y-5">
      <PageHeading title="Products" description="Pricing, availability, and inventory at a glance." count={catalogProducts.length} />
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-400">
            <Icon name="search" className="h-4 w-4" />
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search SKU, product name or search alias…"
            aria-label="Search catalog products"
            className={`${adminInput} pl-10`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Filter category"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="rounded-full border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 outline-none focus:border-stone-900"
          >
            <option value="all">All categories ({catalogProducts.length})</option>
            {catalogCategories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </Select>

          <Select
            aria-label="Filter stock state"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
            className="rounded-full border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 outline-none focus:border-stone-900"
          >
            <option value="all">All stock states</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock (0)</option>
            <option value="hidden">Hidden / Draft</option>
          </Select>

          <Select
            aria-label="Filter payment policy"
            value={payFilter}
            onChange={(e) => setPayFilter(e.target.value as typeof payFilter)}
            className="rounded-full border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 outline-none focus:border-stone-900"
          >
            <option value="all">COD + Advance</option>
            <option value="cod">COD only</option>
            <option value="prepay">Advance only</option>
          </Select>

          {canWriteCatalog && <button type="button" disabled={!catalogReady} onClick={openNewProduct} className={adminBtnAccent}>
            <Icon name="plus" className="h-4 w-4" />
            <span>Add product</span>
          </button>}
        </div>
      </div>

      {!catalogReady && <p role="status" className="text-xs text-stone-500">Connecting to live inventory… Product edits become available once connected.</p>}
      {/* Bulk Action Bar */}
      {canWriteCatalog && selectedSlugs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-xs text-white">
          <span className="font-bold">{selectedSlugs.length} SKU{selectedSlugs.length > 1 ? "s" : ""} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              hidden={!canWriteCatalog}
              onClick={() => { bulkPatchProducts(selectedSlugs, { pay: "cod" }, "Bulk switched to COD"); setSelectedSlugs([]); }}
              className="rounded-full bg-white/15 px-3 py-1.5 font-bold hover:bg-white/25 disabled:opacity-40"
            >
              Set COD
            </button>
            <button
              type="button"
              hidden={!canWriteCatalog}
              onClick={() => { bulkPatchProducts(selectedSlugs, { pay: "prepay" }, "Bulk switched to Advance Prepay"); setSelectedSlugs([]); }}
              className="rounded-full bg-white/15 px-3 py-1.5 font-bold hover:bg-white/25 disabled:opacity-40"
            >
              Set Advance
            </button>
            <button
              type="button"
              hidden={!canWriteCatalog}
              onClick={() => { bulkPatchProducts(selectedSlugs, { published: true }, "Bulk published SKUs"); setSelectedSlugs([]); }}
              className="rounded-full bg-white/15 px-3 py-1.5 font-bold hover:bg-white/25 disabled:opacity-40"
            >
              Publish
            </button>
            <button
              type="button"
              hidden={!canWriteCatalog}
              onClick={() => { bulkPatchProducts(selectedSlugs, { published: false }, "Bulk hidden SKUs"); setSelectedSlugs([]); }}
              className="rounded-full bg-white/15 px-3 py-1.5 font-bold hover:bg-white/25 disabled:opacity-40"
            >
              Hide
            </button>
            <button
              type="button"
              onClick={() => setSelectedSlugs([])}
              className="rounded-full px-2.5 py-1.5 text-stone-300 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Product Table */}
      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-stone-100 bg-paper/70 text-[11px] font-bold uppercase tracking-[0.1em] text-stone-500">
              <tr>
                <th hidden={!canWriteCatalog} className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all visible products"
                    checked={filtered.length > 0 && filtered.every((p) => selectedSlugs.includes(p.slug))}
                    onChange={(e) => setSelectedSlugs(e.target.checked ? filtered.map((p) => p.slug) : [])}
                    className="h-4 w-4 rounded accent-stone-900"
                  />
                </th>
                <th className="px-3 py-3">Product · SKU</th>
                <th className="px-3 py-3">Price {canViewFinance ? "· Margin" : ""}</th>
                <th className="px-3 py-3">Stock Control</th>
                <th className="px-3 py-3">Payment Rule</th>
                <th className="px-3 py-3">Live</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((p) => {
                const cost = p.cost ?? Math.round(p.price * 0.68);
                const marginPct = p.price > 0 ? Math.round(((p.price - cost) / p.price) * 100) : 0;
                const low = getVariants(p).some(v => v.enabled !== false && variantIsLow(p, v));
                const isPublished = p.published !== false;
                return (
                  <tr key={p.slug} className={`transition hover:bg-stone-50/80 ${!isPublished ? "opacity-60" : ""}`}>
                    <td hidden={!canWriteCatalog} className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${p.name}`}
                        checked={selectedSlugs.includes(p.slug)}
                        onChange={() => toggleSelect(p.slug)}
                        className="h-4 w-4 rounded accent-stone-900"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <ResponsiveImage src={p.images[0]} alt="" loading="lazy" sizes="44px" className="h-11 w-11 shrink-0 rounded-xl object-cover ring-1 ring-stone-200" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="max-w-[260px] truncate font-bold text-stone-900">{p.name}</p>
                            {p.trending && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Trending</span>
                            )}
                            {p.kit && (
                              <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-700">Kit</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-stone-500">
                            <span className="font-mono font-semibold text-stone-700">{p.sku}</span> · {categoryLabel(p.category)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 tnum">
                      <p className="font-extrabold text-stone-900">
                        {fmt(p.price)}
                        {p.mrp && p.mrp > p.price ? <span className="ml-1.5 text-xs font-normal text-stone-400 line-through">{fmt(p.mrp)}</span> : null}
                      </p>
                      {canViewFinance && (
                        <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">
                          Cost {fmt(cost)} · {marginPct}%
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          hidden={!canWriteStock}
                          disabled={!catalogReady || p.stock <= 0 || inventoryMode(p) === "independent"}
                          aria-label={`Decrease stock for ${p.name}`}
                          onClick={() => patchProduct(p.slug, { stock: Math.max(0, p.stock - 1) }, `Adjusted stock to ${p.stock - 1}`)}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:border-stone-400 disabled:opacity-35"
                        >
                          <Icon name="minus" className="h-3.5 w-3.5" />
                        </button>
                        <span
                          className={`min-w-[44px] rounded-lg px-2 py-1 text-center text-xs font-extrabold tnum ${
                            p.stock === 0 ? "bg-red-100 text-red-800" : low ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-900"
                          }`}
                        >
                          {p.stock}
                        </span>
                        <button
                          type="button"
                          hidden={!canWriteStock}
                          disabled={!catalogReady || inventoryMode(p) === "independent"}
                          aria-label={`Increase stock for ${p.name}`}
                          onClick={() => patchProduct(p.slug, { stock: p.stock + 5 }, `Restocked +5 to ${p.stock + 5}`)}
                          title="Add 5 units"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:border-stone-400 disabled:opacity-35"
                        >
                          <Icon name="plus" className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-stone-500">{inventoryMode(p) === "independent" ? "Separate stock · edit variants" : inventoryMode(p) === "shared_units" ? "Shared pieces · auto pack stock" : "Shared item stock"}</p>
                    </td>
                    <td className="px-3 py-3">
                      {canWriteCatalog ? (<button
                        type="button"
                        
                        onClick={() =>
                          patchProduct(
                            p.slug,
                            { pay: p.pay === "cod" ? "prepay" : "cod" },
                            `Switched payment rule to ${p.pay === "cod" ? "Advance" : "COD"}`,
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition disabled:cursor-not-allowed ${
                          p.pay === "cod"
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100"
                            : "bg-violet-50 text-violet-800 ring-violet-200 hover:bg-violet-100"
                        }`}
                      >
                        <Icon name={p.pay === "cod" ? "cash" : "shield"} className="h-3.5 w-3.5" />
                        <span>{p.pay === "cod" ? "COD" : "Advance"}</span>
                      </button>) : <span className={`admin-status status-${p.pay === "cod" ? "green" : "purple"}`}>{p.pay === "cod" ? "COD" : "Advance"}</span>}
                    </td>
                    <td className="px-3 py-3">
                      {canWriteCatalog ? <SwitchToggle
                        checked={isPublished}
                        label={`Publish ${p.name}`}
                        onChange={(next) => patchProduct(p.slug, { published: next }, next ? "Published SKU" : "Hidden SKU from storefront")}
                      /> : <span className="text-xs text-stone-500">{isPublished ? "Active" : "Draft"}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {canWriteCatalog && <IconBtn disabled={!catalogReady} icon="edit" label={`Edit ${p.name}`} onClick={() => setEditing({ product: p, isNew: false })} />}
                        {canWriteCatalog && <IconBtn icon="duplicate" label={`Duplicate ${p.name}`} onClick={() => duplicateProduct(p)} />}
                        <Link
                          to={`/product/${p.slug}`}
                          aria-label={`View ${p.name} on storefront`}
                          title="View on storefront"
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-600 transition hover:border-stone-400 hover:text-stone-900"
                        >
                          <Icon name="external" className="h-4 w-4" />
                        </Link>
                        {canWriteCatalog && <IconBtn
                          icon="trash"
                          tone="danger"
                          label={`Delete ${p.name}`}
                          onClick={() => { if (window.confirm(`Delete ${p.sku}? This removes it from the catalog.`)) deleteProduct(p.slug); }}
                        />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && canWriteCatalog && (
        <ProductEditorModal
          initial={editing.product}
          isNew={editing.isNew}
          categories={catalogCategories}
          canViewFinance={canViewFinance}
          onClose={() => setEditing(null)}
          onSave={async (prod) => {
            const saved = await upsertProduct(prod, editing.isNew);
            if (saved) setEditing(null);
            return saved;
          }}
        />
      )}
    </div>
  );
}

function ProductEditorModal({
  initial,
  isNew,
  categories,
  canViewFinance,
  onClose,
  onSave,
}: {
  initial: Product;
  isNew: boolean;
  categories: Category[];
  canViewFinance: boolean;
  onClose: () => void;
  onSave: (p: Product) => Promise<boolean>;
}) {
  const canonicalAliases = (value: string) => value.split(",").map(item => item.trim()).filter(Boolean);
  const initialProduct = normalizeProduct(initial);
  const initialAliases = JSON.stringify(initialProduct.aliases ?? []);
  const [draft, setDraft] = useState<Product>(() => initialProduct);
  const [baseline, setBaseline] = useState<Product>(() => initialProduct);
  const [baselineAliases, setBaselineAliases] = useState(initialAliases);
  const [saving, setSaving] = useState(false);
  const [modeConfirmed, setModeConfirmed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const modeChanged = !isNew && inventoryMode(initial) !== inventoryMode(draft);
  const [aliasText, setAliasText] = useState((initialProduct.aliases ?? []).join(", "));
  const [customImg, setCustomImg] = useState("");
  const [err, setErr] = useState("");
  const compareProduct = (product: Product) => JSON.stringify({
    ...normalizeProduct(product),
    original: Boolean(product.original),
    qualityNote: product.qualityNote?.trim() ?? "",
  });
  const isDirty = compareProduct(draft) !== compareProduct(baseline)
    || JSON.stringify(canonicalAliases(aliasText)) !== baselineAliases
    || Boolean(customImg.trim());

  useEffect(() => {
    const next = normalizeProduct(initial);
    setDraft(next);
    setBaseline(next);
    setAliasText((next.aliases ?? []).join(", "));
    setBaselineAliases(JSON.stringify(next.aliases ?? []));
    setCustomImg("");
    setErr("");
    setModeConfirmed(false);
    setConfirmDiscard(false);
  }, [initial, isNew]);

  const requestClose = () => {
    if (saving) return;
    if (isDirty) setConfirmDiscard(true);
    else onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      if (saving) return;
      if (confirmDiscard) setConfirmDiscard(false);
      else requestClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  });

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (modeChanged && !modeConfirmed) { setErr("Confirm you have checked the stock for the new inventory mode."); return; }
    if (draft.name.trim().length < 3) { setErr("Enter a descriptive product name."); return; }
    if (draft.sku.trim().length < 3) { setErr("Enter a valid SKU code."); return; }
    if (draft.price <= 0) { setErr("Price must be greater than 0 BDT."); return; }
    const finalSlug = isNew ? slugify(draft.slug || draft.name) || draft.slug : draft.slug;
    const aliases = aliasText.split(",").map((s) => s.trim()).filter(Boolean);
    const inventoryIssue = productInventoryIssue(draft);
    if (inventoryIssue) { setErr(inventoryIssue); return; }
    setErr(""); setSaving(true);
    try {
      const saved = await onSave(normalizeProduct({
        ...draft,
        name: draft.name.trim(),
        sku: draft.sku.trim().toUpperCase(),
        slug: finalSlug,
        short: draft.short.trim() || "Tested component ready for dispatch from Dhaka.",
        specs: draft.specs.filter(([k, v]) => k.trim() && v.trim()),
        aliases,
      }));
      if (!saved) setErr("Not saved. Your draft is still here; check the notification, refresh current stock if asked, and retry.");
    } catch {
      setErr("Save failed. Your draft is still here. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-[2px]" onMouseDown={event => { if (event.target === event.currentTarget) requestClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={isNew ? "Create SKU" : "Edit SKU"} aria-busy={saving} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">{isNew ? "New product" : `Editing ${draft.sku}`}</p>
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-extrabold text-stone-900">{draft.name || "Untitled product"}</h3>{isDirty && <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Unsaved changes</span>}{!isDirty && !isNew && <span className="text-[10px] font-medium text-stone-400">All changes saved</span>}</div>
          </div>
          <IconBtn icon="close" label="Close editor" disabled={saving} onClick={requestClose} />
        </div>

        <form onSubmit={submit} inert={saving} className="relative flex-1 space-y-5 overflow-y-auto p-6">
          <fieldset disabled={saving} className="contents">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs sm:col-span-2">
              <span className="mb-1.5 block font-bold text-stone-700">Product Name</span>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value, ...(isNew ? { slug: slugify(e.target.value) } : {}) })}
                placeholder="e.g. Panasonic NCR18650B 3400mAh Li-ion Cell"
                className={adminInput}
                required
              />
            </label>

            <label className="block text-xs">
              <span className="mb-1.5 block font-bold text-stone-700">SKU Code</span>
              <input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} className={`${adminInput} font-mono`} required />
            </label>

            <label className="block text-xs">
              <span className="mb-1.5 block font-bold text-stone-700">Category Aisle</span>
              <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={adminInput}>
                {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </Select>
            </label>

            <label className="block text-xs">
              <span className="mb-1.5 block font-bold text-stone-700">{inventoryMode(draft) === "single" ? "Selling Price (৳ BDT)" : "From price · calculated from variants"}</span>
              <input type="number" min={1} readOnly={inventoryMode(draft) !== "single"} value={inventoryMode(draft) === "single" ? draft.price : normalizeProduct(draft).price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} className={adminInput} required />
            </label>

            <label className="block text-xs">
              <span className="mb-1.5 block font-bold text-stone-700">Compare-at MRP (৳ optional)</span>
              <input
                type="number"
                min={0}
                value={draft.mrp ?? ""}
                onChange={(e) => setDraft({ ...draft, mrp: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Leave blank if no discount"
                className={adminInput}
              />
            </label>

            {canViewFinance && (
              <label className="block text-xs">
                <span className="mb-1.5 block font-bold text-stone-700">Unit Cost (৳ BDT · Internal)</span>
                <input
                  type="number"
                  min={0}
                  value={draft.cost ?? ""}
                  onChange={(e) => setDraft({ ...draft, cost: e.target.value ? Number(e.target.value) : undefined })}
                  className={adminInput}
                />
              </label>
            )}

            <label className="block text-xs">
              <span className="mb-1.5 block font-bold text-stone-700">Payment method</span>
              <Select value={draft.pay} onChange={(e) => setDraft({ ...draft, pay: e.target.value as Pay })} className={adminInput}>
                <option value="cod">Cash on Delivery (Low-risk item)</option>
                <option value="prepay">Advance bKash/Nagad (Unique / higher-value)</option>
              </Select>
            </label>
          </div>

          <ProductInventoryEditor product={draft} onChange={next => { if (inventoryMode(next) !== inventoryMode(draft)) setModeConfirmed(false); setDraft(next); }} canViewFinance={canViewFinance} modeChanged={modeChanged} confirmed={modeConfirmed} onConfirm={setModeConfirmed} />

          <section className="rounded-2xl border border-stone-200 bg-white p-4" aria-label="Product authenticity">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0"><p className="text-xs font-bold text-stone-800">Authenticity</p><p className="mt-1 text-[11px] leading-relaxed text-stone-500">Only mark a product as original when its authenticity has been verified.</p></div>
              <SwitchToggle checked={Boolean(draft.original)} label="Original product" onChange={(value) => setDraft({ ...draft, original: value })} />
            </div>
            {draft.original ? (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800"><Icon name="check-circle" className="h-3.5 w-3.5" />Original capsule shown on product image</span>
            ) : (
              <label className="mt-3 block text-xs"><span className="mb-1.5 block font-bold text-stone-700">Quality / compatibility note · optional</span><input aria-label="Quality or compatibility note" value={draft.qualityNote ?? ""} onChange={event => setDraft({ ...draft, qualityNote: event.target.value })} maxLength={160} placeholder="e.g. Compatible alternative · Grade A copy" className={adminInput} /><span className="mt-1 block text-[10px] text-stone-500">Shown in product details as entered; avoid calling a non-original item “original”.</span></label>
            )}
          </section>

          <label className="block text-xs">
            <span className="mb-1.5 block font-bold text-stone-700">Short Summary (1–2 crisp lines)</span>
            <input value={draft.short} onChange={(e) => setDraft({ ...draft, short: e.target.value })} placeholder="Key value proposition shown on PDP & search" className={adminInput} />
          </label>

          <label className="block text-xs">
            <span className="mb-1.5 block font-bold text-stone-700">Smart Search Aliases (comma-separated)</span>
            <input value={aliasText} onChange={(e) => setAliasText(e.target.value)} placeholder="e.g. router backup, load shedding, mini ups, 12v" className={adminInput} />
          </label>

          {/* Flags */}
          <div className="grid gap-3 rounded-2xl border border-stone-200 bg-paper/60 p-4 sm:grid-cols-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-800">Published</span>
              <SwitchToggle checked={draft.published !== false} label="Published" onChange={(v) => setDraft({ ...draft, published: v })} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-800">Trending Shelf</span>
              <SwitchToggle checked={Boolean(draft.trending)} label="Trending" onChange={(v) => setDraft({ ...draft, trending: v })} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-stone-800">Project Kit</span>
              <SwitchToggle checked={Boolean(draft.kit)} label="Project kit" onChange={(v) => setDraft({ ...draft, kit: v })} />
            </div>
          </div>

          {/* Studio Photo Picker */}
          <div>
            <p className="text-xs font-bold text-stone-700">Product Gallery</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STUDIO_GALLERY.map((g) => {
                const active = draft.images[0] === g.url;
                return (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => setDraft({ ...draft, images: [g.url, ...draft.images.filter((u) => u !== g.url)] })}
                    className={`flex items-center gap-2 rounded-xl border p-1.5 pr-2.5 text-[11px] font-semibold transition ${
                      active ? "border-stone-900 bg-amber-50 ring-2 ring-amber-300" : "border-stone-200 bg-white hover:border-stone-400"
                    }`}
                  >
                    <ResponsiveImage src={g.url} alt="" loading="lazy" sizes="28px" className="h-7 w-7 shrink-0 rounded-lg object-cover" />
                    <span>{g.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 flex gap-2">
              <input
                value={customImg}
                onChange={(e) => setCustomImg(e.target.value)}
                placeholder="Or paste custom image URL (https://…)"
                className={adminInput}
              />
              <button
                type="button"
                onClick={() => {
                  if (!customImg.trim()) return;
                  setDraft({ ...draft, images: [customImg.trim(), ...draft.images] });
                  setCustomImg("");
                }}
                className={adminBtnGhost}
              >
                Add image
              </button>
            </div>
          </div>

          {/* Specifications */}
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-stone-700">Specifications</p>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, specs: [...draft.specs, ["", ""]] })}
                className="inline-flex items-center gap-1 text-xs font-bold text-stone-700 hover:text-stone-900"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                <span>Add row</span>
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {draft.specs.map(([k, v], idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                  <input
                    value={k}
                    onChange={(e) => {
                      const next = [...draft.specs];
                      next[idx] = [e.target.value, v];
                      setDraft({ ...draft, specs: next });
                    }}
                    placeholder="Spec name (e.g. Capacity)"
                    className={adminInput}
                  />
                  <input
                    value={v}
                    onChange={(e) => {
                      const next = [...draft.specs];
                      next[idx] = [k, e.target.value];
                      setDraft({ ...draft, specs: next });
                    }}
                    placeholder="Value (e.g. 3000 mAh)"
                    className={adminInput}
                  />
                  <IconBtn
                    icon="trash"
                    tone="danger"
                    label="Remove spec row"
                    onClick={() => setDraft({ ...draft, specs: draft.specs.filter((_, i) => i !== idx) })}
                  />
                </div>
              ))}
            </div>
          </div>

          {err && <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">{err}</p>}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
            <p role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${isDirty ? "text-amber-800" : "text-stone-400"}`}>
              {isDirty ? <><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Unsaved changes</> : isNew ? "Make a change to enable saving" : "No unsaved changes"}
            </p>
            <div className="flex items-center gap-2.5">
              <button type="button" disabled={saving} onClick={requestClose} className={adminBtnGhost}>Cancel</button>
              <button type="submit" disabled={saving || !isDirty} className={`${adminBtnAccent} disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 disabled:shadow-none`}>
                <Icon name={saving ? "clock" : "check"} className="h-4 w-4" />
                <span>{saving ? "Saving to database…" : isNew ? "Create SKU" : "Save Changes"}</span>
              </button>
            </div>
          </div>
          </fieldset>
        </form>
        {confirmDiscard && <div className="absolute inset-0 z-[2] grid place-items-center bg-stone-950/40 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setConfirmDiscard(false); }}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="discard-product-title" aria-describedby="discard-product-description" className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><Icon name="alert" className="h-5 w-5" /></div>
            <h4 id="discard-product-title" className="mt-3 text-base font-extrabold text-stone-900">Discard unsaved changes?</h4>
            <p id="discard-product-description" className="mt-1.5 text-sm leading-relaxed text-stone-600">Your changes to <strong>{draft.name || "this new product"}</strong> haven’t been saved. Keep editing or discard this draft.</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" autoFocus onClick={() => setConfirmDiscard(false)} className={adminBtnGhost}>Keep editing</button><button type="button" onClick={onClose} className="admin-button admin-button-danger">Discard changes</button></div>
          </section>
        </div>}
      </div>
    </div>
  );
}

/* ============================================================================
   3. STOREFRONT & MERCHANDISING STUDIO (Hero Carousel, Aisles, Ticker, FAQs)
   ============================================================================ */

export function StorefrontSection() {
  const {
    heroSlides,
    saveHeroSlides,
    catalogProducts,
    catalogCategories,
    upsertCategory,
    settings,
    updateSettings,
    can,
  } = useStore();

  const canWrite = can("storefront.write");
  const [editingSlide, setEditingSlide] = useState<HeroSlideConfig | null>(null);
  const [announcement, setAnnouncement] = useState(settings.announcementText);
  const [supportHours, setSupportHours] = useState(settings.supportHours);
  const [dispatchHour, setDispatchHour] = useState(settings.dispatchHourBdt);
  const [newPromise, setNewPromise] = useState("");
  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  if (!canWrite) {
    return null;
  }

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= heroSlides.length) return;
    const copy = [...heroSlides];
    const [item] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, item);
    saveHeroSlides(copy, "Reordered Hero carousel slides");
  };

  const toggleSlide = (id: string, active: boolean) => {
    saveHeroSlides(
      heroSlides.map((s) => (s.id === id ? { ...s, active } : s)),
      `${active ? "Enabled" : "Disabled"} hero slide`,
    );
  };

  const addHeroSlide = () => {
    const firstProd = catalogProducts.find((p) => p.published !== false && p.stock > 0) ?? catalogProducts[0];
    if (!firstProd) return;
    setEditingSlide({
      id: `slide-${Date.now()}`,
      slug: firstProd.slug,
      label: firstProd.name.slice(0, 18),
      eyebrow: "Featured maker pick",
      title: ["Built for", "real projects."],
      body: firstProd.short,
      theme: "sand",
      chips: [["bolt", "Tested in Dhaka"], ["shield", "7-day return"]],
      tag: "Featured",
      active: true,
    });
  };

  const THEME_SWATCH: Record<HeroTheme, string> = {
    sand: "bg-[#efebe1] text-stone-900 ring-stone-300",
    ink: "bg-[#15201b] text-white ring-stone-700",
    mint: "bg-[#dbe8e2] text-stone-900 ring-emerald-300",
    amber: "bg-[#fcd34d] text-stone-900 ring-amber-400",
  };

  return (
    <div className="space-y-6">
      <PageHeading title="Storefront" description="Manage your homepage and product aisles." />
      {/* Hero Carousel Studio */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700">Merchandising</p>
            <h3 className="mt-0.5 text-lg font-extrabold text-stone-900">Homepage slides</h3>
            <p className="text-xs text-stone-500">Choose the products and copy shown on your homepage.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className={adminBtnGhost}>
              <span>Preview Home</span>
              <Icon name="external" className="h-3.5 w-3.5" />
            </Link>
            <button type="button" disabled={!canWrite} onClick={addHeroSlide} className={adminBtnAccent}>
              <Icon name="plus" className="h-4 w-4" />
              <span>Add Slide</span>
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {heroSlides.map((s, idx) => {
            const linked = catalogProducts.find((p) => p.slug === s.slug);
            return (
              <div key={s.id} className={`flex min-w-0 flex-col justify-between rounded-2xl border border-stone-200 p-4 transition ${!s.active ? "opacity-55" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {linked && <ResponsiveImage src={linked.images[0]} alt="" loading="lazy" sizes="48px" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-stone-200" />}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ring-1 ${THEME_SWATCH[s.theme]}`}>
                          {s.theme}
                        </span>
                        <span className="truncate text-xs font-bold text-stone-500">{s.eyebrow}</span>
                      </div>
                      <p className="mt-1 truncate text-base font-extrabold text-stone-900">
                        {s.title[0]} {s.title[1]}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        SKU: {linked ? `${linked.name} (${fmt(linked.price)})` : s.slug}
                      </p>
                    </div>
                  </div>
                  <SwitchToggle checked={s.active} disabled={!canWrite} label={`Toggle slide ${s.label}`} onChange={(v) => toggleSlide(s.id, v)} />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <IconBtn icon="chevron-left" label="Move slide earlier" disabled={!canWrite || idx === 0} onClick={() => moveSlide(idx, -1)} />
                    <IconBtn icon="chevron-right" label="Move slide later" disabled={!canWrite || idx === heroSlides.length - 1} onClick={() => moveSlide(idx, 1)} />
                    <span className="ml-1 text-[11px] font-semibold text-stone-400">Slide #{idx + 1}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" disabled={!canWrite} onClick={() => setEditingSlide(s)} className={adminBtnGhost}>
                      <Icon name="edit" className="h-3.5 w-3.5" />
                      <span>Customize</span>
                    </button>
                    {heroSlides.length > 1 && (
                      <IconBtn
                        icon="trash"
                        tone="danger"
                        label="Remove slide"
                        disabled={!canWrite}
                        onClick={() => saveHeroSlides(heroSlides.filter((x) => x.id !== s.id), `Removed slide ${s.label}`)}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top Bar & Dispatch Countdown */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-base font-extrabold text-stone-900">Announcement & dispatch</h3>
          <div className="mt-4 space-y-3.5">
            <label className="block text-xs">
              <span className="mb-1.5 block font-bold text-stone-700">Top Announcement Message</span>
              <input disabled={!canWrite} value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className={adminInput} />
            </label>
            <label className="block text-xs">
              <span className="mb-1.5 block font-bold text-stone-700">Support Hours Text</span>
              <input disabled={!canWrite} value={supportHours} onChange={(e) => setSupportHours(e.target.value)} className={adminInput} />
            </label>
            <div className="grid grid-cols-2 items-center gap-3 rounded-xl bg-paper/70 p-3">
              <div>
                <p className="text-xs font-bold text-stone-800">Hero Dispatch Countdown</p>
                <p className="text-[11px] text-stone-500">Daily courier cutoff (BDT 24h)</p>
              </div>
              <div className="flex items-center justify-end gap-2.5">
                <input
                  type="number"
                  min={8}
                  max={22}
                  disabled={!canWrite}
                  aria-label="Dispatch cutoff hour BDT"
                  value={dispatchHour}
                  onChange={(e) => setDispatchHour(Number(e.target.value))}
                  className="w-20 rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-center text-xs font-extrabold tnum"
                />
                <SwitchToggle
                  checked={settings.showDispatchCountdown}
                  disabled={!canWrite}
                  label="Show dispatch countdown"
                  onChange={(v) => updateSettings({ showDispatchCountdown: v }, "Toggled hero dispatch countdown")}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!canWrite}
              onClick={() =>
                updateSettings(
                  { announcementText: announcement.trim(), supportHours: supportHours.trim(), dispatchHourBdt: dispatchHour },
                  "Updated announcement bar & dispatch hour",
                )
              }
              className={adminBtnPrimary}
            >
              <Icon name="check" className="h-4 w-4" />
              <span>Apply Bar & Cutoff</span>
            </button>
          </div>
        </div>

        {/* Category Aisles Visibility */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-base font-extrabold text-stone-900">Category Aisles</h3>
          <p className="mt-0.5 text-xs text-stone-500">Toggle aisle visibility across navigation, homepage tiles, and search.</p>
          <ul className="mt-4 divide-y divide-stone-100">
            {catalogCategories.map((c) => {
              const ic = c.icon ?? CATEGORY_ICON[c.slug] ?? "box";
              return (
                <li key={c.slug} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sand text-stone-800">
                      <Icon name={ic} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-extrabold text-stone-900">{c.name}</p>
                      <p className="truncate text-[11px] text-stone-500">{c.blurb}</p>
                    </div>
                  </div>
                  <SwitchToggle
                    checked={c.visible !== false}
                    disabled={!can("catalog.write")}
                    label={`Show ${c.name}`}
                    onChange={(v) => upsertCategory({ ...c, visible: v })}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Marquee & FAQs */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-base font-extrabold text-stone-900">Marquee Store Promises</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {settings.marqueePromises.map((item, idx) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full bg-stone-100 py-1.5 pl-3 pr-2 text-xs font-semibold text-stone-800">
                <span>{item}</span>
                <button
                  type="button"
                  disabled={!canWrite}
                  aria-label={`Remove ${item}`}
                  onClick={() =>
                    updateSettings(
                      { marqueePromises: settings.marqueePromises.filter((_, i) => i !== idx) },
                      "Removed marquee promise",
                    )
                  }
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-stone-500 hover:bg-stone-200 hover:text-stone-900"
                >
                  <Icon name="close" className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <input
              disabled={!canWrite}
              value={newPromise}
              onChange={(e) => setNewPromise(e.target.value)}
              placeholder="Add ticker item (e.g. Same-day Dhaka dispatch)"
              className={adminInput}
            />
            <button
              type="button"
              disabled={!canWrite || !newPromise.trim()}
              onClick={() => {
                updateSettings({ marqueePromises: [...settings.marqueePromises, newPromise.trim()] }, "Added marquee promise");
                setNewPromise("");
              }}
              className={adminBtnGhost}
            >
              Add
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5">
          <h3 className="text-base font-extrabold text-stone-900">Frequently asked questions</h3>
          <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
            {settings.faqs.map(([qText, aText], idx) => (
              <li key={qText} className="flex items-start justify-between gap-3 rounded-xl border border-stone-200 p-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-stone-900">{qText}</p>
                  <p className="mt-0.5 line-clamp-2 text-stone-500">{aText}</p>
                </div>
                <IconBtn
                  icon="trash"
                  tone="danger"
                  label={`Delete FAQ ${qText}`}
                  disabled={!canWrite}
                  onClick={() => updateSettings({ faqs: settings.faqs.filter((_, i) => i !== idx) }, "Removed FAQ entry")}
                />
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-2">
            <input disabled={!canWrite} value={newFaqQ} onChange={(e) => setNewFaqQ(e.target.value)} placeholder="Question…" className={adminInput} />
            <div className="flex gap-2">
              <input disabled={!canWrite} value={newFaqA} onChange={(e) => setNewFaqA(e.target.value)} placeholder="Answer…" className={adminInput} />
              <button
                type="button"
                disabled={!canWrite || !newFaqQ.trim() || !newFaqA.trim()}
                onClick={() => {
                  updateSettings({ faqs: [...settings.faqs, [newFaqQ.trim(), newFaqA.trim()]] }, "Added FAQ entry");
                  setNewFaqQ("");
                  setNewFaqA("");
                }}
                className={adminBtnGhost}
              >
                Add FAQ
              </button>
            </div>
          </div>
        </div>
      </section>

      {editingSlide && (
        <HeroSlideModal
          slide={editingSlide}
          products={catalogProducts}
          onClose={() => setEditingSlide(null)}
          onSave={(updated) => {
            const exists = heroSlides.some((s) => s.id === updated.id);
            const next = exists ? heroSlides.map((s) => (s.id === updated.id ? updated : s)) : [...heroSlides, updated];
            saveHeroSlides(next, `Saved hero slide ${updated.label}`);
            setEditingSlide(null);
          }}
        />
      )}
    </div>
  );
}

function HeroSlideModal({
  slide,
  products,
  onClose,
  onSave,
}: {
  slide: HeroSlideConfig;
  products: Product[];
  onClose: () => void;
  onSave: (s: HeroSlideConfig) => void;
}) {
  const [d, setD] = useState<HeroSlideConfig>(slide);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-[2px]">
      <div role="dialog" aria-modal="true" aria-label="Customize Hero Slide" className="w-full max-w-lg overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
          <h3 className="text-base font-extrabold text-stone-900">Customize Hero Slide</h3>
          <IconBtn icon="close" label="Close modal" onClick={onClose} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(d);
          }}
          className="space-y-4 p-6"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs sm:col-span-2">
              <span className="mb-1 block font-bold text-stone-700">Featured SKU</span>
              <Select value={d.slug} onChange={(e) => setD({ ...d, slug: e.target.value })} className={adminInput}>
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name} ({fmt(p.price)})</option>
                ))}
              </Select>
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-bold text-stone-700">Slide Label</span>
              <input value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} className={adminInput} required />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-bold text-stone-700">Color Theme</span>
              <Select value={d.theme} onChange={(e) => setD({ ...d, theme: e.target.value as HeroTheme })} className={adminInput}>
                <option value="sand">Warm Sand</option>
                <option value="ink">Forest Ink (Dark)</option>
                <option value="mint">Maker Mint</option>
                <option value="amber">Signal Amber</option>
              </Select>
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-bold text-stone-700">Headline Line 1</span>
              <input value={d.title[0]} onChange={(e) => setD({ ...d, title: [e.target.value, d.title[1]] })} className={adminInput} required />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-bold text-stone-700">Headline Line 2</span>
              <input value={d.title[1]} onChange={(e) => setD({ ...d, title: [d.title[0], e.target.value] })} className={adminInput} required />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-bold text-stone-700">Eyebrow</span>
              <input value={d.eyebrow} onChange={(e) => setD({ ...d, eyebrow: e.target.value })} className={adminInput} required />
            </label>
            <label className="block text-xs">
              <span className="mb-1 block font-bold text-stone-700">Corner Badge</span>
              <input value={d.tag} onChange={(e) => setD({ ...d, tag: e.target.value })} className={adminInput} required />
            </label>
            <label className="block text-xs sm:col-span-2">
              <span className="mb-1 block font-bold text-stone-700">Supporting Copy</span>
              <textarea rows={2} value={d.body} onChange={(e) => setD({ ...d, body: e.target.value })} className={adminInput} required />
            </label>
          </div>
          <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
            <button type="button" onClick={onClose} className={adminBtnGhost}>Cancel</button>
            <button type="submit" className={adminBtnAccent}>Save Slide</button>
          </div>
        </form>
      </div>
    </div>
  );
}

