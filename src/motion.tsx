import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Icon } from "./icons";

const REDUCED = "(prefers-reduced-motion: reduce)";

/** True when the visitor has asked their device for less motion. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia(REDUCED).matches);
  useEffect(() => {
    const query = window.matchMedia(REDUCED);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Reports whether an element is on screen, so off-screen carousels can pause themselves. */
export function useIsVisible<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, visible];
}

/** Becomes true the first time an element scrolls into view, then stops observing. */
function useSeenOnce<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (seen || !el) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/** Fades and lifts content in once it scrolls into view. `stagger` cascades the direct children instead. */
export function Reveal({ children, stagger = false, className = "" }: { children: ReactNode; stagger?: boolean; className?: string }) {
  const [ref, seen] = useSeenOnce<HTMLDivElement>();
  return (
    <div ref={ref} className={`${stagger ? "reveal-stagger" : "reveal"} ${seen ? "is-in" : ""} ${className}`}>
      {children}
    </div>
  );
}

/** Counts up to `to` once it is visible. Shows the final value straight away for reduced motion. */
export function CountUp({ to, format = (n: number) => Math.round(n).toLocaleString("en-US"), duration = 1400 }: { to: number; format?: (n: number) => string; duration?: number }) {
  const reduced = usePrefersReducedMotion();
  const [ref, seen] = useSeenOnce<HTMLSpanElement>();
  const [value, setValue] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!seen) return;
    if (reduced) {
      setValue(to);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setValue(to * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [seen, to, duration, reduced]);
  return <span ref={ref} className="tnum">{format(value)}</span>;
}

/** Endless horizontal ticker. Pauses on hover. Becomes a scrollable row for reduced motion. */
export function Marquee({ items, className = "" }: { items: string[]; className?: string }) {
  const group = (hidden: boolean) => (
    <div className="flex shrink-0" aria-hidden={hidden || undefined}>
      {items.map((text) => (
        <span key={text} className="flex shrink-0 items-center gap-3 pr-10 text-[13px] font-semibold tracking-tight whitespace-nowrap">
          {text}
          <Icon name="star" className="h-3 w-3 text-amber-400" />
        </span>
      ))}
    </div>
  );
  return (
    <div role="region" aria-label="Store highlights" className={`marquee overflow-hidden py-3.5 ${className}`}>
      <div className="marquee-track flex w-max">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}

/**
 * Sends a copy of a product image along an arc into the header cart, then pops the cart badge.
 * Falls back to only the badge pop when motion is reduced or the cart is not on the page.
 */
export function flyToCart(source: Element | null, image?: string) {
  const bump = () => document.dispatchEvent(new CustomEvent("cart:bump"));
  // The floating bubble is the landing spot on phones and tablets; the header cart is the desktop one.
  const bubble = document.getElementById("cart-fab-target");
  const target = bubble?.getClientRects().length ? bubble : document.getElementById("cart-header-target") ?? document.getElementById("cart-target");
  const reduced = window.matchMedia(REDUCED).matches;
  if (!source || !target || reduced || typeof source.animate !== "function") {
    bump();
    return;
  }
  const from = source.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const size = 44;
  const sx = from.left + from.width / 2;
  const sy = from.top + from.height / 2;
  const tx = to.left + to.width / 2;
  const ty = to.top + to.height / 2;
  const arcX = (sx + tx) / 2;
  const arcY = Math.min(sy, ty) - 96;

  const dot = document.createElement("div");
  dot.className = "fly-dot";
  dot.setAttribute("aria-hidden", "true");
  const imageUrl = source instanceof HTMLImageElement ? source.currentSrc || image : image;
  if (imageUrl) dot.style.backgroundImage = `url("${imageUrl}")`;
  dot.style.left = `${sx - size / 2}px`;
  dot.style.top = `${sy - size / 2}px`;
  document.body.appendChild(dot);

  const flight = dot.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(1)", opacity: 1, offset: 0, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)" },
      { transform: `translate3d(${arcX - sx}px, ${arcY - sy}px, 0) scale(0.8)`, opacity: 1, offset: 0.5, easing: "cubic-bezier(0.6, 0, 0.8, 0.6)" },
      { transform: `translate3d(${tx - sx}px, ${ty - sy}px, 0) scale(0.2)`, opacity: 0.3, offset: 1 },
    ],
    { duration: 760, fill: "forwards" },
  );
  flight.onfinish = () => {
    dot.remove();
    bump();
  };
}
