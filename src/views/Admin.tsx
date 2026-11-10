import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useRouter } from "../router";
import { useStore } from "../store";
import { Icon } from "../icons";
import { useSeo } from "../seo";
import { ROLE_DEFINITIONS, type AdminRole } from "../admin/rbac";
import { ADMIN_NAV, adminHref } from "../admin/navigation";
import { ProductsSection } from "../admin/AdminSections";
import { ContentDraftProvider, ReturnsSection, CustomersSection, ReviewsSection, MessagesSection, CategoriesSection, BrandsSection, AttributesSection, TagsSection, DiscountsSection, BannersSection, FlashSaleSection, NewsletterSection, TestimonialsSection, HomeSectionsSection, PagesSection, BlogSection, MediaSection, ProvidersSection, ZonesSection, TrackingSection, PayMethodsSection, PaySettingsSection, TransactionsSection, ReportsSection } from "../admin/CommerceAdmin";
import { SettingsSection, SystemSection, RolesSection } from "../admin/SettingsAdmin";
import { OrdersSection } from "../admin/Orders";
import { DispatchPage } from "../admin/Dispatch";
import { CouponsSection, CheckoutSettings } from "../admin/Promotions";
import { VaultSection, TeamSection, AuditSection } from "../admin/Administration";
import { Overview } from "../admin/Overview";
import { Overlay } from "../admin/ui";
import { Select } from "../ui/Select";
import { waitingOrder } from "../admin/batches";
import "../admin/admin.css";

export function AdminPage({ sectionParam }: { sectionParam?: string }) {
  return <ContentDraftProvider><AdminWorkspace sectionParam={sectionParam} /></ContentDraftProvider>;
}

