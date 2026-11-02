import { Select } from "../ui/Select";
import { useState } from "react";
import { useStore } from "../store";
import { ROLE_DEFINITIONS, ALL_PERMISSIONS, hasPermission, type AdminRole, type StaffMember } from "./rbac";
import { validateSecretDraft, type SecretDescriptor, type VaultEnv } from "./secretsVault";
import { Confirm, Empty, Field, IconBtn, Overlay, PageHeading } from "./ui";
import { Icon } from "../icons";

export function VaultSection() {
  const { can, secretsMeta, rotateBackendSecret } = useStore();
  const [filter, setFilter] = useState("all");
  const [rotating, setRotating] = useState<SecretDescriptor | null>(null);
  if (!can("secrets.manage")) return null;
  const backend = Boolean(import.meta.env.VITE_ADMIN_API_URL);
  const list = secretsMeta.filter(s => filter === "all" || s.group === filter);
  return <div><PageHeading title="Vault" description="Manage integration credentials." />
    {!backend && <div className="admin-inline-notice mb-5"><Icon name="info" className="h-4 w-4" /><span>Backend not connected. Credential updates are unavailable in this frontend demo.</span></div>}
    <section className="admin-surface"><div className="admin-tabs" role="tablist" aria-label="Credential groups">{[["all", "All credentials"], ["payments", "Payments"], ["couriers", "Couriers"], ["messaging", "Messaging"], ["security", "Platform"]].map(([key, label]) => <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}>{label}</button>)}</div><div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th>Credential</th><th>Service</th><th>Environment</th><th>Version</th><th>Last changed</th><th /></tr></thead><tbody>{list.map(secret => <tr key={secret.key}><td><div className="flex items-center gap-3"><span className="admin-method-icon"><Icon name="key" className="h-4 w-4" /></span><span><strong className="text-[13px] font-medium">{secret.label.replace(/ \(.*\)/, "")}</strong><span className="admin-cell-sub font-mono">{secret.key}</span></span></div></td><td className="text-stone-500">{secret.service}</td><td><span className="admin-status status-gray">{secret.env}</span></td><td className="text-stone-500">{secret.configured ? `v${secret.version}` : "Not set"}</td><td className="text-xs text-stone-500">{secret.rotatedAt ? new Date(secret.rotatedAt).toLocaleDateString("en-GB") : "-"}</td><td className="text-right"><button className="admin-button" disabled={!backend} onClick={() => setRotating(secret)}>{secret.configured ? "Update" : "Add value"}</button></td></tr>)}</tbody></table></div></section>
    {rotating && <CredentialEditor secret={rotating} onClose={() => setRotating(null)} onCommit={rotateBackendSecret} />}
  </div>;
}

function CredentialEditor({ secret, onClose, onCommit }: { secret: SecretDescriptor; onClose: () => void; onCommit: (key: string, value: string, env: VaultEnv) => Promise<{ ok: boolean; message: string }> }) {
  const [value, setValue] = useState("");
  const [env, setEnv] = useState<VaultEnv>(secret.env);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const close = () => { setValue(""); onClose(); };
  const save = async () => {
    const check = validateSecretDraft(value, secret.minLength);
    if (!check.valid) { setError(check.issues[0]); return; }
    setBusy(true);
    const entered = value; setValue("");
    const response = await onCommit(secret.key, entered, env);
    setBusy(false);
    if (response.ok) close(); else setError(response.message);
  };
  return <Overlay title="Update credential" subtitle={secret.key} onClose={close} footer={<><button className="admin-button" onClick={close}>Cancel</button><button className="admin-button admin-button-primary" disabled={busy || !value} onClick={save}>{busy ? "Saving..." : "Save credential"}</button></>}><div className="space-y-5"><Field label="Environment"><Select className="admin-input" value={env} onChange={e => setEnv(e.target.value as VaultEnv)}><option value="production">Production</option><option value="sandbox">Sandbox</option></Select></Field><Field label="New value" hint="Existing values cannot be retrieved here."><textarea className="admin-input font-mono" value={value} rows={4} autoComplete="off" spellCheck={false} onChange={e => setValue(e.target.value)} /></Field>{error && <p role="alert" className="admin-form-error">{error}</p>}</div></Overlay>;
}

