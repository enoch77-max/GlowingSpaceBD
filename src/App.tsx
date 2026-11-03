"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Router, useRouter, match } from "./router";
import { StoreProvider, useStore } from "./store";
import { Header, Footer, Toast, MobileNav, ScrollProgress } from "./components";
import { CartDock } from "./cart/CartDock";
import { CartPanelProvider } from "./cart/cartPanel";
import { Home } from "./views/Home";
import { Catalog, ProductPage } from "./views/Shop";
import { Cart, Checkout, Confirmation, Track, Login } from "./views/Order";
import { NotFound } from "./views/NotFound";
import { AdminPage } from "./views/Admin";

function Shell() {
  const { path } = useRouter();
  const { visibleCategories, findProduct, catalogReady } = useStore();

  let m: Record<string, string> | null;
  if (path === "/admin") {
    return (
      <div className="min-h-screen bg-paper font-sans text-stone-900 antialiased">
        <main id="main"><AdminPage /></main>
        <Toast />
      </div>
    );
  }
  if ((m = match("/admin/:section", path))) {
    return (
      <div className="min-h-screen bg-paper font-sans text-stone-900 antialiased">
        <main id="main"><AdminPage sectionParam={m.section} /></main>
        <Toast />
      </div>
    );
  }

  let page: ReactNode;
  if (path === "/") page = <Home />;
  else if (path === "/shop") page = <Catalog />;
  else if ((m = match("/shop/:cat", path))) {
    page = visibleCategories.some((category) => category.slug === m!.cat) ? <Catalog category={m.cat} /> : <NotFound />;
  } else if ((m = match("/product/:slug", path))) {
    page = findProduct(m.slug) ? <ProductPage slug={m.slug} /> : catalogReady ? <NotFound /> : <div role="status" className="shell py-24 text-center text-sm text-stone-500">Loading product…</div>;
  } else if (path === "/cart") page = <Cart />;
  else if (path === "/checkout") page = <Checkout />;
  else if ((m = match("/order/:id", path))) page = <Confirmation id={m.id} />;
  else if (path === "/track") page = <Track />;
  else if (path === "/login") page = <Login />;
  else page = <NotFound />;

  return (
    <CartPanelProvider>
      <div className="flex min-h-screen flex-col bg-paper font-sans text-stone-900 antialiased">
        <ScrollProgress />
        <Header key={path} />
        <main id="main" className="flex-1">
          <div key={path}>{page}</div>
        </main>
        <Footer />
        <MobileNav />
        <CartDock />
        <Toast />
      </div>
    </CartPanelProvider>
  );
}

export default function App({ initialUrl = "/" }: { initialUrl?: string }) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  return (
    <Router initialUrl={initialUrl}>
      <StoreProvider>
        {mounted ? (
          <Shell />
        ) : (
          <div className="min-h-screen bg-paper font-sans text-stone-900 antialiased" />
        )}
      </StoreProvider>
    </Router>
  );
}
