import { categories as defaultCategories, products as defaultProducts, type Category, type Product } from "./data";

export type ProductHit = { product: Product; score: number; matched: string[] };
export type CategoryHit = { slug: string; name: string; blurb: string; img: string; count: number; score: number };
export type SearchResults = { products: ProductHit[]; categories: CategoryHit[]; total: number; exactSku: Product | null };

/** Words shoppers actually use, mapped onto the products that answer them. */
const ALIASES: Record<string, string[]> = {
  "samsung-30q-18650-3000mah": ["samsung", "30q", "li-ion", "lithium", "cell", "battery", "batteries", "3000mah", "high drain", "15a", "flat top", "rechargeable"],
  "lg-mj1-18650-3500mah": ["lg", "mj1", "cell", "battery", "3500mah", "lithium", "li-ion", "high capacity", "rechargeable"],
  "molicel-p42a-21700": ["molicel", "p42a", "21700", "4200mah", "45a", "high drain", "ebike", "e-bike", "power bank", "battery", "cell"],
  "lipo-3s-2200mah-rc": ["lipo", "3s", "2200mah", "30c", "rc", "drone", "plane", "xt60", "11.1v", "battery", "hobby"],
  "tp4056-type-c-charging-module": ["tp4056", "tp 4056", "type c", "usb c", "charger", "charging", "module", "1a", "protection", "dw01a", "lithium charger", "power module"],
  "3s-bms-20a-protection-board": ["bms", "3s", "20a", "protection", "balance", "board", "12v", "battery management", "li-ion pack", "overcharge"],
  "mt3608-boost-converter": ["mt3608", "boost", "converter", "step up", "dc dc", "28v", "adjustable", "power module", "voltage"],
  "4-slot-18650-smart-charger": ["charger", "4 slot", "lcd", "smart charger", "nimh", "li-ion", "capacity test", "18650 charger", "charging"],
  "h4-led-headlight-bulb-pair": ["h4", "9003", "led", "headlight", "bulb", "car", "6000k", "12000lm", "hi lo", "automotive", "light"],
  "h7-led-bulb-pair": ["h7", "led", "bulb", "canbus", "car", "headlight", "6500k", "automotive", "light"],
  "t10-w5w-led-parking-pair": ["t10", "w5w", "led", "parking", "side light", "number plate", "car", "bulb", "light"],
  "esp32-devkit-v1": ["esp32", "esp 32", "devkit", "wifi", "ble", "bluetooth", "microcontroller", "mcu", "cp2102", "wroom", "240mhz", "iot", "smart home", "board"],
  "arduino-nano-type-c": ["arduino", "nano", "atmega328p", "ch340", "microcontroller", "mcu", "type c", "board", "robot"],
  "hc-sr04-ultrasonic-sensor": ["hc sr04", "hc-sr04", "ultrasonic", "sensor", "distance", "range", "400cm", "robot", "obstacle", "5v"],
  "l298n-motor-driver": ["l298n", "motor", "driver", "dual", "2a", "dc motor", "h bridge", "robot", "controller"],
  "ina226-precision-power-monitor": ["ina226", "power monitor", "current", "voltage", "i2c", "16 bit", "sensor", "precision", "meter"],
  "spot-welder-pcb-18650": ["spot welder", "welding", "pcb", "nickel", "battery pack", "diy welder", "12v", "pulse", "tab"],
  "pure-nickel-strip-0-15mm": ["nickel", "strip", "pure nickel", "0.15mm", "welding", "battery pack", "spot welder", "tab"],
  "diy-power-bank-kit": ["power bank", "diy", "kit", "10000mah", "pd", "18w", "usb c", "case", "project", "beginner", "cells", "gift"],
  "smart-obstacle-robot-kit": ["robot", "obstacle", "car kit", "chassis", "nano", "l298n", "hc sr04", "science fair", "project", "kit", "stem", "school"],
  "esp32-home-automation-kit": ["home automation", "esp32", "relay", "4 channel", "hlk", "power supply", "bangla", "smart home", "kit", "project", "iot"],
  "12v-ups-for-router-kit": ["ups", "mini ups", "router", "wifi backup", "load shedding", "12v", "backup power", "kit", "project", "internet"],
};

