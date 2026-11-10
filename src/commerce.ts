import type { IconName } from "./icons";

/** Content model ported from the Universal Shop admin taxonomy. */

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  blurb?: string;
  active: boolean;
  order?: number;
}

export interface AttributeDef {
  id: string;
  name: string;
  slug: string;
  type: "select" | "swatch" | "number";
  values: string[];
  filterable: boolean;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  image: string;
  author: string;
  views: number;
  status: "published" | "draft";
  createdAt: number;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  body: string;
  footerLink: boolean;
  status: "published" | "draft";
  updatedAt: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  link: string;
  position: "home_top" | "home_mid" | "sidebar";
  startsAt?: number;
  endsAt?: number;
  order: number;
  active: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  initials: string;
  tone: string;
  active: boolean;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: "unread" | "read" | "archived";
  createdAt: number;
}

export interface Subscriber {
  email: string;
  subscribedAt: number;
  active: boolean;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  customer: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "completed";
  adminNote?: string;
  createdAt: number;
}

export interface Review {
  id: string;
  productSlug: string;
  name: string;
  rating: number;
  body: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  note?: string;
  active: boolean;
  sort: number;
}

export interface Transaction {
  id: string;
  orderId: string;
  gateway: "bkash" | "nagad" | "cod";
  trxId: string;
  sender?: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  createdAt: number;
}

export interface DeliveryProvider {
  id: string;
  name: string;
  driver: "manual" | "steadfast" | "pathao" | "redx" | "ecourier";
  trackingUrl: string;
  active: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  type: "city" | "district" | "country";
  areas: string[];
  charge: number;
  eta: string;
  active: boolean;
}

export interface Discount {
  id: string;
  label: string;
  percent: number;
  target: "category" | "products";
  categorySlug?: string;
  productSlugs: string[];
  endsAt?: number;
  active: boolean;
}

export interface FlashSale {
  id: string;
  title: string;
  subtitle: string;
  percent: number;
  productSlugs: string[];
  startsAt?: number;
  endsAt?: number;
  active: boolean;
}

export type HomeSectionKey =
  | "categories" | "featured" | "new" | "best" | "deals" | "trending" | "recommended"
  | "brands" | "features" | "testimonials" | "blog" | "newsletter";

export interface HomeSection {
  key: HomeSectionKey;
  title: string;
  subtitle?: string;
  active: boolean;
  order: number;
  limit: number;
}

export interface ContentState {
  brands: Brand[];
  attributes: AttributeDef[];
  tags: Tag[];
  blogCategories: BlogCategory[];
  blogPosts: BlogPost[];
  pages: Page[];
  banners: Banner[];
  testimonials: Testimonial[];
  messages: ContactMessage[];
  subscribers: Subscriber[];
  returns: ReturnRequest[];
  reviews: Review[];
  paymentMethods: PaymentMethod[];
  transactions: Transaction[];
  deliveryProviders: DeliveryProvider[];
  deliveryZones: DeliveryZone[];
  discounts: Discount[];
  flashSale: FlashSale | null;
  homeSections: HomeSection[];
}

export const defaultHomeSections: HomeSection[] = [
  { key: "categories", title: "Shop by category", subtitle: "Focused aisles. No endless scrolling.", active: true, order: 1, limit: 6 },
  { key: "featured", title: "Featured products", subtitle: "Hand-picked favourites from our bench", active: true, order: 2, limit: 8 },
  { key: "new", title: "New arrivals", subtitle: "Fresh drops you will love", active: true, order: 3, limit: 8 },
  { key: "best", title: "Best sellers", subtitle: "What everyone is buying right now", active: true, order: 4, limit: 8 },
  { key: "deals", title: "Big discounts", subtitle: "Save more on these deals", active: true, order: 5, limit: 8 },
  { key: "trending", title: "Trending now", subtitle: "Most viewed this week", active: true, order: 6, limit: 8 },
  { key: "recommended", title: "Recommended for you", subtitle: "Based on what you have been browsing", active: false, order: 7, limit: 8 },
  { key: "brands", title: "Top brands", subtitle: "Genuine products from brands you trust", active: true, order: 8, limit: 12 },
  { key: "features", title: "Why shop with us", subtitle: "We make online shopping simple, safe and enjoyable", active: true, order: 9, limit: 4 },
  { key: "testimonials", title: "What our customers say", subtitle: "Real feedback from technicians, students and tinkerers", active: true, order: 10, limit: 6 },
  { key: "blog", title: "From our blog", subtitle: "Guides and ideas for your next build", active: true, order: 11, limit: 3 },
  { key: "newsletter", title: "Get 10% off your first order", subtitle: "Subscribe for exclusive deals and new arrivals", active: true, order: 12, limit: 1 },
];

