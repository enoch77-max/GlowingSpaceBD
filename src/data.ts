import type { IconName } from "./icons";

export type Pay = "cod" | "prepay";

export type InventoryMode = "single" | "shared_units" | "independent" | "shared_stock";

export interface ProductVariant {
  id: string;
  label: string;
  unitsPerPack: number;
  price: number;
  compareAtPrice?: number;
  stock?: number;
  lowStockAt?: number;
  cost?: number;
  enabled?: boolean;
}

export interface Product {
  inventoryMode?: InventoryMode;
  variants?: ProductVariant[];
  inventoryVersion?: number;
  /** Show an authenticity badge only when this is explicitly enabled. */
  original?: boolean;
  /** Customer-facing quality/compatibility note for non-original products. */
  qualityNote?: string;
  slug: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  mrp?: number;
  cost?: number;
  stock: number;
  lowStockAt?: number;
  pay: Pay;
  images: string[];
  short: string;
  specs: [string, string][];
  rating: number;
  reviews: number;
  trending?: boolean;
  kit?: boolean;
  published?: boolean;
  aliases?: string[];
  brand?: string;
  tags?: string[];
  attrs?: Record<string, string>;
  sold?: number;
  views?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  trashed?: boolean;
  seoTitle?: string;
  seoKeywords?: string;
  seoDescription?: string;
}

export interface Category {
  slug: string;
  name: string;
  blurb: string;
  img: string;
  icon?: IconName;
  visible?: boolean;
  parent?: string;
  order?: number;
}

export type HeroTheme = "sand" | "ink" | "mint" | "amber";

export interface HeroSlideConfig {
  id: string;
  slug: string;
  label: string;
  eyebrow: string;
  title: [string, string];
  body: string;
  theme: HeroTheme;
  chips: [IconName, string][];
  tag: string;
  active: boolean;
}

export interface CouponRule {
  code: string;
  type: "percent" | "flat";
  value: number;
  minSubtotal: number;
  active: boolean;
  used: number;
  maxUses?: number;
  note?: string;
  startsAt?: number;
  expiresAt?: number;
}

export interface StoreSettings {
  storeName: string;
  announcementText: string;
  supportHours: string;
  whatsappNumber: string;
  dispatchHourBdt: number;
  showDispatchCountdown: boolean;
  dhakaDeliveryFee: number;
  outsideDeliveryFee: number;
  freeDhakaThreshold: number;
  autoPrepayAboveBdt: number;
  enableCod: boolean;
  enableBkash: boolean;
  enableNagad: boolean;
  enableAdvanceShipping: boolean;
  marqueePromises: string[];
  faqs: [string, string][];
  pickupAddress: string;
  pickupContact: string;
  pickupPhone: string;
  defaultCourier: "Steadfast" | "Pathao" | "RedX";
  // Ported from Universal Shop settings matrix
  siteTagline: string;
  currencySymbol: string;
  currencyCode: string;
  currencyPosition: "before" | "after";
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  returnDays: number;
  taxEnabled: boolean;
  taxLabel: string;
  taxRate: number;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  businessHours: string;
  mapEmbedUrl: string;
  social: Record<string, string>;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  gaId: string;
  allowIndexing: boolean;
  announcementLink: string;
  footerAbout: string;
  copyrightText: string;
  productsPerPage: number;
  guestCheckout: boolean;
  reviewsAutoApprove: boolean;
  deliveryInfo: string;
  returnPolicy: string;
  logoDark: string;
  favicon: string;
  ogImage: string;
  mailFromName: string;
  mailFromAddress: string;
  orderNotificationEmail: string;
  notifyCustomerEmail: boolean;
  bkashMode: "manual" | "api";
  nagadMode: "manual" | "api";
  bkashManualNumber: string;
  nagadManualNumber: string;
  checkoutNote: string;
  checkoutPaymentMode: "manual" | "eps";
  epsSandbox: boolean;
}

