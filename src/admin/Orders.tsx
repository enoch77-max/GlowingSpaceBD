import { Select } from "../ui/Select";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouter, usePageState } from "../router";
import { fmt } from "../data";
import { useStore, type CourierName, type Order, type OrderStatus, type PaymentStatus } from "../store";
import { Icon } from "../icons";
import { Confirm, Empty, Field, IconBtn, Overlay, PageHeading, downloadCsv } from "./ui";
import { COURIERS, PAYMENT, STATUS, orderDate, orderTime, orderUpdateIssue } from "./orderWorkflow";
import { useMobileLayout } from "../hooks/useMobileLayout";
import { ResponsiveImage } from "../ResponsiveImage";

type Queue = "all" | "unfulfilled" | "unpaid" | "ready" | "shipped" | "issues";
type Filters = { q: string; queue: Queue; payment: string; courier: string; date: string; sort: string };
const DEFAULT_FILTERS: Filters = { q: "", queue: "all", payment: "all", courier: "all", date: "all", sort: "newest" };
const bdtDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });
const isUnfulfilled = (o: Order) => ["placed", "confirmed", "packed"].includes(o.status ?? "placed");
const isIssue = (o: Order, at: number) => o.status !== "delivered" && o.status !== "cancelled" && ((at - o.created > 2 * 86400000) || o.paymentStatus === "verifying");
const inQueue = (o: Order, queue: Queue, at: number) => queue === "all" || (queue === "unfulfilled" && isUnfulfilled(o)) || (queue === "unpaid" && o.paymentStatus === "verifying") || (queue === "ready" && o.status === "packed") || (queue === "shipped" && o.status === "shipped") || (queue === "issues" && isIssue(o, at));

const statusHint: Record<string, string> = {
  placed: "Waiting for confirmation",
  confirmed: "Accepted, not packed",
  packed: "On the bench, ready to ship",
  shipped: "With the courier",
  delivered: "Completed",
  cancelled: "Closed, no shipment",
};
const paymentHint: Record<string, string> = {
  cod_pending: "Collected on delivery",
  verifying: "Check bKash or Nagad",
  paid: "Verified, safe to dispatch",
  refunded: "Money returned",
};
const statusOptions = Object.entries(STATUS).map(([key, info]) => <option key={key} value={key} data-tone={info.tone} data-hint={statusHint[key]}>{info.label}</option>);
const paymentOptions = Object.entries(PAYMENT).map(([key, info]) => <option key={key} value={key} data-tone={info.tone} data-hint={paymentHint[key]}>{info.label}</option>);

