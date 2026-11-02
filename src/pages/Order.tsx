import { Select } from "../ui/Select";
import { useEffect, useRef, useState } from "react";
import { Link, usePageState, useRouter } from "../router";
import { useStore, type Order, type OrderStatus } from "../store";
import { fmt } from "../data";
import { PayBadge, Field, inputCls, btnPrimary, btnAccent, QtyStepper } from "../components";
import { Icon } from "../icons";
import { useSeo, SITE } from "../seo";
import { ResponsiveImage } from "../ResponsiveImage";

const phoneOk = (p: string) => /^01[3-9]\d{8}$/.test(p.replace(/\D/g, "").replace(/^880/, "0"));
const normPhone = (p: string) => p.replace(/\D/g, "").replace(/^880/, "0");
const DRAFT_KEY = "gs_checkout_draft";
type CheckoutDraft = { name: string; phone: string; address: string; city: string; method: string };

function readDraft(user: string | null, needPrepay: boolean, freeDelivery: boolean, codEnabled: boolean): CheckoutDraft {
  const defaultMethod = needPrepay || !codEnabled ? "bkash" : "cod";
  const fallback = { name: "", phone: user ?? "", address: "", city: "dhaka", method: defaultMethod };
  try {
    const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null") as Partial<CheckoutDraft> | null;
    if (!saved) return fallback;
    const method = ["cod", "bkash", "nagad", "advance"].includes(saved.method ?? "") ? saved.method! : fallback.method;
    const city = saved.city === "outside" ? "outside" : "dhaka";
    return {
      name: saved.name ?? "", phone: saved.phone || user || "", address: saved.address ?? "",
      city,
      method: ((needPrepay || !codEnabled) && (method === "cod" || method === "advance")) || (freeDelivery && city === "dhaka" && method === "advance")
        ? fallback.method : method,
    };
  } catch { return fallback; }
}

/* ============================= CART ============================= */