export const defaultBrands: Brand[] = [
  { id: "b-samsung", name: "Samsung SDI", slug: "samsung-sdi", active: true, order: 1, blurb: "Genuine Korean 18650 cells" },
  { id: "b-lg", name: "LG Chem", slug: "lg-chem", active: true, order: 2, blurb: "MJ1 high-capacity cells" },
  { id: "b-molicel", name: "Molicel", slug: "molicel", active: true, order: 3, blurb: "High-drain 21700 power cells" },
  { id: "b-ti", name: "Texas Instruments", slug: "ti", active: true, order: 4, blurb: "TP4056 protection ICs" },
  { id: "b-espressif", name: "Espressif", slug: "espressif", active: true, order: 5, blurb: "ESP32 wireless modules" },
  { id: "b-local", name: "Glowing Bench", slug: "glowing-bench", active: true, order: 6, blurb: "Tested & assembled in Dhaka" },
];

export const defaultAttributes: AttributeDef[] = [
  { id: "a-voltage", name: "Voltage", slug: "voltage", type: "select", values: ["3.6 V", "3.7 V", "5 V", "12 V", "12–24 V"], filterable: true },
  { id: "a-capacity", name: "Capacity", slug: "capacity", type: "select", values: ["3000 mAh", "3500 mAh", "4200 mAh", "2200 mAh"], filterable: true },
  { id: "a-connector", name: "Connector", slug: "connector", type: "select", values: ["Flat top", "Button top", "XT60", "Type-C", "JST"], filterable: true },
  { id: "a-rating-power", name: "Power rating", slug: "power", type: "select", values: ["5 W", "10 W", "15 W", "45 A", "20 A"], filterable: true },
];

export const defaultTags: Tag[] = [
  { id: "t-load-shedding", name: "Load shedding", slug: "load-shedding" },
  { id: "t-student", name: "Student project", slug: "student-project" },
  { id: "t-wifi", name: "WiFi", slug: "wifi" },
  { id: "t-workshop", name: "Workshop", slug: "workshop" },
];

export const defaultBlogCategories: BlogCategory[] = [
  { id: "bc-guides", name: "Buying guides", slug: "guides" },
  { id: "bc-tutorials", name: "Tutorials", slug: "tutorials" },
  { id: "bc-news", name: "Store news", slug: "news" },
];

export const defaultBlogPosts: BlogPost[] = [
  { id: "bp-1", slug: "how-to-test-an-18650-cell", title: "How to capacity-test an 18650 cell before you build", category: "guides", excerpt: "A charger with a discharge test is all you need. Here is the 5-minute bench routine we run on every batch.", body: "Every batch we list is capacity-tested on a 4-slot charger before it ships. At home you can do the same: charge fully, discharge at 0.5C, and compare the measured mAh against the label. Anything under 90% of the rated capacity is a red flag for a 'rewrapped' cell. Keep a log per cell — real capacity matters more than brand stickers when you are building packs.", image: "/img/18650.jpg", author: "Glowing Space Bench", views: 1240, status: "published", createdAt: Date.now() - 6 * 86400000 },
  { id: "bp-2", slug: "tp4056-vs-bms-when-to-use-each", title: "TP4056 vs BMS: when to use each in your project", category: "tutorials", excerpt: "Single cell or a whole pack? A quick decision guide for charging circuits.", body: "Use a TP4056 module for single-cell (1S) Li-ion charging with protection. The moment you series cells into a pack (2S, 3S, 4S…), you need a BMS with balancing. A BMS protects against overcharge, over-discharge and short circuits across the pack, while the TP4056 only watches one cell. For power banks: TP4056 + a boost board. For e-bike packs: a proper BMS, every time.", image: "/img/charging.jpg", author: "Glowing Space Bench", views: 860, status: "published", createdAt: Date.now() - 12 * 86400000 },
  { id: "bp-3", slug: "car-led-upgrade-canbus-errors", title: "Upgrading car LEDs without CANBUS errors", category: "guides", excerpt: "Modern cars hate dumb bulbs. Here is how to pick error-free LED kits.", body: "If your dashboard shows a bulb-out warning after an LED swap, the car is measuring current draw. Pick a kit labelled Canbus / error-free — it has built-in load resistors or a decoder. Match the socket (H4, H7, H11, T10) to your car, check polarity, and keep the original halogen as a spare.", image: "/img/carled.jpg", author: "Glowing Space Garage", views: 540, status: "published", createdAt: Date.now() - 20 * 86400000 },
];

