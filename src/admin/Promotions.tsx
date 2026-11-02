import { Select } from "../ui/Select";
import { courierMode } from "./courier";
import { useState } from "react";
import { useStore } from "../store";
import { fmt, type CouponRule } from "../data";
import { Icon } from "../icons";
import { Confirm, Empty, Field, IconBtn, Overlay, PageHeading, SwitchToggle } from "./ui";

export function couponState(coupon: CouponRule) {
  if (!coupon.active) return "Paused";
  if (coupon.expiresAt && coupon.expiresAt <= Date.now()) return "Expired";
  if (coupon.maxUses && coupon.used >= coupon.maxUses) return "Exhausted";
  if (coupon.startsAt && coupon.startsAt > Date.now()) return "Scheduled";
  return "Active";
}
const dateLabel = (value?: number) => value ? new Date(value).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric" }) : "No end date";

export function CouponsSection() {
  const { can, couponRules, upsertCouponRule, deleteCouponRule, notify } = useStore();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("All discounts");
  const [editing, setEditing] = useState<{ rule: CouponRule; isNew: boolean } | null>(null);
  const [deleting, setDeleting] = useState<CouponRule | null>(null);
  if (!can("marketing.write")) return null;
  const filtered = couponRules.filter(c => `${c.code} ${c.note ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (view === "All discounts" || couponState(c) === view));
  const openNew = () => setEditing({ rule: { code: "", type: "percent", value: 10, minSubtotal: 0, active: true, used: 0, note: "" }, isNew: true });
  const copy = async (code: string) => { try { await navigator.clipboard.writeText(code); notify("Coupon code copied"); } catch { notify("Clipboard unavailable"); } };
  return <div>
    <PageHeading title="Coupons" description="Create clear offers. Keep limits and usage in view." count={couponRules.length}><button className="admin-button admin-button-primary" onClick={openNew}><Icon name="plus" className="h-4 w-4" />Create coupon</button></PageHeading>
    <section className="admin-surface">
      <div className="admin-tabs" role="tablist" aria-label="Coupon views">{["All discounts", "Active", "Scheduled", "Paused", "Expired"].map(label => <button key={label} role="tab" aria-selected={view === label} onClick={() => setView(label)}>{label}<span>{label === "All discounts" ? couponRules.length : couponRules.filter(c => couponState(c) === label).length}</span></button>)}</div>
      <div className="admin-table-toolbar"><div className="admin-search-field"><Icon name="search" className="h-4 w-4" /><input aria-label="Search coupons" placeholder="Search by code or description..." value={query} onChange={e => setQuery(e.target.value)} /></div><span className="text-xs text-stone-500">{filtered.length} coupons</span></div>
      <div className="admin-table-scroll"><table className="admin-data-table admin-coupon-table"><thead><tr><th>Coupon</th><th>Discount</th><th>Status</th><th>Usage</th><th>End date</th><th /></tr></thead><tbody>{filtered.map(coupon => {
        const state = couponState(coupon);
        const usage = coupon.maxUses ? Math.min(100, coupon.used / coupon.maxUses * 100) : 0;
        return <tr key={coupon.code}><td><div className="flex items-center gap-3"><span className="admin-coupon-symbol"><Icon name="tag" className="h-[18px] w-[18px]" /></span><div><button className="admin-cell-title" onClick={() => setEditing({ rule: coupon, isNew: false })}>{coupon.code}</button><span className="admin-cell-sub max-w-64 truncate">{coupon.note || "Order discount"}</span></div></div></td><td><strong className="font-medium">{coupon.type === "percent" ? `${coupon.value}% off` : `${fmt(coupon.value)} off`}</strong><span className="admin-cell-sub">{coupon.minSubtotal ? `Min. ${fmt(coupon.minSubtotal)}` : "No minimum spend"}</span></td><td><span className={`admin-status status-${state === "Active" ? "green" : state === "Scheduled" ? "blue" : "gray"}`}><i />{state}</span></td><td><div className="admin-coupon-usage"><span>{coupon.used} <span className="text-stone-400">/ {coupon.maxUses ?? "Unlimited"}</span></span>{coupon.maxUses && <div><span style={{ width: `${usage}%` }} /></div>}</div></td><td className="text-xs text-stone-500">{dateLabel(coupon.expiresAt)}</td><td><div className="flex items-center justify-end gap-2"><IconBtn icon="copy" label={`Copy ${coupon.code}`} onClick={() => copy(coupon.code)} /><IconBtn icon="edit" label={`Edit ${coupon.code}`} onClick={() => setEditing({ rule: coupon, isNew: false })} /><SwitchToggle checked={coupon.active} label={`Enable ${coupon.code}`} onChange={active => upsertCouponRule({ ...coupon, active })} /><IconBtn icon="trash" label={`Delete ${coupon.code}`} tone="danger" onClick={() => setDeleting(coupon)} /></div></td></tr>;
      })}</tbody></table></div>
      <div className="admin-mobile-coupon-list">{filtered.map(coupon => {
        const state = couponState(coupon);
        return <div key={coupon.code} className="admin-mobile-coupon"><div className="flex items-center gap-3"><span className="admin-coupon-symbol"><Icon name="tag" className="h-4 w-4" /></span><button className="min-w-0 flex-1 text-left" onClick={() => setEditing({ rule: coupon, isNew: false })}><strong>{coupon.code}</strong><span className="admin-cell-sub truncate">{coupon.note || "Order discount"}</span></button><IconBtn icon="edit" label={`Edit ${coupon.code}`} onClick={() => setEditing({ rule: coupon, isNew: false })} /></div><div className="mt-4 flex items-center justify-between"><span className="text-sm font-medium">{coupon.type === "percent" ? `${coupon.value}% off` : `${fmt(coupon.value)} off`}</span><span className={`admin-status status-${state === "Active" ? "green" : state === "Scheduled" ? "blue" : "gray"}`}><i />{state}</span></div><div className="mt-2 flex items-center justify-between text-[11px] text-stone-500"><span>{coupon.minSubtotal ? `Min. ${fmt(coupon.minSubtotal)}` : "No minimum spend"}</span><span>{coupon.used} / {coupon.maxUses ?? "Unlimited"} uses</span></div><div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3"><small className="text-stone-500">{dateLabel(coupon.expiresAt)}</small><div className="flex items-center gap-3"><IconBtn icon="copy" label={`Copy ${coupon.code}`} onClick={() => copy(coupon.code)} /><SwitchToggle checked={coupon.active} label={`Enable ${coupon.code}`} onChange={active => upsertCouponRule({ ...coupon, active })} /><IconBtn icon="trash" tone="danger" label={`Delete ${coupon.code}`} onClick={() => setDeleting(coupon)} /></div></div></div>;
      })}</div>
      {!filtered.length && <Empty title="No coupons in this view"><p>Choose another view or create your first offer.</p><button className="admin-button mt-4" onClick={openNew}>Create coupon</button></Empty>}
      <div className="admin-table-footer"><span>{couponRules.reduce((s, c) => s + c.used, 0).toLocaleString()} total redemptions</span><span>All discounts apply to the order subtotal.</span></div>
    </section>
    {editing && <CouponEditor initial={editing.rule} isNew={editing.isNew} onClose={() => setEditing(null)} onSave={rule => { if (upsertCouponRule(rule)) { setEditing(null); setView("All discounts"); setQuery(""); } }} />}
    {deleting && <Confirm title={`Delete ${deleting.code}?`} description="The coupon will stop working at checkout. Past order totals will not change." confirmLabel="Delete coupon" danger onClose={() => setDeleting(null)} onConfirm={() => { deleteCouponRule(deleting.code); setDeleting(null); }} />}
  </div>;
}

function dateInput(value?: number) { return value ? new Date(value + 6 * 3600000).toISOString().slice(0, 16) : ""; }
function parseDate(value: string) { return value ? new Date(`${value}:00+06:00`).getTime() : undefined; }

function CouponEditor({ initial, isNew, onClose, onSave }: { initial: CouponRule; isNew: boolean; onClose: () => void; onSave: (rule: CouponRule) => void }) {
  const { couponRules } = useStore();
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [previewSubtotal, setPreviewSubtotal] = useState(1500);
  const [discard, setDiscard] = useState(false);
  const dirty = JSON.stringify(initial) !== JSON.stringify(draft);
  const requestClose = () => { if (dirty) setDiscard(true); else onClose(); };
  const set = (patch: Partial<CouponRule>) => { setDraft(d => ({ ...d, ...patch })); setError(""); };
  const save = () => {
    if (!/^[A-Z0-9_-]{3,32}$/.test(draft.code)) { setError("Use 3-32 letters, numbers, hyphens, or underscores."); return; }
    if (isNew && couponRules.some(c => c.code === draft.code)) { setError("That coupon code already exists."); return; }
    if (!Number.isFinite(draft.value) || draft.value <= 0 || (draft.type === "percent" && draft.value > 100)) { setError("Enter a valid discount (percentage must be 1-100)."); return; }
    if (draft.maxUses && draft.maxUses < draft.used) { setError("Usage limit cannot be lower than existing redemptions."); return; }
    if (draft.minSubtotal < 0) { setError("Minimum spend cannot be negative."); return; }
    if (draft.startsAt && draft.expiresAt && draft.expiresAt <= draft.startsAt) { setError("End date must be after the start date."); return; }
    onSave(draft);
  };
  const previewDiscount = previewSubtotal >= draft.minSubtotal ? Math.min(previewSubtotal, draft.type === "percent" ? Math.round(previewSubtotal * draft.value / 100) : draft.value) : 0;
  return <Overlay title={isNew ? "Create coupon" : draft.code} subtitle={isNew ? "A discount customers can apply at checkout." : "Edit discount and redemption rules."} onClose={requestClose} footer={<><button className="admin-button" onClick={requestClose}>Cancel</button><button className="admin-button admin-button-primary" onClick={save}>{isNew ? "Create coupon" : "Save changes"}</button></>}>
    {discard && <div className="admin-discard-notice"><p>Discard this draft?</p><button className="admin-button" onClick={() => setDiscard(false)}>Keep editing</button><button className="admin-button admin-button-danger" onClick={onClose}>Discard</button></div>}
    {error && <p role="alert" className="admin-form-error">{error}</p>}
    <div className="admin-drawer-sections">
      <section><h3 className="admin-form-section-label">Discount details</h3><Field label="Coupon code" hint="Use a short code that is easy to share."><input className="admin-input font-mono" disabled={!isNew} value={draft.code} placeholder="e.g. MAKER10" onChange={e => set({ code: e.target.value.toUpperCase().replace(/\s/g, "") })} /></Field><div className="admin-segmented my-4" role="group" aria-label="Discount type"><button className={draft.type === "percent" ? "active" : ""} onClick={() => set({ type: "percent" })}>Percentage</button><button className={draft.type === "flat" ? "active" : ""} onClick={() => set({ type: "flat" })}>Fixed amount</button></div><div className="grid grid-cols-2 gap-3"><Field label={draft.type === "percent" ? "Discount (%)" : "Discount (BDT)"}><input type="number" className="admin-input" min={1} max={draft.type === "percent" ? 100 : undefined} value={draft.value} onChange={e => set({ value: Number(e.target.value) })} /></Field><Field label="Minimum spend (BDT)"><input type="number" className="admin-input" min={0} value={draft.minSubtotal} onChange={e => set({ minSubtotal: Number(e.target.value) })} /></Field></div><div className="mt-4"><Field label="Internal description"><input className="admin-input" placeholder="What is this offer for?" value={draft.note ?? ""} onChange={e => set({ note: e.target.value })} /></Field></div></section>
      <section><h3 className="admin-form-section-label">Availability & limits</h3><div className="flex items-center justify-between gap-3 mb-4"><span className="text-sm">Enable coupon</span><SwitchToggle checked={draft.active} label="Enable coupon" onChange={active => set({ active })} /></div><Field label="Total redemption limit" hint="Leave blank for unlimited redemptions."><input type="number" min={1} className="admin-input" value={draft.maxUses ?? ""} onChange={e => set({ maxUses: e.target.value ? Number(e.target.value) : undefined })} placeholder="Unlimited" /></Field><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><Field label="Start date (BDT)"><input type="datetime-local" className="admin-input" value={dateInput(draft.startsAt)} onChange={e => set({ startsAt: parseDate(e.target.value) })} /></Field><Field label="End date (BDT)"><input type="datetime-local" className="admin-input" value={dateInput(draft.expiresAt)} onChange={e => set({ expiresAt: parseDate(e.target.value) })} /></Field></div></section>
      <section className="admin-discount-preview"><div className="admin-section-title"><h3>Checkout preview</h3><Icon name="receipt" className="h-4 w-4 text-stone-400" /></div><Field label="Example subtotal (BDT)"><input className="admin-input" type="number" min={0} value={previewSubtotal} onChange={e => setPreviewSubtotal(Math.max(0, Number(e.target.value)))} /></Field><dl className="admin-order-totals mt-3"><div><dt>Subtotal</dt><dd>{fmt(previewSubtotal)}</dd></div><div className="text-emerald-700"><dt>{draft.code || "Your coupon"}</dt><dd>-{fmt(previewDiscount)}</dd></div><div className="total"><dt>After discount</dt><dd>{fmt(previewSubtotal - previewDiscount)}</dd></div></dl>{previewSubtotal < draft.minSubtotal && <p className="text-xs text-amber-700 mt-2">Minimum spend not reached.</p>}</section>
    </div>
  </Overlay>;
}

export function CheckoutSettings() {
  const { settings, updateSettings, can } = useStore();
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  if (!can("settings.write")) return null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const save = () => {
    if ([draft.dhakaDeliveryFee, draft.outsideDeliveryFee, draft.freeDhakaThreshold, draft.autoPrepayAboveBdt].some(n => !Number.isFinite(n) || n < 0)) { setError("Fees and thresholds must be zero or greater."); return; }
    if (!draft.enableBkash && !draft.enableNagad) { setError("Keep at least one advance payment method enabled for advance-only products."); return; }
    if (!/^8801[3-9]\d{8}$/.test(draft.whatsappNumber)) { setError("Use an international Bangladesh number, e.g. 8801712345678."); return; }
    if (updateSettings(draft, "Updated checkout settings")) setError("");
  };
  return <div><PageHeading title="Checkout" description="Delivery rates, payment methods, and order limits."><button className="admin-button admin-button-primary" disabled={!dirty} onClick={save}>Save changes</button></PageHeading>{error && <p role="alert" className="admin-form-error mb-5">{error}</p>}
    <div className="admin-settings-layout"><div><h3>Delivery</h3><p>Rates applied to orders at checkout.</p></div><section className="admin-surface p-6"><div className="grid gap-5 sm:grid-cols-2">{([{ key: "dhakaDeliveryFee", label: "Inside Dhaka (BDT)" }, { key: "outsideDeliveryFee", label: "Outside Dhaka (BDT)" }, { key: "freeDhakaThreshold", label: "Free Dhaka delivery above (BDT)" }, { key: "autoPrepayAboveBdt", label: "Require prepayment above (BDT)" }] as const).map(field => <Field key={field.key} label={field.label}><input type="number" className="admin-input" min={0} value={draft[field.key]} onChange={e => setDraft(d => ({ ...d, [field.key]: Number(e.target.value) }))} /></Field>)}</div><p className="mt-4 text-xs text-stone-500">Set the prepayment threshold to 0 to disable the high-value order rule.</p></section></div>
    <div className="admin-settings-layout"><div><h3>Payment methods</h3><p>Choose the methods offered to customers.</p></div><section className="admin-surface admin-settings-options">{([{ key: "enableCod", label: "Cash on delivery", hint: "Available only for eligible products.", icon: "cash" }, { key: "enableBkash", label: "bKash", hint: "Advance payment", icon: "phone" }, { key: "enableNagad", label: "Nagad", hint: "Advance payment", icon: "phone" }, { key: "enableAdvanceShipping", label: "Delivery charge in advance", hint: "Remainder paid on delivery.", icon: "truck" }] as const).map(method => <div key={method.key}><span className="admin-method-icon"><Icon name={method.icon} className="h-[18px] w-[18px]" /></span><div className="min-w-0 flex-1"><h4>{method.label}</h4><p>{method.hint}</p></div><SwitchToggle checked={draft[method.key]} label={method.label} onChange={value => setDraft(d => ({ ...d, [method.key]: value }))} /></div>)}</section></div>
    <div className="admin-settings-layout"><div><h3>Support contact</h3><p>Used for storefront WhatsApp links.</p></div><section className="admin-surface p-6"><Field label="WhatsApp number" hint="International format without a plus sign."><input className="admin-input max-w-sm" inputMode="tel" value={draft.whatsappNumber} onChange={e => setDraft(d => ({ ...d, whatsappNumber: e.target.value }))} /></Field></section></div>
    <div className="admin-settings-layout"><div><h3>Courier & pickup</h3><p>Defaults for new batches. Courier credentials stay on the backend.</p></div><section className="admin-surface p-6"><div className="grid gap-5 sm:grid-cols-2"><Field label="Default courier"><Select value={draft.defaultCourier} onChange={(e) => setDraft((d) => ({ ...d, defaultCourier: e.target.value as typeof d.defaultCourier }))}><option value="Steadfast" data-hint="Bulk booking and pickup">Steadfast</option><option value="Pathao" data-hint="Merchant API">Pathao</option><option value="RedX" data-hint="Merchant API">RedX</option></Select></Field><Field label="Connection"><div className="flex h-[36px] items-center"><span className={`ds-pill ${courierMode() === "backend" ? "tone-green" : "tone-amber"}`}>{courierMode() === "backend" ? "Connected through backend" : "Demo · no live couriers"}</span></div></Field><Field label="Pickup contact"><input className="admin-input" value={draft.pickupContact} onChange={(e) => setDraft((d) => ({ ...d, pickupContact: e.target.value }))} /></Field><Field label="Pickup phone"><input className="admin-input" inputMode="tel" value={draft.pickupPhone} onChange={(e) => setDraft((d) => ({ ...d, pickupPhone: e.target.value }))} /></Field><div className="sm:col-span-2"><Field label="Pickup address"><textarea className="admin-input" rows={2} value={draft.pickupAddress} onChange={(e) => setDraft((d) => ({ ...d, pickupAddress: e.target.value }))} /></Field></div></div></section></div>
    {dirty && <div className="admin-save-bar"><span>Unsaved changes</span><div><button className="admin-button" onClick={() => { setDraft(settings); setError(""); }}>Discard</button><button className="admin-button admin-button-primary" onClick={save}>Save changes</button></div></div>}
  </div>;
}