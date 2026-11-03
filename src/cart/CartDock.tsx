import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useRouter } from "../router";
import { useStore } from "../store";
import { fmt } from "../data";
import { Icon } from "../icons";
import { QtyStepper } from "../components";
import { ResponsiveImage } from "../ResponsiveImage";
import "./cart.css";

/**
 * Cart entry points and their panels:
 * - Desktop (≥1024px): the header cart button opens a right-hand drawer.
 * - Phone / tablet (<1024px): a floating cart bubble opens a bottom sheet, and the
 *   page behind it is lightly blurred. The bubble is hidden while the cart is empty.
 */

import { useCartPanel } from "./cartPanel";

function CartItems({ compact, close }: { compact: boolean; close: () => void }) {
  const { items, setQty, remove, subtotal, discount, coupon, count, settings, cartIssue } = useStore();
  const remaining = Math.max(0, settings.freeDhakaThreshold - subtotal);
  return (
    <>
      <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800"><Icon name="cart" className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">Your cart</p>
          <p className="text-[11px] text-stone-500">{count} item{count === 1 ? "" : "s"} · ships from Dhaka</p>
        </div>
      </div>

      {items.length ? (
        <>
          <ul className="flex-1 space-y-3 overflow-y-auto py-4">
            {items.map(({ p, qty, unitsPerPack, variantId, variantLabel, packPrice, saleUnit, maxQty, key }) => (
              <li key={key} className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-2.5">
                <Link to={`/product/${p.slug}`} onClick={close} className="h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-stone-100">
                  <ResponsiveImage src={p.images[0]} alt={p.name} sizes="68px" className="h-full w-full object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start gap-2">
                    <Link to={`/product/${p.slug}`} onClick={close} className="line-clamp-2 min-w-0 flex-1 text-[13px] font-semibold leading-snug hover:underline">{p.name}</Link>
                    <button type="button" aria-label={`Remove ${p.name}, ${variantLabel}`} onClick={() => remove(p.slug, variantId)}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-stone-400 transition hover:bg-red-50 hover:text-red-600">
                      <Icon name="trash" className="h-[15px] w-[15px]" />
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-stone-600"><span>{variantLabel}</span><span aria-hidden="true">·</span><span>{fmt(packPrice)} / {saleUnit}</span></div>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                    <QtyStepper small qty={qty} setQty={(next) => setQty(p.slug, next, variantId)} max={Math.max(maxQty, 1)} />
                    <p className="text-sm font-extrabold tnum">{fmt(packPrice * qty)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="shrink-0 space-y-3 border-t border-stone-200 pt-4">
            {settings.freeDhakaThreshold > 0 && (
              <div>
                <p className="text-[11px] text-stone-500">{remaining > 0 ? <>Add <b className="tnum">{fmt(remaining)}</b> more for <b>free Dhaka delivery</b>.</> : <span className="font-semibold text-emerald-700">Free Dhaka delivery unlocked.</span>}</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, (subtotal / settings.freeDhakaThreshold) * 100)}%` }} /></div>
              </div>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-stone-500">Subtotal{coupon ? ` · after ${coupon}` : ""}</span>
              <span className="text-lg font-extrabold tnum">{fmt(subtotal - discount)}</span>
            </div>
            <p className="text-[11px] text-stone-500">Delivery and taxes are calculated at checkout.</p>
            {cartIssue && <p role="alert" className="rounded-xl bg-amber-50 p-2.5 text-xs font-semibold text-amber-800">{cartIssue}</p>}
            <div className={`flex gap-2 ${compact ? "" : "flex-col"}`}>
              {cartIssue ? (
                <button type="button" disabled className="flex flex-1 items-center justify-center rounded-full bg-stone-200 px-5 py-3 text-sm font-semibold text-stone-400">Proceed to checkout</button>
              ) : (
                <Link to="/checkout" onClick={close} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">
                  Proceed to checkout<Icon name="arrow-right" className="h-4 w-4" />
                </Link>
              )}
              <Link to="/cart" onClick={close} className="flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-900 hover:bg-stone-50">
                View full cart
              </Link>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-stone-100 text-stone-400"><Icon name="cart" className="h-6 w-6" /></span>
          <p className="text-sm font-semibold text-stone-600">Your cart is empty.</p>
          <Link to="/shop" onClick={close} className="rounded-full bg-stone-900 px-5 py-2.5 text-xs font-semibold text-white">Start shopping</Link>
        </div>
      )}
    </>
  );
}

function CartPanel() {
  const { open, closeCart, compact, trigger } = useCartPanel();
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(closeCart);
  useEffect(() => { close.current = closeCart; }, [closeCart]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const opener = trigger;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("[data-cart-close]")?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); return; }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled)')];
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(frame);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, trigger]);

  if (!open) return null;
  return createPortal(
    <div className={`fixed inset-0 z-[60] flex ${compact ? "items-end" : "justify-end"}`}>
      <button type="button" aria-label="Close cart" onClick={closeCart} className={`cart-scrim absolute inset-0 ${compact ? "backdrop-blur-[6px]" : ""}`} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`cart-panel relative flex w-full flex-col ${compact ? "max-h-[80vh] rounded-t-[28px] pb-[env(safe-area-inset-bottom)]" : "max-w-[420px] rounded-l-[28px]"}`}
      >
        {compact && <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-stone-300" aria-hidden="true" />}
        <button data-cart-close type="button" aria-label="Close cart" onClick={closeCart} className="absolute right-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full bg-stone-100 text-stone-500 transition hover:bg-stone-200 hover:text-stone-900">
          <Icon name="close" className="h-4 w-4" />
        </button>
        <div className="flex min-h-0 flex-1 flex-col p-5">
          <CartItems compact={compact} close={closeCart} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CartBubble({ raised = false }: { raised?: boolean }) {
  const { count } = useStore();
  const { openCart } = useCartPanel();
  const button = useRef<HTMLButtonElement>(null);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const bump = () => setPulse((n) => n + 1);
    document.addEventListener("cart:bump", bump);
    return () => document.removeEventListener("cart:bump", bump);
  }, []);
  if (!count) return null;
  return (
    <button
      key={pulse}
      type="button"
      id="cart-fab-target"
      ref={button}
      onClick={(event) => openCart(event.currentTarget)}
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
      className={`cart-bubble cart-pop fixed right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-stone-900 text-white shadow-xl shadow-stone-900/25 ring-4 ring-white transition hover:scale-105 ${raised ? "bottom-[calc(env(safe-area-inset-bottom,0px)+9rem)]" : "bottom-[calc(env(safe-area-inset-bottom,0px)+4.25rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"}`}
    >
      <Icon name="cart" className="h-[22px] w-[22px]" />
      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-extrabold text-stone-900 ring-2 ring-stone-900 tnum">{count}</span>
    </button>
  );
}

/** Floating cart bubble plus the compact/drawer cart panels. */
export function CartDock() {
  const { path } = useRouter();
  const { compact } = useCartPanel();
  // A sticky buy bar lives on product and checkout screens; keep the bubble above it.
  const raised = /^\/(product\/|cart$|checkout$|order\/)/.test(path);
  return (
    <>
      {compact && <CartBubble raised={raised} />}
      <CartPanel />
    </>
  );
}