export const defaultPages: Page[] = [
  { id: "pg-about", slug: "about-us", title: "About Us", footerLink: true, status: "published", updatedAt: Date.now() - 30 * 86400000, body: "Glowing Space BD started on a workbench in Dhanmondi. We test every 18650 cell, photograph every module as-shipped, and pack everything to survive the courier. Our mission: make genuine electronics parts easy to buy for students, hobbyists and repair pros across Bangladesh." },
  { id: "pg-faq", slug: "faq", title: "FAQ", footerLink: true, status: "published", updatedAt: Date.now() - 25 * 86400000, body: "**Do you offer COD?** Yes, on eligible items nationwide. **How fast is delivery?** Dhaka 1–2 days, nationwide 2–4 days. **Can I return?** Unused items within 7 days; DOA replaced free. **Are cells genuine?** Every batch is capacity-tested before listing." },
  { id: "pg-privacy", slug: "privacy-policy", title: "Privacy Policy", footerLink: true, status: "published", updatedAt: Date.now() - 40 * 86400000, body: "We store your order details (name, phone, address) only to deliver and support your orders. We never sell personal data. Payment details for bKash/Nagad are handled by the payment gateway; we only keep the transaction reference." },
  { id: "pg-returns", slug: "return-and-refund-policy", title: "Return & Refund Policy", footerLink: true, status: "published", updatedAt: Date.now() - 35 * 86400000, body: "Unused items can be returned within 7 days of delivery. Dead-on-arrival electronics are replaced free — no forms. Refunds for advance payments go back to the original bKash/Nagad account within 3–5 business days." },
  { id: "pg-shipping", slug: "shipping-information", title: "Shipping Information", footerLink: true, status: "published", updatedAt: Date.now() - 28 * 86400000, body: "Inside Dhaka: ৳70, 1–2 days. Outside Dhaka: ৳130, 2–4 days via Pathao and Steadfast. Free Dhaka delivery on orders over ৳1,500. You will get a tracking number by SMS once the parcel is booked." },
  { id: "pg-terms", slug: "terms-and-conditions", title: "Terms & Conditions", footerLink: true, status: "published", updatedAt: Date.now() - 45 * 86400000, body: "By ordering you agree to provide accurate delivery details and to inspect the parcel on arrival. Prices include no hidden fees; delivery is charged at checkout. This is a frontend preview — no real payment is collected." },
];

export const defaultBanners: Banner[] = [
  { id: "bn-1", title: "Weekend flash sale", subtitle: "Up to 20% off selected cells & chargers", image: "/img/charging.jpg", link: "/shop", position: "home_mid", order: 1, active: true },
];

export const defaultTestimonials: Testimonial[] = [
  { id: "tm-1", name: "Rafiq H.", role: "Mobile repair · Chattogram", quote: "Cells arrived with a capacity test sheet — real 2,900mAh. Finally a shop I trust for 18650.", initials: "RH", tone: "bg-emerald-100 text-emerald-800", active: true },
  { id: "tm-2", name: "Nusrat J.", role: "EEE student · BUET", quote: "The robot kit had every single part. Ordered at night, got it next afternoon in Dhaka.", initials: "NJ", tone: "bg-amber-100 text-amber-800", active: true },
  { id: "tm-3", name: "Tanvir A.", role: "Car enthusiast · Sylhet", quote: "H4 LEDs are seriously bright and error-free. WhatsApp support helped me pick the right socket.", initials: "TA", tone: "bg-violet-100 text-violet-800", active: true },
];

export const defaultPaymentMethods: PaymentMethod[] = [
  { id: "cod", name: "Cash on Delivery", note: "Pay when you receive", active: true, sort: 1 },
  { id: "bkash", name: "bKash", note: "Send Money + TrxID", active: true, sort: 2 },
  { id: "nagad", name: "Nagad", note: "Send Money + TrxID", active: true, sort: 3 },
];