export function Cart() {
  const { items, setQty, remove, subtotal, discount, coupon, applyCoupon, removeCoupon, count, customerOrders, settings, couponRules } = useStore();
  const { shoppingReturn, previous, back } = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  useSeo({ title: "Your cart", description: "Review your cart", path: "/cart" });

  const freeThreshold = settings.freeDhakaThreshold;
  const welcomeHint = couponRules.find((r) => r.active && r.minSubtotal === 0);

  if (!items.length) return (
    <div className="shell flex flex-col items-center py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white ring-1 ring-stone-200"><Icon name="bag" className="h-7 w-7 text-stone-400" /></span>
      <h1 className="mt-5 text-2xl font-extrabold">Your cart is empty</h1>
      <p className="mt-1.5 max-w-xs text-sm text-stone-500">Tested cells, charging boards and kits are waiting for your next build.</p>
      <Link to={shoppingReturn} className={`${btnPrimary} mt-6`}><span>Browse products</span><Icon name="arrow-right" className="h-4 w-4" /></Link>
      {customerOrders[0] && <Link to={`/order/${customerOrders[0].id}`} className="mt-4 text-xs font-semibold text-stone-600 underline underline-offset-4">View your latest order {customerOrders[0].id}</Link>}
    </div>
  );

  const highValuePrepay = settings.autoPrepayAboveBdt > 0 && subtotal >= settings.autoPrepayAboveBdt;
  const needPrepay = items.some((i) => i.p.pay === "prepay") || highValuePrepay || !settings.enableCod;
  const remaining = Math.max(0, freeThreshold - subtotal);
  const pct = freeThreshold > 0 ? Math.min(100, Math.round((subtotal / freeThreshold) * 100)) : 100;

  return (
    <div className="shell pb-24 pt-6 sm:pt-8 md:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="text-[28px] font-extrabold tracking-tight sm:text-3xl">Your cart <span className="ml-1 align-middle text-sm font-bold text-stone-400">{count} item{count !== 1 ? "s" : ""}</span></h1><p className="mt-1 text-sm text-stone-500">Free returns within 7 days. No surprises at checkout.</p></div>
        {previous === shoppingReturn
          ? <button type="button" onClick={() => back(shoppingReturn)} className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900"><Icon name="arrow-left" className="h-4 w-4" />Continue shopping</button>
          : <Link to={shoppingReturn} className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900"><Icon name="arrow-left" className="h-4 w-4" />Continue shopping</Link>}
      </div>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-center gap-2.5 text-[13px]">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800"><Icon name="truck" className="h-4 w-4" /></span>
              {remaining > 0
                ? <p>Add <b className="tnum">{fmt(remaining)}</b> more for <b>free delivery in Dhaka</b>.</p>
                : <p className="font-semibold text-emerald-700">You've unlocked free delivery in Dhaka.</p>}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full transition-all ${remaining > 0 ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} /></div>
          </div>

          <ul className="mt-4 divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {items.map(({ p, qty }) => (
              <li key={p.slug} className="flex gap-3 p-3.5 sm:gap-4 sm:p-4">
                <Link to={`/product/${p.slug}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-stone-200/70 sm:h-24 sm:w-24"><ResponsiveImage src={p.images[0]} alt="" sizes="96px" className="h-full w-full object-cover" /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/product/${p.slug}`} className="line-clamp-2 text-[13px] font-bold leading-snug hover:underline sm:text-sm">{p.name}</Link>
                      <div className="mt-1 flex items-center gap-2"><PayBadge pay={p.pay} compact /><span className="hidden font-mono text-[10px] text-stone-400 sm:inline">{p.sku}</span></div>
                    </div>
                    <button onClick={() => remove(p.slug)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${p.name}`}><Icon name="trash" className="h-4 w-4" /></button>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    <QtyStepper small qty={qty} setQty={(n) => setQty(p.slug, n)} max={Math.max(p.stock, 1)} />
                    <div className="text-right"><p className="text-sm font-extrabold tnum">{fmt(p.price * qty)}</p><p className="text-[10px] text-stone-400 tnum">{fmt(p.price)} each</p></div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <details className="group mt-4 rounded-2xl border border-stone-200 bg-white">
            <summary className="flex cursor-pointer items-center gap-2.5 px-4 py-3.5 text-sm font-semibold">
              <Icon name="tag" className="h-4 w-4 text-stone-500" /><span>Have a coupon?</span>
              <Icon name="chevron-down" className="ml-auto h-4 w-4 text-stone-400 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-stone-100 p-4">
              {coupon ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm"><span className="flex items-center gap-2 font-semibold text-emerald-800"><Icon name="check-circle" className="h-4 w-4" />{coupon} applied · {fmt(discount)} off</span><button type="button" onClick={() => { removeCoupon(); setCode(""); setMsg(""); }} className="text-xs font-semibold text-emerald-900 underline underline-offset-2">Remove</button></div>
              ) : (
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setMsg(applyCoupon(code) ? "Coupon applied." : "That code isn't valid or minimum subtotal not met."); }}>
                  <label htmlFor="coupon" className="sr-only">Coupon code</label>
                  <input id="coupon" value={code} onChange={(e) => setCode(e.target.value)} placeholder={`Enter code${welcomeHint ? ` (try ${welcomeHint.code})` : ""}`} className={inputCls} />
                  <button className="shrink-0 rounded-xl border border-stone-900 px-4 text-sm font-bold hover:bg-stone-900 hover:text-white">Apply</button>
                </form>
              )}
              {msg && <p role="status" className={`mt-2 text-xs ${msg.includes("applied") ? "text-emerald-700" : "text-red-700"}`}>{msg}</p>}
              {welcomeHint && (
                <p className="mt-2 text-[11px] text-stone-500">
                  New here? <b>{welcomeHint.code}</b> takes {welcomeHint.type === "percent" ? `${welcomeHint.value}%` : fmt(welcomeHint.value)} off.
                </p>
              )}
            </div>
          </details>

          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] font-semibold text-stone-600 sm:grid-cols-4">
            {[["shield", "Secure checkout"], ["return", "7-day returns"], ["truck", "Dhaka 1–2 days"], ["headphones", "Human support"]].map(([i, t]) => (
              <span key={t} className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2 ring-1 ring-stone-200"><Icon name={i as "shield"} className="h-3.5 w-3.5 text-stone-500" />{t}</span>
            ))}
          </div>
        </div>

        <aside className="overflow-hidden rounded-2xl border border-stone-200 bg-white lg:sticky lg:top-[124px]">
          <div className="border-b border-stone-100 px-5 py-4"><h2 className="text-base font-extrabold">Order summary</h2></div>
          <div className="px-5 py-4">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-stone-600">Subtotal ({count} items)</dt><dd className="font-semibold tnum">{fmt(subtotal)}</dd></div>
              {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon ({coupon})</dt><dd className="font-semibold tnum">−{fmt(discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-stone-600">Delivery</dt><dd className="font-semibold text-stone-500">At checkout</dd></div>
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-stone-100 pt-3">
              <span className="text-sm font-bold">Total</span><span className="text-xl font-extrabold tnum">{fmt(subtotal - discount)}</span>
            </div>
            {needPrepay && <p className="mt-2.5 flex gap-2 rounded-xl bg-violet-50 p-2.5 text-[11px] text-violet-900"><Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{highValuePrepay ? `Orders of ${fmt(settings.autoPrepayAboveBdt)}+ require advance payment via bKash or Nagad.` : "Includes advance-payment items. bKash or Nagad at checkout."}</p>}
            <Link to="/checkout" className={`${btnAccent} mt-4 w-full`}><Icon name="lock" className="h-4 w-4" />Checkout · {fmt(subtotal - discount)}</Link>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-stone-500"><Icon name="shield" className="h-3.5 w-3.5 text-emerald-600" />Safe payment · No account needed</div>
          </div>
          <div className="flex items-center justify-center gap-1.5 border-t border-stone-100 bg-paper px-4 py-3">
            <span className="text-[10px] font-bold text-stone-500">PAY WITH</span>
            {settings.enableBkash && <span className="rounded bg-pink-50 px-1.5 py-0.5 text-[10px] font-bold text-pink-700">bKash</span>}
            {settings.enableNagad && <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">Nagad</span>}
            {settings.enableCod && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">COD</span>}
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden safe-bottom">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-400">Total</p><p className="text-lg font-extrabold leading-none tnum">{fmt(subtotal - discount)}</p></div>
          <Link to="/checkout" className={btnAccent + " shrink-0"}>Checkout<Icon name="arrow-right" className="h-4 w-4" /></Link>
        </div>
      </div>
    </div>
  );
}

/* ============================= CHECKOUT ============================= */

function Steps({ active }: { active: 1 | 2 | 3 }) {
  const steps = ["Cart", "Delivery", "Payment"];
  return (
    <ol className="mb-6 flex items-center gap-2 text-[11px] font-bold">
      {steps.map((s, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = n < active, current = n === active;
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className={`h-px w-6 sm:w-10 ${done || current ? "bg-stone-900" : "bg-stone-300"}`} />}
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${done ? "bg-stone-900 text-white" : current ? "bg-amber-400 text-stone-900" : "bg-stone-200 text-stone-500"}`}>{done ? <Icon name="check" className="h-3 w-3" strokeWidth={3} /> : n}</span>
            <span className={current || done ? "text-stone-900" : "text-stone-400"}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function Checkout() {
  const { items, subtotal, discount, user, clear, saveOrder, coupon, customerOrders, settings } = useStore();
  const { go, back, previous } = useRouter();
  const highValuePrepay = settings.autoPrepayAboveBdt > 0 && subtotal >= settings.autoPrepayAboveBdt;
  const needPrepay = items.some((i) => i.p.pay === "prepay") || highValuePrepay || !settings.enableCod;

  const [f, setF] = useState<CheckoutDraft>(() => readDraft(user, needPrepay, subtotal >= settings.freeDhakaThreshold, settings.enableCod));
  const [err, setErr] = useState<{ field: "name" | "phone" | "address"; message: string } | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(f)); } catch { /* ignore */ }
  }, [f]);

  const fallbackPrepay = settings.enableBkash ? "bkash" : "nagad";

  useEffect(() => {
    if (needPrepay && (f.method === "cod" || f.method === "advance")) {
      setF((current) => ({ ...current, method: fallbackPrepay }));
    } else if (!needPrepay && f.method === "advance" && f.city === "dhaka" && subtotal >= settings.freeDhakaThreshold) {
      setF((current) => ({ ...current, method: settings.enableCod ? "cod" : fallbackPrepay }));
    }
  }, [needPrepay, f.method, f.city, subtotal, settings.freeDhakaThreshold, settings.enableCod, fallbackPrepay]);

  useSeo({ title: "Secure checkout", description: "Cash on delivery, bKash or Nagad checkout.", path: "/checkout" });

  if (!items.length) return (
    <div className="shell py-32 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white ring-1 ring-stone-200"><Icon name="cart" className="h-6 w-6 text-stone-400" /></span>
      <h1 className="mt-4 font-bold">Your cart is empty.</h1>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link to="/shop" className={btnPrimary}>Shop products</Link>
        {customerOrders[0] && <Link to={`/order/${customerOrders[0].id}`} className="inline-flex items-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold">View your latest order</Link>}
      </div>
    </div>
  );

  const shipping = f.city === "dhaka"
    ? (subtotal >= settings.freeDhakaThreshold ? 0 : settings.dhakaDeliveryFee)
    : settings.outsideDeliveryFee;
  const total = subtotal - discount + shipping;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setF((current) => ({ ...current, [k]: e.target.value }));
    if (err?.field === k) setErr(null);
  };
  const isPrepay = f.method !== "cod";

  const methods = [
    { id: "cod", name: "Cash on Delivery", note: !settings.enableCod ? "Disabled in store settings" : needPrepay ? "Unavailable for this cart" : "Pay when it arrives", icon: "cash" as const, off: needPrepay || !settings.enableCod, color: "text-emerald-700 bg-emerald-50" },
    { id: "bkash", name: "bKash", note: settings.enableBkash ? "Advance payment at launch" : "Temporarily unavailable", icon: "phone" as const, off: !settings.enableBkash, color: "text-pink-700 bg-pink-50" },
    { id: "nagad", name: "Nagad", note: settings.enableNagad ? "Advance payment at launch" : "Temporarily unavailable", icon: "phone" as const, off: !settings.enableNagad, color: "text-orange-700 bg-orange-50" },
    { id: "advance", name: "Advance delivery charge", note: !settings.enableAdvanceShipping ? "Disabled in store settings" : needPrepay ? "Not available for this bag" : shipping === 0 ? "Delivery is already free" : `${fmt(shipping)} at launch, rest on delivery`, icon: "truck" as const, off: needPrepay || shipping === 0 || !settings.enableAdvanceShipping, color: "text-stone-700 bg-stone-100" },
  ];

  const place = (e: React.FormEvent) => {
    e.preventDefault(); setErr(null);
    const invalid = (field: "name" | "phone" | "address", message: string, input: HTMLInputElement | HTMLTextAreaElement | null) => {
      setErr({ field, message });
      input?.focus();
    };
    if (f.name.trim().length < 2) return invalid("name", "Please enter your full name.", nameRef.current);
    if (!phoneOk(f.phone)) return invalid("phone", "Enter a valid mobile number, like 01712345678.", phoneRef.current);
    if (f.address.trim().length < 8) return invalid("address", "Please enter your full delivery address.", addressRef.current);
    const id = "GS" + Date.now().toString().slice(-7);
    const o: Order = {
      id, phone: normPhone(f.phone), name: f.name.trim(), address: f.address.trim(), city: f.city, method: f.method,
      lines: items.map((i) => ({ slug: i.p.slug, name: i.p.name, qty: i.qty, price: i.p.price })), subtotal, discount, shipping, total, paid: false, created: Date.now(),
    };
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    saveOrder(o); clear(); go(`/order/${id}`, { replace: true });
  };

  return (
    <div className="shell pt-6 sm:pt-8">
      <Steps active={2} />
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div><h1 className="text-[28px] font-extrabold tracking-tight sm:text-3xl">Checkout</h1><p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500"><Icon name="lock" className="h-3.5 w-3.5" />Guest checkout · Frontend preview</p></div>
        {previous === "/cart"
          ? <button type="button" onClick={() => back("/cart")} className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Icon name="arrow-left" className="h-4 w-4" />Back to cart</button>
          : <Link to="/cart" className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Icon name="arrow-left" className="h-4 w-4" />Back to cart</Link>}
      </div>

      <form onSubmit={place} className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px]" noValidate>
        <div className="space-y-4">
          {!user && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-white p-3.5 text-xs">
              <Icon name="user" className="h-4 w-4 text-stone-500" />
              <span className="font-medium text-stone-700">Already have an account?</span>
              <Link to="/login?next=/checkout" className="font-bold underline underline-offset-2">Sign in for faster checkout</Link>
            </div>
          )}

          <fieldset className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <legend className="sr-only">Contact and delivery details</legend>
            <div className="flex items-center gap-2.5 border-b border-stone-100 px-4 py-3.5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-[11px] font-bold text-white">1</span>
              <p className="text-sm font-extrabold">Contact & delivery</p>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-stone-500"><Icon name="truck" className="h-3.5 w-3.5" />Ships from Dhaka</span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <Field label="Full name"><input ref={nameRef} className={inputCls} value={f.name} onChange={set("name")} aria-invalid={err?.field === "name"} autoComplete="name" placeholder="Your name" required />{err?.field === "name" && <span role="alert" className="mt-1 block text-xs text-red-700">{err.message}</span>}</Field>
              <Field label="Mobile number" hint="For delivery updates"><input ref={phoneRef} className={inputCls} value={f.phone} onChange={set("phone")} aria-invalid={err?.field === "phone"} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" required />{err?.field === "phone" && <span role="alert" className="mt-1 block text-xs text-red-700">{err.message}</span>}</Field>
              <div className="sm:col-span-2"><Field label="Delivery area">
                <Select variant="store" className="w-full" value={f.city} onChange={set("city")}>
                  <option value="dhaka">Inside Dhaka · {fmt(settings.dhakaDeliveryFee)} (free over {fmt(settings.freeDhakaThreshold)})</option>
                  <option value="outside">Outside Dhaka · {fmt(settings.outsideDeliveryFee)}</option>
                </Select>
              </Field></div>
              <div className="sm:col-span-2"><Field label="Full address"><textarea ref={addressRef} className={inputCls} rows={3} value={f.address} onChange={set("address")} aria-invalid={err?.field === "address"} autoComplete="street-address" placeholder="House, road, area, district" required />{err?.field === "address" && <span role="alert" className="mt-1 block text-xs text-red-700">{err.message}</span>}</Field></div>
            </div>
          </fieldset>

          <fieldset className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <legend className="sr-only">Payment method</legend>
            <div className="flex items-center gap-2.5 border-b border-stone-100 px-4 py-3.5">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-[11px] font-bold text-white">2</span>
              <p className="text-sm font-extrabold">Payment</p>
              <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-stone-500"><Icon name="shield" className="h-3.5 w-3.5 text-emerald-600" />Protected</span>
            </div>
            <div className="p-4">
              {needPrepay && (
                <p className="mb-3 flex gap-2 rounded-xl bg-violet-50 p-3 text-[11px] leading-relaxed text-violet-900">
                  <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    {highValuePrepay
                      ? `Cart total reaches ${fmt(settings.autoPrepayAboveBdt)}, so advance payment is required.`
                      : "Your cart has a unique/higher-value item, so advance payment is required. You can switch to COD after removing it."}
                  </span>
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {methods.map((m) => (
                  <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm transition focus-within:ring-2 focus-within:ring-stone-900 focus-within:ring-offset-2 ${f.method === m.id ? "border-stone-900 ring-2 ring-amber-300" : "border-stone-200 hover:border-stone-400"} ${m.off ? "cursor-not-allowed opacity-45 hover:border-stone-200" : ""}`}>
                    <input type="radio" name="method" value={m.id} disabled={m.off} checked={f.method === m.id} onChange={() => setF((current) => ({ ...current, method: m.id }))} className="sr-only" />
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.color}`}><Icon name={m.icon} className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold">{m.name}</span><span className="block text-[11px] text-stone-500">{m.note}</span></span>
                    <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${f.method === m.id ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"}`}>{f.method === m.id && <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} />}</span>
                  </label>
                ))}
              </div>
              {isPrepay && (
                <div className="mt-4 rounded-xl border border-stone-200 bg-paper p-3.5">
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-stone-700"><Icon name="info" className="mt-0.5 h-4 w-4 shrink-0" /><span><b>Preview only: no payment is collected.</b> {f.method === "advance" ? `The ${fmt(shipping)} delivery charge would be paid in advance; the remaining ${fmt(total - shipping)} on delivery.` : `The ${fmt(total)} payment would be handled securely through ${f.method === "bkash" ? "bKash" : "Nagad"} once the live checkout is connected.`}</span></p>
                </div>
              )}
              {f.method === "cod" && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-[11px] font-medium text-emerald-900">Cash on delivery selected. In the live store you would pay <b>{fmt(total)}</b> when the parcel arrives.</p>}
            </div>
          </fieldset>

          <div className="flex items-center gap-2 rounded-xl bg-white p-3.5 text-[11px] leading-relaxed text-stone-500 ring-1 ring-stone-200">
            <Icon name="info" className="h-4 w-4 shrink-0 text-stone-400" />By placing this order you agree to our returns policy. Unused items can be returned within 7 days.
          </div>
        </div>

        <aside className="overflow-hidden rounded-2xl border border-stone-200 bg-white lg:sticky lg:top-[124px]">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <h2 className="text-base font-extrabold">Order summary</h2>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">{items.length} item{items.length > 1 ? "s" : ""}</span>
          </div>
          <div className="max-h-[248px] space-y-3 overflow-y-auto px-5 py-4">
            {items.map(({ p, qty }) => (
              <div key={p.slug} className="flex items-center gap-3">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand"><ResponsiveImage src={p.images[0]} alt="" sizes="48px" className="h-full w-full object-cover" /><span className="absolute -right-0 -top-0 grid h-4 min-w-4 place-items-center rounded-full bg-stone-900 px-1 text-[9px] font-bold text-white">{qty}</span></span>
                <p className="flex-1 text-[11px] font-semibold leading-snug">{p.name}</p>
                <p className="text-xs font-bold tnum">{fmt(p.price * qty)}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-stone-100 px-5 py-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-stone-600">Subtotal</dt><dd className="font-semibold tnum">{fmt(subtotal)}</dd></div>
              {discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Coupon {coupon}</dt><dd className="font-semibold tnum">−{fmt(discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-stone-600">Delivery</dt><dd className="font-semibold tnum">{shipping ? fmt(shipping) : "Free"}</dd></div>
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-stone-100 pt-3"><span className="font-bold">Total</span><span className="text-2xl font-extrabold tnum">{fmt(total)}</span></div>
            <button className={`${btnAccent} mt-4 w-full`}><Icon name="lock" className="h-4 w-4" />Place order · {fmt(total)}</button>
            <p className="mt-2.5 text-center text-[10px] text-stone-500">Frontend preview: no SMS or payment is sent.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

/* ============================= CONFIRMATION ============================= */

export function Confirmation({ id }: { id: string }) {
  const { orders, settings } = useStore();
  const o = orders.find((x) => x.id === id);
  const [copied, setCopied] = useState(false);
  useSeo({ title: "Order preview", description: "Review your order details in this frontend preview", path: `/order/${id}` });
  if (!o) return <div className="shell py-32 text-center"><h1 className="text-2xl font-extrabold">Order not found</h1><p className="mt-2 text-sm text-stone-500">It may have been placed on another device.</p><Link to="/track" className={`${btnPrimary} mt-5`}>Track an order</Link></div>;
  const share = `My Glowing Space BD preview order ${o.id} totals ${fmt(o.total)}. View: ${SITE}/track?id=${o.id}`;
  const copy = async () => { try { await navigator.clipboard.writeText(o.id); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* noop */ } };
  const payLabel = o.paymentStatus === "paid"
    ? "Payment verified"
    : o.paymentStatus === "refunded"
      ? "Refunded"
      : o.method === "cod"
        ? "COD selected"
        : "Payment not collected";

  return (
    <div className="shell max-w-2xl pt-8 sm:pt-12">
      <div className="text-center">
        <span className="pop-in mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" className="h-7 w-7" strokeWidth={2.6} /></span>
        <h1 className="mt-4 text-[28px] font-extrabold tracking-tight sm:text-4xl">Order preview, {o.name.split(" ")[0]}.</h1>
        <p className="mt-2 text-sm text-stone-600">Saved in this browser. No payment, SMS or stock reservation has been made.</p>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 px-5 py-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">Order number</p><p className="font-mono text-base font-extrabold">{o.id}</p></div>
          <button onClick={copy} className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-[11px] font-bold text-stone-700 hover:bg-stone-200">{copied ? <Icon name="check" className="h-3.5 w-3.5 text-emerald-600" /> : <Icon name="copy" className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy"}</button>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${o.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{payLabel}</span>
        </div>
        <div className="space-y-3 px-5 py-4">
          {o.lines.map((l) => <div key={l.slug} className="flex items-center justify-between gap-3 text-sm"><span className="text-stone-700">{l.name} <span className="text-stone-400">×{l.qty}</span></span><span className="font-semibold tnum">{fmt(l.price * l.qty)}</span></div>)}
        </div>
        <div className="px-5 pb-4">
          <dl className="space-y-1.5 border-t border-dashed border-stone-200 pt-3 text-sm">
            <div className="flex justify-between text-stone-600"><dt>Delivery</dt><dd className="tnum">{o.shipping ? fmt(o.shipping) : "Free"}</dd></div>
            {o.discount > 0 && <div className="flex justify-between text-emerald-700"><dt>Discount</dt><dd className="tnum">−{fmt(o.discount)}</dd></div>}
            <div className="flex justify-between font-extrabold"><dt>Total</dt><dd className="tnum">{fmt(o.total)}</dd></div>
          </dl>
        </div>
        <div className="flex items-start gap-2.5 border-t border-stone-100 bg-paper px-5 py-4 text-xs">
          <Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
          <p><span className="font-bold">{o.name}</span> · {o.phone}<br /><span className="text-stone-500">{o.address}, {o.city === "dhaka" ? "Dhaka" : "Outside Dhaka"}</span></p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a href={`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-stone-900"><Icon name="whatsapp" className="h-4 w-4" />Share on WhatsApp</a>
        <Link to={`/track?id=${o.id}`} className={btnPrimary}>View order status<Icon name="arrow-right" className="h-4 w-4" /></Link>
      </div>
      <Link to="/shop" className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900"><Icon name="arrow-left" className="h-3.5 w-3.5" />Continue shopping</Link>

      <div className="mt-8 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-3">
        {[["shield", "We verify", "Advance payments checked today"], ["box", "Packed in Dhaka", "Usually within 24 hours"], ["truck", "Courier calls", "Before your parcel arrives"]].map(([i, t, s]) => (
          <div key={t} className="flex gap-2.5"><Icon name={i as "shield"} className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" /><p className="text-[11px] leading-snug"><span className="block font-bold">{t}</span><span className="text-stone-500">{s}</span></p></div>
        ))}
      </div>
    </div>
  );
}

/* ============================= TRACKING ============================= */

const STEPS = [
  { label: "Preview saved", icon: "receipt" as const },
  { label: "Confirmed", icon: "check-circle" as const },
  { label: "Packed", icon: "box" as const },
  { label: "On the way", icon: "truck" as const },
  { label: "Delivered", icon: "home" as const },
];

const STATUS_TO_STEP: Record<OrderStatus, number> = {
  placed: 0,
  confirmed: 1,
  packed: 2,
  shipped: 3,
  delivered: 4,
  cancelled: 0,
};

export function Track() {
  const { search } = useRouter();
  const { orders, settings } = useStore();
  const idFromUrl = search.get("id") ?? "";
  const phoneFromUrl = search.get("phone") ?? orders.find((order) => order.id.toLowerCase() === idFromUrl.toLowerCase())?.phone ?? "";
  const findOrder = (number: string, mobile: string) => orders.find((order) => order.id.toLowerCase() === number.trim().toLowerCase() && order.phone === normPhone(mobile));
  const [id, setId] = useState(idFromUrl);
  const [phone, setPhone] = useState(phoneFromUrl);
  const [res, setRes] = useState<Order | null | "none">(() => idFromUrl && phoneFromUrl ? findOrder(idFromUrl, phoneFromUrl) ?? "none" : null);
  useEffect(() => {
    setId(idFromUrl);
    setPhone(phoneFromUrl);
    setRes(idFromUrl && phoneFromUrl ? findOrder(idFromUrl, phoneFromUrl) ?? "none" : null);
  }, [idFromUrl, phoneFromUrl, orders]);
  useSeo({ title: "Track your order", description: "Track your Glowing Space BD order with order number and phone.", path: "/track" });
  const lookup = (e: React.FormEvent) => { e.preventDefault(); setRes(findOrder(id, phone) ?? "none"); };
  const step = res && res !== "none" ? STATUS_TO_STEP[res.status ?? "placed"] : 0;
  const isCancelled = res && res !== "none" && res.status === "cancelled";
  const day = (o: Order) => new Date(o.created).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="shell max-w-2xl pt-8">
      <div className="text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white ring-1 ring-stone-200"><Icon name="box" className="h-5 w-5" /></span>
        <h1 className="mt-3 text-[28px] font-extrabold tracking-tight sm:text-3xl">Track your order</h1>
        <p className="mt-1.5 text-sm text-stone-500">Enter the order number and phone used in this browser's preview checkout.</p>
      </div>
      <form onSubmit={lookup} className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Order number"><input className={inputCls} value={id} onChange={(e) => setId(e.target.value)} placeholder="GS8492014" required autoComplete="off" /></Field>
          <Field label="Mobile number"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="01XXXXXXXXX" required autoComplete="tel" /></Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className={btnPrimary}><Icon name="search" className="h-4 w-4" />Track order</button>
          <Link to="/login" className="text-xs font-bold text-stone-500 underline underline-offset-2">Or sign in to see all orders</Link>
        </div>
      </form>

      {res === "none" && (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3.5 text-sm text-red-800"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />No order matches that number and phone. Check both and try again.</p>
      )}

      {res && res !== "none" && (
        <section className="mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white rise" aria-label="Order status">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">Order</p><p className="font-mono text-sm font-extrabold">{res.id}</p></div>
            <div className="text-right"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-400">Total</p><p className="text-sm font-extrabold tnum">{fmt(res.total)}</p></div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${isCancelled ? "bg-red-100 text-red-800" : step === 4 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
              {isCancelled ? "Cancelled" : STEPS[step].label}
            </span>
          </div>
          {res.courier && res.courier !== "Unassigned" ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 bg-emerald-50/60 px-5 py-3 text-xs text-stone-800">
              <span className="inline-flex items-center gap-2 font-semibold"><Icon name="truck" className="h-4 w-4 text-emerald-700" />Courier: {res.courier}</span>
              {res.trackingCode && <span className="font-mono font-bold text-emerald-900">Tracking #{res.trackingCode}</span>}
            </div>
          ) : (
            <p className="border-b border-stone-100 px-5 py-3 text-xs text-stone-600">This is a local preview. Status updates made in the Admin Console appear here immediately.</p>
          )}
          <ol className="px-5 py-5">
            {STEPS.map((s, i) => {
              const done = !isCancelled && i < step;
              const cur = !isCancelled && i === step;
              return (
                <li key={s.label} className="relative flex gap-3 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && <span className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 ${done ? "bg-emerald-500" : "bg-stone-200"}`} aria-hidden />}
                  <span className={`z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${done ? "bg-emerald-600 text-white" : cur ? "bg-stone-900 text-white ring-4 ring-amber-100" : "bg-stone-100 text-stone-400"}`}><Icon name={s.icon} className="h-4 w-4" /></span>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-[13px] font-bold ${i > step || isCancelled ? "text-stone-400" : ""}`}>
                        {s.label}
                        {cur && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-900">{step === 0 ? "PREVIEW" : "CURRENT"}</span>}
                      </p>
                      <p className={`text-[10px] ${i <= step && !isCancelled ? "text-stone-500" : "text-stone-400"}`}>{i <= step && !isCancelled ? day(res) : "Pending"}</p>
                    </div>
                    {i === 0 && <p className="mt-0.5 text-[11px] text-stone-500">Saved on this device. Manage status in /admin/orders.</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="border-t border-stone-100 bg-paper px-5 py-3.5 text-[11px]">
            <p className="flex items-start gap-2"><Icon name="map-pin" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-500" /><span>{res.address}, {res.city === "dhaka" ? "Dhaka" : "Outside Dhaka"} · {res.phone}</span></p>
          </div>
        </section>
      )}

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Icon name="whatsapp" className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold">Need an update now?</p><p className="text-[11px] text-stone-500">Message us with your order number.</p></div>
        <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-full border border-stone-300 px-3 py-1.5 text-[11px] font-bold">WhatsApp</a>
      </div>
    </div>
  );
}

/* ============================= LOGIN ============================= */

export function Login() {
  const { user, login, logout, orders, count } = useStore();
  const { go, back, previous, search } = useRouter();
  const [phone, setPhone] = usePageState("login:phone", "");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = usePageState("login:sent", false);
  const [err, setErr] = useState("");
  useSeo({ title: "Sign in with phone", description: "Log in with your phone number.", path: "/login" });

  if (user) return (
    <div className="shell max-w-lg pt-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-stone-900 text-white"><Icon name="user" className="h-5 w-5" /></span>
          <div><h1 className="text-xl font-extrabold">My account</h1><p className="text-sm text-stone-500">{user}</p></div>
        </div>
        <Link to="/admin" className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-800 hover:border-stone-900">
          <Icon name="settings" className="h-3.5 w-3.5" />
          <span>Admin</span>
        </Link>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-sm font-extrabold">Recent orders</h2>
        <Link to="/track" className="text-xs font-bold text-stone-500 underline underline-offset-2">Track another</Link>
      </div>
      <div className="mt-3 grid gap-2">
        {orders.filter((o) => o.phone === user).map((o) => (
          <Link key={o.id} to={`/order/${o.id}`} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3.5 text-sm hover:border-stone-400">
            <span className="flex items-center gap-2.5"><Icon name="receipt" className="h-4 w-4 text-stone-500" /><span className="font-mono font-bold">{o.id}</span></span>
            <span className="flex items-center gap-3"><span className="font-bold tnum">{fmt(o.total)}</span><Icon name="chevron-right" className="h-4 w-4 text-stone-400" /></span>
          </Link>
        ))}
        {!orders.some((o) => o.phone === user) && <p className="rounded-xl bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200">No orders yet on this account.</p>}
      </div>
      <button onClick={() => { setSent(false); setPhone(""); setOtp(""); logout(); }} className="mt-6 flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-stone-900"><Icon name="arrow-left" className="h-4 w-4" />Log out</button>
    </div>
  );

  return (
    <div className="shell pt-8">
      <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-stone-200 bg-white lg:grid-cols-[1.05fr_1fr]">
        <div className="hidden flex-col justify-between bg-stone-900 p-8 text-white lg:flex">
          <div>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-stone-900"><Icon name="bolt" className="h-5 w-5" /></span>
            <h2 className="mt-6 text-3xl font-extrabold leading-tight">One account.<br />Every build.</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">Your orders, addresses and support history in one place. No passwords, just a code.</p>
            <ul className="mt-6 space-y-3.5 text-sm">
              {[["box", "Track orders instantly"], ["refresh", "One-tap re-order of consumables"], ["headphones", "Priority maker support"]].map(([i, t]) => (
                <li key={t} className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-amber-400"><Icon name={i as "box"} className="h-4 w-4" /></span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 text-sm">
            <div className="flex gap-0.5 text-amber-400">{Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" className="h-3.5 w-3.5" />)}</div>
            <p className="mt-2 text-[13px] text-stone-300">“Ordered cells at 11pm, at my bench the next afternoon.”</p>
            <p className="mt-2 text-[11px] font-semibold text-stone-500">Nusrat J. · EEE student, Dhaka</p>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <p className="eyebrow text-amber-700">Glowing Space account</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight">Sign in or create an account</h1>
          <p className="mt-1.5 text-sm text-stone-500">One phone number. No password to remember.</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => {
            e.preventDefault(); setErr("");
            if (!sent) { if (!phoneOk(phone)) return setErr("Enter a valid number, like 01712345678."); setSent(true); }
            else {
              if (!/^\d{4}$/.test(otp)) return setErr("Enter four digits for the preview verification.");
              login(normPhone(phone));
              const next = search.get("next");
              const destination = next?.startsWith("/") && !next.startsWith("//") && next !== "/login" ? next : null;
              if (destination && previous?.split("?")[0] === destination) back(destination);
              else if (destination) go(destination, { replace: true });
              else if (next) go("/login", { replace: true });
            }
          }}>
            <Field label="Mobile number">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400"><Icon name="phone" className="h-4 w-4" /></span>
                <input className={`${inputCls} pl-10`} value={phone} disabled={sent} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" />
                {sent && <span className="absolute inset-y-0 right-3 flex items-center text-emerald-600"><Icon name="check-circle" className="h-4 w-4" /></span>}
              </div>
            </Field>
            {sent && (
              <Field label="4-digit code" hint="Preview: any four digits">
                <input className={`${inputCls} text-center font-mono text-xl tracking-[0.6em]`} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} inputMode="numeric" autoComplete="one-time-code" maxLength={4} autoFocus aria-label="4-digit verification code" />
              </Field>
            )}
            {err && <p role="alert" className="flex items-center gap-1.5 text-xs font-medium text-red-700"><Icon name="alert" className="h-3.5 w-3.5" />{err}</p>}
            <button className={`${btnAccent} w-full`}>{sent ? "Verify & continue" : "Send code"}<Icon name="arrow-right" className="h-4 w-4" /></button>
            {sent && <div className="flex items-center justify-between text-[11px]"><button type="button" className="font-bold text-stone-500 underline underline-offset-2" onClick={() => { setSent(false); setOtp(""); }}>Change number</button><span className="rounded-full bg-stone-100 px-2 py-1 text-stone-500">Demo: any 4 digits</span></div>}
          </form>
          <p className="mt-6 flex items-start gap-2 text-[11px] leading-relaxed text-stone-500"><Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />Frontend preview: no SMS is sent. Sign-in is stored only in this browser.</p>
          <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs font-bold text-stone-600">
            <Link to={count > 0 ? "/checkout" : "/shop"} className="inline-flex items-center gap-1.5 hover:text-stone-900">{count > 0 ? "Continue as guest" : "Browse parts"}<Icon name="arrow-right" className="h-3.5 w-3.5" /></Link>
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-900"><Icon name="settings" className="h-3.5 w-3.5" />Staff Admin</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
