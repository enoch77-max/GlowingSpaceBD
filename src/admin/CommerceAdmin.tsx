import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "../router";
import { useStore } from "../store";
import { fmt } from "../data";
import type { ContentState, Brand, AttributeDef, Tag, BlogPost, Page, Banner, Testimonial, ContactMessage, Subscriber, ReturnRequest, Review, PaymentMethod, Transaction, DeliveryProvider, DeliveryZone, Discount, FlashSale, HomeSection, HomeSectionKey } from "../commerce";
import { Icon } from "../icons";
import { Confirm, Empty, Field, IconBtn, PageHeading, SwitchToggle, adminInput } from "./ui";

/* ---------- generic helpers ---------- */

function Table({ cols, children }: { cols: string[]; children: React.ReactNode }) {
  return <div className="admin-table-scroll"><table className="admin-data-table"><thead><tr>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

function RowActions({ onEdit, onDelete, editLabel = "Edit", deleteLabel = "Delete" }: { onEdit?: () => void; onDelete?: () => void; editLabel?: string; deleteLabel?: string }) {
  return <td className="text-right whitespace-nowrap">{onEdit && <IconBtn icon="edit" label={editLabel} onClick={onEdit} />}{onDelete && <IconBtn icon="trash" tone="danger" label={deleteLabel} onClick={onDelete} />}</td>;
}

function useEditor<T extends { id: string }>(list: T[], setList: (next: T[]) => void) {
  const [editing, setEditing] = useState<T | null>(null);
  const [isNew, setIsNew] = useState(false);
  const save = (item: T) => {
    setList(editing && !isNew ? list.map(x => x.id === item.id ? item : x) : [item, ...list]);
    setEditing(null);
  };
  return { editing, isNew, open: (item?: T) => { setEditing(item ?? null); setIsNew(!item); }, close: () => setEditing(null), save };
}

function EditorModal({ title, editing, isNew, onClose, onSave, children }: { title: string; editing: unknown; isNew: boolean; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  if (!editing && !isNew) return null;
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-stone-950/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5"><h3 className="text-base font-extrabold">{title}</h3><IconBtn icon="close" label="Close" onClick={onClose} /></div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">{children}</div>
      <div className="flex justify-end gap-2 border-t border-stone-100 px-5 py-3"><button className="admin-button" onClick={onClose}>Cancel</button><button className="admin-button admin-button-primary" onClick={onSave}>{isNew ? "Create" : "Save"}</button></div>
    </div>
  </div>;
}

type DraftValue = { drafts: Partial<ContentState>; stage: <K extends keyof ContentState>(key: K, next: ContentState[K] | ((previous: ContentState[K]) => ContentState[K])) => void };
const ContentDraftContext = createContext<DraftValue | null>(null);

const SECTION_TITLES: Partial<Record<keyof ContentState, string>> = {
  brands: "Brands", attributes: "Attributes", tags: "Tags", blogCategories: "Blog categories", blogPosts: "Blog posts",
  pages: "Pages", banners: "Banners", testimonials: "Testimonials", messages: "Messages", subscribers: "Newsletter",
  returns: "Returns", reviews: "Reviews", paymentMethods: "Payment methods", transactions: "Transactions",
  deliveryProviders: "Delivery providers", deliveryZones: "Delivery zones", discounts: "Discounts", flashSale: "Flash sale", homeSections: "Homepage sections",
};

export function ContentDraftProvider({ children }: { children: ReactNode }) {
  const { content, saveContent, notify } = useStore();
  const [drafts, setDrafts] = useState<Partial<ContentState>>({});
  const [saving, setSaving] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const dirtyKeys = Object.keys(drafts) as (keyof ContentState)[];

  const stage = useCallback(<K extends keyof ContentState>(key: K, next: ContentState[K] | ((previous: ContentState[K]) => ContentState[K])) => {
    setDrafts(previous => {
      const base = (previous[key] ?? content[key]) as ContentState[K];
      const value = typeof next === "function" ? (next as (value: ContentState[K]) => ContentState[K])(base) : next;
      const updated = { ...previous };
      if (JSON.stringify(value) === JSON.stringify(content[key])) delete updated[key];
      else updated[key] = value as never;
      return updated;
    });
    setSaveError("");
  }, [content]);

  const save = async () => {
    if (saving || dirtyKeys.length === 0) return;
    const snapshot = { ...drafts };
    setSaving(true); setSaveError("");
    try {
      const success = await saveContent(snapshot, `Saved ${dirtyKeys.map(key => SECTION_TITLES[key] ?? key).join(", ")}`);
      if (!success) { setSaveError("Save failed. Your edits are still here; retry after checking the error notification."); return; }
      setDrafts(current => {
        const next = { ...current };
        for (const key of Object.keys(snapshot) as (keyof ContentState)[]) {
          if (JSON.stringify(next[key]) === JSON.stringify(snapshot[key])) delete next[key];
        }
        return next;
      });
      notify("All changes saved to the database");
    } catch {
      setSaveError("Save failed. Your edits are still here; retry after checking your connection.");
    } finally { setSaving(false); }
  };

  const discard = () => { setDrafts({}); setSaveError(""); setDiscardOpen(false); };
  useEffect(() => {
    if (!dirtyKeys.length) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyKeys.length]);
  useEffect(() => {
    if (!dirtyKeys.length) return;
    const onKey = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirtyKeys.length, drafts, saving]);

  return <ContentDraftContext.Provider value={{ drafts, stage }}>
    {children}
    {dirtyKeys.length > 0 && <div className="fixed inset-x-3 bottom-3 z-[55] mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-stone-900 px-4 py-3 text-white shadow-2xl shadow-stone-900/20">
        <div className="min-w-0"><p className="text-xs font-bold">{saving ? "Saving changes…" : `${dirtyKeys.length} section${dirtyKeys.length === 1 ? "" : "s"} with unsaved changes`}</p><p className="mt-0.5 text-[10px] text-stone-400">{dirtyKeys.map(key => SECTION_TITLES[key] ?? key).join(" · ")} · Ctrl/⌘S to save</p></div>
        <div className="flex shrink-0 items-center gap-2"><button type="button" disabled={saving} onClick={() => setDiscardOpen(true)} className="rounded-full px-3 py-2 text-xs font-bold text-stone-300 hover:bg-white/10 disabled:opacity-40">Discard</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-full bg-amber-400 px-4 py-2 text-xs font-extrabold text-stone-900 hover:bg-amber-300 disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div>
      </div>
      {saveError && <p role="alert" className="mt-1 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 shadow">{saveError}</p>}
    </div>}
    {discardOpen && <div className="fixed inset-0 z-[80] grid place-items-center bg-stone-950/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setDiscardOpen(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="content-discard-title" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"><h2 id="content-discard-title" className="text-base font-extrabold">Discard unsaved changes?</h2><p className="mt-1.5 text-sm leading-relaxed text-stone-600">Your edits to {dirtyKeys.map(key => SECTION_TITLES[key] ?? key).join(", ")} have not been saved.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setDiscardOpen(false)} className="admin-button">Keep editing</button><button type="button" onClick={discard} className="admin-button admin-button-danger">Discard changes</button></div></section>
    </div>}
  </ContentDraftContext.Provider>;
}

function useContent<K extends keyof ContentState>(key: K): [ContentState[K], (next: ContentState[K] | ((previous: ContentState[K]) => ContentState[K])) => void] {
  const { content } = useStore();
  const context = useContext(ContentDraftContext);
  if (!context) throw new Error("Content draft editors must be inside ContentDraftProvider");
  const value = (context.drafts[key] ?? content[key]) as ContentState[K];
  const setter = useCallback((next: ContentState[K] | ((previous: ContentState[K]) => ContentState[K])) => context.stage(key, next), [context.stage, key]);
  return [value, setter];
}

/* ---------- Workspace: returns / customers / reviews / messages ---------- */

export function ReturnsSection() {
  const [returns, setReturns] = useContent("returns");
  const { can } = useStore();
  const canWrite = can("returns.manage");
  return <div>
    <PageHeading title="Returns" description="Approve, reject or complete customer return requests." count={returns.length} />
    <section className="admin-surface"><Table cols={["Order", "Customer", "Reason", "Requested", "Status", "Admin note", ""]}>
      {returns.map(r => (
        <tr key={r.id}>
          <td><Link to={`/admin/orders?q=${r.orderId}`} className="admin-order-id font-mono">{r.orderId}</Link></td>
          <td>{r.customer}</td><td className="max-w-[240px] truncate" title={r.reason}>{r.reason}</td>
          <td className="text-xs text-stone-500">{new Date(r.createdAt).toLocaleDateString("en-GB")}</td>
          <td><span className={`admin-status ${r.status === "pending" ? "status-amber" : r.status === "approved" ? "status-blue" : r.status === "completed" ? "status-green" : "status-gray"}`}>{r.status}</span></td>
          <td>{canWrite ? <input className={`${adminInput} !py-1.5 !text-xs`} value={r.adminNote ?? ""} onChange={e => setReturns(returns.map(x => x.id === r.id ? { ...x, adminNote: e.target.value } : x))} placeholder="Note…" /> : <span className="text-xs text-stone-500">{r.adminNote ?? "—"}</span>}</td>
          <td className="text-right whitespace-nowrap">
            {canWrite && <select className="admin-select !py-1.5 !text-xs" value={r.status} onChange={e => { const status = e.target.value as ReturnRequest["status"]; setReturns(returns.map(x => x.id === r.id ? { ...x, status } : x)); }}>
              <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="completed">Completed</option>
            </select>}
          </td>
        </tr>
      ))}
      {!returns.length && <tr><td colSpan={7}><Empty title="No return requests" /></td></tr>}
    </Table></section>
  </div>;
}

export function CustomersSection() {
  const { orders, user } = useStore();
  const groups = ["Newsletter", "VIP", "Wholesale"];
  const customers = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; orders: number; spent: number; joined: number }>();
    for (const o of orders) {
      const c = map.get(o.phone) ?? { phone: o.phone, name: o.name, orders: 0, spent: 0, joined: o.created };
      c.orders++; c.spent += o.total; c.joined = Math.min(c.joined, o.created);
      map.set(o.phone, c);
    }
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  }, [orders]);
  const [q, setQ] = useState("");
  const filtered = customers.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  return <div>
    <PageHeading title="Customers" description="Everyone who has placed an order, ranked by spend." count={customers.length}>
      <div className="admin-search-field"><Icon name="search" className="h-4 w-4" /><input aria-label="Search customers" placeholder="Name or phone…" value={q} onChange={e => setQ(e.target.value)} /></div>
    </PageHeading>
    <section className="admin-surface"><Table cols={["Customer", "Phone", "Orders", "Total spent", "First order", "Status"]}>
      {filtered.map(c => <tr key={c.phone}>
        <td><strong>{c.name}</strong>{user === c.phone && <span className="ml-2 admin-status status-blue">you</span>}</td>
        <td className="font-mono text-xs">{c.phone}</td><td className="tnum">{c.orders}</td><td className="font-bold tnum">{fmt(c.spent)}</td>
        <td className="text-xs text-stone-500">{new Date(c.joined).toLocaleDateString("en-GB")}</td>
        <td><span className="admin-status status-green">Active</span></td>
      </tr>)}
      {!filtered.length && <tr><td colSpan={6}><Empty title="No customers match" /></td></tr>}
    </Table></section>
    <section className="admin-surface mt-5"><PageHeading title="Customer groups" description="Segments used for coupons and pricing." /><div className="flex flex-wrap gap-2 px-5 pb-5">{groups.map(g => <span key={g} className="admin-status status-blue">{g}</span>)}</div></section>
  </div>;
}

