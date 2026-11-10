import { useEffect, useState } from "react";
import { useStore } from "../store";
import { Field, PageHeading, SwitchToggle, adminInput } from "./ui";
import { ALL_PERMISSIONS, ROLE_DEFINITIONS, type Permission } from "./rbac";
import type { StoreSettings } from "../data";

type Group = { key: string; title: string; description: string; fields: { key: keyof StoreSettings; label: string; type?: "text" | "number" | "textarea" | "switch" | "select"; options?: [string, string][] }[] };

const SETTING_GROUPS: Group[] = [
  { key: "general", title: "General", description: "Site identity, announcement bar and catalog behaviour.", fields: [
    { key: "storeName", label: "Site name" }, { key: "siteTagline", label: "Tagline" },
    { key: "announcementText", label: "Announcement text" }, { key: "announcementLink", label: "Announcement link" },
    { key: "footerAbout", label: "Footer about" }, { key: "copyrightText", label: "Copyright text" },
    { key: "productsPerPage", label: "Products per page", type: "number" },
    { key: "guestCheckout", label: "Guest checkout", type: "switch" },
    { key: "reviewsAutoApprove", label: "Auto-approve reviews", type: "switch" },
  ] },
  { key: "store", title: "Store & Appearance", description: "Currency formatting, theme colors and return window.", fields: [
    { key: "currencySymbol", label: "Currency symbol" }, { key: "currencyCode", label: "Currency code" },
    { key: "currencyPosition", label: "Symbol position", type: "select", options: [["before", "Before amount"], ["after", "After amount"]] },
    { key: "primaryColor", label: "Primary color" }, { key: "secondaryColor", label: "Secondary color" }, { key: "accentColor", label: "Accent color" },
    { key: "returnDays", label: "Return window (days)", type: "number" },
  ] },
  { key: "branding", title: "Logo & Favicon", description: "Brand assets used in header, footer and social previews.", fields: [
    { key: "logoDark", label: "Logo URL (light header)" }, { key: "favicon", label: "Favicon URL" }, { key: "ogImage", label: "OG image URL" },
  ] },
  { key: "contact", title: "Contact Information", description: "Shown in the topbar, footer and contact page.", fields: [
    { key: "contactPhone", label: "Phone" }, { key: "contactEmail", label: "Email" },
    { key: "contactAddress", label: "Address" }, { key: "businessHours", label: "Business hours" },
    { key: "mapEmbedUrl", label: "Map embed URL", type: "textarea" },
  ] },
  { key: "social", title: "Social Links", description: "Links rendered in the footer.", fields: [
    { key: "social", label: "Social profiles (facebook, instagram, twitter, youtube, linkedin, tiktok, whatsapp)" },
  ] },
  { key: "email", title: "Email Settings", description: "Sender identity and order notifications.", fields: [
    { key: "mailFromName", label: "From name" }, { key: "mailFromAddress", label: "From address" },
    { key: "orderNotificationEmail", label: "Order notification email" }, { key: "notifyCustomerEmail", label: "Notify customer by email", type: "switch" },
  ] },
  { key: "seo", title: "SEO Settings", description: "Default meta tags and analytics.", fields: [
    { key: "metaTitle", label: "Meta title" }, { key: "metaKeywords", label: "Meta keywords" },
    { key: "metaDescription", label: "Meta description", type: "textarea" },
    { key: "gaId", label: "Google Analytics ID" }, { key: "allowIndexing", label: "Allow indexing", type: "switch" },
  ] },
  { key: "tax", title: "Tax Settings", description: "Optional VAT applied at checkout.", fields: [
    { key: "taxEnabled", label: "Enable tax", type: "switch" }, { key: "taxLabel", label: "Tax label" }, { key: "taxRate", label: "Tax rate (%)", type: "number" },
  ] },
  { key: "shipping", title: "Shipping & Returns", description: "Policy text shown on product pages and the shipping page.", fields: [
    { key: "deliveryInfo", label: "Delivery info", type: "textarea" }, { key: "returnPolicy", label: "Return policy", type: "textarea" },
  ] },
];