const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800`;
const local = (n: string) => `/img/${n}.jpg`;

export const IMG = {
  bat1: local("18650"), bat2: px(698485), bat3: local("18650"), bat4: px(35673093), charger: local("charging"), charging: local("charging"),
  pcb1: px(40068137), pcb2: px(1432794), pcb3: px(6636477), pcb4: px(18372332), pcb5: px(1432678),
  pcb6: px(40068133), chip: "https://images.pexels.com/photos/163170/board-printed-circuit-board-computer-electronics-163170.jpeg?auto=compress&cs=tinysrgb&w=800",
  car1: local("carled"), car2: px(20771125), car3: px(31968459),
  esp32: local("esp32"), sensor: local("sensor"), kit: local("kit"),
};

export const STUDIO_GALLERY: { label: string; url: string }[] = [
  { label: "18650 Cells Studio", url: IMG.bat1 },
  { label: "Charging Module Studio", url: IMG.charging },
  { label: "Car LED Headlights", url: IMG.car1 },
  { label: "ESP32 Dev Board", url: IMG.esp32 },
  { label: "Ultrasonic Sensor", url: IMG.sensor },
  { label: "DIY Power Bank Kit", url: IMG.kit },
  { label: "LiPo Pack", url: IMG.bat4 },
  { label: "Driver PCB", url: IMG.pcb1 },
];

export const categories: Category[] = [
  { slug: "batteries", name: "Batteries", blurb: "18650, 21700, LiPo cells", img: IMG.bat1, icon: "battery", visible: true },
  { slug: "charging-modules", name: "Charging Circuits", blurb: "TP4056, BMS, boost", img: IMG.charger, icon: "bolt", visible: true },
  { slug: "car-led", name: "Car LED Lights", blurb: "H4, H7, fog, DRL", img: IMG.car1, icon: "car", visible: true },
  { slug: "modules", name: "Circuits & Modules", blurb: "Sensors, drivers, MCUs", img: IMG.esp32, icon: "chip", visible: true },
  { slug: "unique-parts", name: "Unique Parts", blurb: "Hard-to-find in BD", img: IMG.sensor, icon: "spark", visible: true },
  { slug: "kits", name: "Project Kits", blurb: "Everything in one box", img: IMG.kit, icon: "box", visible: true },
];

export const products: Product[] = [
  { slug: "samsung-30q-18650-3000mah", sku: "GS-BAT-001", name: "Samsung 30Q 18650 3000mAh Li-ion Cell", category: "batteries", price: 450, mrp: 550, cost: 310, stock: 64, lowStockAt: 15, pay: "cod", images: [IMG.bat1, IMG.bat2, IMG.bat3], short: "Genuine high-drain 15A cell. Tested capacity, flat top.", specs: [["Capacity", "3000 mAh"], ["Max discharge", "15 A"], ["Nominal voltage", "3.6 V"], ["Top", "Flat"], ["Origin", "Korea (genuine)"]], rating: 4.8, reviews: 126, trending: true, published: true },
  { slug: "lg-mj1-18650-3500mah", sku: "GS-BAT-002", name: "LG MJ1 18650 3500mAh Cell", category: "batteries", price: 520, cost: 365, stock: 22, lowStockAt: 10, pay: "cod", images: [IMG.bat1, IMG.bat4], short: "High-capacity cell for power banks and flashlights.", specs: [["Capacity", "3500 mAh"], ["Max discharge", "10 A"], ["Nominal voltage", "3.635 V"]], rating: 4.7, reviews: 84, trending: true, published: true },
  { slug: "molicel-p42a-21700", sku: "GS-BAT-003", name: "Molicel P42A 21700 4200mAh", category: "batteries", price: 890, cost: 640, stock: 6, lowStockAt: 8, pay: "prepay", images: [IMG.bat1, IMG.bat4], short: "45A beast for e-bike packs and high-power builds.", specs: [["Capacity", "4200 mAh"], ["Max discharge", "45 A"], ["Size", "21700"]], rating: 4.9, reviews: 31, published: true },
  { slug: "lipo-3s-2200mah-rc", sku: "GS-BAT-004", name: "LiPo 3S 2200mAh 30C RC Battery", category: "batteries", price: 1650, cost: 1180, stock: 9, lowStockAt: 8, pay: "prepay", images: [IMG.bat4, IMG.bat1], short: "XT60 connector, ideal for RC planes & drones.", specs: [["Cells", "3S (11.1 V)"], ["Capacity", "2200 mAh"], ["C-rating", "30C"], ["Connector", "XT60"]], rating: 4.6, reviews: 18, published: true },
  { slug: "tp4056-type-c-charging-module", sku: "GS-CHG-001", name: "TP4056 Type-C 1A Charging Module", category: "charging-modules", price: 45, cost: 24, stock: 320, lowStockAt: 40, pay: "cod", images: [IMG.pcb3, IMG.pcb1], short: "With protection IC. The classic single-cell charger.", specs: [["Input", "5 V Type-C"], ["Charge current", "1 A"], ["Protection", "DW01A + FS8205"]], rating: 4.8, reviews: 412, trending: true, published: true },
  { slug: "3s-bms-20a-protection-board", sku: "GS-CHG-002", name: "3S 20A BMS Protection Board", category: "charging-modules", price: 180, cost: 105, stock: 75, lowStockAt: 15, pay: "cod", images: [IMG.pcb5, IMG.pcb3], short: "Balance + overcharge protection for 12V packs.", specs: [["Config", "3S"], ["Current", "20 A"], ["Balance", "Yes"]], rating: 4.5, reviews: 97, trending: true, published: true },
  { slug: "mt3608-boost-converter", sku: "GS-CHG-003", name: "MT3608 2A DC-DC Boost Converter", category: "charging-modules", price: 60, cost: 34, stock: 0, lowStockAt: 20, pay: "cod", images: [IMG.pcb6, IMG.pcb5], short: "Step 2–24V up to 28V. Adjustable trim pot.", specs: [["Input", "2–24 V"], ["Output", "Up to 28 V"], ["Current", "2 A"]], rating: 4.4, reviews: 140, published: true },
  { slug: "4-slot-18650-smart-charger", sku: "GS-CHG-004", name: "4-Slot 18650 Smart LCD Charger", category: "charging-modules", price: 1150, cost: 790, stock: 12, lowStockAt: 8, pay: "prepay", images: [IMG.charger, IMG.bat1], short: "Per-slot LCD, capacity test, Li-ion/NiMH.", specs: [["Slots", "4 independent"], ["Display", "LCD per slot"], ["Chemistry", "Li-ion / NiMH"]], rating: 4.7, reviews: 44, trending: true, published: true },
  { slug: "h4-led-headlight-bulb-pair", sku: "GS-CAR-001", name: "H4 LED Headlight Bulb (Pair) 6000K", category: "car-led", price: 2200, mrp: 2600, cost: 1480, stock: 15, lowStockAt: 8, pay: "prepay", images: [IMG.car1, IMG.car2], short: "Hi/Lo beam, 12,000 lm, fanned cooling. Plug & play.", specs: [["Socket", "H4 (9003)"], ["Colour temp", "6000 K"], ["Output", "12,000 lm / pair"], ["Voltage", "12–24 V"]], rating: 4.6, reviews: 58, trending: true, published: true },
  { slug: "h7-led-bulb-pair", sku: "GS-CAR-002", name: "H7 LED Bulb (Pair) Canbus", category: "car-led", price: 1950, cost: 1320, stock: 8, lowStockAt: 8, pay: "prepay", images: [IMG.car2, IMG.car3], short: "Error-free Canbus driver for modern cars.", specs: [["Socket", "H7"], ["Canbus", "Yes"], ["Colour temp", "6500 K"]], rating: 4.5, reviews: 23, published: true },
  { slug: "t10-w5w-led-parking-pair", sku: "GS-CAR-003", name: "T10 W5W LED Parking Light (Pair)", category: "car-led", price: 150, cost: 75, stock: 200, lowStockAt: 25, pay: "cod", images: [IMG.car3, IMG.car1], short: "Bright white side & number-plate lights.", specs: [["Socket", "T10 / W5W"], ["Colour", "Cool white"]], rating: 4.4, reviews: 176, published: true },
  { slug: "esp32-devkit-v1", sku: "GS-MOD-001", name: "ESP32 DevKit V1 (WiFi + BLE)", category: "modules", price: 590, cost: 410, stock: 40, lowStockAt: 12, pay: "cod", images: [IMG.esp32, IMG.pcb4], short: "Dual-core 240MHz. CP2102 USB.", specs: [["MCU", "ESP32-WROOM-32"], ["Wireless", "WiFi + BT 4.2"], ["USB", "CP2102 Micro-USB"]], rating: 4.8, reviews: 203, trending: true, published: true },
  { slug: "arduino-nano-type-c", sku: "GS-MOD-002", name: "Arduino Nano (CH340, Type-C)", category: "modules", price: 380, cost: 255, stock: 55, lowStockAt: 15, pay: "cod", images: [IMG.esp32, IMG.chip], short: "ATmega328P, soldered headers.", specs: [["MCU", "ATmega328P"], ["USB", "Type-C (CH340)"]], rating: 4.6, reviews: 150, published: true },
  { slug: "hc-sr04-ultrasonic-sensor", sku: "GS-MOD-003", name: "HC-SR04 Ultrasonic Sensor", category: "modules", price: 95, cost: 55, stock: 4, lowStockAt: 15, pay: "cod", images: [IMG.sensor, IMG.pcb2], short: "2–400cm range finding.", specs: [["Range", "2–400 cm"], ["Voltage", "5 V"]], rating: 4.5, reviews: 260, published: true },
  { slug: "l298n-motor-driver", sku: "GS-MOD-004", name: "L298N Dual Motor Driver", category: "modules", price: 180, cost: 110, stock: 60, lowStockAt: 15, pay: "cod", images: [IMG.pcb1, IMG.pcb6], short: "Drive 2 DC motors up to 2A each.", specs: [["Channels", "2"], ["Current", "2 A / ch"]], rating: 4.5, reviews: 188, published: true },
  { slug: "ina226-precision-power-monitor", sku: "GS-UNQ-001", name: "INA226 Precision Power Monitor", category: "unique-parts", price: 420, cost: 270, stock: 7, lowStockAt: 8, pay: "prepay", images: [IMG.pcb6, IMG.pcb3], short: "16-bit I²C current/voltage sensing. Rare in BD.", specs: [["Interface", "I²C"], ["Bus voltage", "0–36 V"], ["Resolution", "16-bit"]], rating: 4.9, reviews: 12, published: true },
  { slug: "spot-welder-pcb-18650", sku: "GS-UNQ-002", name: "DIY Spot Welder Control Board", category: "unique-parts", price: 1450, cost: 980, stock: 3, lowStockAt: 6, pay: "prepay", images: [IMG.charging, IMG.bat1], short: "Build your own nickel-strip welder for packs.", specs: [["Input", "12 V car battery"], ["Pulse", "Adjustable 0–99 levels"]], rating: 4.7, reviews: 9, trending: true, published: true },
  { slug: "pure-nickel-strip-0-15mm", sku: "GS-UNQ-003", name: "Pure Nickel Strip 0.15mm (1m)", category: "unique-parts", price: 160, cost: 90, stock: 90, lowStockAt: 20, pay: "cod", images: [IMG.bat1, IMG.charging], short: "Pure Ni, not plated steel. Verified.", specs: [["Thickness", "0.15 mm"], ["Width", "8 mm"], ["Length", "1 m"]], rating: 4.8, reviews: 66, published: true },
  { slug: "diy-power-bank-kit", sku: "GS-KIT-001", name: "DIY 10,000mAh Power Bank Kit", category: "kits", price: 1290, mrp: 1500, cost: 880, stock: 18, lowStockAt: 8, pay: "cod", images: [IMG.kit, IMG.bat1, IMG.pcb3], short: "3× 18650, 2-way PD board, case, nickel strip & guide.", specs: [["Includes", "3× cells, PD board, case, strip"], ["Output", "18W PD + USB-A"], ["Skill level", "Beginner"]], rating: 4.9, reviews: 72, kit: true, trending: true, published: true },
  { slug: "smart-obstacle-robot-kit", sku: "GS-KIT-002", name: "Obstacle-Avoiding Robot Car Kit", category: "kits", price: 2450, cost: 1690, stock: 10, lowStockAt: 6, pay: "prepay", images: [IMG.kit, IMG.esp32], short: "Chassis, Nano, L298N, HC-SR04, motors & battery holder.", specs: [["Includes", "Full chassis + electronics"], ["Skill level", "Intermediate"], ["Science fair ready", "Yes"]], rating: 4.7, reviews: 41, kit: true, published: true },
  { slug: "esp32-home-automation-kit", sku: "GS-KIT-003", name: "ESP32 Home Automation Kit", category: "kits", price: 1890, cost: 1290, stock: 14, lowStockAt: 6, pay: "cod", images: [IMG.esp32, IMG.pcb4], short: "4-ch relay, ESP32, PSU & app guide in Bangla.", specs: [["Includes", "ESP32, 4-ch relay, HLK PSU"], ["Guide", "Bangla + English"]], rating: 4.8, reviews: 35, kit: true, published: true },
  { slug: "12v-ups-for-router-kit", sku: "GS-KIT-004", name: "12V Mini UPS for Router Kit", category: "kits", price: 1590, cost: 1090, stock: 0, lowStockAt: 8, pay: "cod", images: [IMG.bat1, IMG.charger], short: "Keep WiFi alive during load-shedding. 4–6 hrs.", specs: [["Backup", "4–6 hrs (typical router)"], ["Output", "12 V 2 A"]], rating: 4.9, reviews: 110, kit: true, published: true },
];

export const defaultHeroSlides: HeroSlideConfig[] = [
  {
    id: "slide-powerbank",
    slug: "diy-power-bank-kit",
    label: "Power bank kit",
    eyebrow: "Bestseller · build guide included",
    title: ["Power your", "next build."],
    body: "Three 18650 cells, a 2-way PD board, case, nickel strip and a guide. Every part in one box.",
    theme: "sand",
    chips: [["battery", "10,000mAh build"], ["bolt", "18W PD output"]],
    tag: "Bestseller",
    active: true,
  },
  {
    id: "slide-h4-led",
    slug: "h4-led-headlight-bulb-pair",
    label: "H4 LED bulbs",
    eyebrow: "Car lighting upgrade",
    title: ["Brighter", "roads ahead."],
    body: "Hi/Lo beam H4 bulbs at 6000K with fanned cooling. Check your socket before you order.",
    theme: "ink",
    chips: [["car", "H4 · 9003 socket"], ["bolt", "12,000 lm a pair"]],
    tag: "Hi / Lo beam",
    active: true,
  },
  {
    id: "slide-30q",
    slug: "samsung-30q-18650-3000mah",
    label: "18650 cells",
    eyebrow: "Tested capacity · flat top",
    title: ["Real mAh.", "Fair price."],
    body: "Samsung 30Q cells with a 15A max discharge, capacity-tested before they reach our bench.",
    theme: "mint",
    chips: [["battery", "3000mAh"], ["bolt", "15A discharge"]],
    tag: "Tested",
    active: true,
  },
  {
    id: "slide-charger",
    slug: "4-slot-18650-smart-charger",
    label: "Smart charger",
    eyebrow: "Four slots · per-slot LCD",
    title: ["Four cells,", "four channels."],
    body: "An independent charging channel and LCD for every 18650 slot, with a capacity test for Li-ion and NiMH.",
    theme: "amber",
    chips: [["bolt", "Per-slot charging"], ["chip", "Li-ion & NiMH"]],
    tag: "Smart charge",
    active: true,
  },
];

export const defaultCouponRules: CouponRule[] = [
  { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 0, active: true, used: 84, maxUses: 500, note: "10% off first maker order" },
  { code: "STUDENT5", type: "percent", value: 5, minSubtotal: 300, active: true, used: 47, maxUses: 300, note: "University & polytechnic student discount" },
  { code: "MAKER150", type: "flat", value: 150, minSubtotal: 2000, active: true, used: 19, maxUses: 100, note: "৳150 off orders over ৳2,000" },
];

export const coupons: Record<string, number> = { WELCOME10: 0.1, STUDENT5: 0.05 };

export const faqs: [string, string][] = [
  ["Do you offer Cash on Delivery?", "Yes. Items marked COD can be paid on delivery anywhere in Bangladesh. Unique or higher-value items (marked Advance) need bKash/Nagad payment before dispatch."],
  ["How long does delivery take?", "Inside Dhaka: 1–2 days (৳70). Outside Dhaka: 2–4 days (৳130) via Pathao / Steadfast."],
  ["Are your batteries genuine?", "Every batch is capacity-tested before listing. We publish real test results and replace any cell that fails."],
  ["Can I return a product?", "Unused items can be returned within 7 days. Dead-on-arrival modules are replaced free."],
];

export const defaultSettings: StoreSettings = {
  storeName: "Glowing Space BD",
  announcementText: "Free Dhaka delivery over ৳1,500",
  supportHours: "Support 10am–8pm",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "8801400788738",
  dispatchHourBdt: 16,
  showDispatchCountdown: true,
  dhakaDeliveryFee: 70,
  outsideDeliveryFee: 130,
  freeDhakaThreshold: 1500,
  autoPrepayAboveBdt: 5000,
  enableCod: true,
  enableBkash: true,
  enableNagad: true,
  enableAdvanceShipping: true,
  marqueePromises: [
    "Tested before dispatch",
    "Cash on Delivery on eligible parts",
    "bKash & Nagad advance payment",
    "Dhaka delivery in 1–2 days",
    "7-day returns on unused items",
    "Real people on WhatsApp",
    "Free Dhaka delivery over ৳1,500",
  ],
  pickupAddress: "House 12, Road 5, Dhanmondi, Dhaka 1205",
  pickupContact: "Glowing Space Dispatch",
  pickupPhone: "01400788738",
  defaultCourier: "Steadfast",
  faqs,
  siteTagline: "Tested electronics for makers in Bangladesh",
  currencySymbol: "৳",
  currencyCode: "BDT",
  currencyPosition: "before",
  primaryColor: "#181814",
  secondaryColor: "#6b645d",
  accentColor: "#fbbf24",
  returnDays: 7,
  taxEnabled: false,
  taxLabel: "VAT",
  taxRate: 0,
  contactEmail: "support@glowingspace.com.bd",
  contactPhone: "+880 1400-788738",
  contactAddress: "House 12, Road 5, Dhanmondi, Dhaka 1205",
  businessHours: "Sat–Thu, 10am–8pm BDT",
  mapEmbedUrl: "",
  social: { facebook: "", instagram: "", twitter: "", youtube: "", linkedin: "", tiktok: "", whatsapp: "8801400788738" },
  metaTitle: "Glowing Space BD — Tested 18650 cells, modules & car LEDs",
  metaKeywords: "18650, TP4056, BMS, ESP32, car LED, Bangladesh, COD",
  metaDescription: "Tested 18650 batteries, charging circuits, car LED lights and unique electronics parts in Bangladesh. COD, bKash & Nagad.",
  gaId: "",
  allowIndexing: true,
  announcementLink: "/shop",
  footerAbout: "Tested batteries, charging circuits and hard-to-find modules for Bangladesh's students, hobbyists and repair pros.",
  copyrightText: "",
  productsPerPage: 24,
  guestCheckout: true,
  reviewsAutoApprove: true,
  deliveryInfo: "Inside Dhaka 1–2 days · Nationwide 2–4 days via Pathao & Steadfast.",
  returnPolicy: "Unused items can be returned within 7 days. Dead-on-arrival parts are replaced free.",
  logoDark: "",
  favicon: "",
  ogImage: "/img/kit.jpg",
  mailFromName: "Glowing Space BD",
  mailFromAddress: "orders@glowingspace.com.bd",
  orderNotificationEmail: "orders@glowingspace.com.bd",
  notifyCustomerEmail: true,
  bkashMode: "manual",
  nagadMode: "manual",
  bkashManualNumber: "01700000000",
  nagadManualNumber: "01700000000",
  checkoutNote: "Send money to the merchant number and submit the TrxID at checkout.",
  checkoutPaymentMode: "manual",
  epsSandbox: true,
};

const bdtFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export const fmt = (n: number) => "৳" + bdtFormatter.format(Math.round(n));
export const getProduct = (slug: string, list: Product[] = products) => list.find((p) => p.slug === slug);
export const catName = (slug: string, list: Category[] = categories) => list.find((c) => c.slug === slug)?.name ?? slug;