export function StatusControl({ order, payment = false, onChange }: { order: Order; payment?: boolean; onChange: (value: string) => void }) {
  const { can } = useStore();
  const value = payment ? order.paymentStatus ?? "cod_pending" : order.status ?? "placed";
  const meta = payment ? PAYMENT[value as PaymentStatus] : STATUS[value as OrderStatus];
  const writable = can(payment ? "orders.payment" : "orders.write");
  if (!writable) return <span className={`ds-pill tone-${meta.tone}`}>{meta.label}</span>;
  return (
    <Select
      variant="status"
      aria-label={`${payment ? "Payment" : "Status"} for ${order.id}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {payment ? paymentOptions : statusOptions}
    </Select>
  );
}

export function OrdersSection({ initialQuery = "" }: { initialQuery?: string }) {
  const { orders, updateOrder, bulkUpdateOrders, can, notify } = useStore();
  const { go } = useRouter();
  const isMobile = useMobileLayout();
  const [filters, setFilters] = usePageState<Filters>("admin:orderFilters", { ...DEFAULT_FILTERS, q: initialQuery });
  const [page, setPage] = usePageState("admin:orderPage", 1);
  const [pageSize, setPageSize] = usePageState("admin:orderSize", 25);
  const [selected, setSelected] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [pending, setPending] = useState<{ ids: string[]; patch: Partial<Order>; label: string } | null>(null);
  const [result, setResult] = useState("");
  const [skippedResults, setSkippedResults] = useState<{ id: string; reason: string }[]>([]);
  const [dense, setDense] = useState(false);
  const query = useDeferredValue(filters.q);
  const [auditNow] = useState(() => Date.now());
  const canWrite = can("orders.write");
  useEffect(() => { if (initialQuery) { setFilters(f => ({ ...f, q: initialQuery })); setPage(1); } }, [initialQuery]);
  useEffect(() => { setSelected([]); setOpenId(null); }, [canWrite, can("orders.payment")]);

  const change = (patch: Partial<Filters>) => { setFilters(f => ({ ...f, ...patch })); setPage(1); setSelected([]); setResult(""); setSkippedResults([]); };
  const filtered = useMemo(() => {
    const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const today = filters.date === "today" ? bdtDay.format(auditNow) : "";
    const cutoff = filters.date !== "all" && filters.date !== "today" ? auditNow - Number(filters.date) * 86400000 : 0;
    return orders.filter(order => {
      if (!inQueue(order, filters.queue, auditNow)) return false;
      if (filters.payment !== "all" && order.paymentStatus !== filters.payment) return false;
      if (filters.courier !== "all" && (order.courier ?? "Unassigned") !== filters.courier) return false;
      if (today && bdtDay.format(order.created) !== today) return false;
      if (cutoff && order.created < cutoff) return false;
      if (!terms.length) return true;
      const hay = `${order.id} ${order.name} ${order.phone} ${order.trackingCode ?? ""} ${order.lines.map(l => l.name).join(" ")}`.toLowerCase();
      return terms.every(t => hay.includes(t));
    }).sort((a, b) => filters.sort === "oldest" ? a.created - b.created : filters.sort === "value" ? b.total - a.total : b.created - a.created);
  }, [orders, query, filters.queue, filters.payment, filters.courier, filters.date, filters.sort, auditNow]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageOrders = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const openOrder = orders.find(o => o.id === openId);
  const openIndex = filtered.findIndex(o => o.id === openId);
  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const allPageSelected = pageOrders.length > 0 && pageOrders.every(o => selectedIds.has(o.id));
  const activeFilterCount = [filters.payment, filters.courier, filters.date].filter(v => v !== "all").length;
  const counts = useMemo(() => {
    const totals = { all: orders.length, unfulfilled: 0, ready: 0, unpaid: 0, shipped: 0, issues: 0 };
    for (const order of orders) {
      if (isUnfulfilled(order)) totals.unfulfilled++;
      if (order.status === "packed") totals.ready++;
      if (order.paymentStatus === "verifying") totals.unpaid++;
      if (order.status === "shipped") totals.shipped++;
      if (isIssue(order, auditNow)) totals.issues++;
    }
    return totals;
  }, [orders, auditNow]);

  const selectOne = (id: string) => setSelected(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  const togglePage = () => setSelected(ids => {
    const pageIds = new Set(pageOrders.map(o => o.id));
    return allPageSelected ? ids.filter(id => !pageIds.has(id)) : [...new Set([...ids, ...pageIds])];
  });
  const mutate = (order: Order, patch: Partial<Order>) => {
    if (patch.status === "cancelled" || patch.paymentStatus === "refunded") { setPending({ ids: [order.id], patch, label: patch.status ? "Cancel order" : "Record refund" }); return; }
    const issue = orderUpdateIssue(order, patch);
    if (issue) { notify(issue); setResult(issue); return; }
    updateOrder(order.id, patch);
  };
  const exportOrders = (ids?: string[]) => {
    const exportIds = ids ? new Set(ids) : null;
    const rows = exportIds ? orders.filter(o => exportIds.has(o.id)) : filtered;
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Order", "Date BDT", "Name", "Phone", "Address", "Area", "Status", "Payment method", "Payment status", "Courier", "Tracking", "Total BDT", "Items"],
      ...rows.map(o => [o.id, `${orderDate(o.created)} ${orderTime(o.created)}`, o.name, o.phone, o.address, o.city, o.status ?? "placed", o.method, o.paymentStatus ?? "cod_pending", o.courier ?? "Unassigned", o.trackingCode ?? "", o.total, o.lines.map(l => `${l.name}${l.variantLabel ? ` (${l.variantLabel})` : ""} x${l.qty}`).join("; ")]),
    ]);
    notify(`Exported ${rows.length} orders`);
  };
  const runBulk = () => {
    if (!bulkAction || !selected.length) return;
    const patch: Partial<Order> = bulkAction.startsWith("courier:") ? { courier: bulkAction.split(":")[1] as CourierName } : { status: bulkAction as OrderStatus };
    setPending({ ids: selected, patch, label: `Update ${selected.length} orders` });
  };
  const confirmBulk = () => {
    if (!pending) return;
    const report = bulkUpdateOrders(pending.ids, pending.patch);
    setResult(`${report.updated} updated.${report.skipped.length ? ` ${report.skipped.length} skipped: ${report.skipped[0].reason}` : ""}`);
    setSkippedResults(report.skipped);
    setSelected(report.skipped.map(x => x.id)); setPending(null); setBulkAction("");
  };

  return <div className="admin-orders-workspace">
    <PageHeading title="Orders" description="Review, prepare, and dispatch from one queue." count={orders.length}>
      <button className="admin-button" onClick={() => exportOrders()}><Icon name="download" className="h-4 w-4" />Export</button>
      {canWrite && <button className="admin-button admin-button-primary" onClick={() => change({ ...DEFAULT_FILTERS, queue: "unfulfilled", sort: "oldest" })}><Icon name="box" className="h-4 w-4" />Process orders<Icon name="arrow-right" className="h-3.5 w-3.5" /></button>}
    </PageHeading>

    <div className="admin-order-summary">
      {([{ label: "To fulfill", value: counts.unfulfilled, queue: "unfulfilled", icon: "bag", tone: "" }, { label: "Ready to ship", value: counts.ready, queue: "ready", icon: "box", tone: "green" }, { label: "Payment review", value: counts.unpaid, queue: "unpaid", icon: "card", tone: "amber" }, { label: "Needs attention", value: counts.issues, queue: "issues", icon: "alert", tone: "red" }] as const).map(item => <button key={item.label} onClick={() => change({ queue: item.queue })} className={filters.queue === item.queue ? "is-active" : ""}>
        <div><span>{item.label}</span><strong>{item.value.toLocaleString()}</strong></div><span className={`summary-symbol ${item.tone}`}><Icon name={item.icon} className="h-[19px] w-[19px]" /></span>
      </button>)}
    </div>

    <section className="admin-surface admin-order-list">
      <div className="admin-tabs" role="tablist" aria-label="Order queues">
        {([{ key: "all", label: "All orders" }, { key: "unfulfilled", label: "Unfulfilled" }, { key: "ready", label: "Ready to ship" }, { key: "unpaid", label: "Payment review" }, { key: "shipped", label: "In transit" }] as const).map(tab => <button key={tab.key} role="tab" aria-selected={filters.queue === tab.key} onClick={() => change({ queue: tab.key })}>{tab.label}<span>{counts[tab.key]}</span></button>)}
      </div>
      <div className="admin-table-toolbar">
        <div className="admin-search-field"><Icon name="search" className="h-4 w-4" /><input aria-label="Search orders" placeholder="Search order, name, phone, or product..." value={filters.q} onChange={e => change({ q: e.target.value })} />{filters.q && <button aria-label="Clear order search" onClick={() => change({ q: "" })}><Icon name="close" className="h-3.5 w-3.5" /></button>}<kbd>/</kbd></div>
        <div className="flex items-center gap-2"><button className={`admin-button ${showFilters ? "is-active" : ""}`} onClick={() => setShowFilters(v => !v)} aria-expanded={showFilters}><Icon name="filter" className="h-4 w-4" />Filters{activeFilterCount > 0 && <span className="admin-count">{activeFilterCount}</span>}</button><Select aria-label="Sort orders" className="admin-select" value={filters.sort} onChange={e => change({ sort: e.target.value })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="value">Highest value</option></Select><button className="admin-icon-button hidden sm:inline-flex" title={dense ? "Comfortable rows" : "Compact rows"} aria-label="Toggle table density" onClick={() => setDense(v => !v)}><Icon name="list" className="h-4 w-4" /></button></div>
      </div>
      {showFilters && <div className="admin-filter-row">
        <Field label="Payment"><Select className="admin-input" value={filters.payment} onChange={e => change({ payment: e.target.value })} aria-label="Filter payment status"><option value="all">All payments</option>{Object.entries(PAYMENT).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</Select></Field>
        <Field label="Courier"><Select className="admin-input" value={filters.courier} onChange={e => change({ courier: e.target.value })} aria-label="Filter courier"><option value="all">All couriers</option>{COURIERS.map(c => <option key={c}>{c}</option>)}</Select></Field>
        <Field label="Date"><Select className="admin-input" value={filters.date} onChange={e => change({ date: e.target.value })} aria-label="Filter order date"><option value="all">Any time</option><option value="today">Today (BDT)</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></Select></Field>
        <button className="admin-text-button self-end" onClick={() => change(DEFAULT_FILTERS)}>Clear filters</button>
      </div>}

      {selected.length > 0 && <div className="admin-bulk-toolbar"><div className="flex items-center gap-2"><span className="admin-count">{selected.length}</span><strong>selected</strong><button className="admin-text-button" onClick={() => setSelected([])}>Clear</button></div><div className="flex flex-wrap items-center gap-2">
        {canWrite && <><Select className="admin-select" value={bulkAction} onChange={e => setBulkAction(e.target.value)} aria-label="Bulk order action"><option value="">Choose action...</option><optgroup label="Fulfillment"><option value="confirmed">Confirm orders</option><option value="packed">Mark as packed</option><option value="shipped">Mark as shipped</option><option value="cancelled">Cancel orders</option></optgroup><optgroup label="Assign courier">{COURIERS.filter(c => c !== "Unassigned").map(c => <option key={c} value={`courier:${c}`}>{c}</option>)}</optgroup></Select><button disabled={!bulkAction} className="admin-button admin-button-primary" onClick={runBulk}>Apply</button></>}
        {can("dispatch.manage") && <button className="admin-button admin-button-primary" onClick={() => go(`/admin/dispatch?orders=${selected.join(",")}`)}><Icon name="truck" className="h-3.5 w-3.5" />Create batch</button>}
        <button className="admin-button" onClick={() => exportOrders(selected)}><Icon name="download" className="h-3.5 w-3.5" />Export selected</button>
      </div></div>}
      {allPageSelected && filtered.length > pageOrders.length && selected.length < filtered.length && <div className="admin-selection-hint">All {pageOrders.length} orders on this page selected. <button onClick={() => setSelected(filtered.map(o => o.id))}>Select all {filtered.length} matching orders</button></div>}
      {result && <div role="status" className="admin-inline-notice"><Icon name="info" className="h-4 w-4" /><span>{result}</span><button aria-label="Dismiss result" onClick={() => setResult("")}><Icon name="close" className="h-3.5 w-3.5" /></button></div>}
      {skippedResults.length > 0 && <details className="admin-skipped-results"><summary>Review {skippedResults.length} skipped orders</summary><ul>{skippedResults.map(item => <li key={item.id}><button className="admin-order-id" onClick={() => setOpenId(item.id)}>{item.id}</button><span>{item.reason}</span></li>)}</ul></details>}

      <div className={`admin-table-scroll ${dense ? "admin-table-dense" : ""}`}>
        {!isMobile && <table className="admin-data-table admin-orders-table"><thead><tr>
          <th className="selection-cell"><input type="checkbox" aria-label="Select page" checked={allPageSelected} onChange={togglePage} /></th><th>Order</th><th>Customer</th><th>Payment</th><th>Fulfillment</th><th>Courier</th><th className="text-right">Total</th><th className="w-12" />
        </tr></thead><tbody>{pageOrders.map(order => <tr key={order.id} data-order-id={order.id} className={selectedIds.has(order.id) ? "is-selected" : ""} onClick={event => { if ((event.target as HTMLElement).closest("button, a, select, input")) return; setOpenId(order.id); }}>
          <td className="selection-cell"><input type="checkbox" aria-label={`Select ${order.id}`} checked={selectedIds.has(order.id)} onChange={() => selectOne(order.id)} /></td>
          <td><button className="admin-order-id" onClick={() => setOpenId(order.id)}>{order.id}</button>{order.batchId && <span className="admin-batch-chip">{order.batchId}</span>}<span className="admin-cell-sub">{orderDate(order.created)} <span className="text-stone-400">{orderTime(order.created)}</span></span></td>
          <td><div className="flex items-center gap-2"><span className="admin-customer-avatar hidden 2xl:inline-flex">{order.name.split(" ").map(n => n[0]).slice(0, 2).join("")}</span><div><button className="admin-cell-title" onClick={() => setOpenId(order.id)}>{order.name}</button><span className="admin-cell-sub">{order.city === "dhaka" ? "Dhaka" : "Outside Dhaka"}{order.priority === "high" && <span className="ml-2 text-amber-700">Priority</span>}</span></div></div></td>
          <td><StatusControl order={order} payment onChange={value => mutate(order, { paymentStatus: value as PaymentStatus })} /><span className="admin-cell-sub">{order.method === "bkash" ? "bKash" : order.method === "nagad" ? "Nagad" : order.method === "cod" ? "Cash on delivery" : "Advance delivery"}</span></td>
          <td><StatusControl order={order} onChange={value => mutate(order, { status: value as OrderStatus })} /><span className="admin-cell-sub">{order.lines.reduce((s, l) => s + l.qty, 0)} {order.lines.reduce((s, l) => s + l.qty, 0) === 1 ? "item" : "items"}{isIssue(order, auditNow) && <span className="ml-2 text-amber-700">Needs review</span>}</span></td>
          <td><span className={order.courier && order.courier !== "Unassigned" ? "admin-cell-title" : "text-stone-400"}>{order.courier ?? "Unassigned"}</span><span className="admin-cell-sub font-mono">{order.trackingCode || "Not booked"}</span></td>
          <td className="text-right"><strong className="font-semibold tnum">{fmt(order.total)}</strong></td><td><button className="admin-icon-button" aria-label={`Open ${order.id}`} onClick={() => setOpenId(order.id)}><Icon name="chevron-right" className="h-4 w-4" /></button></td>
        </tr>)}</tbody></table>}
        {isMobile && <div className="admin-mobile-order-list">{pageOrders.map(order => <div className="admin-mobile-order" key={order.id}>
          <div className="admin-mobile-order-header"><span className="flex items-center gap-3"><input type="checkbox" aria-label={`Select ${order.id}`} checked={selectedIds.has(order.id)} onChange={() => selectOne(order.id)} /><button className="admin-order-id" onClick={() => setOpenId(order.id)}>{order.id}</button>{order.batchId && <span className="admin-batch-chip">{order.batchId}</span>}</span><span className="text-[10px] text-stone-500">{orderDate(order.created)} / {orderTime(order.created)}</span></div>
          <div className="admin-mobile-order-middle"><button className="min-w-0 flex-1 text-left" onClick={() => setOpenId(order.id)}><strong className="admin-cell-title">{order.name}</strong><span className="admin-cell-sub">{order.city === "dhaka" ? "Dhaka" : "Outside Dhaka"} / {order.lines.reduce((s, l) => s + l.qty, 0)} {order.lines.reduce((s, l) => s + l.qty, 0) === 1 ? "item" : "items"}</span></button><strong className="text-xs font-medium tnum">{fmt(order.total)}</strong><button className="admin-icon-button" aria-label={`Open ${order.id}`} onClick={() => setOpenId(order.id)}><Icon name="chevron-right" className="h-4 w-4" /></button></div>
          <div className="admin-mobile-order-footer"><StatusControl order={order} payment onChange={value => mutate(order, { paymentStatus: value as PaymentStatus })} /><StatusControl order={order} onChange={value => mutate(order, { status: value as OrderStatus })} /><span className="text-[9px] text-stone-500">{order.courier === "Unassigned" ? "No courier" : order.courier}</span></div>
        </div>)}</div>}
        {!filtered.length && <Empty title="No orders in this view"><p>Try a different search or clear the filters.</p><button className="admin-button mt-4" onClick={() => change(DEFAULT_FILTERS)}>Clear filters</button></Empty>}
      </div>

      <div className="admin-pagination"><span>Showing {filtered.length ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length.toLocaleString()} orders</span><div><label className="hidden sm:inline-flex items-center gap-2">Rows per page <Select className="admin-select" aria-label="Orders per page" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); setSelected([]); }}>{[25, 50, 100].map(n => <option key={n}>{n}</option>)}</Select></label><span>{currentPage} / {pageCount}</span><IconBtn icon="chevron-left" label="Previous page" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); setSelected([]); }} /><IconBtn icon="chevron-right" label="Next page" disabled={currentPage === pageCount} onClick={() => { setPage(currentPage + 1); setSelected([]); }} /></div></div>
    </section>
    <p className="admin-workspace-hint"><Icon name="info" className="h-3.5 w-3.5" />Click a status to update it. Open an order for delivery details and notes.</p>

    {openOrder && <OrderDrawer key={openOrder.id} order={openOrder} index={openIndex} count={filtered.length} onClose={() => setOpenId(null)} onNavigate={direction => setOpenId(filtered[openIndex + direction]?.id ?? null)} onStatus={patch => mutate(openOrder, patch)} />}
    {pending && <Confirm title={pending.label} description={pending.patch.paymentStatus === "refunded" ? "This records a refund only. It does not send money through a payment provider." : `${pending.ids.length} order${pending.ids.length > 1 ? "s" : ""} will be updated. Orders that do not meet dispatch requirements will be skipped and listed.`} confirmLabel={pending.label} danger={pending.patch.status === "cancelled" || pending.patch.paymentStatus === "refunded"} onClose={() => setPending(null)} onConfirm={confirmBulk} />}
  </div>;
}

function OrderDrawer({ order, index, count, onClose, onNavigate, onStatus }: { order: Order; index: number; count: number; onClose: () => void; onNavigate: (direction: -1 | 1) => void; onStatus: (patch: Partial<Order>) => void }) {
  const { can, updateOrder, staff, findProduct, notify } = useStore();
  const canWrite = can("orders.write");
  const [tab, setTab] = useState("details");
  const [draft, setDraft] = useState({ name: order.name, phone: order.phone, address: order.address, city: order.city, courier: order.courier ?? "Unassigned", trackingCode: order.trackingCode ?? "", assignee: order.assignee ?? "", priority: order.priority ?? "normal" });
  const [note, setNote] = useState("");
  const [issue, setIssue] = useState("");
  const [discardAction, setDiscardAction] = useState<(() => void) | null>(null);
  const savedVersion = useRef(order.updatedAt ?? order.created);
  const dirty = Object.entries(draft).some(([key, value]) => value !== (key === "courier" ? order.courier ?? "Unassigned" : key === "priority" ? order.priority ?? "normal" : (order as unknown as Record<string, unknown>)[key] ?? ""));
  const request = (action: () => void) => { if (dirty || note.trim()) setDiscardAction(() => action); else action(); };
  const set = (key: keyof typeof draft, value: string) => { setDraft(d => ({ ...d, [key]: value })); setIssue(""); };
  const save = () => {
    const patch = { ...draft, name: draft.name.trim(), phone: draft.phone.trim(), address: draft.address.trim(), courier: draft.courier as CourierName, priority: draft.priority as "normal" | "high" };
    const problem = orderUpdateIssue(order, patch);
    if (problem) { setIssue(problem); return; }
    if (updateOrder(order.id, patch, "Updated order details", savedVersion.current)) { savedVersion.current = Date.now(); setIssue(""); }
  };
  const changeStatus = (patch: Partial<Order>) => {
    if (dirty) { notify("Save or discard the detail changes before updating status."); return; }
    onStatus(patch);
  };
  useEffect(() => { if (!dirty) savedVersion.current = order.updatedAt ?? order.created; }, [order.updatedAt, dirty]);
  const meta = STATUS[order.status ?? "placed"];
  const next = "next" in meta ? meta.next : null;
  const copy = async () => { try { await navigator.clipboard.writeText(order.id); notify("Order number copied"); } catch { notify("Clipboard unavailable"); } };

  return <Overlay title={order.id} subtitle={`${orderDate(order.created)}, ${orderTime(order.created)} BDT`} onClose={() => request(onClose)} headerActions={<><span className="text-xs text-stone-500">{index + 1} / {count}</span><IconBtn icon="chevron-left" label="Previous order" disabled={index <= 0} onClick={() => request(() => onNavigate(-1))} /><IconBtn icon="chevron-right" label="Next order" disabled={index >= count - 1} onClick={() => request(() => onNavigate(1))} /></>} footer={<><span className="mr-auto text-xs text-stone-500">{dirty ? "Unsaved changes" : "All changes saved locally"}</span><button className="admin-button" onClick={() => request(onClose)}>Close</button>{canWrite && <button className="admin-button admin-button-primary" disabled={!dirty} onClick={save}>Save changes</button>}</>}>
    {discardAction && <div className="admin-discard-notice"><p>Discard unsaved changes?</p><button className="admin-button" onClick={() => setDiscardAction(null)}>Keep editing</button><button className="admin-button admin-button-danger" onClick={discardAction}>Discard</button></div>}
    {issue && <p role="alert" className="admin-form-error">{issue}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><StatusControl order={order} onChange={value => changeStatus({ status: value as OrderStatus })} /><StatusControl order={order} payment onChange={value => changeStatus({ paymentStatus: value as PaymentStatus })} /></div><IconBtn icon="copy" label="Copy order number" onClick={copy} /></div>
    {canWrite && next && <button className="admin-button admin-order-next" onClick={() => changeStatus({ status: next })}><Icon name={next === "shipped" ? "truck" : "check-circle"} className="h-4 w-4" /><span>{"action" in meta ? meta.action : "Update order"}</span><Icon name="arrow-right" className="ml-auto h-4 w-4" /></button>}
    <div className="admin-tabs admin-drawer-tabs" role="tablist" aria-label="Order details"><button role="tab" aria-selected={tab === "details"} onClick={() => setTab("details")}>Details</button><button role="tab" aria-selected={tab === "activity"} onClick={() => setTab("activity")}>Activity <span>{(order.events ?? []).length + 1}</span></button></div>
    {tab === "details" ? <div className="admin-drawer-sections">
      <section><div className="admin-section-title"><h3>Items</h3><span>{order.lines.reduce((s, l) => s + l.qty * (l.unitsPerPack ?? 1), 0)} pieces</span></div><div className="admin-order-items">{order.lines.map(line => { const p = findProduct(line.slug, true); return <div key={`${line.slug}::${line.variantId ?? line.unitsPerPack ?? 1}`}><ResponsiveImage src={p?.images[0] ?? "/img/kit.jpg"} alt="" sizes="39px" /><div className="min-w-0 flex-1"><p>{line.name}</p><small>{p?.sku ?? line.slug}{line.variantLabel ? ` · ${line.variantLabel}` : ""}</small></div><span className="text-xs text-stone-500">x{line.qty}</span><strong>{fmt(line.price * line.qty)}</strong></div>; })}</div><dl className="admin-order-totals"><div><dt>Subtotal</dt><dd>{fmt(order.subtotal)}</dd></div><div><dt>Delivery</dt><dd>{order.shipping ? fmt(order.shipping) : "Free"}</dd></div>{order.discount > 0 && <div><dt>Discount</dt><dd>-{fmt(order.discount)}</dd></div>}<div className="total"><dt>Total</dt><dd>{fmt(order.total)}</dd></div></dl></section>
      <section><div className="admin-section-title"><h3>Customer</h3><a className="admin-text-button" href={`tel:${order.phone}`}><Icon name="phone" className="h-3.5 w-3.5" />Call</a></div>{canWrite ? <div className="grid grid-cols-2 gap-3"><Field label="Full name"><input className="admin-input" value={draft.name} onChange={e => set("name", e.target.value)} /></Field><Field label="Phone number"><input className="admin-input" inputMode="tel" value={draft.phone} onChange={e => set("phone", e.target.value)} /></Field><div className="col-span-2"><Field label="Delivery address"><textarea className="admin-input" rows={2} value={draft.address} onChange={e => set("address", e.target.value)} /></Field></div><Field label="Delivery area"><Select className="admin-input" value={draft.city} onChange={e => set("city", e.target.value)}><option value="dhaka">Inside Dhaka</option><option value="outside">Outside Dhaka</option></Select></Field><Field label="Priority"><Select className="admin-input" value={draft.priority} onChange={e => set("priority", e.target.value)}><option value="normal">Normal</option><option value="high">High priority</option></Select></Field></div> : <div className="text-sm leading-relaxed text-stone-600"><p className="font-medium text-stone-900">{order.name}</p><p>{order.phone}</p><p>{order.address}</p></div>}</section>
      <section><div className="admin-section-title"><h3>Delivery & assignment</h3><Icon name="truck" className="h-4 w-4 text-stone-400" /></div>{canWrite ? <div className="grid grid-cols-2 gap-3"><Field label="Courier"><Select aria-label="Courier service" className="admin-input" value={draft.courier} onChange={e => set("courier", e.target.value)}>{COURIERS.map(c => <option key={c}>{c}</option>)}</Select></Field><Field label="Tracking number"><input aria-label="Courier tracking code" className="admin-input" value={draft.trackingCode} onChange={e => set("trackingCode", e.target.value)} placeholder="e.g. SF-104822" /></Field><div className="col-span-2"><Field label="Assigned to"><Select className="admin-input" value={draft.assignee} onChange={e => set("assignee", e.target.value)}><option value="">Unassigned</option>{staff.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field></div></div> : <p className="text-sm text-stone-600">{order.courier ?? "Unassigned"}{order.trackingCode ? ` / ${order.trackingCode}` : ""}</p>}{order.batchId && <p className="mb-2 text-xs text-stone-500">Batch <span className="font-mono">{order.batchId}</span> · <Link to="/admin/dispatch" className="admin-text-button">Open dispatch</Link></p>}
      <Link to={`/track?id=${order.id}&phone=${order.phone}`} className="admin-text-button mt-3 inline-flex">Open tracking page<Icon name="external" className="h-3.5 w-3.5" /></Link></section>
      <section><div className="admin-section-title"><h3>Internal notes</h3><span>Not shared with customer</span></div>{order.internalNote && <p className="admin-existing-note">{order.internalNote}</p>}{can("orders.note") && <><textarea aria-label="Add order note" className="admin-input" rows={2} placeholder="Add delivery instructions or a team note..." value={note} onChange={e => setNote(e.target.value)} /><div className="mt-2 flex justify-end"><button className="admin-button" disabled={!note.trim()} onClick={() => { if (updateOrder(order.id, { internalNote: [order.internalNote, note.trim()].filter(Boolean).join("\n") }, "Added internal note")) setNote(""); }}>Add note</button></div></>}</section>
    </div> : <ol className="admin-order-activity">{[...(order.events ?? [])].reverse().map(event => <li key={event.id}><i /><div><p>{event.label}</p><span>{event.actor} / {orderDate(event.at)}, {orderTime(event.at)}</span></div></li>)}<li><i /><div><p>Order created</p><span>{orderDate(order.created)}, {orderTime(order.created)}</span></div></li></ol>}
  </Overlay>;
}