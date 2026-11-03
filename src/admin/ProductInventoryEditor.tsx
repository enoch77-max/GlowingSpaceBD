import type { InventoryMode, Product, ProductVariant } from "../data";
import { fmt } from "../data";
import { getVariants, INVENTORY_MODES, inventoryMode, normalizeProduct, variantComparison, variantSavings, variantStock } from "../catalog/inventory";
import { Icon } from "../icons";
import { adminInput, SwitchToggle } from "./ui";

export function ProductInventoryEditor({ product: p, onChange, canViewFinance, modeChanged, confirmed, onConfirm }: {
  product: Product; onChange: (p: Product) => void; canViewFinance: boolean; modeChanged: boolean; confirmed: boolean; onConfirm: (value: boolean) => void;
}) {
  const mode = inventoryMode(p);
  const enabled = mode !== "single";
  const isPack = mode === "shared_units";
  const separate = mode === "independent";
  const variants = getVariants(p);
  const updateVariant = (id: string, patch: Partial<ProductVariant>) => onChange({ ...p, variants: variants.map(v => v.id === id ? { ...v, ...patch } : v) });
  const changeMode = (next: InventoryMode) => {
    const nextVariants = (p.variants?.length ? p.variants : variants).map(v => ({ ...v, unitsPerPack: next === "shared_units" ? v.unitsPerPack : 1, stock: v.stock ?? 0 }));
    const stock = inventoryMode(p) === "independent" && next !== "independent"
      ? variants.filter(v => v.enabled !== false).reduce((sum, v) => sum + (v.stock ?? 0), 0)
      : p.stock;
    onChange({ ...p, stock, inventoryMode: next, variants: next === "single" ? p.variants : nextVariants });
  };
  const addVariant = () => onChange({ ...p, variants: [...variants, { id: `v-${crypto.randomUUID()}`, label: `Variant ${variants.length + 1}`, unitsPerPack: 1, price: p.price, stock: 0, enabled: true }] });
  const examplePacks = () => onChange({ ...p, inventoryMode: "shared_units", variants: [1, 3, 5, 10].map(units => {
    const old = variants.find(v => v.unitsPerPack === units);
    return old ? { ...old, label: `${units} ${p.category === "batteries" ? (units === 1 ? "Cell" : "Cells") : (units === 1 ? "Piece" : "Pieces")}` } : { id: `pack-${units}`, label: `${units} ${p.category === "batteries" ? "Cells" : "Pieces"}`, unitsPerPack: units, price: p.price * units, enabled: true };
  }) });

  return (
    <section className="overflow-hidden rounded-2xl border border-stone-200 bg-[#fafaf7]" aria-label="Inventory and variants">
      <div className="flex items-center justify-between gap-4 border-b border-stone-200 bg-white p-4">
        <div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-900"><Icon name="layers" className="h-[18px] w-[18px]" /></span><div><h4 className="text-sm font-extrabold text-stone-900">Inventory & variants</h4><p className="mt-0.5 text-[11px] text-stone-500">Choose how this product is priced and counted.</p></div></div>
        <SwitchToggle checked={enabled} label="Enable variants" onChange={value => changeMode(value ? "shared_units" : "single")} />
      </div>
      <div className="space-y-4 p-4">
        {enabled && <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Inventory mode">
          {INVENTORY_MODES.filter(item => item.id !== "single").map(item => <label key={item.id} className={`relative cursor-pointer rounded-xl border bg-white p-3 transition focus-within:ring-2 focus-within:ring-amber-400 ${mode === item.id ? "border-stone-900 shadow-[inset_0_0_0_1px_#1c1917]" : "border-stone-200 hover:border-stone-400"}`}>
            <input type="radio" name="inventory-mode" value={item.id} checked={mode === item.id} onChange={() => changeMode(item.id)} className="sr-only" />
            <span className="flex items-center justify-between gap-2 text-[12px] font-bold text-stone-900">{item.title}<span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${mode === item.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"}`}>{mode === item.id && <Icon name="check" className="h-2.5 w-2.5" />}</span></span>
            <span className="mt-1.5 block text-[11px] leading-relaxed text-stone-500">{item.hint}</span>
          </label>)}
        </div>}

        {modeChanged && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900"><p className="font-bold">Changing the stock source</p><p>Existing quantities are not automatically split or merged. Review the pool or each variant’s stock before saving. Old cart selections are checked again at checkout.</p><label className="mt-2 flex cursor-pointer items-center gap-2 font-bold"><input type="checkbox" checked={confirmed} onChange={e => onConfirm(e.target.checked)} className="accent-stone-900" />I have checked the stock for the new mode</label></div>}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs"><span className="mb-1.5 block font-bold text-stone-700">{separate ? "Total stock · calculated" : isPack ? "Shared stock · individual pieces" : "Stock on hand"}</span>
            <input aria-label="Stock on hand" type="number" min={0} step={1} readOnly={separate} value={separate ? normalizeProduct(p).stock : p.stock} onChange={e => onChange({ ...p, stock: Number(e.target.value) })} className={`${adminInput} ${separate ? "!bg-stone-100 text-stone-500" : ""}`} required />
            <span className="mt-1 block text-[10.5px] leading-snug text-stone-500">{separate ? "Sum of enabled variants. Edit each variant below." : isPack ? "Enter loose pieces once. Every pack draws from this pool." : "Each quantity sold consumes one item."}</span>
          </label>
          <label className="block text-xs"><span className="mb-1.5 block font-bold text-stone-700">Low-stock alert below</span><input aria-label="Low-stock alert below" type="number" min={0} step={1} value={p.lowStockAt ?? 5} onChange={e => onChange({ ...p, lowStockAt: Number(e.target.value) })} className={adminInput} /><span className="mt-1 block text-[10.5px] text-stone-500">{separate ? "Default for each variant; override below. " : "Based on remaining pool stock. "}0 disables the alert.</span></label>
        </div>

        {enabled && <>
          <div className="flex flex-wrap items-center justify-between gap-2"><h5 className="text-xs font-bold text-stone-900">Variants <span className="ml-1 font-medium text-stone-400">{variants.length}/32</span></h5><div className="flex gap-3">{isPack && <button type="button" onClick={examplePacks} className="text-[11px] font-bold text-amber-800 hover:underline">Use 1 / 3 / 5 / 10 packs</button>}<button type="button" disabled={variants.length >= 32} onClick={addVariant} className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 disabled:opacity-40"><Icon name="plus" className="h-3.5 w-3.5" />Add variant</button></div></div>
          <div className="space-y-3">
            {variants.map((v, index) => {
              const savings = variantSavings(p, v);
              return <div key={v.id} className={`rounded-xl border border-stone-200 bg-white p-3.5 ${v.enabled === false ? "opacity-60" : ""}`}>
                <div className="mb-3 flex items-center justify-between gap-3"><span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">Variant {index + 1}</span><label className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-stone-600"><input type="checkbox" checked={v.enabled !== false} onChange={e => updateVariant(v.id, { enabled: e.target.checked })} className="accent-stone-900" />Enabled</label></div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="col-span-2 block text-[11px] sm:col-span-1"><span className="mb-1 block font-semibold text-stone-600">Variant name</span><input aria-label={`Variant ${index + 1} name`} value={v.label} onChange={e => updateVariant(v.id, { label: e.target.value })} className={adminInput} required maxLength={80} /></label>
                  {isPack ? <label className="block text-[11px]"><span className="mb-1 block font-semibold text-stone-600">Pieces per pack</span><input aria-label={`Variant ${index + 1} pieces`} type="number" min={1} step={1} value={v.unitsPerPack} onChange={e => updateVariant(v.id, { unitsPerPack: Number(e.target.value) })} className={adminInput} required /></label> : <label className="block text-[11px]"><span className="mb-1 block font-semibold text-stone-600">{separate ? "Variant stock" : "Shared stock"}</span><input aria-label={`Variant ${index + 1} stock`} type="number" min={0} step={1} readOnly={!separate} value={separate ? v.stock ?? 0 : p.stock} onChange={e => updateVariant(v.id, { stock: Number(e.target.value) })} className={`${adminInput} ${!separate ? "!bg-stone-100" : ""}`} required /></label>}
                  <label className="block text-[11px]"><span className="mb-1 block font-semibold text-stone-600">Selling price · ৳</span><input aria-label={`Variant ${index + 1} price`} type="number" min={1} step={1} value={v.price} onChange={e => updateVariant(v.id, { price: Number(e.target.value) })} className={adminInput} required /></label>
                  <label className="block text-[11px]"><span className="mb-1 block font-semibold text-stone-600">Compare price · optional</span><input aria-label={`Variant ${index + 1} comparison price`} type="number" min={1} step={1} value={v.compareAtPrice ?? ""} onChange={e => updateVariant(v.id, { compareAtPrice: e.target.value ? Number(e.target.value) : undefined })} placeholder={isPack ? "Auto: single × pieces" : "No savings badge"} className={adminInput} /></label>
                  {separate && <label className="block text-[11px]"><span className="mb-1 block font-semibold text-stone-600">Low-stock override</span><input aria-label={`Variant ${index + 1} low stock`} type="number" min={0} step={1} value={v.lowStockAt ?? ""} onChange={e => updateVariant(v.id, { lowStockAt: e.target.value ? Number(e.target.value) : undefined })} placeholder={`Inherit ${p.lowStockAt ?? 5}`} className={adminInput} /></label>}
                  {canViewFinance && <label className="block text-[11px]"><span className="mb-1 block font-semibold text-stone-600">Cost per {isPack ? "pack" : "item"} · optional</span><input aria-label={`Variant ${index + 1} cost`} type="number" min={0} step={1} value={v.cost ?? ""} onChange={e => updateVariant(v.id, { cost: e.target.value ? Number(e.target.value) : undefined })} placeholder="Inherit unit cost" className={adminInput} /></label>}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2.5 text-[11px]" aria-live="polite">
                  <span className="font-semibold text-stone-700">{v.enabled === false ? "Hidden from customers" : <>{variantStock(p, v).toLocaleString()} {isPack ? "packs" : "items"} available{isPack && <span className="font-normal text-stone-500"> · consumes {v.unitsPerPack} {v.unitsPerPack === 1 ? "piece" : "pieces"} each</span>}</>}</span>
                  <span className="flex items-baseline gap-2 font-bold text-stone-900">{fmt(v.price)}{savings.amount > 0 && <><span className="font-normal text-stone-400 line-through">{fmt(variantComparison(p, v)!)}</span><span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700">Save {fmt(savings.amount)} · {savings.percent}%</span></>}</span>
                </div>
              </div>;
            })}
          </div>
          <p className="flex items-start gap-2 rounded-xl bg-stone-100 p-3 text-[11px] leading-relaxed text-stone-600"><Icon name="info" className="mt-0.5 h-3.5 w-3.5" />{isPack ? "Pack capacities are alternatives, not extra stock. Selling a 10-piece pack subtracts 10 pieces, and all pack capacities recalculate. Quantity 2 means two packs." : separate ? "Selling a 10 W module only reduces the 10 W stock. Other variants are unchanged. Disable a variant to hide it without losing its identity." : "All variants share the same pool. Selling any variant subtracts one item per quantity, regardless of its price."}</p>
        </>}
      </div>
    </section>
  );
}