const CATEGORY_ALIASES: Record<string, string[]> = {
  batteries: ["battery", "batteries", "cell", "cells", "li-ion", "lithium", "lipo", "18650", "21700", "power"],
  "charging-modules": ["charger", "charging", "bms", "tp4056", "boost", "converter", "protection", "power", "module"],
  "car-led": ["car", "led", "light", "lights", "bulb", "headlight", "automotive", "h4", "h7", "t10", "vehicle"],
  modules: ["module", "modules", "sensor", "mcu", "microcontroller", "esp32", "arduino", "driver", "board", "circuit"],
  "unique-parts": ["unique", "rare", "hard to find", "welder", "nickel", "ina226", "special", "unusual"],
  kits: ["kit", "kits", "project", "diy", "bundle", "starter", "beginner", "complete"],
};

const strip = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const tokenize = (s: string) => strip(s).split(" ").filter(Boolean);

type Doc = {
  product: Product;
  sku: string;
  name: string;
  nameTokens: string[];
  catTokens: string[];
  specTokens: string[];
  aliasTokens: string[];
  hay: string;
};

type SearchIndex = {
  docs: Doc[];
  categories: Category[];
  bySku: Map<string, Product>;
  categoryCounts: Map<string, number>;
};

// Catalog arrays are replaced on edits. Weak keys let old indexes be collected.
const indexCache = new WeakMap<Product[], WeakMap<Category[], SearchIndex>>();

function getIndex(catalogProducts: Product[], catalogCategories: Category[]): SearchIndex {
  let categoryCache = indexCache.get(catalogProducts);
  const cached = categoryCache?.get(catalogCategories);
  if (cached) return cached;
  if (!categoryCache) {
    categoryCache = new WeakMap<Category[], SearchIndex>();
    indexCache.set(catalogProducts, categoryCache);
  }

  const categories = catalogCategories.filter((c) => c.visible !== false);
  const byCategory = new Map(categories.map((category) => [category.slug, category]));
  const docs: Doc[] = [];
  const bySku = new Map<string, Product>();
  const categoryCounts = new Map<string, number>();
  for (const product of catalogProducts) {
    if (product.published === false || (byCategory.size > 0 && !byCategory.has(product.category))) continue;
    const name = strip(product.name);
    const catTokens = tokenize(byCategory.get(product.category)?.name ?? product.category);
    const specTokens = product.specs.flatMap(([k, v]) => [...tokenize(k), ...tokenize(v)]);
    const aliasTokens = [...(ALIASES[product.slug] ?? []), ...(product.aliases ?? [])].flatMap(tokenize);
    const sku = strip(product.sku);
    const hay = [name, product.sku.toLowerCase(), ...catTokens, ...specTokens, ...aliasTokens, strip(product.short)].join(" ");
    docs.push({ product, sku, name, nameTokens: tokenize(product.name), catTokens, specTokens, aliasTokens, hay });
    if (!bySku.has(sku)) bySku.set(sku, product);
    categoryCounts.set(product.category, (categoryCounts.get(product.category) ?? 0) + 1);
  }
  const index = { docs, categories, bySku, categoryCounts };
  categoryCache.set(catalogCategories, index);
  return index;
}

function termScore(doc: Doc, term: string): number {
  if (doc.sku === term) return 140;
  if (doc.sku.includes(term)) return 100;
  if (doc.nameTokens.some((t) => t === term)) return 62;
  if (doc.nameTokens.some((t) => t.startsWith(term))) return 46;
  if (doc.aliasTokens.includes(term)) return 42;
  if (doc.nameTokens.some((t) => t.includes(term))) return 34;
  if (doc.aliasTokens.some((t) => t.startsWith(term))) return 30;
  if (doc.catTokens.includes(term)) return 26;
  if (doc.specTokens.some((t) => t === term || t.startsWith(term))) return 20;
  if (doc.hay.includes(term)) return 11;
  return 0;
}

