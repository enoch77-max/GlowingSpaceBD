import { useMemo, useState } from "react";
import { Link } from "../router";
import { useStore } from "../store";
import { fmt } from "../data";
import { Icon } from "../icons";
import { PageHeading } from "./ui";
import { MiniSparkline, RevenueAreaChart, CategoryDonutChart, buildDailySeries, PaymentAndFulfillmentCards } from "./charts";

export function Overview() {
  const { can, orders, catalogProducts, catalogCategories } = useStore();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [metric, setMetric] = useState<"revenue" | "profit" | "orders">("revenue");
  const finance = can("finance.read");
  const series = useMemo(() => buildDailySeries(orders, catalogProducts, range, finance), [orders, catalogProducts, range, finance]);
  const revenue = series.reduce((s, p) => s + p.revenue, 0);
  const profit = series.reduce((s, p) => s + p.profit, 0);
  const count = series.reduce((s, p) => s + p.orders, 0);
  const open = orders.filter(o => ["placed", "confirmed", "packed"].includes(o.status ?? "placed")).length;
  if (!can("analytics.read")) return null;
  return <div>
    <PageHeading title="Overview" description="A clear view of how your store is doing."><Link to="/admin/orders" className="admin-button">View orders<Icon name="arrow-right" className="h-4 w-4" /></Link></PageHeading>
    <div className="admin-overview-stats">{[{ label: `Revenue / ${range} days`, value: fmt(revenue), sub: "Total order value", spark: series.slice(-10).map(p => p.revenue) }, ...(finance ? [{ label: "Gross profit", value: fmt(profit), sub: "Before operating costs", spark: series.slice(-10).map(p => p.profit) }] : []), { label: "Orders", value: count.toLocaleString(), sub: `${open} awaiting fulfillment`, spark: series.slice(-10).map(p => p.orders) }, { label: "Average order value", value: fmt(count ? revenue / count : 0), sub: `${catalogProducts.length} products in catalog`, spark: [] }].map(item => <div key={item.label}><span>{item.label}</span><div className="flex items-center justify-between gap-3"><strong>{item.value}</strong>{item.spark.length > 0 && <MiniSparkline values={item.spark} color="#2d6557" />}</div><small>{item.sub}</small></div>)}</div>
    <div className="admin-overview-chart"><RevenueAreaChart series={series} metric={metric === "profit" && !finance ? "revenue" : metric} onMetricChange={setMetric} range={range} onRangeChange={setRange} canViewFinance={finance} /></div>
    <div className="mt-6"><CategoryDonutChart orders={orders} products={catalogProducts} categories={catalogCategories} /></div>
    <div className="mt-6"><PaymentAndFulfillmentCards orders={orders} /></div>
  </div>;
}