function AdminWorkspace({ sectionParam }: { sectionParam?: string }) {
  const { currentAdmin, staff, signInAdmin, signOutAdmin, switchAdminRole, can, orders, catalogProducts } = useStore();
  const { path, search, go } = useRouter();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandIndex, setCommandIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const commandRef = useRef<HTMLDivElement>(null);
  const allowedNav = ADMIN_NAV.filter((item) => can(item.permission));
  const requested = sectionParam ?? "overview";
  const active = allowedNav.find((item) => item.key === requested) ?? allowedNav[0];
  const destination = active ? adminHref(active.key) : "/admin";
  useSeo({ title: active?.label ?? "Staff sign in", description: "Glowing Space workspace", path });

  // Never mount a section the current role cannot use, including direct URLs.
  useLayoutEffect(() => {
    if (currentAdmin && active && active.key !== requested) go(destination, { replace: true });
  }, [currentAdmin?.role, currentAdmin?.id, requested, destination]);

  useEffect(() => { setMobileMenu(false); setCommandOpen(false); setQuery(""); }, [path, currentAdmin?.role]);

  // Every search field is clickable across its full box, not only on the text.
  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      const target = event.target as Element;
      const field = target.closest(".admin-search-field, .admin-command-field");
      if (!field || target.closest("button")) return;
      event.preventDefault();
      field.querySelector<HTMLInputElement>("input")?.focus();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input,textarea,select,[contenteditable],[role='listbox']");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        const orderSearch = document.querySelector<HTMLInputElement>('input[aria-label="Search orders"]');
        if (e.key === "/" && orderSearch) orderSearch.focus({ preventScroll: true });
        else { searchRef.current?.focus(); setCommandOpen(true); }
      }
      if (e.key === "Escape") setCommandOpen(false);
    };
    const onDown = (event: PointerEvent) => { if (!commandRef.current?.contains(event.target as Node)) setCommandOpen(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onDown); };
  }, []);

  const term = query.trim().toLowerCase();
  const matches: { id: string; label: string; detail: string; icon: "receipt" | "box" | "arrow-right" | "truck"; href: string }[] = term ? [
    ...allowedNav.filter((n) => n.label.toLowerCase().includes(term)).map((n) => ({ id: `nav-${n.key}`, label: n.label, detail: "Page", icon: "arrow-right" as const, href: adminHref(n.key) })),
    ...(can("orders.read") ? orders.filter((o) => `${o.id} ${o.name} ${o.phone}`.toLowerCase().includes(term)).slice(0, 5).map((o) => ({ id: o.id, label: `${o.id} / ${o.name}`, detail: "Order", icon: "receipt" as const, href: `/admin/orders?q=${encodeURIComponent(o.id)}` })) : []),
    ...(can("catalog.read") ? catalogProducts.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(term)).slice(0, 5).map((p) => ({ id: p.slug, label: p.name, detail: p.sku, icon: "box" as const, href: `/admin/products?q=${encodeURIComponent(p.sku)}` })) : []),
  ].slice(0, 8) : [];
  const chooseMatch = (href: string) => { setCommandOpen(false); setQuery(""); go(href); };

  if (!currentAdmin) {
    return (
      <div className="admin-app admin-signin">
        <div className="admin-signin-brand"><Brand /><Link to="/" className="admin-text-button">Visit store <Icon name="external" className="h-3.5 w-3.5" /></Link></div>
        <div className="admin-signin-panel">
          <span className="admin-kicker">STAFF WORKSPACE</span>
          <h1>Welcome back.</h1>
          <p>Choose a demo account to preview its workspace.</p>
          <div className="mt-7 grid gap-3">
            {staff.filter((s) => s.active).map((member) => (
              <button key={member.id} onClick={() => signInAdmin(member.id)} className="admin-account-choice">
                <span className="admin-avatar">{member.initials}</span>
                <span className="min-w-0 flex-1 text-left"><strong>{member.name}</strong><small>{ROLE_DEFINITIONS[member.role].shortLabel}</small></span>
                <Icon name="arrow-right" className="h-4 w-4" />
              </button>
            ))}
          </div>
          <small className="mt-6 block text-stone-500">Frontend demo. Production sign-in requires a backend session.</small>
        </div>
      </div>
    );
  }

  const waitingCount = orders.filter(waitingOrder).length;
  const openCount = orders.filter((o) => ["placed", "confirmed", "packed"].includes(o.status ?? "placed")).length;

  const sidebar = (
    <>
      <Link to={destination} className="admin-brand-link"><Brand /></Link>
      <div className="admin-store-switch"><span className="admin-store-symbol">G</span><div><strong>Glowing Space BD</strong><small>Store workspace</small></div><span className="admin-local-dot" /></div>
      <nav aria-label="Admin sections">
        {["Workspace", "Catalog", "Marketing", "Content", "Delivery", "Payments", "Reports", "Settings", "Administration"].map((group) => {
          const items = allowedNav.filter((item) => item.group === group);
          if (!items.length) return null;
          return (
            <div key={group} className="admin-nav-group">
              <p>{group}</p>
              {items.map((item) => {
                const count = item.key === "orders" ? openCount : item.key === "dispatch" ? waitingCount : undefined;
                return (
                  <Link key={item.key} to={adminHref(item.key)} aria-current={active?.key === item.key ? "page" : undefined} className={`admin-nav-link ${active?.key === item.key ? "active" : ""}`}>
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                    {count !== undefined && count > 0 && <span className="admin-nav-count">{count}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="admin-sidebar-bottom">
        <Link to="/" className="admin-nav-link"><Icon name="external" className="h-[18px] w-[18px]" /><span>View storefront</span></Link>
        <div className="admin-sidebar-user">
          <span className="admin-avatar">{currentAdmin.initials}</span>
          <div className="min-w-0 flex-1"><strong>{currentAdmin.name}</strong><small>{ROLE_DEFINITIONS[currentAdmin.role].shortLabel}</small></div>
          <button className="admin-icon-button" onClick={signOutAdmin} aria-label="Sign out of admin"><Icon name="logout" className="h-4 w-4" /></button>
        </div>
      </div>
    </>
  );

  return (
    <div className="admin-app admin-layout">
      <aside className="admin-sidebar">{sidebar}</aside>
      <div className="admin-main-column">
        <header className="admin-topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button className="admin-icon-button lg:hidden" onClick={() => setMobileMenu(true)} aria-label="Open admin navigation"><Icon name="menu" className="h-[18px] w-[18px]" /></button>
            <span className="admin-breadcrumb"><span>Workspace</span><Icon name="chevron-right" className="h-3 w-3" /><h1>{active?.label}</h1></span>
          </div>
          <div ref={commandRef} className="admin-command">
            <div className="admin-command-field">
              <Icon name="search" className="h-4 w-4" />
              <input
                ref={searchRef}
                value={query}
                aria-label="Admin quick jump"
                placeholder="Search anything..."
                onFocus={() => setCommandOpen(true)}
                onChange={(e) => { setQuery(e.target.value); setCommandIndex(-1); setCommandOpen(true); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setCommandIndex((i) => Math.min(i + 1, matches.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setCommandIndex((i) => Math.max(0, i - 1)); }
                  if (e.key === "Enter" && matches[commandIndex < 0 ? 0 : commandIndex]) chooseMatch(matches[commandIndex < 0 ? 0 : commandIndex].href);
                }}
              />
              <kbd>Ctrl K</kbd>
            </div>
            {commandOpen && term && (
              <div className="admin-command-results">
                {matches.length ? matches.map((m, i) => (
                  <button key={m.id} className={i === commandIndex ? "active" : ""} onClick={() => chooseMatch(m.href)}>
                    <Icon name={m.icon} className="h-4 w-4" />
                    <span><strong>{m.label}</strong><small>{m.detail}</small></span>
                    <Icon name="chevron-right" className="h-3.5 w-3.5" />
                  </button>
                )) : <p>No results for "{query}"</p>}
              </div>
            )}
          </div>
          <div className="admin-topbar-actions">
            <span className="admin-demo-label">Local demo</span>
            <div className="admin-role-switch">
              <span className="hidden xl:inline">Preview role</span>
              <Select aria-label="Switch active RBAC role" variant="header" className="admin-role-select" value={currentAdmin.role} onChange={(e) => switchAdminRole(e.target.value as AdminRole)}>
                <option value="owner" data-hint="Full access">Owner</option>
                <option value="manager" data-hint="Operations">Ops Manager</option>
                <option value="fulfillment" data-hint="Packing & dispatch">Fulfillment</option>
                <option value="support" data-hint="Orders & notes">Support</option>
              </Select>
            </div>
            <span className="admin-topbar-avatar">{currentAdmin.initials}</span>
          </div>
        </header>
        <div className="admin-content">
          {active?.key === "overview" && <Overview />}
          {active?.key === "orders" && <OrdersSection initialQuery={search.get("q") ?? ""} />}
          {active?.key === "dispatch" && <DispatchPage />}
          {active?.key === "returns" && <ReturnsSection />}
          {active?.key === "customers" && <CustomersSection />}
          {active?.key === "reviews" && <ReviewsSection />}
          {active?.key === "messages" && <MessagesSection />}
          {active?.key === "products" && <ProductsSection key={`products-${search.get("q") ?? ""}`} initialQuery={search.get("q") ?? ""} />}
          {active?.key === "categories" && <CategoriesSection />}
          {active?.key === "brands" && <BrandsSection />}
          {active?.key === "attributes" && <AttributesSection />}
          {active?.key === "tags" && <TagsSection />}
          {active?.key === "coupons" && <CouponsSection />}
          {active?.key === "discounts" && <DiscountsSection />}
          {active?.key === "banners" && <BannersSection />}
          {active?.key === "flash" && <FlashSaleSection />}
          {active?.key === "newsletter" && <NewsletterSection />}
          {active?.key === "home-sections" && <HomeSectionsSection />}
          {active?.key === "pages" && <PagesSection />}
          {active?.key === "blog" && <BlogSection />}
          {active?.key === "testimonials" && <TestimonialsSection />}
          {active?.key === "media" && <MediaSection />}
          {active?.key === "providers" && <ProvidersSection />}
          {active?.key === "zones" && <ZonesSection />}
          {active?.key === "tracking" && <TrackingSection />}
          {active?.key === "pay-methods" && <PayMethodsSection />}
          {active?.key === "pay-settings" && <PaySettingsSection />}
          {active?.key === "transactions" && <TransactionsSection />}
          {active?.key === "reports" && <ReportsSection />}
          {active?.key === "settings" && <SettingsSection />}
          {active?.key === "system" && <SystemSection />}
          {active?.key === "roles" && <RolesSection />}
          {active?.key === "secrets" && <VaultSection />}
          {active?.key === "team" && <TeamSection />}
          {active?.key === "audit" && <AuditSection />}
        </div>
      </div>
      {mobileMenu && <Overlay title="Workspace" onClose={() => setMobileMenu(false)}><div className="admin-mobile-navigation">{sidebar}</div></Overlay>}
    </div>
  );
}

function Brand() {
  return <span className="admin-brand"><span><Icon name="bolt" className="h-[17px] w-[17px]" /></span><span>glowing<span className="font-normal">space</span><small>ADMIN</small></span></span>;
}
