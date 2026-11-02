import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type Dispatch,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react";

type NavigationOptions = { replace?: boolean; scroll?: "top" | "preserve" };
type Entry = {
  id: string;
  y: number;
  from?: string;
  browse?: string;
  focusHref?: string;
  data?: Record<string, unknown>;
};
type RouterValue = {
  path: string;
  search: URLSearchParams;
  hash: string;
  entryId: string;
  previous?: string;
  shoppingReturn: string;
  go: (to: string, options?: NavigationOptions) => void;
  back: (fallback?: string) => void;
};

const Ctx = createContext<RouterValue>(null!);
const STATE_KEY = "__glowingNavigation";
const currentUrl = () => window.location.pathname + window.location.search + window.location.hash;
const isBrowsePage = (path: string) => path === "/" || /^\/(shop|product)(\/|$)/.test(path);
const newEntryId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function stateObject(): Record<string, unknown> {
  const state: unknown = window.history.state;
  return state && typeof state === "object" && !Array.isArray(state)
    ? state as Record<string, unknown>
    : {};
}

function getEntry(): Entry | undefined {
  const value = stateObject()[STATE_KEY];
  return value && typeof value === "object" && "id" in value
    ? value as Entry
    : undefined;
}

function writeEntry(entry: Entry) {
  window.history.replaceState({ ...stateObject(), [STATE_KEY]: entry }, "", currentUrl());
}

function ensureEntry(): Entry {
  const existing = getEntry();
  if (existing) return existing;
  const entry = { id: newEntryId(), y: window.scrollY };
  writeEntry(entry);
  return entry;
}

function savePosition() {
  const entry = ensureEntry();
  const active = document.activeElement;
  const main = document.getElementById("main");
  writeEntry({
    ...entry,
    y: window.scrollY,
    focusHref: active instanceof HTMLAnchorElement && main?.contains(active)
      ? active.getAttribute("href") ?? undefined
      : entry.focusHref,
  });
}

function scrollToHash(hash: string) {
  let id: string;
  try { id = decodeURIComponent(hash.slice(1)); }
  catch { return false; }
  const target = document.getElementById(id);
  if (!target) return false;
  const header = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
  window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - header - 12);
  return true;
}

export function Router({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(currentUrl);
  const entryRef = useRef<Entry | null>(null);
  const initialized = useRef(false);
  const pending = useRef<{ kind: "top" | "preserve" | "restore"; y: number } | null>(null);
  if (!entryRef.current) entryRef.current = ensureEntry();

  useEffect(() => {
    const previousSetting = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; savePosition(); });
    };
    const onPop = () => {
      const entry = ensureEntry();
      entryRef.current = entry;
      pending.current = { kind: "restore", y: entry.y };
      setLoc(currentUrl());
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPop);
      if (frame) cancelAnimationFrame(frame);
      window.history.scrollRestoration = previousSetting;
    };
  }, []);

  // Run after React has mounted the destination, but before it is painted.
  useLayoutEffect(() => {
    const task = pending.current;
    if (!task) {
      if (!initialized.current) {
        initialized.current = true;
        const y = getEntry()?.y ?? 0;
        const hash = window.location.hash;
        if (!hash || !scrollToHash(hash)) window.scrollTo(0, y);
      }
      return;
    }
    initialized.current = true;
    pending.current = null;
    const hash = window.location.hash;
    if (!hash || !scrollToHash(hash)) window.scrollTo(0, task.y);

    if (task.kind === "top") {
      const heading = document.querySelector<HTMLElement>("#main .hero-slide[data-active='true'] h1, #main .hero-slide[data-active='true'] h2, #main h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
    } else if (task.kind === "restore") {
      const focusHref = getEntry()?.focusHref;
      if (focusHref) {
        const anchor = Array.from(document.querySelectorAll<HTMLAnchorElement>("#main a[href]"))
          .find((link) => link.getAttribute("href") === focusHref);
        anchor?.focus({ preventScroll: true });
      }
    }
  }, [loc]);

  const go = (to: string, options: NavigationOptions = {}) => {
    const target = new URL(to, window.location.href);
    if (target.origin !== window.location.origin) {
      window.location.assign(target.href);
      return;
    }
    const next = target.pathname + target.search + target.hash;
    if (next === currentUrl()) {
      if (target.hash) scrollToHash(target.hash);
      else if (options.scroll === "top") window.scrollTo(0, 0);
      return;
    }

    savePosition();
    const previous = ensureEntry();
    const browse = isBrowsePage(window.location.pathname)
      ? currentUrl()
      : previous.browse ?? "/shop";
    const mode = options.scroll ?? "top";
    const y = mode === "preserve" ? window.scrollY : 0;
    const entry: Entry = options.replace
      ? { ...previous, y, browse, data: previous.data }
      : { id: newEntryId(), y, from: currentUrl(), browse };
    const state = { ...stateObject(), [STATE_KEY]: entry };
    if (options.replace) window.history.replaceState(state, "", next);
    else window.history.pushState(state, "", next);
    entryRef.current = entry;
    pending.current = { kind: mode, y };
    setLoc(next);
  };

  const back = (fallback = "/shop") => {
    if (getEntry()?.from && window.history.length > 1) window.history.back();
    else go(fallback);
  };

  const url = new URL(loc, window.location.origin);
  const entry = entryRef.current;
  return (
    <Ctx.Provider value={{
      path: url.pathname.replace(/\/$/, "") || "/",
      search: url.searchParams,
      hash: url.hash,
      entryId: entry?.id ?? "",
      previous: entry?.from,
      shoppingReturn: isBrowsePage(url.pathname) ? currentUrl() : entry?.browse ?? "/shop",
      go,
      back,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useRouter = () => useContext(Ctx);

/** Keep a page's small UI state on its history entry, not across unrelated visits. */
export function usePageState<T>(name: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const { entryId } = useRouter();
  const [value, setValue] = useState<T>(() => (getEntry()?.data?.[name] as T | undefined) ?? initial);
  useEffect(() => {
    const entry = getEntry();
    if (entry?.id === entryId) writeEntry({ ...entry, data: { ...entry.data, [name]: value } });
  }, [entryId, name, value]);
  return [value, setValue];
}

type LinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  to: string;
  replace?: boolean;
  scroll?: NavigationOptions["scroll"];
};

export function Link({ to, replace, scroll, onClick, target, download, children, ...rest }: LinkProps) {
  const { go } = useRouter();
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (target && target !== "_self") || download !== undefined) return;
    if (new URL(to, window.location.href).origin !== window.location.origin) return;
    event.preventDefault();
    go(to, { replace, scroll });
  };
  return <a href={to} target={target} download={download} onClick={click} {...rest}>{children}</a>;
}

/** Match "/product/:slug" against a pathname. */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split("/"), b = path.split("/");
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(":")) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}