function matchesCategory(doc: Doc, terms: string[]): boolean {
  const aliases = CATEGORY_ALIASES[doc.product.category] ?? [];
  return terms.some((t) => doc.catTokens.includes(t) || aliases.includes(t)
    || doc.catTokens.some((c) => c.startsWith(t)) || aliases.some((a) => a.startsWith(t)));
}

function rank(doc: Doc, terms: string[]): { score: number; matched: string[] } | null {
  if (!terms.length) return null;
  let sum = 0;
  let misses = 0;
  const matched: string[] = [];
  for (const term of terms) {
    const points = termScore(doc, term);
    if (points) matched.push(term);
    else if (++misses > 1) return null;
    sum += points;
  }
  if (misses === terms.length) return null;
  const { stock, trending, reviews } = doc.product;
  let score = sum / terms.length;
  score *= stock > 0 ? 1.12 : 0.45;
  if (matchesCategory(doc, terms)) score *= 1.18;
  if (trending) score *= 1.06;
  if (stock > 0 && stock < 10) score *= 1.02;
  score += Math.min(reviews, 400) / 4000;
  return { score, matched };
}

export function search(
  query: string,
  limit = 6,
  catalogProducts: Product[] = defaultProducts,
  catalogCategories: Category[] = defaultCategories,
): SearchResults {
  const terms = tokenize(query);
  const empty: SearchResults = { products: [], categories: [], total: 0, exactSku: null };
  if (!terms.length) return empty;
  const trimmed = strip(query);
  const { docs, categories: activeCategories, bySku, categoryCounts } = getIndex(catalogProducts, catalogCategories);

  const exactSku = bySku.get(trimmed) ?? null;
  if (exactSku) {
    const c = activeCategories.find((x) => x.slug === exactSku.category);
    return {
      products: [{ product: exactSku, score: Infinity, matched: terms }],
      categories: c ? [{ slug: c.slug, name: c.name, blurb: c.blurb, img: c.img, count: categoryCounts.get(c.slug) ?? 0, score: 30 }] : [],
      total: 1,
      exactSku,
    };
  }

  const hits: ProductHit[] = [];
  const hitCounts = new Map<string, number>();
  for (const doc of docs) {
    const ranked = rank(doc, terms);
    if (!ranked) continue;
    hits.push({ product: doc.product, ...ranked });
    hitCounts.set(doc.product.category, (hitCounts.get(doc.product.category) ?? 0) + 1);
  }
  hits.sort((a, b) => b.score - a.score || b.product.reviews - a.product.reviews);

  const catHits: CategoryHit[] = activeCategories
    .map((c) => {
      const aliases = CATEGORY_ALIASES[c.slug] ?? [];
      const nameTokens = tokenize(c.name);
      let score = 0;
      for (const term of terms) {
        if (nameTokens.includes(term)) score += 40;
        else if (aliases.includes(term)) score += 34;
        else if (nameTokens.some((t) => t.startsWith(term))) score += 26;
        else if (aliases.some((a) => a.startsWith(term))) score += 20;
      }
      score += Math.min(hitCounts.get(c.slug) ?? 0, 6) * 6;
      const total = categoryCounts.get(c.slug) ?? 0;
      return { slug: c.slug, name: c.name, blurb: c.blurb, img: c.img, count: total, score };
    })
    .filter((c) => c.score >= 20)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  return { products: hits.slice(0, limit), categories: catHits, total: hits.length, exactSku };
}

export const POPULAR: string[] = ["18650", "TP4056", "ESP32", "H4 LED", "Power bank kit", "BMS", "Ultrasonic", "Nickel strip"];