export function TeamSection() {
  const { staff, currentAdmin, can, upsertStaff, toggleStaffActive } = useStore();
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);
  const [suspending, setSuspending] = useState<StaffMember | null>(null);
  if (!can("team.manage")) return null;
  return <div><PageHeading title="Team" description="Manage staff access and responsibilities." count={staff.length}><button className="admin-button admin-button-primary" onClick={() => setEditing("new")}><Icon name="plus" className="h-4 w-4" />Add member</button></PageHeading><section className="admin-surface"><div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th>Member</th><th>Role</th><th>Access</th><th /></tr></thead><tbody>{staff.map(member => <tr key={member.id}><td><div className="flex items-center gap-3"><span className="admin-avatar">{member.initials}</span><span><strong className="font-medium">{member.name}{member.id === currentAdmin?.id && <small className="ml-2 text-stone-400">You</small>}</strong><span className="admin-cell-sub">{member.email}</span></span></div></td><td>{ROLE_DEFINITIONS[member.role].shortLabel}</td><td><span className={`admin-status status-${member.active ? "green" : "gray"}`}><i />{member.active ? "Active" : "Suspended"}</span></td><td><div className="flex justify-end gap-2">{member.id !== currentAdmin?.id && <><IconBtn icon="edit" label={`Edit ${member.name}`} onClick={() => setEditing(member)} /><button className="admin-button" onClick={() => member.active ? setSuspending(member) : toggleStaffActive(member.id)}>{member.active ? "Suspend" : "Restore"}</button></>}</div></td></tr>)}</tbody></table></div></section>
    <details className="admin-surface mt-6"><summary className="cursor-pointer p-5 text-sm font-medium flex justify-between items-center">Role permissions<Icon name="chevron-down" className="h-4 w-4" /></summary><div className="admin-table-scroll border-t border-stone-100"><table className="admin-data-table"><thead><tr><th>Capability</th>{Object.values(ROLE_DEFINITIONS).map(role => <th key={role.role} className="text-center">{role.shortLabel}</th>)}</tr></thead><tbody>{ALL_PERMISSIONS.map(permission => <tr key={permission.key}><td>{permission.label}</td>{Object.values(ROLE_DEFINITIONS).map(role => <td key={role.role} className="text-center">{hasPermission(role.role, permission.key) ? <Icon name="check" className="mx-auto h-4 w-4 text-emerald-600" /> : <span className="text-stone-300">-</span>}</td>)}</tr>)}</tbody></table></div></details>
    {editing && <StaffEditor member={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={member => { upsertStaff(member); setEditing(null); }} />}
    {suspending && <Confirm title={`Suspend ${suspending.name}?`} description="This member will no longer be able to enter the workspace. You can restore access later." confirmLabel="Suspend access" danger onClose={() => setSuspending(null)} onConfirm={() => { toggleStaffActive(suspending.id); setSuspending(null); }} />}
  </div>;
}

function StaffEditor({ member, onSave, onClose }: { member: StaffMember | null; onSave: (member: StaffMember) => void; onClose: () => void }) {
  const { staff } = useStore();
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<AdminRole>(member?.role ?? "support");
  const [error, setError] = useState("");
  const save = () => {
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Enter a name and valid email address."); return; }
    if (staff.some(m => m.id !== member?.id && m.email.toLowerCase() === email.toLowerCase())) { setError("A staff member already uses this email."); return; }
    onSave({ id: member?.id ?? `stf-${Date.now()}`, initials: name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase(), name: name.trim(), email: email.trim(), phone: member?.phone ?? "", role, active: member?.active ?? true, twoFactor: member?.twoFactor ?? false, lastActive: member?.lastActive ?? "Not yet signed in" });
  };
  return <Overlay title={member ? "Edit team member" : "Add team member"} onClose={onClose} footer={<><button className="admin-button" onClick={onClose}>Cancel</button><button className="admin-button admin-button-primary" onClick={save}>Save member</button></>}><div className="space-y-5"><Field label="Full name"><input className="admin-input" value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Email"><input className="admin-input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field><Field label="Role"><Select className="admin-input" value={role} onChange={e => setRole(e.target.value as AdminRole)}>{Object.values(ROLE_DEFINITIONS).map(def => <option key={def.role} value={def.role}>{def.shortLabel}</option>)}</Select></Field><p className="text-sm text-stone-500">{ROLE_DEFINITIONS[role].summary}</p>{error && <p role="alert" className="admin-form-error">{error}</p>}</div></Overlay>;
}

export function AuditSection() {
  const { can, auditLog } = useStore();
  const [group, setGroup] = useState("all");
  const [query, setQuery] = useState("");
  if (!can("audit.read")) return null;
  const filtered = auditLog.filter(entry => (group === "all" || entry.category === group) && `${entry.actorName} ${entry.action} ${entry.target}`.toLowerCase().includes(query.toLowerCase()));
  return <div><PageHeading title="Activity log" description="Changes made by your team." /><section className="admin-surface"><div className="admin-table-toolbar"><div className="admin-search-field"><Icon name="search" className="h-4 w-4" /><input aria-label="Search activity" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search actor, action, or order..." /></div><Select className="admin-select" value={group} onChange={e => setGroup(e.target.value)} aria-label="Filter activity type"><option value="all">All events</option>{["orders", "catalog", "storefront", "settings", "team", "security"].map(category => <option key={category}>{category}</option>)}</Select></div><div className="admin-table-scroll"><table className="admin-data-table"><thead><tr><th>When</th><th>Member</th><th>Action</th><th>Reference</th></tr></thead><tbody>{filtered.map(entry => <tr key={entry.id}><td className="whitespace-nowrap text-xs text-stone-500">{new Date(entry.at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td>{entry.actorName}<span className="admin-cell-sub">{ROLE_DEFINITIONS[entry.actorRole].shortLabel}</span></td><td>{entry.action}</td><td className="text-xs text-stone-500">{entry.target}</td></tr>)}</tbody></table></div>{!filtered.length && <Empty title="No matching activity" />}</section></div>;
}