export function ReviewsSection() {
  const [reviews, setReviews] = useContent("reviews");
  const { catalogProducts, can, notify } = useStore();
  const canMod = can("reviews.moderate");
  const [filter, setFilter] = useState("pending");
  const list = reviews.filter(r => filter === "all" || r.status === filter);
  const setStatus = (id: string, status: Review["status"]) => { setReviews(reviews.map(r => r.id === id ? { ...r, status } : r)); };
  return <div>
    <PageHeading title="Reviews" description="Moderate customer reviews before they appear on product pages." count={reviews.length}>
      <select className="admin-select" value={filter} onChange={e => setFilter(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></select>
    </PageHeading>
    <section className="admin-surface"><Table cols={["Product", "Review", "Rating", "Customer", "Status", "Moderate"]}>
      {list.map(r => <tr key={r.id}>
        <td><Link to={`/product/${r.productSlug}`} className="admin-text-button">{catalogProducts.find(p => p.slug === r.productSlug)?.name ?? r.productSlug}</Link></td>
        <td className="max-w-[280px]"><span className="line-clamp-2 text-xs">{r.body}</span></td>
        <td><span className="inline-flex items-center gap-1 text-xs font-bold"><Icon name="star" className="h-3.5 w-3.5 text-amber-500" />{r.rating}</span></td>
        <td className="text-xs">{r.name}</td>
        <td><span className={`admin-status ${r.status === "approved" ? "status-green" : r.status === "pending" ? "status-amber" : "status-gray"}`}>{r.status}</span></td>
        <td className="text-right whitespace-nowrap">{canMod && <select className="admin-select !py-1.5 !text-xs" value={r.status} onChange={e => setStatus(r.id, e.target.value as Review["status"])}><option value="pending">Pending</option><option value="approved">Approve</option><option value="rejected">Reject</option></select>}</td>
      </tr>)}
      {!list.length && <tr><td colSpan={6}><Empty title="Nothing here" /></td></tr>}
    </Table></section>
  </div>;
}

export function MessagesSection() {
  const [messages, setMessages] = useContent("messages");
  const { can, notify } = useStore();
  const canWrite = can("messages.read");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const list = messages.filter(m => (status === "all" || m.status === status) && `${m.name} ${m.email} ${m.subject}`.toLowerCase().includes(q.toLowerCase()));
  const mark = async (id: string, next: ContactMessage["status"]) => { await setMessages(messages.map(m => m.id === id ? { ...m, status: next } : m)); notify("Message updated"); };
  return <div>
    <PageHeading title="Contact messages" description="Messages sent from the storefront contact form." count={messages.filter(m => m.status === "unread").length}>
      <div className="admin-search-field"><Icon name="search" className="h-4 w-4" /><input aria-label="Search messages" placeholder="Name, email, subject…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <select className="admin-select" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All</option><option value="unread">Unread</option><option value="read">Read</option><option value="archived">Archived</option></select>
    </PageHeading>
    <section className="admin-surface divide-y divide-stone-100">
      {list.map(m => (
        <div key={m.id} className={`px-5 py-4 ${m.status === "unread" ? "bg-amber-50/50" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><strong>{m.name}</strong> <span className="text-xs text-stone-500">{m.email}{m.phone ? ` · ${m.phone}` : ""}</span></div>
            <div className="flex items-center gap-2 text-xs text-stone-500">{new Date(m.createdAt).toLocaleString("en-GB")}
              {canWrite && <select className="admin-select !py-1 !text-[11px]" value={m.status} onChange={e => mark(m.id, e.target.value as ContactMessage["status"])}><option value="unread">Unread</option><option value="read">Read</option><option value="archived">Archived</option></select>}
            </div>
          </div>
          <p className="mt-1 text-sm font-bold">{m.subject}</p><p className="mt-0.5 text-sm text-stone-600">{m.message}</p>
        </div>
      ))}
      {!list.length && <div className="p-8"><Empty title="No messages" /></div>}
    </section>
  </div>;
}

/* ---------- Catalog extras: categories / brands / attributes / tags ---------- */

export function CategoriesSection() {
  const { catalogCategories, visibleCategories, upsertCategory, deleteCategory, can, notify, catalogProducts } = useStore();
  const [editing, setEditing] = useState<{ slug?: string; name: string; blurb: string; parent: string; icon: string; visible: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const canWrite = can("catalog.write");
  const parents = catalogCategories.filter(c => !c.parent);
  const save = () => {
    if (!editing || editing.name.trim().length < 2) return;
    const slug = editing.slug ?? editing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    upsertCategory({ slug, name: editing.name.trim(), blurb: editing.blurb.trim(), img: "/img/kit.jpg", icon: (editing.icon || "box") as never, visible: editing.visible, parent: editing.parent || undefined });
    notify(`Saved ${editing.name}`); setEditing(null);
  };
  return <div>
    <PageHeading title="Categories" description="Two-level category tree used by the storefront mega menu and filters." count={catalogCategories.length}>
      {canWrite && <button className="admin-button admin-button-primary" onClick={() => setEditing({ name: "", blurb: "", parent: "", icon: "box", visible: true })}><Icon name="plus" className="h-4 w-4" />Add category</button>}
    </PageHeading>
    <section className="admin-surface"><Table cols={["Category", "Parent", "Products", "Visible", ""]}>
      {catalogCategories.map(c => <tr key={c.slug}>
        <td><strong>{c.name}</strong> <span className="ml-2 font-mono text-[11px] text-stone-400">{c.slug}</span></td>
        <td className="text-xs text-stone-500">{c.parent ? catalogCategories.find(p => p.slug === c.parent)?.name ?? c.parent : "—"}</td>
        <td className="tnum">{catalogProducts.filter(p => p.category === c.slug).length}</td>
        <td>{c.visible === false ? <span className="admin-status status-gray">Hidden</span> : <span className="admin-status status-green">Visible</span>}</td>
        <RowActions onEdit={canWrite ? () => setEditing({ slug: c.slug, name: c.name, blurb: c.blurb, parent: c.parent ?? "", icon: c.icon ?? "box", visible: c.visible !== false }) : undefined} onDelete={canWrite ? () => setConfirmDelete(c.slug) : undefined} />
      </tr>)}
    </Table></section>
    {editing && <EditorModal title={editing.slug ? "Edit category" : "Add category"} editing={editing} isNew={!editing.slug} onClose={() => setEditing(null)} onSave={save}>
      <Field label="Name"><input className={adminInput} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} /></Field>
      <Field label="Parent"><select className={adminInput} value={editing.parent} onChange={e => setEditing({ ...editing, parent: e.target.value })}><option value="">— Top level —</option>{parents.filter(p => p.slug !== editing.slug).map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></Field>
      <Field label="Blurb"><input className={adminInput} value={editing.blurb} onChange={e => setEditing({ ...editing, blurb: e.target.value })} /></Field>
      <div className="flex items-center justify-between"><span className="text-xs font-bold">Visible in storefront</span><SwitchToggle checked={editing.visible} label="Visible" onChange={v => setEditing({ ...editing, visible: v })} /></div>
    </EditorModal>}
    {confirmDelete && <Confirm title="Delete category" description="Products in this category must be moved first." confirmLabel="Delete" danger onClose={() => setConfirmDelete(null)} onConfirm={() => { deleteCategory(confirmDelete); setConfirmDelete(null); }} />}
    <p className="mt-3 text-xs text-stone-500">{visibleCategories.length} categories visible on the storefront.</p>
  </div>;
}

export function BrandsSection() {
  const [brands, setBrands] = useContent("brands");
  const { catalogProducts, can, notify } = useStore();
  const editor = useEditor<Brand>(brands, next => setBrands(next));
  const canWrite = can("catalog.write");
  const [draft, setDraft] = useState<Brand | null>(null);
  return <div>
    <PageHeading title="Brands" description="Brand strip on the homepage and brand filter in shop." count={brands.length}>
      {canWrite && <button className="admin-button admin-button-primary" onClick={() => { const d: Brand = { id: `b-${Date.now()}`, name: "", slug: "", active: true, order: brands.length + 1 }; setDraft(d); editor.open(d); }}><Icon name="plus" className="h-4 w-4" />Add brand</button>}
    </PageHeading>
    <section className="admin-surface"><Table cols={["Brand", "Slug", "Products", "Active", ""]}>
      {brands.map(b => <tr key={b.id}>
        <td><strong>{b.name}</strong></td><td className="font-mono text-xs">{b.slug}</td>
        <td className="tnum">{catalogProducts.filter(p => p.brand === b.slug).length}</td>
        <td>{b.active ? <span className="admin-status status-green">Active</span> : <span className="admin-status status-gray">Hidden</span>}</td>
        <RowActions onEdit={canWrite ? () => { setDraft(b); editor.open(b); } : undefined} onDelete={canWrite ? () => { if (window.confirm(`Delete ${b.name}?`)) setBrands(brands.filter(x => x.id !== b.id)); notify("Brand deleted"); } : undefined} />
      </tr>)}
    </Table></section>
    {draft && <EditorModal title={editor.isNew ? "Add brand" : "Edit brand"} editing={draft} isNew={editor.isNew} onClose={editor.close} onSave={() => { if (!draft.name.trim()) return; editor.save({ ...draft, slug: draft.slug || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") }); setDraft(null); }}>
      <Field label="Name"><input className={adminInput} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
      <Field label="Logo URL"><input className={adminInput} value={draft.logo ?? ""} onChange={e => setDraft({ ...draft, logo: e.target.value })} placeholder="/img/… or https://…" /></Field>
      <Field label="Blurb"><input className={adminInput} value={draft.blurb ?? ""} onChange={e => setDraft({ ...draft, blurb: e.target.value })} /></Field>
      <div className="flex items-center justify-between"><span className="text-xs font-bold">Active</span><SwitchToggle checked={draft.active} label="Active" onChange={v => setDraft({ ...draft, active: v })} /></div>
    </EditorModal>}
  </div>;
}

export function AttributesSection() {
  const [attributes, setAttributes] = useContent("attributes");
  const { can } = useStore();
  const canWrite = can("catalog.write");
  const [draft, setDraft] = useState<AttributeDef | null>(null);
  return <div>
    <PageHeading title="Attributes" description="Filterable product attributes shown in the shop sidebar (e.g. Storage, Color)." count={attributes.length}>
      {canWrite && <button className="admin-button admin-button-primary" onClick={() => setDraft({ id: `a-${Date.now()}`, name: "", slug: "", type: "select", values: [], filterable: true })}><Icon name="plus" className="h-4 w-4" />Add attribute</button>}
    </PageHeading>
    <section className="admin-surface"><Table cols={["Attribute", "Type", "Values", "Filterable", ""]}>
      {attributes.map(a => <tr key={a.id}>
        <td><strong>{a.name}</strong></td><td className="text-xs">{a.type}</td>
        <td className="text-xs text-stone-500">{a.values.join(", ") || "—"}</td>
        <td>{a.filterable ? <span className="admin-status status-green">Yes</span> : <span className="admin-status status-gray">No</span>}</td>
        <RowActions onEdit={canWrite ? () => setDraft(a) : undefined} onDelete={canWrite ? () => setAttributes(attributes.filter(x => x.id !== a.id)) : undefined} />
      </tr>)}
    </Table></section>
    {draft && <EditorModal title="Attribute" editing={draft} isNew={!attributes.some(a => a.id === draft.id)} onClose={() => setDraft(null)} onSave={() => { if (!draft.name.trim()) return; const id = attributes.some(a => a.id === draft.id) ? draft.id : `a-${Date.now()}`; setAttributes(attributes.some(a => a.id === draft.id) ? attributes.map(a => a.id === draft.id ? { ...draft, id, slug: draft.slug || draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") } : a) : [...attributes, { ...draft, id }]); setDraft(null); }}>
      <Field label="Name"><input className={adminInput} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
      <Field label="Type"><select className={adminInput} value={draft.type} onChange={e => setDraft({ ...draft, type: e.target.value as AttributeDef["type"] })}><option value="select">Select</option><option value="swatch">Swatch</option><option value="number">Number</option></select></Field>
      <Field label="Values (comma separated)"><input className={adminInput} value={draft.values.join(", ")} onChange={e => setDraft({ ...draft, values: e.target.value.split(",").map(v => v.trim()).filter(Boolean) })} /></Field>
      <div className="flex items-center justify-between"><span className="text-xs font-bold">Filterable in shop</span><SwitchToggle checked={draft.filterable} label="Filterable" onChange={v => setDraft({ ...draft, filterable: v })} /></div>
    </EditorModal>}
  </div>;
}

export function TagsSection() {
  const [tags, setTags] = useContent("tags");
  const { catalogProducts, can } = useStore();
  const canWrite = can("catalog.write");
  const [name, setName] = useState("");
  return <div>
    <PageHeading title="Tags" description="Search keywords attached to products." count={tags.length} />
    <section className="admin-surface p-5">
      <div className="flex flex-wrap gap-2">
        {tags.map(t => <span key={t.id} className="inline-flex items-center gap-2 rounded-full bg-stone-100 py-1.5 pl-3 pr-1.5 text-xs font-semibold">{t.name}<span className="text-stone-400">({catalogProducts.filter(p => p.tags?.includes(t.slug)).length})</span>{canWrite && <button aria-label={`Delete ${t.name}`} onClick={() => setTags(tags.filter(x => x.id !== t.id))} className="grid h-5 w-5 place-items-center rounded-full text-stone-400 hover:bg-stone-200"><Icon name="close" className="h-3 w-3" /></button>}</span>)}
      </div>
      {canWrite && <form className="mt-4 flex gap-2" onSubmit={e => { e.preventDefault(); if (!name.trim()) return; setTags([...tags, { id: `t-${Date.now()}`, name: name.trim(), slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") }]); setName(""); }}>
        <input className={adminInput} value={name} onChange={e => setName(e.target.value)} placeholder="New tag…" aria-label="New tag" />
        <button className="admin-button admin-button-primary" type="submit">Add</button>
      </form>}
    </section>
  </div>;
}

/* ---------- Marketing: discounts / banners / flash sale / newsletter / testimonials ---------- */

export function DiscountsSection() {
  const [discounts, setDiscounts] = useContent("discounts");
  const { catalogProducts, catalogCategories, can, notify } = useStore();
  const canWrite = can("marketing.write");
  const [form, setForm] = useState({ label: "", percent: 10, target: "category" as "category" | "products", categorySlug: "", productSlugs: [] as string[], endsAt: "" });
  const apply = async () => {
    if (!form.label.trim() || form.percent <= 0) return;
    setDiscounts([...discounts, { id: `d-${Date.now()}`, label: form.label.trim(), percent: form.percent, target: form.target, categorySlug: form.target === "category" ? form.categorySlug : undefined, productSlugs: form.target === "products" ? form.productSlugs : [], endsAt: form.endsAt ? new Date(form.endsAt).getTime() : undefined, active: true }]);
    setForm({ label: "", percent: 10, target: "category", categorySlug: "", productSlugs: [], endsAt: "" });
  };
  return <div>
    <PageHeading title="Discounts" description="Percentage markdowns applied to a category or selected products." count={discounts.length} />
    {canWrite && <section className="admin-surface mb-5 p-5"><div className="grid gap-3 sm:grid-cols-4">
      <Field label="Label"><input className={adminInput} value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Weekend deal" /></Field>
      <Field label="Percent off"><input type="number" min={1} max={90} className={adminInput} value={form.percent} onChange={e => setForm({ ...form, percent: Number(e.target.value) })} /></Field>
      <Field label="Target"><select className={adminInput} value={form.target} onChange={e => setForm({ ...form, target: e.target.value as "category" | "products" })}><option value="category">Category</option><option value="products">Selected products</option></select></Field>
      <Field label="Ends (optional)"><input type="datetime-local" className={adminInput} value={form.endsAt} onChange={e => setForm({ ...form, endsAt: e.target.value })} /></Field>
    </div>
    {form.target === "category"
      ? <Field label="Category"><select className={adminInput} value={form.categorySlug} onChange={e => setForm({ ...form, categorySlug: e.target.value })}>{catalogCategories.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></Field>
      : <Field label="Products"><select multiple className={`${adminInput} h-32`} value={form.productSlugs} onChange={e => setForm({ ...form, productSlugs: [...e.target.selectedOptions].map(o => o.value) })}>{catalogProducts.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></Field>}
    <div className="mt-3"><button className="admin-button admin-button-primary" onClick={apply}>Apply discount</button></div>
    </section>}
    <section className="admin-surface"><Table cols={["Label", "Off", "Applies to", "Ends", "Status", ""]}>
      {discounts.map(d => <tr key={d.id}>
        <td><strong>{d.label}</strong></td><td className="tnum font-bold">-{d.percent}%</td>
        <td className="text-xs text-stone-500">{d.target === "category" ? catalogCategories.find(c => c.slug === d.categorySlug)?.name ?? d.categorySlug : `${d.productSlugs.length} products`}</td>
        <td className="text-xs text-stone-500">{d.endsAt ? new Date(d.endsAt).toLocaleString("en-GB") : "—"}</td>
        <td>{d.active ? <span className="admin-status status-green">Active</span> : <span className="admin-status status-gray">Off</span>}</td>
        <RowActions onEdit={canWrite ? () => setDiscounts(discounts.map(x => x.id === d.id ? { ...x, active: !x.active } : x)) : undefined} editLabel={d.active ? "Turn off" : "Turn on"} onDelete={canWrite ? () => setDiscounts(discounts.filter(x => x.id !== d.id)) : undefined} />
      </tr>)}
      {!discounts.length && <tr><td colSpan={6}><Empty title="No discounts yet" /></td></tr>}
    </Table></section>
  </div>;
}

export function BannersSection() {
  const [banners, setBanners] = useContent("banners");
  const { can } = useStore();
  const canWrite = can("storefront.write");
  const [draft, setDraft] = useState<Banner | null>(null);
  return <div>
    <PageHeading title="Banners" description="Promotional banners rendered on the storefront by position." count={banners.length}>
      {canWrite && <button className="admin-button admin-button-primary" onClick={() => setDraft({ id: `bn-${Date.now()}`, title: "", image: "/img/kit.jpg", link: "/shop", position: "home_mid", order: banners.length + 1, active: true })}><Icon name="plus" className="h-4 w-4" />Add banner</button>}
    </PageHeading>
    <section className="admin-surface"><Table cols={["Banner", "Position", "Link", "Order", "Status", ""]}>
      {banners.map(b => <tr key={b.id}>
        <td><strong>{b.title}</strong></td><td className="text-xs">{b.position}</td><td className="text-xs text-stone-500">{b.link}</td><td className="tnum">{b.order}</td>
        <td>{b.active ? <span className="admin-status status-green">Active</span> : <span className="admin-status status-gray">Off</span>}</td>
        <RowActions onEdit={canWrite ? () => setDraft(b) : undefined} onDelete={canWrite ? () => setBanners(banners.filter(x => x.id !== b.id)) : undefined} />
      </tr>)}
    </Table></section>
    {draft && <EditorModal title="Banner" editing={draft} isNew={!banners.some(b => b.id === draft.id)} onClose={() => setDraft(null)} onSave={() => { setBanners(banners.some(b => b.id === draft.id) ? banners.map(b => b.id === draft.id ? draft : b) : [...banners, draft]); setDraft(null); }}>
      <Field label="Title"><input className={adminInput} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></Field>
      <Field label="Subtitle"><input className={adminInput} value={draft.subtitle ?? ""} onChange={e => setDraft({ ...draft, subtitle: e.target.value })} /></Field>
      <Field label="Image URL"><input className={adminInput} value={draft.image} onChange={e => setDraft({ ...draft, image: e.target.value })} /></Field>
      <Field label="Link"><input className={adminInput} value={draft.link} onChange={e => setDraft({ ...draft, link: e.target.value })} /></Field>
      <Field label="Position"><select className={adminInput} value={draft.position} onChange={e => setDraft({ ...draft, position: e.target.value as Banner["position"] })}><option value="home_top">Home top</option><option value="home_mid">Home middle</option><option value="sidebar">Shop sidebar</option></select></Field>
      <Field label="Order"><input type="number" className={adminInput} value={draft.order} onChange={e => setDraft({ ...draft, order: Number(e.target.value) })} /></Field>
      <div className="flex items-center justify-between"><span className="text-xs font-bold">Active</span><SwitchToggle checked={draft.active} label="Active" onChange={v => setDraft({ ...draft, active: v })} /></div>
    </EditorModal>}
  </div>;
}

export function FlashSaleSection() {
  const [flash, setFlash] = useContent("flashSale");
  const { catalogProducts, can, notify } = useStore();
  const canWrite = can("marketing.write");
  const [draft, setDraft] = useState<FlashSale>(flash ?? { id: "fs-1", title: "", subtitle: "", percent: 15, productSlugs: [], endsAt: undefined, active: false });
  return <div>
    <PageHeading title="Flash Sale & Promotions" description="Time-boxed campaign pricing shown on the homepage and product cards." />
    <section className="admin-surface p-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title"><input className={adminInput} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Weekend flash sale" disabled={!canWrite} /></Field>
        <Field label="Subtitle"><input className={adminInput} value={draft.subtitle} onChange={e => setDraft({ ...draft, subtitle: e.target.value })} disabled={!canWrite} /></Field>
        <Field label="Percent off"><input type="number" min={1} max={90} className={adminInput} value={draft.percent} onChange={e => setDraft({ ...draft, percent: Number(e.target.value) })} disabled={!canWrite} /></Field>
        <Field label="Ends at"><input type="datetime-local" className={adminInput} value={draft.endsAt ? new Date(draft.endsAt).toISOString().slice(0, 16) : ""} onChange={e => setDraft({ ...draft, endsAt: e.target.value ? new Date(e.target.value).getTime() : undefined })} disabled={!canWrite} /></Field>
      </div>
      <Field label="Products in flash sale"><select multiple className={`${adminInput} h-36`} value={draft.productSlugs} onChange={e => setDraft({ ...draft, productSlugs: [...e.target.selectedOptions].map(o => o.value) })} disabled={!canWrite}>{catalogProducts.map(p => <option key={p.slug} value={p.slug}>{p.name}</option>)}</select></Field>
      <div className="flex items-center justify-between"><span className="text-xs font-bold">Campaign active</span><SwitchToggle checked={draft.active} label="Active" onChange={v => setDraft({ ...draft, active: v })} disabled={!canWrite} /></div>
      {canWrite && <button className="admin-button admin-button-primary" onClick={() => setFlash(draft)}>Add to pending changes</button>}
    </section>
    {flash && <p className="mt-3 text-xs text-stone-500">Current: {flash.title || "untitled"} · {flash.percent}% off {flash.productSlugs.length} products · {flash.active ? "live" : "inactive"}</p>}
  </div>;
}

export function NewsletterSection() {
  const [subs, setSubs] = useContent("subscribers");
  const [q, setQ] = useState("");
  const list = subs.filter(s => s.email.toLowerCase().includes(q.toLowerCase()));
  return <div>
    <PageHeading title="Newsletter subscribers" description="Emails collected from the storefront newsletter box." count={subs.filter(s => s.active).length}>
      <div className="admin-search-field"><Icon name="search" className="h-4 w-4" /><input aria-label="Search subscribers" placeholder="Email…" value={q} onChange={e => setQ(e.target.value)} /></div>
    </PageHeading>
    <section className="admin-surface"><Table cols={["Email", "Subscribed", "Status", ""]}>
      {list.map(s => <tr key={s.email}>
        <td className="font-mono text-xs">{s.email}</td><td className="text-xs text-stone-500">{new Date(s.subscribedAt).toLocaleDateString("en-GB")}</td>
        <td>{s.active ? <span className="admin-status status-green">Active</span> : <span className="admin-status status-gray">Unsubscribed</span>}</td>
        <RowActions onEdit={() => setSubs(subs.map(x => x.email === s.email ? { ...x, active: !x.active } : x))} editLabel={s.active ? "Unsubscribe" : "Resubscribe"} />
      </tr>)}
      {!list.length && <tr><td colSpan={4}><Empty title="No subscribers" /></td></tr>}
    </Table></section>
  </div>;
}

export function TestimonialsSection() {
  const [items, setItems] = useContent("testimonials");
  const { can } = useStore();
  const canWrite = can("content.write");
  const [draft, setDraft] = useState<Testimonial | null>(null);
  return <div>
    <PageHeading title="Testimonials" description="Customer quotes shown in the homepage testimonials section." count={items.length}>
      {canWrite && <button className="admin-button admin-button-primary" onClick={() => setDraft({ id: `tm-${Date.now()}`, name: "", role: "", quote: "", initials: "", tone: "bg-stone-100 text-stone-700", active: true })}><Icon name="plus" className="h-4 w-4" />Add</button>}
    </PageHeading>
    <section className="admin-surface divide-y divide-stone-100">
      {items.map(t => <div key={t.id} className="flex items-start justify-between gap-3 px-5 py-4">
        <div><strong>{t.name}</strong> <span className="text-xs text-stone-500">· {t.role}</span><p className="mt-1 text-sm text-stone-600">“{t.quote}”</p></div>
        <div className="flex shrink-0 gap-1">{canWrite && <IconBtn icon="edit" label="Edit" onClick={() => setDraft(t)} />}{canWrite && <IconBtn icon="trash" tone="danger" label="Delete" onClick={() => setItems(items.filter(x => x.id !== t.id))} />}</div>
      </div>)}
    </section>
    {draft && <EditorModal title="Testimonial" editing={draft} isNew={!items.some(t => t.id === draft.id)} onClose={() => setDraft(null)} onSave={() => { const initials = draft.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(); setItems(items.some(t => t.id === draft.id) ? items.map(t => t.id === draft.id ? { ...draft, initials } : t) : [...items, { ...draft, initials }]); setDraft(null); }}>
      <Field label="Name"><input className={adminInput} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></Field>
      <Field label="Role"><input className={adminInput} value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value })} /></Field>
      <Field label="Quote"><textarea className={adminInput} rows={3} value={draft.quote} onChange={e => setDraft({ ...draft, quote: e.target.value })} /></Field>
      <div className="flex items-center justify-between"><span className="text-xs font-bold">Active</span><SwitchToggle checked={draft.active} label="Active" onChange={v => setDraft({ ...draft, active: v })} /></div>
    </EditorModal>}
  </div>;
}

/* ---------- Content: home sections / pages / blog / media ---------- */

const SECTION_LABELS: Record<HomeSectionKey, string> = {
  categories: "Category grid", featured: "Featured products", new: "New arrivals", best: "Best sellers", deals: "Big discounts", trending: "Trending now", recommended: "Recommended for you", brands: "Brand strip", features: "Why shop with us", testimonials: "Testimonials", blog: "Blog rail", newsletter: "Newsletter",
};

export function HomeSectionsSection() {
  const [sections, setSections] = useContent("homeSections");
  const { can } = useStore();
  const canWrite = can("storefront.write");
  return <div>
    <PageHeading title="Homepage sections" description="Edit section content and order, then save or discard using the pending-changes bar." />
    <section className="admin-surface"><Table cols={["Section", "Title", "Subtitle", "Limit", "Order", "Active", ""]}>
      {[...sections].sort((a, b) => a.order - b.order).map(s => <tr key={s.key}>
        <td><strong>{SECTION_LABELS[s.key]}</strong> <span className="ml-1 font-mono text-[10px] text-stone-400">{s.key}</span></td>
        <td>{canWrite ? <input className={`${adminInput} !py-1.5 !text-xs`} value={s.title} onChange={e => setSections(sections.map(x => x.key === s.key ? { ...x, title: e.target.value } : x))} /> : s.title}</td>
        <td>{canWrite ? <input className={`${adminInput} !py-1.5 !text-xs`} value={s.subtitle ?? ""} onChange={e => setSections(sections.map(x => x.key === s.key ? { ...x, subtitle: e.target.value } : x))} /> : <span className="text-xs text-stone-500">{s.subtitle ?? "—"}</span>}</td>
        <td>{canWrite ? <input type="number" className={`${adminInput} !w-16 !py-1.5 !text-xs`} value={s.limit} onChange={e => setSections(sections.map(x => x.key === s.key ? { ...x, limit: Number(e.target.value) } : x))} /> : <span className="tnum">{s.limit}</span>}</td>
        <td>{canWrite ? <input type="number" className={`${adminInput} !w-16 !py-1.5 !text-xs`} value={s.order} onChange={e => setSections(sections.map(x => x.key === s.key ? { ...x, order: Number(e.target.value) } : x))} /> : <span className="tnum">{s.order}</span>}</td>
        <td>{canWrite ? <SwitchToggle checked={s.active} label={`Toggle ${s.key}`} onChange={v => setSections(sections.map(x => x.key === s.key ? { ...x, active: v } : x))} /> : (s.active ? <span className="admin-status status-green">On</span> : <span className="admin-status status-gray">Off</span>)}</td>
        <RowActions />
      </tr>)}
    </Table></section>
  </div>;
}

export function PagesSection() {
  const [pages, setPages] = useContent("pages");
  const { can } = useStore();
  const canWrite = can("content.write");
  const [draft, setDraft] = useState<Page | null>(null);
  return <div>
    <PageHeading title="Pages" description="CMS pages linked from the storefront footer (About, FAQ, policies…)." count={pages.length}>
      {canWrite && <button className="admin-button admin-button-primary" onClick={() => setDraft({ id: `pg-${Date.now()}`, slug: "", title: "", body: "", footerLink: true, status: "draft", updatedAt: Date.now() })}><Icon name="plus" className="h-4 w-4" />Add page</button>}
    </PageHeading>
    <section className="admin-surface"><Table cols={["Title", "URL", "Footer link", "Status", "Updated", ""]}>
      {pages.map(p => <tr key={p.id}>
        <td><strong>{p.title}</strong></td><td className="font-mono text-xs">/page/{p.slug}</td>
        <td>{p.footerLink ? <span className="admin-status status-green">Yes</span> : <span className="admin-status status-gray">No</span>}</td>
        <td><span className={`admin-status ${p.status === "published" ? "status-green" : "status-gray"}`}>{p.status}</span></td>
        <td className="text-xs text-stone-500">{new Date(p.updatedAt).toLocaleDateString("en-GB")}</td>
        <RowActions onEdit={canWrite ? () => setDraft(p) : undefined} onDelete={canWrite ? () => setPages(pages.filter(x => x.id !== p.id)) : undefined} />
      </tr>)}
    </Table></section>
    {draft && <EditorModal title="Page" editing={draft} isNew={!pages.some(p => p.id === draft.id)} onClose={() => setDraft(null)} onSave={() => { const slug = draft.slug || draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"); setPages(pages.some(p => p.id === draft.id) ? pages.map(p => p.id === draft.id ? { ...draft, slug, updatedAt: Date.now() } : p) : [...pages, { ...draft, slug, updatedAt: Date.now() }]); setDraft(null); }}>
      <Field label="Title"><input className={adminInput} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></Field>
      <Field label="URL slug"><input className={adminInput} value={draft.slug} onChange={e => setDraft({ ...draft, slug: e.target.value })} /></Field>
      <Field label="Body"><textarea className={adminInput} rows={8} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></Field>
      <Field label="Status"><select className={adminInput} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Page["status"] })}><option value="published">Published</option><option value="draft">Draft</option></select></Field>
      <div className="flex items-center justify-between"><span className="text-xs font-bold">Show in footer</span><SwitchToggle checked={draft.footerLink} label="Footer link" onChange={v => setDraft({ ...draft, footerLink: v })} /></div>
    </EditorModal>}
  </div>;
}

export function BlogSection() {
  const [posts, setPosts] = useContent("blogPosts");
  const [cats, setCats] = useContent("blogCategories");
  const { can } = useStore();
  const canWrite = can("content.write");
  const [draft, setDraft] = useState<BlogPost | null>(null);
  const [newCat, setNewCat] = useState("");
  return <div>
    <PageHeading title="Blog posts" description="Guides and news shown on /blog." count={posts.length}>
      {canWrite && <button className="admin-button admin-button-primary" onClick={() => setDraft({ id: `bp-${Date.now()}`, slug: "", title: "", category: cats[0]?.slug ?? "", excerpt: "", body: "", image: "/img/kit.jpg", author: "Glowing Space Bench", views: 0, status: "draft", createdAt: Date.now() })}><Icon name="plus" className="h-4 w-4" />Add post</button>}
    </PageHeading>
    <section className="admin-surface"><Table cols={["Post", "Category", "Author", "Views", "Status", ""]}>
      {posts.map(p => <tr key={p.id}>
        <td><Link to={`/blog/${p.slug}`} className="admin-text-button font-bold">{p.title}</Link></td>
        <td className="text-xs">{cats.find(c => c.slug === p.category)?.name ?? p.category}</td>
        <td className="text-xs text-stone-500">{p.author}</td><td className="tnum">{p.views.toLocaleString()}</td>
        <td><span className={`admin-status ${p.status === "published" ? "status-green" : "status-gray"}`}>{p.status}</span></td>
        <RowActions onEdit={canWrite ? () => setDraft(p) : undefined} onDelete={canWrite ? () => setPosts(posts.filter(x => x.id !== p.id)) : undefined} />
      </tr>)}
    </Table></section>
    <section className="admin-surface mt-5 p-5">
      <PageHeading title="Blog categories" description="" />
      <div className="flex flex-wrap gap-2">{cats.map(c => <span key={c.id} className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold">{c.name}{canWrite && <button aria-label={`Delete ${c.name}`} onClick={() => setCats(cats.filter(x => x.id !== c.id))}><Icon name="close" className="h-3 w-3" /></button>}</span>)}</div>
      {canWrite && <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); if (!newCat.trim()) return; setCats([...cats, { id: `bc-${Date.now()}`, name: newCat.trim(), slug: newCat.toLowerCase().replace(/[^a-z0-9]+/g, "-") }]); setNewCat(""); }}><input className={adminInput} value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category…" /><button className="admin-button">Add</button></form>}
    </section>
    {draft && <EditorModal title="Blog post" editing={draft} isNew={!posts.some(p => p.id === draft.id)} onClose={() => setDraft(null)} onSave={() => { const slug = draft.slug || draft.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"); setPosts(posts.some(p => p.id === draft.id) ? posts.map(p => p.id === draft.id ? { ...draft, slug, createdAt: p.createdAt } : p) : [...posts, { ...draft, slug, createdAt: Date.now() }]); setDraft(null); }}>
      <Field label="Title"><input className={adminInput} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></Field>
      <Field label="Slug"><input className={adminInput} value={draft.slug} onChange={e => setDraft({ ...draft, slug: e.target.value })} /></Field>
      <Field label="Category"><select className={adminInput} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value })}>{cats.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></Field>
      <Field label="Image URL"><input className={adminInput} value={draft.image} onChange={e => setDraft({ ...draft, image: e.target.value })} /></Field>
      <Field label="Excerpt"><input className={adminInput} value={draft.excerpt} onChange={e => setDraft({ ...draft, excerpt: e.target.value })} /></Field>
      <Field label="Body"><textarea className={adminInput} rows={8} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} /></Field>
      <Field label="Status"><select className={adminInput} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as BlogPost["status"] })}><option value="published">Published</option><option value="draft">Draft</option></select></Field>
    </EditorModal>}
  </div>;
}

export function MediaSection() {
  const { can } = useStore();
  const canWrite = can("media.write");
  const folders = ["Banners", "Blog", "Brands", "Categories", "Products"];
  const { STUDIO_GALLERY } = require("../data") as typeof import("../data");
  const [folder, setFolder] = useState("All folders");
  return <div>
    <PageHeading title="Media library" description="Shared image pool used by product galleries, banners and branding.">
      <select className="admin-select" value={folder} onChange={e => setFolder(e.target.value)}><option>All folders</option>{folders.map(f => <option key={f}>{f}</option>)}</select>
    </PageHeading>
    <section className="admin-surface grid grid-cols-3 gap-3 p-4 sm:grid-cols-6">
      {STUDIO_GALLERY.map(g => (
        <figure key={g.label} className="group">
          <img src={g.url} alt={g.label} className="aspect-square w-full rounded-xl object-cover ring-1 ring-stone-200" loading="lazy" />
          <figcaption className="mt-1 truncate text-[11px] font-semibold" title={g.url}>{g.label}</figcaption>
          {canWrite && <button className="mt-1 w-full rounded-md border border-stone-200 py-1 text-[10px] font-bold text-stone-600 hover:border-stone-900" onClick={() => { navigator.clipboard?.writeText(g.url); }}>Copy URL</button>}
        </figure>
      ))}
    </section>
    {canWrite && <section className="admin-surface mt-5 p-5"><p className="text-xs font-bold text-stone-700">Upload</p><input type="file" multiple className="mt-2 text-xs" onChange={e => { const files = [...(e.target.files ?? [])]; if (files.length) alert(`${files.length} file(s) selected — in this preview they are stored in browser memory only.`); }} /></section>}
  </div>;
}

/* ---------- Delivery / payments / reports / settings / system / roles ---------- */

export function ProvidersSection() {
  const [providers, setProviders] = useContent("deliveryProviders");
  const { can } = useStore();
  const canWrite = can("delivery.write");
  return <div>
    <PageHeading title="Delivery providers" description="Courier integrations. API drivers can be wired in System & Integrations." count={providers.length} />
    <section className="admin-surface"><Table cols={["Provider", "Driver", "Tracking URL template", "Active", ""]}>
      {providers.map(p => <tr key={p.id}>
        <td><strong>{p.name}</strong></td><td className="text-xs font-mono">{p.driver}</td>
        <td className="max-w-[260px] truncate text-xs text-stone-500">{p.trackingUrl || "—"}</td>
        <td>{canWrite ? <SwitchToggle checked={p.active} label={`Toggle ${p.name}`} onChange={v => setProviders(providers.map(x => x.id === p.id ? { ...x, active: v } : x))} /> : (p.active ? <span className="admin-status status-green">Active</span> : <span className="admin-status status-gray">Off</span>)}</td>
        <RowActions />
      </tr>)}
    </Table></section>
  </div>;
}

export function ZonesSection() {
  const [zones, setZones] = useContent("deliveryZones");
  const { can, settings, updateSettings } = useStore();
  const canWrite = can("delivery.write");
  return <div>
    <PageHeading title="Delivery zones & charges" description="Zone-based shipping with a free-delivery threshold." count={zones.length} />
    <section className="admin-surface"><Table cols={["Zone", "Type", "Charge", "Estimated time", "Active", ""]}>
      {zones.map(z => <tr key={z.id}>
        <td><strong>{z.name}</strong> <span className="ml-1 text-[11px] text-stone-500">{z.areas.join(", ")}</span></td>
        <td className="text-xs">{z.type}</td>
        <td>{canWrite ? <input type="number" className={`${adminInput} !w-24 !py-1.5 !text-xs tnum`} value={z.charge} onChange={e => setZones(zones.map(x => x.id === z.id ? { ...x, charge: Number(e.target.value) } : x))} /> : <span className="tnum font-bold">{fmt(z.charge)}</span>}</td>
        <td>{canWrite ? <input className={`${adminInput} !w-28 !py-1.5 !text-xs`} value={z.eta} onChange={e => setZones(zones.map(x => x.id === z.id ? { ...x, eta: e.target.value } : x))} /> : <span className="text-xs">{z.eta}</span>}</td>
        <td>{canWrite ? <SwitchToggle checked={z.active} label={`Toggle ${z.name}`} onChange={v => setZones(zones.map(x => x.id === z.id ? { ...x, active: v } : x))} /> : null}</td><RowActions />
      </tr>)}
    </Table></section>
    <section className="admin-surface mt-5 p-5"><Field label="Free delivery threshold (৳, 0 = disabled)"><input type="number" className={adminInput} value={settings.freeDhakaThreshold} onChange={e => updateSettings({ freeDhakaThreshold: Number(e.target.value) })} disabled={!canWrite} /></Field></section>
  </div>;
}

export function TrackingSection() {
  const { orders } = useStore();
  const [providers] = useContent("deliveryProviders");
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("all");
  const shipped = orders.filter(o => o.trackingCode && `${o.id} ${o.trackingCode} ${o.name}`.toLowerCase().includes(q.toLowerCase()) && (provider === "all" || o.courier === providers.find(p => p.id === provider)?.name));
  return <div>
    <PageHeading title="Shipment tracking" description="All dispatched shipments with tracking numbers." count={shipped.length}>
      <div className="admin-search-field"><Icon name="search" className="h-4 w-4" /><input aria-label="Search shipments" placeholder="Order, tracking, customer…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <select className="admin-select" value={provider} onChange={e => setProvider(e.target.value)}><option value="all">All couriers</option>{providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
    </PageHeading>
    <section className="admin-surface"><Table cols={["Order", "Customer", "Courier", "Tracking", "Status", "Updated"]}>
      {shipped.map(o => <tr key={o.id}>
        <td><Link to={`/admin/orders?q=${o.id}`} className="admin-order-id font-mono">{o.id}</Link></td>
        <td className="text-xs">{o.name}</td><td className="text-xs">{o.courier}</td>
        <td><span className="rounded bg-stone-100 px-2 py-0.5 font-mono text-[11px] font-bold">{o.trackingCode}</span></td>
        <td><span className={`admin-status ${o.status === "delivered" ? "status-green" : "status-blue"}`}>{o.status ?? "shipped"}</span></td>
        <td className="text-xs text-stone-500">{new Date(o.updatedAt ?? o.created).toLocaleDateString("en-GB")}</td>
      </tr>)}
      {!shipped.length && <tr><td colSpan={6}><Empty title="No shipments yet" /></td></tr>}
    </Table></section>
  </div>;
}

export function PayMethodsSection() {
  const [methods, setMethods] = useContent("paymentMethods");
  const { can } = useStore();
  const canWrite = can("payments.write");
  return <div>
    <PageHeading title="Payment methods" description="Checkout payment options in display order." count={methods.length} />
    <section className="admin-surface"><Table cols={["Method", "Note", "Order", "Active", ""]}>
      {methods.map(m => <tr key={m.id}>
        <td><strong>{m.name}</strong></td><td className="text-xs text-stone-500">{m.note ?? "—"}</td>
        <td>{canWrite ? <input type="number" className={`${adminInput} !w-16 !py-1.5 !text-xs tnum`} value={m.sort} onChange={e => setMethods(methods.map(x => x.id === m.id ? { ...x, sort: Number(e.target.value) } : x))} /> : <span className="tnum">{m.sort}</span>}</td>
        <td>{canWrite ? <SwitchToggle checked={m.active} label={`Toggle ${m.name}`} onChange={v => setMethods(methods.map(x => x.id === m.id ? { ...x, active: v } : x))} /> : (m.active ? <span className="admin-status status-green">Active</span> : <span className="admin-status status-gray">Off</span>)}</td>
        <RowActions />
      </tr>)}
    </Table></section>
  </div>;
}

export function PaySettingsSection() {
  const { settings, updateSettings, can } = useStore();
  const canWrite = can("payments.write");
  return <div>
    <PageHeading title="Payment Settings" description="Manual send-money flow or automatic gateway API mode." />
    <section className="admin-surface space-y-4 p-5">
      {([["bkashMode", "bKash mode", "bkashManualNumber", "bKash number"], ["nagadMode", "Nagad mode", "nagadManualNumber", "Nagad number"]] as const).map(([modeKey, modeLabel, numKey, numLabel]) => (
        <div key={modeKey} className="grid gap-3 sm:grid-cols-2">
          <Field label={modeLabel}><select className={adminInput} value={settings[modeKey]} disabled={!canWrite} onChange={e => updateSettings({ [modeKey]: e.target.value as "manual" | "api" })}><option value="manual">Manual (Send Money + TrxID)</option><option value="api">Automatic (Tokenized API)</option></select></Field>
          <Field label={numLabel}><input className={adminInput} value={settings[numKey]} disabled={!canWrite} onChange={e => updateSettings({ [numKey]: e.target.value })} /></Field>
        </div>
      ))}
      <Field label="Checkout note"><textarea className={adminInput} rows={2} value={settings.checkoutNote} disabled={!canWrite} onChange={e => updateSettings({ checkoutNote: e.target.value })} /></Field>
    </section>
  </div>;
}

export function TransactionsSection() {
  const [txns, setTxns] = useContent("transactions");
  const { can, notify } = useStore();
  const canWrite = can("orders.payment");
  const [q, setQ] = useState("");
  const [gw, setGw] = useState("all");
  const list = txns.filter(t => (gw === "all" || t.gateway === gw) && `${t.id} ${t.orderId} ${t.trxId} ${t.sender ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const setStatus = (id: string, status: Transaction["status"]) => { setTxns(txns.map(t => t.id === id ? { ...t, status } : t)); };
  return <div>
    <PageHeading title="Transactions" description="Gateway payments submitted by customers." count={txns.length}>
      <div className="admin-search-field"><Icon name="search" className="h-4 w-4" /><input aria-label="Search transactions" placeholder="TrxID, order, sender…" value={q} onChange={e => setQ(e.target.value)} /></div>
      <select className="admin-select" value={gw} onChange={e => setGw(e.target.value)}><option value="all">All gateways</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="cod">COD</option></select>
    </PageHeading>
    <section className="admin-surface"><Table cols={["Date", "Order", "Gateway", "Trx ID", "Sender", "Amount", "Status", ""]}>
      {list.map(t => <tr key={t.id}>
        <td className="text-xs text-stone-500">{new Date(t.createdAt).toLocaleString("en-GB")}</td>
        <td><Link to={`/admin/orders?q=${t.orderId}`} className="admin-order-id font-mono text-xs">{t.orderId}</Link></td>
        <td className="text-xs font-bold">{t.gateway}</td><td className="font-mono text-xs">{t.trxId}</td><td className="font-mono text-xs">{t.sender ?? "—"}</td>
        <td className="font-bold tnum">{fmt(t.amount)}</td>
        <td><span className={`admin-status ${t.status === "completed" ? "status-green" : t.status === "pending" ? "status-amber" : t.status === "refunded" ? "status-blue" : "status-gray"}`}>{t.status}</span></td>
        <td className="text-right">{canWrite && <select className="admin-select !py-1.5 !text-xs" value={t.status} onChange={e => setStatus(t.id, e.target.value as Transaction["status"])}><option value="pending">Pending</option><option value="completed">Verify</option><option value="failed">Reject</option><option value="refunded">Refund</option></select>}</td>
      </tr>)}
      {!list.length && <tr><td colSpan={8}><Empty title="No transactions" /></td></tr>}
    </Table></section>
  </div>;
}

export function ReportsSection() {
  const { orders, catalogProducts, catalogCategories, content } = useStore();
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const range = useMemo(() => {
    const start = new Date(from).getTime();
    const end = new Date(to).getTime() + 86400000;
    return orders.filter(o => o.created >= start && o.created < end && o.status !== "cancelled");
  }, [orders, from, to]);
  const revenue = range.reduce((s, o) => s + o.total, 0);
  const byStatus = useMemo(() => {
    const map = new Map<string, { n: number; v: number }>();
    for (const o of range) { const e = map.get(o.status ?? "placed") ?? { n: 0, v: 0 }; e.n++; e.v += o.total; map.set(o.status ?? "placed", e); }
    return [...map.entries()].sort((a, b) => b[1].v - a[1].v);
  }, [range]);
  const byMethod = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of range) map.set(o.method, (map.get(o.method) ?? 0) + o.total);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [range]);
  const byProduct = useMemo(() => {
    const map = new Map<string, { units: number; revenue: number }>();
    for (const o of range) for (const l of o.lines) { const e = map.get(l.slug) ?? { units: 0, revenue: 0 }; e.units += l.qty; e.revenue += l.price * l.qty; map.set(l.slug, e); }
    return [...map.entries()].map(([slug, e]) => ({ name: catalogProducts.find(p => p.slug === slug)?.name ?? slug, ...e })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [range, catalogProducts]);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const [slug, e] of byProduct.map(x => [x.name, x] as const)) {
      const p = catalogProducts.find(p => p.name === slug);
      if (p) map.set(p.category, (map.get(p.category) ?? 0) + e.revenue);
    }
    return [...map.entries()].map(([slug, v]) => ({ name: catalogCategories.find(c => c.slug === slug)?.name ?? slug, v })).sort((a, b) => b.v - a.v);
  }, [byProduct, catalogProducts, catalogCategories]);
  const topCustomers = useMemo(() => {
    const map = new Map<string, { name: string; n: number; spent: number }>();
    for (const o of range) { const e = map.get(o.phone) ?? { name: o.name, n: 0, spent: 0 }; e.n++; e.spent += o.total; map.set(o.phone, e); }
    return [...map.values()].sort((a, b) => b.spent - a.spent).slice(0, 10);
  }, [range]);
  const lowStock = catalogProducts.filter(p => p.stock > 0 && p.stock < (p.lowStockAt ?? 5) || p.stock === 0);
  const daily = useMemo(() => {
    const map = new Map<string, { orders: number; total: number }>();
    for (const o of range) { const d = new Date(o.created).toISOString().slice(0, 10); const e = map.get(d) ?? { orders: 0, total: 0 }; e.orders++; e.total += o.total; map.set(d, e); }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [range]);
  return <div>
    <PageHeading title="Reports" description="Sales, product, customer and order reports for a date range.">
      <div className="flex flex-wrap items-center gap-2">
        <Field label="From"><input type="date" className={adminInput} value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" className={adminInput} value={to} onChange={e => setTo(e.target.value)} /></Field>
      </div>
    </PageHeading>
    <div className="admin-overview-stats mb-5">
      <div><span>Revenue in range</span><strong>{fmt(revenue)}</strong><small>{range.length} orders</small></div>
      <div><span>Avg order value</span><strong>{fmt(range.length ? revenue / range.length : 0)}</strong><small>excl. cancelled</small></div>
      <div><span>Items sold</span><strong>{range.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.qty, 0), 0).toLocaleString()}</strong><small>units</small></div>
      <div><span>Subscribers</span><strong>{content.subscribers.filter(s => s.active).length}</strong><small>newsletter</small></div>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="admin-surface p-5"><h3 className="text-sm font-extrabold mb-3">Daily breakdown</h3><Table cols={["Date", "Orders", "Total"]}>{daily.map(([d, e]) => <tr key={d}><td className="text-xs">{d}</td><td className="tnum">{e.orders}</td><td className="font-bold tnum">{fmt(e.total)}</td></tr>)}</Table></section>
      <section className="admin-surface p-5"><h3 className="text-sm font-extrabold mb-3">Orders by status</h3><Table cols={["Status", "Orders", "Value"]}>{byStatus.map(([s, e]) => <tr key={s}><td className="text-xs">{s}</td><td className="tnum">{e.n}</td><td className="font-bold tnum">{fmt(e.v)}</td></tr>)}</Table></section>
      <section className="admin-surface p-5"><h3 className="text-sm font-extrabold mb-3">Best-selling products</h3><Table cols={["#", "Product", "Units", "Revenue"]}>{byProduct.map((p, i) => <tr key={p.name}><td className="tnum text-stone-400">{i + 1}</td><td className="text-xs font-semibold">{p.name}</td><td className="tnum">{p.units}</td><td className="font-bold tnum">{fmt(p.revenue)}</td></tr>)}</Table></section>
      <section className="admin-surface p-5"><h3 className="text-sm font-extrabold mb-3">Revenue by category</h3><Table cols={["Category", "Revenue"]}>{byCategory.map(c => <tr key={c.name}><td className="text-xs">{c.name}</td><td className="font-bold tnum">{fmt(c.v)}</td></tr>)}</Table></section>
      <section className="admin-surface p-5"><h3 className="text-sm font-extrabold mb-3">Top customers</h3><Table cols={["Customer", "Orders", "Spent"]}>{topCustomers.map(c => <tr key={c.name}><td className="text-xs font-semibold">{c.name}</td><td className="tnum">{c.n}</td><td className="font-bold tnum">{fmt(c.spent)}</td></tr>)}</Table></section>
      <section className="admin-surface p-5"><h3 className="text-sm font-extrabold mb-3">Payment methods</h3><Table cols={["Method", "Revenue"]}>{byMethod.map(([m, v]) => <tr key={m}><td className="text-xs font-semibold">{m}</td><td className="font-bold tnum">{fmt(v)}</td></tr>)}</Table></section>
      <section className="admin-surface p-5 lg:col-span-2"><h3 className="text-sm font-extrabold mb-3">Low / out of stock</h3><Table cols={["Product", "Stock", "Threshold"]}>{lowStock.map(p => <tr key={p.slug}><td className="text-xs font-semibold">{p.name}</td><td className={`tnum font-bold ${p.stock === 0 ? "text-red-700" : "text-amber-700"}`}>{p.stock}</td><td className="tnum text-stone-500">{p.lowStockAt ?? 5}</td></tr>)}</Table></section>
    </div>
  </div>;
}
