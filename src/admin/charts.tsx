import { useMemo, useState } from "react";
import { fmt, type Category, type Product } from "../data";
import type { Order } from "../store";

export interface DailyPoint {
  dateLabel: string;
  iso: string;
  revenue: number;
  profit: number;
  orders: number;
}

const chartDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const DAY_MS = 86_400_000;

/** Builds a daily time-series from stored orders without synthetic filler. */
export function buildDailySeries(orders: Order[], products: Product[], days: 7 | 30 | 90, showFinance: boolean): DailyPoint[] {
  const costMap = showFinance ? new Map(products.map((p) => [p.slug, p.cost ?? Math.round(p.price * 0.68)])) : null;
  const now = new Date();
  const buckets: (DailyPoint & { start: number; cost: number })[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.push({ start: d.getTime(), iso: d.toISOString().slice(0, 10), dateLabel: chartDate.format(d), revenue: 0, profit: 0, orders: 0, cost: 0 });
  }

  for (const order of orders) {
    if (order.status === "cancelled" || order.created < buckets[0].start || order.created >= buckets[buckets.length - 1].start + DAY_MS) continue;
    let lo = 0, hi = buckets.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (buckets[mid].start <= order.created) lo = mid + 1;
      else hi = mid;
    }
    // The preceding bucket can overlap around daylight-saving transitions.
    for (let index = lo - 1; index >= 0 && order.created < buckets[index].start + DAY_MS; index--) {
      const bucket = buckets[index];
      bucket.revenue += order.total;
      bucket.orders++;
      if (costMap) bucket.cost += order.lines.reduce((total, line) => {
        const unitCost = costMap.get(line.slug);
        return total + (line.cost ?? (unitCost === undefined ? Math.round(line.price * 0.68) : unitCost * (line.unitsPerPack ?? 1))) * line.qty;
      }, 0);
    }
  }
  return buckets.map(({ start: _start, cost, ...point }) => ({ ...point, profit: showFinance ? Math.max(0, point.revenue - cost) : 0 }));
}

export function MiniSparkline({ values, color = "#181814" }: { values: number[]; color?: string }) {
  if (values.length < 2) return null;
  const w = 84;
  const h = 28;
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values, min + 1);
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = pts[pts.length - 1].split(",");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-[84px] shrink-0 select-none" aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts.join(" ")} />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}

