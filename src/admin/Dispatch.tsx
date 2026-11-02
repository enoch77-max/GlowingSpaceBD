import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "../router";
import { useStore, type Batch, type BatchPickup, type Order } from "../store";
import { fmt } from "../data";
import { Icon } from "../icons";
import { Select } from "../ui/Select";
import { useMobileLayout } from "../hooks/useMobileLayout";
import { Confirm, Empty, Field, IconBtn, Overlay, PageHeading } from "./ui";
import { PAYMENT, STATUS, orderDate, orderTime } from "./orderWorkflow";
import {
  PICKUP_WINDOWS,
  STEPS,
  batchCreateIssue,
  bdtToday,
  bdtTomorrow,
  codAmount,
  currentStep,
  dateLabel,
  pickupWindowLabel,
  reached,
  stepState,
  waitingOrder,
  type StepKey,
} from "./batches";
import { courierMode, requestCourierPickup, toParcel, type CourierKey } from "./courier";

const Pill = ({ tone, children }: { tone: string; children: ReactNode }) => <span className={`ds-pill tone-${tone}`}>{children}</span>;

const statusPill = (o: Order) => {
  const meta = STATUS[o.status ?? "placed"];
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
};
const paymentPill = (o: Order) => {
  const meta = PAYMENT[o.paymentStatus ?? "cod_pending"];
  return <Pill tone={meta.tone}>{meta.label}</Pill>;
};

const NEXT_STEP: Record<string, StepKey | undefined> = { placed: "confirm", confirmed: "pack", packed: "dispatch" };

function readiness(o: Order): { ok: boolean; text: string } {
  const step = NEXT_STEP[o.status ?? "placed"];
  if (!step) return { ok: false, text: "Closed" };
  const state = stepState(o, step);
  if (state.state === "ready") return { ok: true, text: `Ready · ${STEPS.find((s) => s.key === step)!.label}` };
  if (state.state === "blocked") return { ok: false, text: state.reason };
  return { ok: true, text: "Done" };
}

const COURIER_HINT = () => (courierMode() === "backend" ? "Live pickup through the courier API" : "Demo only · no parcel is sent");