export const defaultTransactions: Transaction[] = [
  { id: "TX-1001", orderId: "GS8491982", gateway: "bkash", trxId: "9XK2L1M4PQ", sender: "01819334411", amount: 2110, status: "completed", createdAt: Date.now() - 9 * 3600000 },
  { id: "TX-1002", orderId: "GS8491905", gateway: "nagad", trxId: "7QW8ER2TY", sender: "01912776655", amount: 2508, status: "pending", createdAt: Date.now() - 14 * 3600000 },
];

export const defaultDeliveryProviders: DeliveryProvider[] = [
  { id: "dp-own", name: "Own Delivery", driver: "manual", trackingUrl: "", active: true },
  { id: "dp-steadfast", name: "Steadfast Courier", driver: "steadfast", trackingUrl: "https://steadfast.com.bd/tracking/{tracking}", active: true },
  { id: "dp-pathao", name: "Pathao Courier", driver: "pathao", trackingUrl: "https://pathao.com/track/{tracking}", active: true },
  { id: "dp-redx", name: "RedX", driver: "redx", trackingUrl: "https://redx.com.bd/tracking/{tracking}", active: false },
];

export const defaultDeliveryZones: DeliveryZone[] = [
  { id: "dz-dhaka", name: "Dhaka Metro", type: "city", areas: ["Dhaka"], charge: 70, eta: "1–2 days", active: true },
  { id: "dz-outside", name: "Rest of Bangladesh", type: "country", areas: ["All other districts"], charge: 130, eta: "2–4 days", active: true },
];

export function seedContent(): ContentState {
  return {
    brands: defaultBrands,
    attributes: defaultAttributes,
    tags: defaultTags,
    blogCategories: defaultBlogCategories,
    blogPosts: defaultBlogPosts,
    pages: defaultPages,
    banners: defaultBanners,
    testimonials: defaultTestimonials,
    messages: [
      { id: "msg-1", name: "Sabbir Islam", email: "sabbir@example.com", phone: "01712345678", subject: "ESP32 stock?", message: "Hi, do you have the ESP32 DevKit in stock this week? Need 5 for a university workshop.", status: "unread", createdAt: Date.now() - 3600000 },
      { id: "msg-2", name: "Nusrat Jahan", email: "nusrat@example.com", subject: "Courier choice", message: "Can you ship my last order via Pathao instead of Steadfast?", status: "unread", createdAt: Date.now() - 7200000 },
    ],
    subscribers: [
      { email: "rafiq@example.com", subscribedAt: Date.now() - 5 * 86400000, active: true },
      { email: "lamia@example.com", subscribedAt: Date.now() - 2 * 86400000, active: true },
    ],
    returns: [
      { id: "RET-1", orderId: "GS8491740", customer: "Mahmuduluky", reason: "Wrong capacity received", status: "pending", createdAt: Date.now() - 26 * 3600000 },
      { id: "RET-2", orderId: "GS8491120", customer: "Imran Chowdhury", reason: "Module dead on arrival", status: "pending", createdAt: Date.now() - 50 * 3600000 },
    ],
    reviews: [
      { id: "rev-1", productSlug: "esp32-devkit-v1", name: "Arif K.", rating: 5, body: "Flashed it the same evening. Solid board, genuine CP2102.", status: "approved", createdAt: Date.now() - 2 * 86400000 },
      { id: "rev-2", productSlug: "tp4056-type-c-charging-module", name: "Mehedi H.", rating: 4, body: "Works, but the LED is dim. Fine for the price.", status: "pending", createdAt: Date.now() - 86400000 },
      { id: "rev-3", productSlug: "h4-led-headlight-bulb-pair", name: "Tanvir A.", rating: 5, body: "No CANBUS error on my Honda City. Bright and clean cut-off.", status: "pending", createdAt: Date.now() - 30 * 3600000 },
    ],
    paymentMethods: defaultPaymentMethods,
    transactions: defaultTransactions,
    deliveryProviders: defaultDeliveryProviders,
    deliveryZones: defaultDeliveryZones,
    discounts: [],
    flashSale: null,
    homeSections: defaultHomeSections,
  };
}

/** Sections of the storefront home, in configured order. */
export function activeHomeSections(state: ContentState): HomeSection[] {
  return state.homeSections.filter(s => s.active).sort((a, b) => a.order - b.order);
}
