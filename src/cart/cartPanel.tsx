import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Cart entry points and their panels:
 * - Desktop (≥1024px): the header cart button opens a right-hand drawer.
 * - Phone / tablet (<1024px): a floating cart bubble opens a bottom sheet, and the
 *   page behind it is lightly blurred. The bubble is hidden while the cart is empty.
 */

type CartPanelState = {
  open: boolean;
  openCart: (trigger?: HTMLElement | null) => void;
  closeCart: () => void;
  compact: boolean;
  trigger: HTMLElement | null;
};

const CartPanelContext = createContext<CartPanelState>({ open: false, openCart: () => {}, closeCart: () => {}, compact: false, trigger: null });
export const useCartPanel = () => useContext(CartPanelContext);

/** Phone and tablet share one cart surface; desktop gets its own side drawer. */
export function useCompactLayout() {
  const [compact, setCompact] = useState(() => typeof window !== "undefined" && window.innerWidth < 1024);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}

export function CartPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const compact = useCompactLayout();
  const openCart = (source?: HTMLElement | null) => { setTrigger(source ?? null); setOpen(true); };
  return (
    <CartPanelContext.Provider value={{ open, openCart, closeCart: () => setOpen(false), compact, trigger }}>
      {children}
    </CartPanelContext.Provider>
  );
}
