import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "../icons";

export const adminInput = "admin-input";
export const adminBtnPrimary = "admin-button admin-button-primary";
export const adminBtnAccent = "admin-button admin-button-primary";
export const adminBtnGhost = "admin-button";

export function IconBtn({ icon, label, onClick, disabled, tone = "default" }: {
  icon: IconName; label: string; onClick: () => void; disabled?: boolean; tone?: "default" | "danger";
}) {
  return <button type="button" className={`admin-icon-button ${tone === "danger" ? "admin-danger" : ""}`} title={label} aria-label={label} onClick={onClick} disabled={disabled}><Icon name={icon} className="h-4 w-4" /></button>;
}

export function SwitchToggle({ checked, onChange, label, disabled = false }: {
  checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean;
}) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className="admin-switch"><span /></button>;
}

export function PageHeading({ title, description, children, count }: { title: string; description?: string; children?: ReactNode; count?: number }) {
  return <div className="admin-page-heading"><div className="min-w-0"><div className="flex items-center gap-3"><h2>{title}</h2>{count !== undefined && <span className="admin-count">{count.toLocaleString()}</span>}</div>{description && <p>{description}</p>}</div><div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div></div>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="admin-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

/** A single accessible overlay used for desktop drawers and phone dialogs. */
export function Overlay({ title, subtitle, onClose, children, footer, headerActions, wide = false }: {
  title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; headerActions?: ReactNode; wide?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>("[data-overlay-close]")?.focus({ preventScroll: true }));
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = [...panel.current.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length > 0);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", key);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = overflow; document.removeEventListener("keydown", key); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<div className="admin-app admin-overlay-root">
    <div className="admin-overlay-backdrop" onClick={onClose} aria-hidden="true" />
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={id} className={`admin-overlay-panel ${wide ? "admin-overlay-wide" : ""}`}>
      <header className="admin-overlay-header"><div className="min-w-0"><h2 id={id}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><div className="flex items-center gap-2">{headerActions}<span className="admin-divider" /><button data-overlay-close type="button" className="admin-icon-button" onClick={onClose} aria-label="Close panel"><Icon name="close" className="h-[18px] w-[18px]" /></button></div></header>
      <div className="admin-overlay-body">{children}</div>
      {footer && <footer className="admin-overlay-footer">{footer}</footer>}
    </div>
  </div>, document.body);
}

export function Confirm({ title, description, confirmLabel, onConfirm, onClose, danger = false }: {
  title: string; description: string; confirmLabel: string; onConfirm: () => void; onClose: () => void; danger?: boolean;
}) {
  return <Overlay title={title} onClose={onClose} footer={<><button className="admin-button" onClick={onClose}>Cancel</button><button className={`admin-button ${danger ? "admin-button-danger" : "admin-button-primary"}`} onClick={onConfirm}>{confirmLabel}</button></>}><p className="text-sm leading-relaxed text-stone-600">{description}</p></Overlay>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="admin-empty"><Icon name="search" className="mb-3 h-6 w-6 text-stone-400" /><h3>{title}</h3>{children}</div>;
}

export function downloadCsv(name: string, rows: (string | number)[][]) {
  // Neutralize spreadsheet formula injection, including tab-prefixed cells.
  const csv = "\uFEFF" + rows.map(row => row.map(value => { let cell = String(value); if (/^[\s]*[=+@-]/.test(cell)) cell = "'" + cell; return `"${cell.replace(/"/g, '""')}"`; }).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}