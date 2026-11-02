import { useSyncExternalStore } from "react";

const query = typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 767px)") : null;
const subscribe = (onChange: () => void) => {
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
};

/** Share the CSS mobile breakpoint without mounting both responsive lists. */
export function useMobileLayout() {
  return useSyncExternalStore(subscribe, () => query?.matches ?? false, () => false);
}