export function RevenueAreaChart({
  series,
  metric,
  onMetricChange,
  range,
  onRangeChange,
  canViewFinance,
}: {
  series: DailyPoint[];
  metric: "revenue" | "profit" | "orders";
  onMetricChange: (m: "revenue" | "profit" | "orders") => void;
  range: 7 | 30 | 90;
  onRangeChange: (r: 7 | 30 | 90) => void;
  canViewFinance: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const W = 720;
  const H = 252;
  const padL = 58;
  const padR = 18;
  const padT = 18;
  const padB = 34;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const values = series.map((d) => (metric === "revenue" ? d.revenue : metric === "profit" ? d.profit : d.orders));
  const rawMax = Math.max(...values, metric === "orders" ? 5 : 1000);
  const niceMax = metric === "orders"
    ? Math.ceil(rawMax / 2) * 2
    : Math.ceil(rawMax / 1000) * 1000;

  const coords = series.map((_, i) => {
    const x = padL + (series.length === 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
    const y = padT + plotH - (values[i] / (niceMax || 1)) * plotH;
    return { x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = coords.length
    ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(padT + plotH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`
    : "";

  const strokeColor = metric === "profit" ? "#059669" : metric === "orders" ? "#d97706" : "#181814";
  const gradId = `chart-grad-${metric}`;

  const activeIdx = hoverIdx !== null && hoverIdx < series.length ? hoverIdx : series.length - 1;
  const activePoint = series[activeIdx];
  const activeCoord = coords[activeIdx];

  // Pick at most 6 evenly spaced X-axis ticks so labels never touch or overlap
  const tickIndices = useMemo(() => {
    if (series.length <= 7) return series.map((_, i) => i);
    const count = 6;
    const out: number[] = [];
    for (let k = 0; k < count; k++) {
      out.push(Math.round((k / (count - 1)) * (series.length - 1)));
    }
    return Array.from(new Set(out));
  }, [series]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));
  const fmtTick = (v: number) => {
    if (metric === "orders") return String(v);
    if (v >= 1000) return `৳${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return `৳${v}`;
  };

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Performance</p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-lg font-extrabold text-stone-900">
              {metric === "revenue" ? "Revenue" : metric === "profit" ? "Gross profit" : "Orders per day"}
            </h3>
            {activePoint && (
              <span className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 tnum">
                <span className="text-stone-500">{activePoint.dateLabel}:</span>
                <strong className="font-extrabold text-stone-900">
                  {metric === "orders" ? `${activePoint.orders} orders` : fmt(metric === "profit" ? activePoint.profit : activePoint.revenue)}
                </strong>
                {metric !== "orders" && <span className="text-stone-400">· {activePoint.orders} ord</span>}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full bg-stone-100 p-1" role="group" aria-label="Chart metric">
            {(
              [
                ["revenue", "Revenue"],
                ...(canViewFinance ? [["profit", "Profit"] as const] : []),
                ["orders", "Orders"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => onMetricChange(key)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${metric === key ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-full bg-stone-100 p-1" role="group" aria-label="Date range">
            {([7, 30, 90] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRangeChange(r)}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${range === r ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"}`}
              >
                {r}D
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[230px] w-full select-none sm:h-[252px]"
          role="img"
          aria-label={`${metric} over the last ${range} days`}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal reference gridlines + Y labels */}
          {yTicks.map((tick) => {
            const y = padT + plotH - (tick / (niceMax || 1)) * plotH;
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  x2={W - padR}
                  y1={y}
                  y2={y}
                  stroke={tick === 0 ? "#d6d3cd" : "#ece9e2"}
                  strokeDasharray={tick === 0 ? undefined : "4 4"}
                  strokeWidth="1"
                />
                <text
                  x={padL - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-stone-400 text-[11px] font-semibold tnum"
                >
                  {fmtTick(tick)}
                </text>
              </g>
            );
          })}

          {/* Area & Line */}
          {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active hover vertical guide & marker */}
          {activeCoord && (
            <g>
              <line
                x1={activeCoord.x}
                x2={activeCoord.x}
                y1={padT}
                y2={padT + plotH}
                stroke={strokeColor}
                strokeOpacity="0.28"
                strokeDasharray="3 3"
                strokeWidth="1.2"
              />
              <circle cx={activeCoord.x} cy={activeCoord.y} r="5.5" fill="#fff" stroke={strokeColor} strokeWidth="2.5" />
            </g>
          )}

          {/* X-axis non-overlapping date ticks */}
          {tickIndices.map((idx) => {
            const c = coords[idx];
            const pt = series[idx];
            if (!c || !pt) return null;
            return (
              <text
                key={pt.iso}
                x={c.x}
                y={H - 10}
                textAnchor={idx === 0 ? "start" : idx === series.length - 1 ? "end" : "middle"}
                className="fill-stone-400 text-[11px] font-semibold"
              >
                {pt.dateLabel}
              </text>
            );
          })}

          {/* Invisible hit columns for smooth pointer scrubbing */}
          {coords.map((c, idx) => {
            const stepW = plotW / Math.max(series.length, 1);
            return (
              <rect
                key={series[idx].iso}
                x={c.x - stepW / 2}
                y={padT}
                width={Math.max(stepW, 8)}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(idx)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

const SLICE_COLORS = ["#181814", "#f59e0b", "#059669", "#7c3aed", "#0284c7", "#e11d48"];

export function CategoryDonutChart({
  categories,
  products,
  orders,
}: {
  categories: Category[];
  products: Product[];
  orders: Order[];
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const breakdown = useMemo(() => {
    const prodCat = new Map<string, string>();
    products.forEach((p) => prodCat.set(p.slug, p.category));

    const totals = new Map<string, number>();
    categories.forEach((c) => totals.set(c.slug, 0));

    orders
      .filter((o) => o.status !== "cancelled")
      .forEach((o) => {
        o.lines.forEach((l) => {
          const cat = prodCat.get(l.slug) ?? "modules";
          totals.set(cat, (totals.get(cat) ?? 0) + l.price * l.qty);
        });
      });

    const rows = categories.map((c, i) => ({
      slug: c.slug,
      name: c.name,
      value: totals.get(c.slug) ?? 0,
      skus: products.filter((p) => p.category === c.slug).length,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    })).sort((a, b) => b.value - a.value);

    const grand = rows.reduce((s, r) => s + r.value, 0) || 1;
    return rows.map((r) => ({ ...r, pct: Math.round((r.value / grand) * 100), share: r.value / grand, grand }));
  }, [categories, products, orders]);

  const grandTotal = breakdown[0]?.grand ?? 0;
  const focused = breakdown.find((b) => b.slug === activeSlug) ?? null;

  const r = 68;
  const circ = 2 * Math.PI * r;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Categories</p>
          <h3 className="mt-1 text-lg font-extrabold text-stone-900">Revenue by category</h3>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700 tnum">
          {categories.length} aisles
        </span>
      </div>

      <div className="mt-5 grid items-center gap-6 sm:grid-cols-[188px_1fr]">
        <div className="relative mx-auto h-[188px] w-[188px] shrink-0">
          <svg viewBox="0 0 188 188" className="h-full w-full -rotate-90 select-none" aria-label="Category revenue share">
            <circle cx="94" cy="94" r={r} fill="none" stroke="#f1efe9" strokeWidth="22" />
            {breakdown.map((item, index) => {
              const len = Math.max(0, item.share * circ - 3);
              const precedingShare = breakdown.slice(0, index).reduce((sum, entry) => sum + entry.share, 0);
              const offset = -precedingShare * circ;
              const dimmed = activeSlug !== null && activeSlug !== item.slug;
              return (
                <circle
                  key={item.slug}
                  cx="94"
                  cy="94"
                  r={r}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={activeSlug === item.slug ? "25" : "22"}
                  strokeDasharray={`${len} ${circ}`}
                  strokeDashoffset={offset}
                  strokeOpacity={dimmed ? 0.32 : 1}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setActiveSlug(item.slug)}
                  onMouseLeave={() => setActiveSlug(null)}
                />
              );
            })}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <span className="max-w-[110px] truncate text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">
              {focused ? focused.name : "Revenue"}
            </span>
            <span className="mt-0.5 text-base font-extrabold text-stone-900 tnum">
              {fmt(focused ? focused.value : grandTotal)}
            </span>
            <span className="text-[11px] font-semibold text-stone-500 tnum">
              {focused ? `${focused.pct}% share` : "100% total"}
            </span>
          </div>
        </div>

        <ul className="space-y-2.5">
          {breakdown.map((item) => (
            <li
              key={item.slug}
              onMouseEnter={() => setActiveSlug(item.slug)}
              onMouseLeave={() => setActiveSlug(null)}
              className={`flex items-center justify-between gap-3 rounded-xl px-2.5 py-1.5 text-xs transition ${activeSlug === item.slug ? "bg-stone-100" : "hover:bg-stone-50"}`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="truncate font-bold text-stone-800">{item.name}</span>
                <span className="shrink-0 text-[11px] text-stone-400">({item.skus})</span>
              </span>
              <span className="flex shrink-0 items-center gap-3 tnum">
                <span className="font-semibold text-stone-500">{item.pct}%</span>
                <span className="w-16 text-right font-extrabold text-stone-900">{fmt(item.value)}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PaymentAndFulfillmentCards({ orders }: { orders: Order[] }) {
  const activeOrders = orders.filter((o) => o.status !== "cancelled");
  const totalVol = activeOrders.reduce((s, o) => s + o.total, 0) || 1;

  const methods = [
    { key: "cod", label: "Cash on Delivery", color: "#059669", badge: "bg-emerald-50 text-emerald-800" },
    { key: "bkash", label: "bKash Prepay", color: "#db2777", badge: "bg-pink-50 text-pink-800" },
    { key: "nagad", label: "Nagad Prepay", color: "#ea580c", badge: "bg-orange-50 text-orange-800" },
    { key: "advance", label: "Advance Delivery", color: "#57534e", badge: "bg-stone-100 text-stone-800" },
  ].map((m) => {
    const subset = activeOrders.filter((o) => o.method === m.key);
    const vol = subset.reduce((s, o) => s + o.total, 0);
    return { ...m, count: subset.length, vol, pct: Math.round((vol / totalVol) * 100) };
  });

  const stages = [
    { key: "placed", label: "Placed / New", color: "bg-amber-400" },
    { key: "confirmed", label: "Confirmed", color: "bg-sky-500" },
    { key: "packed", label: "Packed", color: "bg-violet-500" },
    { key: "shipped", label: "On the Way", color: "bg-emerald-500" },
    { key: "delivered", label: "Delivered", color: "bg-stone-900" },
  ].map((st) => {
    const count = activeOrders.filter((o) => (o.status ?? "placed") === st.key).length;
    return { ...st, count, pct: activeOrders.length ? Math.round((count / activeOrders.length) * 100) : 0 };
  });

  const dhakaCount = activeOrders.filter((o) => o.city === "dhaka").length;
  const dhakaPct = activeOrders.length ? Math.round((dhakaCount / activeOrders.length) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Hybrid Payment Mix */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Payments</p>
            <h3 className="mt-1 text-lg font-extrabold text-stone-900">Payment methods</h3>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 tnum">
            {activeOrders.filter((o) => o.paymentStatus === "paid").length}/{activeOrders.length} settled
          </span>
        </div>

        {/* Stacked SVG / bar */}
        <div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-stone-100 p-0.5 gap-0.5" role="img" aria-label="Payment channel volume share">
          {methods.filter((m) => m.vol > 0).map((m) => (
            <div
              key={m.key}
              style={{ width: `${Math.max(m.pct, 4)}%`, backgroundColor: m.color }}
              className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
              title={`${m.label}: ${fmt(m.vol)} (${m.pct}%)`}
            />
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {methods.map((m) => (
            <div key={m.key} className="rounded-xl border border-stone-200/80 bg-paper/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="truncate text-xs font-bold text-stone-800">{m.label}</span>
                </span>
                <span className="shrink-0 text-[11px] font-extrabold text-stone-600 tnum">{m.pct}%</span>
              </div>
              <p className="mt-2 text-base font-extrabold text-stone-900 tnum">{fmt(m.vol)}</p>
              <p className="text-[11px] text-stone-500 tnum">{m.count} order{m.count === 1 ? "" : "s"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Fulfillment Pipeline & Geography */}
      <div className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">Delivery</p>
            <h3 className="mt-1 text-lg font-extrabold text-stone-900">Fulfillment</h3>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700 tnum">
            Dhaka {dhakaPct}% · Nationwide {100 - dhakaPct}%
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {stages.map((st) => (
            <div key={st.key}>
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-stone-700">{st.label}</span>
                <span className="font-semibold text-stone-500 tnum">{st.count} orders ({st.pct}%)</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className={`h-full rounded-full transition-all duration-300 ${st.color}`} style={{ width: `${Math.max(st.count > 0 ? 6 : 0, st.pct)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