export function SettingsSection() {
  const { settings, updateSettings, can } = useStore();
  const canWrite = can("settings.write");
  const [active, setActive] = useState(SETTING_GROUPS[0].key);
  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  useEffect(() => { setDraft(settings); }, [settings]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const change = (patch: Partial<StoreSettings>) => { setDraft(current => ({ ...current, ...patch })); setError(""); setSavedMessage(""); };
  const save = () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      if (!updateSettings(draft, "Saved store settings")) { setError("Settings were not saved. Check the permission and retry."); return; }
      setSavedMessage("Settings saved.");
    } finally { setSaving(false); }
  };
  const group = SETTING_GROUPS.find(g => g.key === active)!;
  return <div>
    <PageHeading title="Settings" description="All store configuration in one place." />
    <div className="admin-tabs mb-5 flex-wrap" role="tablist" aria-label="Settings groups">
      {SETTING_GROUPS.map(g => <button key={g.key} role="tab" aria-selected={active === g.key} onClick={() => setActive(g.key)}>{g.title}</button>)}
    </div>
    <section className="admin-surface p-5">
      <h3 className="text-sm font-extrabold">{group.title}</h3><p className="mt-0.5 text-xs text-stone-500">{group.description}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {group.fields.map(f => {
          if (f.key === "social") {
            const social = draft.social ?? {};
            return <div key="social" className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
              {["facebook", "instagram", "twitter", "youtube", "linkedin", "tiktok", "whatsapp"].map(net => (
                <Field key={net} label={net}><input className={adminInput} value={social[net] ?? ""} disabled={!canWrite} onChange={e => change({ social: { ...social, [net]: e.target.value } })} placeholder={`https://${net}.com/…`} /></Field>
              ))}
            </div>;
          }
          const value = draft[f.key];
          if (f.type === "switch") return <div key={f.key} className="flex items-center justify-between gap-3 rounded-xl bg-[#f6f5f1] px-3 py-2.5"><span className="text-xs font-bold text-stone-800">{f.label}</span><SwitchToggle checked={Boolean(value)} label={f.label} disabled={!canWrite} onChange={v => change({ [f.key]: v } as Partial<StoreSettings>)} /></div>;
          if (f.type === "select") return <Field key={f.key} label={f.label}><select className={adminInput} value={String(value)} disabled={!canWrite} onChange={e => change({ [f.key]: e.target.value } as Partial<StoreSettings>)}>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>;
          if (f.type === "textarea") return <div key={f.key} className="sm:col-span-2"><Field label={f.label}><textarea rows={3} className={adminInput} value={String(value ?? "")} disabled={!canWrite} onChange={e => change({ [f.key]: e.target.value } as Partial<StoreSettings>)} /></Field></div>;
          return <Field key={f.key} label={f.label}><input type={f.type === "number" ? "number" : "text"} className={adminInput} value={String(value ?? "")} disabled={!canWrite} onChange={e => change({ [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value } as Partial<StoreSettings>)} /></Field>;
        })}
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>}
      {savedMessage && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">{savedMessage}</p>}
      <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4"><span role="status" className={`text-xs font-semibold ${dirty ? "text-amber-800" : "text-stone-400"}`}>{dirty ? "Unsaved settings changes" : canWrite ? "All settings saved" : "Read only"}</span>{canWrite && <div className="flex gap-2"><button type="button" disabled={!dirty || saving} onClick={() => { setDraft(settings); setError(""); }} className="admin-button disabled:opacity-40">Undo</button><button type="button" disabled={!dirty || saving} onClick={save} className="admin-button admin-button-primary disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Saving…" : "Save settings"}</button></div>}</div>
      {!canWrite && <p className="mt-4 text-xs text-stone-500">Read-only for your role.</p>}
    </section>
  </div>;
}

export function SystemSection() {
  const { auditLog, can, notify } = useStore();
  return <div>
    <PageHeading title="System & Integrations" description="Runtime info, integrations and maintenance." />
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="admin-surface p-5"><h3 className="text-sm font-extrabold">Environment</h3>
        <dl className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between"><dt className="text-stone-500">Runtime</dt><dd className="font-mono font-bold">Next.js 16 · Node {typeof process !== "undefined" ? "server" : "browser"}</dd></div>
          <div className="flex justify-between"><dt className="text-stone-500">Database</dt><dd className="font-mono font-bold">PostgreSQL via Drizzle</dd></div>
          <div className="flex justify-between"><dt className="text-stone-500">Admin API</dt><dd className="font-mono font-bold">{process.env.NEXT_PUBLIC_ADMIN_API_URL ? "external" : "built-in routes"}</dd></div>
          <div className="flex justify-between"><dt className="text-stone-500">Courier API</dt><dd className="font-mono font-bold">{process.env.NEXT_PUBLIC_ADMIN_API_URL ? "enabled" : "demo mode"}</dd></div>
        </dl>
      </section>
      <section className="admin-surface p-5"><h3 className="text-sm font-extrabold">Integrations</h3>
        <ul className="mt-3 space-y-2 text-xs text-stone-600">
          <li className="flex justify-between"><span>bKash Tokenized</span><span className="admin-status status-amber">manual mode</span></li>
          <li className="flex justify-between"><span>Nagad PGW</span><span className="admin-status status-amber">manual mode</span></li>
          <li className="flex justify-between"><span>Steadfast / Pathao / RedX</span><span className="admin-status status-green">configured</span></li>
          <li className="flex justify-between"><span>WhatsApp support</span><span className="admin-status status-green">enabled</span></li>
        </ul>
      </section>
      <section className="admin-surface p-5 lg:col-span-2"><h3 className="text-sm font-extrabold">Maintenance</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {can("settings.write") && <button className="admin-button" onClick={() => { notify("Application cache cleared (demo)"); }}>Clear application cache</button>}
          <button className="admin-button" onClick={() => notify("Backup queued (demo)")}>Download database backup</button>
        </div>
        <p className="mt-3 text-xs text-stone-500">Recent audit entries: {auditLog.length}</p>
      </section>
    </div>
  </div>;
}

export function RolesSection() {
  const roles = Object.values(ROLE_DEFINITIONS);
  return <div>
    <PageHeading title="Roles & Permissions" description="Permission matrix applied to every admin account." />
    <section className="admin-surface mb-5 p-5">
      <div className="flex flex-wrap gap-2">{roles.map(r => <span key={r.role} className={`admin-status ${r.badgeCls}`}>{r.label}</span>)}</div>
    </section>
    <section className="admin-surface overflow-x-auto p-0">
      <table className="admin-data-table">
        <thead><tr><th>Permission</th>{roles.map(r => <th key={r.role} className="text-center">{r.shortLabel}</th>)}</tr></thead>
        <tbody>
          {ALL_PERMISSIONS.map(p => (
            <tr key={p.key}>
              <td><span className="text-[10px] uppercase tracking-wide text-stone-400">{p.group}</span> <span className="ml-2 text-xs font-semibold">{p.label}</span></td>
              {roles.map(r => <td key={r.role} className="text-center">{r.permissions.includes(p.key) ? "✓" : "—"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  </div>;
}
