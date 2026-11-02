import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { after, before, test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server, data, search, charts, workflow, image;

before(async () => {
  server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "silent" });
  [data, search, charts, workflow, image] = await Promise.all([
    server.ssrLoadModule("/src/data.ts"),
    server.ssrLoadModule("/src/search.ts"),
    server.ssrLoadModule("/src/admin/charts.tsx"),
    server.ssrLoadModule("/src/admin/orderWorkflow.ts"),
    server.ssrLoadModule("/src/ResponsiveImage.tsx"),
  ]);
});
after(async () => { await server?.close(); });

test("ranked search keeps aliases, exact SKUs, category counts and empty results", () => {
  const { products, categories } = data;
  assert.deepEqual(search.search("", 6, products, categories), { products: [], categories: [], total: 0, exactSku: null });
  const exact = search.search("gs-bat-001", 6, products, categories);
  assert.equal(exact.total, 1);
  assert.equal(exact.exactSku.sku, "GS-BAT-001");
  assert.equal(exact.categories[0].count, 4);
  assert.equal(search.search("wifi board", 6, products, categories).products[0].product.slug, "esp32-devkit-v1");
  assert.equal(search.search("load shedding", 6, products, categories).products[0].product.slug, "12v-ups-for-router-kit");
  assert.equal(search.search("unlikely-part-zzzz", 6, products, categories).total, 0);
});

test("cached search indexes refresh when products or categories are replaced", () => {
  const { products, categories } = data;
  search.search("battery", 6, products, categories);
  const changed = products.map(product => product.sku === "GS-BAT-001" ? { ...product, aliases: ["brighttestalias"], price: 123 } : product);
  const aliasHit = search.search("brighttestalias", 6, changed, categories);
  assert.equal(aliasHit.products[0].product.price, 123);
  assert.equal(search.search("brighttestalias", 6, products, categories).total, 0);
  const hidden = categories.map(category => category.slug === "batteries" ? { ...category, visible: false } : category);
  assert.ok(!search.search("samsung", 100, changed, hidden).products.some(hit => hit.product.sku === "GS-BAT-001"));
  const draft = changed.map(product => product.sku === "GS-BAT-001" ? { ...product, published: false } : product);
  assert.ok(!search.search("brighttestalias", 100, draft, categories).products.some(hit => hit.product.sku === "GS-BAT-001"));
});

function referenceSeries(orders, products, days, finance) {
  const costs = new Map(products.map(product => [product.slug, product.cost ?? Math.round(product.price * 0.68)]));
  const now = new Date();
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const matching = orders.filter(order => order.status !== "cancelled" && order.created >= day.getTime() && order.created < day.getTime() + 86400000);
    const revenue = matching.reduce((sum, order) => sum + order.total, 0);
    const cost = matching.reduce((sum, order) => sum + order.lines.reduce((total, line) => total + (costs.get(line.slug) ?? Math.round(line.price * 0.68)) * line.qty, 0), 0);
    points.push({ dateLabel: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), iso: day.toISOString().slice(0, 10), revenue, profit: finance ? Math.max(0, revenue - cost) : 0, orders: matching.length });
  }
  return points;
}

test("single-pass chart aggregation matches the original calculation", () => {
  const now = Date.now();
  const orders = Array.from({ length: 1200 }, (_, i) => ({
    id: `GS${i}`, created: now - (i % 105) * 86400000, total: 100 + i,
    status: i % 13 === 0 ? "cancelled" : "confirmed",
    lines: [{ slug: data.products[i % data.products.length].slug, qty: (i % 3) + 1, price: 200 }],
  }));
  for (const days of [7, 30, 90]) for (const finance of [false, true]) {
    assert.deepEqual(charts.buildDailySeries(orders, data.products, days, finance), referenceSeries(orders, data.products, days, finance));
  }
});

test("reused number and date formatters preserve visible output", () => {
  for (const number of [0, 45, 1234.4, 1234567.9, -13.5]) {
    assert.equal(data.fmt(number), "৳" + Math.round(number).toLocaleString("en-IN"));
  }
  const timestamp = Date.UTC(2026, 0, 3, 19, 15);
  assert.equal(workflow.orderDate(timestamp), new Date(timestamp).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short" }));
  assert.equal(workflow.orderTime(timestamp), new Date(timestamp).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", minute: "2-digit" }));
});

test("product images always resolve to a shippable asset", () => {
  const local = renderToStaticMarkup(createElement(image.ResponsiveImage, { src: "/img/kit.jpg", alt: "Kit", sizes: "50vw" }));
  assert.match(local, /src="\/img\/kit\.jpg"/);
  const remote = renderToStaticMarkup(createElement(image.ResponsiveImage, { src: "https://example.com/custom.jpg", alt: "Custom" }));
  assert.match(remote, /src="https:\/\/example\.com\/custom\.jpg"/);
  assert.equal(image.heroPrefetchUrl("/img/kit.jpg"), "/img/kit.jpg");
  for (const name of ["18650", "carled", "charging", "esp32", "kit", "sensor"]) {
    assert.ok(existsSync(`public/img/${name}.jpg`));
  }
});