export function DispatchPage() {
  const { can, orders, batches } = useStore();
  const { search } = useRouter();
  const isMobile = useMobileLayout();
  const canDispatch = can("dispatch.manage");
  const presetParam = search.get("orders") ?? "";
  const [selected, setSelected] = useState<string[]>(() => presetParam.split(",").filter(Boolean));
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("all");
  const [stage, setStage] = useState("all");
  const [composing, setComposing] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const waiting = useMemo(() => orders.filter(waitingOrder).sort((a, b) => a.created - b.created), [orders]);
  const term = query.trim().toLowerCase();
  const filtered = useMemo(() => waiting.filter((o) =>
    (area === "all" || o.city === area) &&
    (stage === "all" || (o.status ?? "placed") === stage) &&
    (!term || `${o.id} ${o.name} ${o.phone}`.toLowerCase().includes(term))), [waiting, area, stage, term]);
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const membersByBatch = useMemo(() => {
    const groups = new Map<string, Order[]>();
    for (const order of orders) {
      if (!order.batchId) continue;
      const members = groups.get(order.batchId);
      if (members) members.push(order);
      else groups.set(order.batchId, [order]);
    }
    return groups;
  }, [orders]);
  const activeBatches = useMemo(() => batches
    .filter((b) => {
      const members = membersByBatch.get(b.id) ?? [];
      return members.length > 0 && currentStep(members) !== "done";
    })
    .sort((a, b) => b.createdAt - a.createdAt), [batches, membersByBatch]);

  const dayStart = Date.parse(`${bdtToday()}T00:00:00+06:00`);
  const pickupsToday = batches.reduce((sum, b) => sum + b.pickupRequests.filter((r) => r.requestedAt >= dayStart).length, 0);
  const dispatchedToday = orders.filter((o) => o.status === "shipped" && (o.updatedAt ?? 0) >= dayStart).length;

  const selectedIds = useMemo(() => new Set(selected), [selected]);
  const selectedRows = waiting.filter((o) => selectedIds.has(o.id));
  const selectedCod = selectedRows.reduce((sum, o) => sum + codAmount(o), 0);
  const allVisibleSelected = visible.length > 0 && visible.every((o) => selectedIds.has(o.id));
  const toggleOne = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleVisible = () => setSelected((s) => {
    const pageIds = new Set(visible.map((o) => o.id));
    return allVisibleSelected ? s.filter((id) => !pageIds.has(id)) : Array.from(new Set([...s, ...pageIds]));
  });

  const openBatch = batches.find((b) => b.id === openId) ?? null;

  return (
    <div className="space-y-8">
      <PageHeading title="Dispatch" description="Confirm, pack and send orders together with one courier pickup.">
        {canDispatch && (
          <button type="button" className="admin-button admin-button-primary" disabled={!selected.length} onClick={() => setComposing(true)}>
            <Icon name="box" className="h-4 w-4" />
            Create batch{selected.length ? ` (${selected.length})` : ""}
          </button>
        )}
      </PageHeading>

      {courierMode() === "demo" && (
        <div className="admin-inline-notice">
          <Icon name="info" className="h-4 w-4" />
          <span><strong>Courier API not connected.</strong> Pickups are simulated here and no parcel reaches a courier. Connect the backend courier integration to send live pickups.</span>
        </div>
      )}

      <div className="admin-overview-stats">
        {[
          { label: "Waiting for a batch", value: waiting.length, sub: "Confirmed, packed or new" },
          { label: "Batches in progress", value: activeBatches.length, sub: `${batches.length} created in total` },
          { label: "Pickups requested today", value: pickupsToday, sub: "Across all batches" },
          { label: "Dispatched today", value: dispatchedToday, sub: "Handed to couriers (BDT)" },
        ].map((item) => (
          <div key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value.toLocaleString()}</strong>
            <small>{item.sub}</small>
          </div>
        ))}
      </div>

      <section>
        <h3 className="admin-section-heading">Active batches</h3>
        {activeBatches.length ? (
          <div className="batch-grid">
            {activeBatches.map((batch) => (
              <BatchCard
                key={batch.id}
                batch={batch}
                members={membersByBatch.get(batch.id) ?? []}
                canDispatch={canDispatch}
                onOpen={() => setOpenId(batch.id)}
              />
            ))}
          </div>
        ) : (
          <Empty title="No batches in progress">
            <p>Select orders below and create a batch to confirm, pack and send them together.</p>
          </Empty>
        )}
      </section>

      <section className="admin-surface">
        <div className="admin-tabs-line">
          <h3>Waiting for a batch</h3>
          <span className="text-xs text-stone-500">{filtered.length} of {waiting.length}</span>
        </div>
        <div className="admin-table-toolbar">
          <div className="admin-search-field">
            <Icon name="search" className="h-4 w-4" />
            <input aria-label="Search waiting orders" placeholder="Search order, name or phone..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select aria-label="Filter by area" className="admin-select" value={area} onChange={(e) => { setArea(e.target.value); setPage(1); }}>
              <option value="all">All areas</option>
              <option value="dhaka">Inside Dhaka</option>
              <option value="outside">Outside Dhaka</option>
            </Select>
            <Select aria-label="Filter by status" className="admin-select" value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }}>
              <option value="all">Any status</option>
              <option value="placed" data-tone="amber">New</option>
              <option value="confirmed" data-tone="blue">Confirmed</option>
              <option value="packed" data-tone="purple">Packed</option>
            </Select>
          </div>
        </div>
        {allVisibleSelected && filtered.length > visible.length && filtered.some((o) => !selectedIds.has(o.id)) && (
          <div className="admin-selection-hint">All {visible.length} orders on this page selected. <button onClick={() => setSelected((ids) => [...new Set([...ids, ...filtered.map((o) => o.id)])])}>Select all {filtered.length} matching orders</button></div>
        )}

        {visible.length ? (
          <>
            {!isMobile && <div className="adp-desktop admin-table-scroll">
              <table className="admin-data-table adp-table">
                <thead>
                  <tr>
                    <th className="selection-cell"><input type="checkbox" aria-label="Select all shown orders" checked={allVisibleSelected} onChange={toggleVisible} /></th>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Next step</th>
                    <th className="text-right">COD</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => {
                    const r = readiness(o);
                    return (
                      <tr key={o.id} className={selectedIds.has(o.id) ? "is-selected" : ""} onClick={(e) => { if (!(e.target as HTMLElement).closest("input,button")) toggleOne(o.id); }}>
                        <td className="selection-cell"><input type="checkbox" aria-label={`Select ${o.id}`} checked={selectedIds.has(o.id)} onChange={() => toggleOne(o.id)} /></td>
                        <td>
                          <span className="admin-order-id">{o.id}</span>
                          <span className="admin-cell-sub">{orderDate(o.created)} · {orderTime(o.created)}</span>
                        </td>
                        <td>
                          <span className="admin-cell-title">{o.name}</span>
                          <span className="admin-cell-sub">{o.city === "dhaka" ? "Inside Dhaka" : "Outside Dhaka"}</span>
                        </td>
                        <td>{statusPill(o)}</td>
                        <td>{paymentPill(o)}</td>
                        <td>
                          <span className={r.ok ? "text-emerald-800" : "text-amber-800"}>{r.text}</span>
                        </td>
                        <td className="text-right tnum">{fmt(codAmount(o))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>}
            {isMobile && <div className="adp-mobile admin-mobile-order-list">
              {visible.map((o) => {
                const r = readiness(o);
                return (
                  <label key={o.id} className="admin-mobile-order flex cursor-pointer items-start gap-3">
                    <input type="checkbox" aria-label={`Select ${o.id}`} checked={selectedIds.has(o.id)} onChange={() => toggleOne(o.id)} className="mt-1" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="admin-order-id">{o.id}</span>
                        <span className="text-xs font-medium tnum">{fmt(o.total)}</span>
                      </span>
                      <span className="admin-cell-title block">{o.name}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">{statusPill(o)}{paymentPill(o)}</span>
                      <span className={`mt-2 block text-[11px] ${r.ok ? "text-emerald-800" : "text-amber-800"}`}>{r.text}</span>
                    </span>
                  </label>
                );
              })}
            </div>}
            <div className="admin-pagination"><span>Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length.toLocaleString()} orders</span><div><span>{currentPage} / {pageCount}</span><IconBtn icon="chevron-left" label="Previous waiting-orders page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} /><IconBtn icon="chevron-right" label="Next waiting-orders page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} /></div></div>
          </>
        ) : (
          <Empty title="No orders waiting">
            <p>New orders and orders not yet in a batch appear here.</p>
          </Empty>
        )}
      </section>

      {selected.length > 0 && canDispatch && (
        <div className="admin-dispatch-bar" role="region" aria-label="Selected orders">
          <div className="min-w-0 truncate">
            <strong className="tnum">{selected.length}</strong> selected <span className="opacity-60">·</span> COD <span className="tnum">{fmt(selectedCod)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="admin-button admin-button-ghostdark" onClick={() => setSelected([])}>Clear</button>
            <button type="button" className="admin-button admin-button-light" onClick={() => setComposing(true)}>
              <Icon name="truck" className="h-4 w-4" />
              Create batch
            </button>
          </div>
        </div>
      )}

      {composing && (
        <BatchComposer
          orderIds={selected}
          onClose={() => setComposing(false)}
          onCreated={(id) => {
            setComposing(false);
            setSelected([]);
            setOpenId(id);
          }}
        />
      )}

      {openBatch && <BatchDetail key={openBatch.id} batch={openBatch} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function BatchCard({ batch, members, canDispatch, onOpen }: { batch: Batch; members: Order[]; canDispatch: boolean; onOpen: () => void }) {
  const { runBatchStep } = useStore();
  const total = members.length;
  const step = currentStep(members);
  const readyFor = (key: StepKey) => members.filter((o) => stepState(o, key).state === "ready").length;
  const blocked = members.filter((o) => STEPS.some((s) => stepState(o, s.key).state === "blocked" && !reached(o, s.key))).length;
  const nextMeta = STEPS.find((s) => s.key === step);
  const pickups = batch.pickupRequests.length;

  return (
    <article className="batch-card">
      <header className="batch-card-head">
        <div className="min-w-0">
          <span className="batch-card-id">{batch.id}</span>
          <p className="batch-card-name truncate">{batch.name}</p>
          <p className="batch-card-meta">{pickupWindowLabel(batch.pickup)}</p>
        </div>
        <Pill tone={batch.courier === "Steadfast" ? "blue" : batch.courier === "Pathao" ? "green" : "purple"}>{batch.courier}</Pill>
      </header>

      <div className="batch-steps">
        {STEPS.map((s) => {
          const done = members.filter((o) => reached(o, s.key)).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return (
            <div key={s.key} className="batch-step">
              <span>{s.label}</span>
              <strong>{done}/{total}</strong>
              <div className="batch-track"><b style={{ width: `${pct}%` }} /></div>
            </div>
          );
        })}
      </div>

      <footer className="batch-card-foot">
        <span className="min-w-0 truncate">
          {step === "done" && "All orders dispatched"}
          {step === "waiting" && `${blocked} order${blocked === 1 ? "" : "s"} need attention`}
          {(step === "confirm" || step === "pack") && `${readyFor(step)} ready to ${step === "confirm" ? "confirm" : "pack"}`}
          {step === "dispatch" && `${readyFor("dispatch")} ready to send`}
          {pickups > 0 && ` · ${pickups} pickup${pickups === 1 ? "" : "s"}`}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {canDispatch && nextMeta && (step === "confirm" || step === "pack") && (
            <button type="button" className="admin-button admin-button-primary" onClick={() => runBatchStep(batch.id, step)}>
              {nextMeta.action} ({readyFor(step)})
            </button>
          )}
          <button type="button" className="admin-button" onClick={onOpen}>
            {step === "dispatch" ? "Review & dispatch" : "Open"}
          </button>
        </div>
      </footer>
    </article>
  );
}

function BatchComposer({ orderIds, onClose, onCreated }: { orderIds: string[]; onClose: () => void; onCreated: (id: string) => void }) {
  const { orders, settings, createBatch } = useStore();
  const [ids, setIds] = useState<string[]>(orderIds);
  const [name, setName] = useState("");
  const [courier, setCourier] = useState<CourierKey>(settings.defaultCourier);
  const [date, setDate] = useState(bdtTomorrow());
  const [windowKey, setWindowKey] = useState<BatchPickup["window"]>("morning");
  const [address, setAddress] = useState(settings.pickupAddress);
  const [contactName, setContactName] = useState(settings.pickupContact);
  const [contactPhone, setContactPhone] = useState(settings.pickupPhone);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const byId = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const rows = ids.map((id) => byId.get(id)).filter((o): o is Order => Boolean(o));
  const pageCount = Math.max(1, Math.ceil(rows.length / 50));
  const currentPage = Math.min(page, pageCount);
  const visibleRows = rows.slice((currentPage - 1) * 50, currentPage * 50);
  const eligible = rows.filter((o) => !batchCreateIssue(o));
  const cod = eligible.reduce((sum, o) => sum + codAmount(o), 0);
  const defaultName = `${PICKUP_WINDOWS[windowKey].label} · ${dateLabel(date)}`;

  const submit = () => {
    if (!eligible.length) return setError("Add at least one order that is not already in a batch.");
    if (address.trim().length < 8) return setError("Enter the pickup address.");
    if (!/^01[3-9]\d{8}$/.test(contactPhone)) return setError("Enter a valid pickup contact number, like 01700000000.");
    const result = createBatch({
      name: name || defaultName,
      courier,
      pickup: { date, window: windowKey, address: address.trim(), contactName: contactName.trim(), contactPhone },
      orderIds: eligible.map((o) => o.id),
    });
    if (result?.id) onCreated(result.id);
  };

  return (
    <Overlay
      wide
      title="New batch"
      subtitle="Confirm, pack and send these orders with one courier pickup."
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-xs text-stone-500">{eligible.length} order{eligible.length === 1 ? "" : "s"} · COD {fmt(cod)}</span>
          <button type="button" className="admin-button" onClick={onClose}>Cancel</button>
          <button type="button" className="admin-button admin-button-primary" disabled={!eligible.length} onClick={submit}>Create batch</button>
        </>
      }
    >
      {error && <p role="alert" className="admin-form-error mb-5">{error}</p>}
      <div className="grid gap-7 lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-4">
          <h3 className="admin-form-section-label">Courier pickup</h3>
          <Field label="Batch name" hint="Optional">
            <input className="admin-input" value={name} placeholder={defaultName} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Courier">
            <Select value={courier} onChange={(e) => setCourier(e.target.value as CourierKey)}>
              <option value="Steadfast" data-hint={COURIER_HINT()}>Steadfast</option>
              <option value="Pathao" data-hint={COURIER_HINT()}>Pathao</option>
              <option value="RedX" data-hint={COURIER_HINT()}>RedX</option>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pickup date">
              <input type="date" className="admin-input" min={bdtToday()} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Time window">
              <Select value={windowKey} onChange={(e) => setWindowKey(e.target.value as BatchPickup["window"])}>
                <option value="morning" data-hint={PICKUP_WINDOWS.morning.hours}>Morning</option>
                <option value="afternoon" data-hint={PICKUP_WINDOWS.afternoon.hours}>Afternoon</option>
                <option value="evening" data-hint={PICKUP_WINDOWS.evening.hours}>Evening</option>
              </Select>
            </Field>
          </div>
          <Field label="Pickup address">
            <textarea className="admin-input" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact name">
              <input className="admin-input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </Field>
            <Field label="Contact phone">
              <input className="admin-input" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="admin-form-section-label">Orders</h3>
            <span className="text-xs text-stone-500 tnum">{eligible.length} ready</span>
          </div>
          {rows.length ? (
            <ul className="admin-compose-list">
              {visibleRows.map((o) => {
                const issue = batchCreateIssue(o);
                return (
                  <li key={o.id}>
                    <div className="min-w-0 flex-1">
                      <span className="admin-order-id block">{o.id}</span>
                      <span className="admin-cell-sub block truncate">{o.name} · {o.city === "dhaka" ? "Dhaka" : "Outside Dhaka"}</span>
                    </div>
                    {issue ? (
                      <span className="text-[11px] text-red-700">{issue}</span>
                    ) : (
                      <span className="text-xs font-medium tnum">{fmt(codAmount(o))}</span>
                    )}
                    <IconBtn icon="close" label={`Remove ${o.id}`} onClick={() => setIds((list) => list.filter((x) => x !== o.id))} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty title="No orders selected" />
          )}
          {rows.length > 50 && <div className="admin-pagination"><span>Showing {(currentPage - 1) * 50 + 1}-{Math.min(currentPage * 50, rows.length)} of {rows.length}</span><div><span>{currentPage} / {pageCount}</span><IconBtn icon="chevron-left" label="Previous selected-orders page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} /><IconBtn icon="chevron-right" label="Next selected-orders page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} /></div></div>}
          <p className="text-xs leading-relaxed text-stone-500">
            Orders already in a batch or closed are skipped. Confirmation and payment checks run again at each step, so a late payment never gets dispatched by mistake.
          </p>
        </div>
      </div>
    </Overlay>
  );
}

function BatchDetail({ batch, onClose }: { batch: Batch; onClose: () => void }) {
  const { orders, can, runBatchStep, removeFromBatch, applyDispatchResult, notify } = useStore();
  const canDispatch = can("dispatch.manage");
  const members = useMemo(() => orders.filter((o) => o.batchId === batch.id), [orders, batch.id]);
  const [note, setNote] = useState("");
  const [askDispatch, setAskDispatch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderQuery, setOrderQuery] = useState("");
  const [orderPage, setOrderPage] = useState(1);

  const filteredMembers = useMemo(() => {
    const term = orderQuery.trim().toLowerCase();
    if (!term) return members;
    return members.filter((order) => `${order.id} ${order.name} ${order.phone} ${order.trackingCode ?? ""}`.toLowerCase().includes(term));
  }, [members, orderQuery]);
  const memberPageCount = Math.max(1, Math.ceil(filteredMembers.length / 50));
  const currentMemberPage = Math.min(orderPage, memberPageCount);
  const visibleMembers = filteredMembers.slice((currentMemberPage - 1) * 50, currentMemberPage * 50);

  const readyDispatch = members.filter((o) => stepState(o, "dispatch").state === "ready");
  const codTotal = readyDispatch.reduce((sum, o) => sum + codAmount(o), 0);
  const attempt = batch.pickupRequests.length + 1;
  const stage = currentStep(members);

  const doStep = (step: "confirm" | "pack") => {
    const result = runBatchStep(batch.id, step);
    if (result) setNote(`${result.updated} updated${result.skipped.length ? `, ${result.skipped.length} skipped` : ""}.`);
  };

  const sendPickup = async () => {
    setAskDispatch(false);
    const ids = readyDispatch.map((o) => o.id);
    if (!ids.length) return;
    setBusy(true);
    setNote("Requesting pickup from the courier…");
    try {
      const result = await requestCourierPickup({
        batchId: batch.id,
        courier: batch.courier as CourierKey,
        attempt,
        idempotencyKey: `${batch.id}:pickup:${attempt}`,
        pickup: batch.pickup,
        parcels: readyDispatch.map(toParcel),
      });
      const summary = applyDispatchResult(batch.id, result, ids, courierMode());
      if (summary) {
        setNote(`${summary.booked} parcel${summary.booked === 1 ? "" : "s"} booked${summary.failed ? `, ${summary.failed} rejected by the courier. Correct them and dispatch again.` : "."} Pickup ${result.pickupRef ?? "not issued"}.`);
      }
    } catch (error) {
      setNote(error instanceof Error ? error.message : "The courier request failed. Nothing was marked dispatched.");
      notify("Pickup request failed. No order was changed.");
    } finally {
      setBusy(false);
    }
  };

  const requests = [...batch.pickupRequests].reverse();

  return (
    <Overlay
      wide
      title={batch.id}
      subtitle={`${batch.courier} · ${pickupWindowLabel(batch.pickup)}`}
      onClose={onClose}
      footer={<button type="button" className="admin-button" onClick={onClose}>Close</button>}
    >
      <div className="space-y-7">
        {note && <div role="status" className="admin-inline-notice"><Icon name="info" className="h-4 w-4" /><span>{note}</span></div>}
        {stage === "done" && <div className="admin-inline-notice"><Icon name="check-circle" className="h-4 w-4" /><span>Every order in this batch is dispatched or closed.</span></div>}

        <section>
          <h3 className="admin-form-section-label">Progress</h3>
          <div className="batch-stage-grid">
            {STEPS.map((s, i) => {
              const ready = members.filter((o) => stepState(o, s.key).state === "ready");
              const blocked = members.filter((o) => stepState(o, s.key).state === "blocked");
              const waiting = members.filter((o) => stepState(o, s.key).state === "waiting");
              const done = members.filter((o) => reached(o, s.key)).length;
              const isDispatch = s.key === "dispatch";
              return (
                <div key={s.key} className="batch-stage">
                  <div className="flex items-center justify-between">
                    <span className="batch-stage-index">{i + 1}</span>
                    <span className="text-xs tnum text-stone-500">{done}/{members.length} done</span>
                  </div>
                  <h4>{s.label}</h4>
                  <p>
                    {ready.length} ready
                    {blocked.length > 0 && <span className="text-amber-800"> · {blocked.length} need attention</span>}
                    {waiting.length > 0 && <span className="text-stone-500"> · {waiting.length} waiting on earlier step</span>}
                  </p>
                  {isDispatch && members.some((o) => o.parcelError) && (
                    <p className="text-amber-800">Includes parcels the courier rejected earlier.</p>
                  )}
                  {canDispatch && (
                    <button
                      type="button"
                      disabled={!ready.length || busy}
                      className={`admin-button justify-center ${ready.length ? "admin-button-primary" : ""}`}
                      onClick={() => (isDispatch ? setAskDispatch(true) : doStep(s.key as "confirm" | "pack"))}
                    >
                      {s.action}{ready.length ? ` (${ready.length})` : ""}
                    </button>
                  )}
                  {blocked.length > 0 && (
                    <ul className="batch-blocked" aria-label={`Needs attention for ${s.label}`}>
                      {blocked.slice(0, 3).map((o) => {
                        const state = stepState(o, s.key) as { state: "blocked"; reason: string };
                        return (
                          <li key={o.id} className="batch-blocked-row">
                            <div className="min-w-0">
                              <span className="font-mono text-[11px] font-semibold">{o.id}</span>
                              <span className="block">{state.reason}</span>
                            </div>
                            {canDispatch && o.status !== "shipped" && (
                              <button type="button" className="admin-text-button shrink-0" onClick={() => removeFromBatch(batch.id, o.id)}>Remove</button>
                            )}
                          </li>
                        );
                      })}
                      {blocked.length > 3 && <li className="text-stone-500">and {blocked.length - 3} more in the table below</li>}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="batch-panel">
          <h3 className="admin-form-section-label">Pickup</h3>
          <dl className="batch-facts">
            <div><dt>When</dt><dd>{pickupWindowLabel(batch.pickup)}</dd></div>
            <div><dt>Address</dt><dd>{batch.pickup.address}</dd></div>
            <div><dt>Contact</dt><dd>{batch.pickup.contactName} · {batch.pickup.contactPhone}</dd></div>
          </dl>
          {requests.length ? (
            <ol className="batch-requests">
              {requests.map((r) => (
                <li key={r.id}>
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-xs font-semibold">{r.ref}</span>
                    <span className="admin-cell-sub block">
                      Attempt {r.attempt} · {new Date(r.requestedAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {r.by}
                    </span>
                  </div>
                  <span className="text-xs tnum">{r.booked} booked{r.failed ? ` · ${r.failed} rejected` : ""}</span>
                  {r.mode === "demo" && <Pill tone="gray">Demo</Pill>}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-stone-500">No pickup requested yet.</p>
          )}
        </section>

        <section>
          <h3 className="admin-form-section-label">Orders in this batch ({members.length})</h3>
          {members.length ? (
            <>
            {(members.length > 50 || orderQuery) && <div className="admin-search-field mb-3"><Icon name="search" className="h-4 w-4" /><input aria-label="Search batch orders" placeholder="Search order, name, phone or tracking..." value={orderQuery} onChange={(e) => { setOrderQuery(e.target.value); setOrderPage(1); }} /></div>}
            <div className="admin-table-scroll">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Tracking</th>
                    <th className="text-right">COD</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className="admin-order-id">{o.id}</span>
                      </td>
                      <td>
                        <span className="admin-cell-title">{o.name}</span>
                        <span className="admin-cell-sub">{o.city === "dhaka" ? "Dhaka" : "Outside Dhaka"}</span>
                      </td>
                      <td>{statusPill(o)}</td>
                      <td>{paymentPill(o)}</td>
                      <td className="text-xs">
                        {o.trackingCode ? <span className="font-mono">{o.trackingCode}</span> : o.parcelError ? <span className="text-red-800">{o.parcelError}</span> : <span className="text-stone-400">Not booked</span>}
                      </td>
                      <td className="text-right tnum">{fmt(codAmount(o))}</td>
                      <td>
                        {canDispatch && o.status !== "shipped" && o.status !== "delivered" && (
                          <IconBtn icon="close" label={`Remove ${o.id} from batch`} onClick={() => removeFromBatch(batch.id, o.id)} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filteredMembers.length && <Empty title="No matching batch orders" />}
            {filteredMembers.length > 50 && <div className="admin-pagination"><span>Showing {(currentMemberPage - 1) * 50 + 1}-{Math.min(currentMemberPage * 50, filteredMembers.length)} of {filteredMembers.length}</span><div><span>{currentMemberPage} / {memberPageCount}</span><IconBtn icon="chevron-left" label="Previous batch-orders page" disabled={currentMemberPage === 1} onClick={() => setOrderPage(currentMemberPage - 1)} /><IconBtn icon="chevron-right" label="Next batch-orders page" disabled={currentMemberPage === memberPageCount} onClick={() => setOrderPage(currentMemberPage + 1)} /></div></div>}
            </>
          ) : (
            <Empty title="This batch is empty" />
          )}
        </section>

        <section>
          <h3 className="admin-form-section-label">Activity</h3>
          <ol className="admin-order-activity">
            {[...batch.events].reverse().map((e) => (
              <li key={e.id}>
                <i />
                <div>
                  <p>{e.label}</p>
                  <span>{e.actor} · {orderDate(e.at)}, {orderTime(e.at)}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {askDispatch && (
        <Confirm
          title={`Dispatch ${readyDispatch.length} parcel${readyDispatch.length === 1 ? "" : "s"}?`}
          description={`${batch.courier} will receive ${readyDispatch.length} parcel${readyDispatch.length === 1 ? "" : "s"} and a pickup request for ${pickupWindowLabel(batch.pickup)}. Only parcels the courier accepts are marked shipped. Cash to collect on delivery: ${fmt(codTotal)}.`}
          confirmLabel="Dispatch and request pickup"
          onConfirm={sendPickup}
          onClose={() => setAskDispatch(false)}
        />
      )}
    </Overlay>
  );
}
