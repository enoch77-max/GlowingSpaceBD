import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icons";
import "./select.css";

/**
 * Drop-in replacement for <select>. It accepts the same <option>/<optgroup> children,
 * so existing markup keeps working, but the whole control is the hit area, the menu is
 * styled, and options can carry a colour tone (`data-tone`) and a hint line (`data-hint`).
 */

type Option = { value: string; label: string; tone?: string; hint?: string; disabled: boolean };
type Group = { label: string; options: Option[] };
export type SelectVariant = "admin" | "header" | "status" | "store" | "pill";

const textOf = (node: ReactNode): string =>
  Children.toArray(node)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement(child)) return textOf((child.props as { children?: ReactNode }).children);
      return "";
    })
    .join("");

function parse(children: ReactNode): Group[] {
  const root: Group = { label: "", options: [] };
  const groups: Group[] = [root];
  const walk = (nodes: ReactNode, into: Group) => {
    Children.toArray(nodes).forEach((node) => {
      if (!isValidElement(node)) return;
      const props = node.props as Record<string, unknown> & { children?: ReactNode };
      if (node.type === "optgroup") {
        const group: Group = { label: String(props.label ?? ""), options: [] };
        groups.push(group);
        walk(props.children, group);
      } else if (node.type === "option") {
        const label = textOf(props.children);
        into.options.push({
          value: String(props.value ?? label),
          label,
          tone: props["data-tone"] as string | undefined,
          hint: props["data-hint"] as string | undefined,
          disabled: Boolean(props.disabled),
        });
      }
    });
  };
  walk(children, root);
  return groups.filter((g) => g.options.length > 0);
}

export type SelectProps = {
  value?: string | number;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  children?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
  variant?: SelectVariant;
  placeholder?: string;
  title?: string;
  "aria-label"?: string;
  [prop: string]: unknown;
};

export function Select({
  value,
  onChange,
  children,
  disabled = false,
  id,
  className = "",
  variant = "admin",
  placeholder = "Select",
  title,
  ...rest
}: SelectProps) {
  const groups = useMemo(() => parse(children), [children]);
  const flat = useMemo(() => groups.flatMap((g) => g.options), [groups]);
  const selectedValue = String(value ?? "");
  const current = flat.find((o) => o.value === selectedValue) ?? flat[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [place, setPlace] = useState<CSSProperties>({ visibility: "hidden" });
  const trigger = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const uid = useId();
  const ariaLabel = rest["aria-label"] as string | undefined;

  const show = () => {
    if (disabled) return;
    setActive(Math.max(0, flat.findIndex((o) => o.value === selectedValue)));
    setOpen(true);
  };
  const hide = (refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus({ preventScroll: true });
  };
  const choose = (option: Option) => {
    if (option.disabled) return;
    hide();
    if (option.value !== selectedValue) {
      onChange?.({ target: { value: option.value } } as unknown as ChangeEvent<HTMLSelectElement>);
    }
  };

  // Position the menu against the trigger, opening upward when there is no room below.
  useLayoutEffect(() => {
    if (!open || !trigger.current || !pop.current) return;
    const position = () => {
      const t = trigger.current!.getBoundingClientRect();
      const menuHeight = Math.min(pop.current!.scrollHeight, 340);
      const margin = 8;
      const gap = 6;
      const below = window.innerHeight - t.bottom - margin;
      const openUp = below < Math.min(menuHeight, 220) && t.top > below;
      const width = Math.max(t.width, variant === "admin" || variant === "header" || variant === "status" ? 210 : 200);
      const left = Math.min(Math.max(margin, t.left), window.innerWidth - width - margin);
      setPlace({
        position: "fixed",
        left,
        width,
        top: openUp ? Math.max(margin, t.top - menuHeight - gap) : t.bottom + gap,
        maxHeight: Math.max(140, openUp ? t.top - gap - margin : below - gap),
        visibility: "visible",
      });
    };
    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [open, variant, flat.length]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => list.current?.focus({ preventScroll: true }));
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !pop.current?.contains(target)) hide(false);
    };
    const onScroll = (event: Event) => {
      if (!pop.current?.contains(event.target as Node)) hide(false);
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("scroll", onScroll, true);
    };
    // hide is stable for our purposes; it only reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const enabledIndexes = useMemo(() => flat.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0), [flat]);

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show();
    }
  };

  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const move = (dir: 1 | -1) => {
      if (!enabledIndexes.length) return;
      const at = enabledIndexes.indexOf(active);
      setActive(enabledIndexes[(at + dir + enabledIndexes.length) % enabledIndexes.length]);
    };
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        setActive(enabledIndexes[0] ?? 0);
        break;
      case "End":
        event.preventDefault();
        setActive(enabledIndexes[enabledIndexes.length - 1] ?? 0);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (flat[active]) choose(flat[active]);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        hide();
        break;
      case "Tab":
        hide(false);
        break;
      default:
        if (event.key.length === 1) {
          const hit = flat.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(event.key.toLowerCase()));
          if (hit >= 0) setActive(hit);
        }
    }
  };

  const isAdminSkin = variant === "admin" || variant === "header" || variant === "status";
  let index = -1;

  return (
    <span className={`ds-root ds-${variant} ${current?.tone && variant === "status" ? `tone-${current.tone}` : ""} ${className}`}>
      <button
        ref={trigger}
        id={id}
        type="button"
        title={title}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${uid}-list` : undefined}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onTriggerKey}
        className="ds-trigger"
      >
        {variant === "status" && <i className={`ds-dot tone-${current?.tone ?? "gray"}`} aria-hidden="true" />}
        <span className="ds-value">{current ? current.label : placeholder}</span>
        <Icon name="chevron-down" className="ds-chevron" />
      </button>

      {open &&
        createPortal(
          <div
            ref={pop}
            className={`ds-portal ${isAdminSkin ? "admin-app" : "ds-store-skin"}`}
            style={place}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          >
            <ul
              ref={list}
              id={`${uid}-list`}
              role="listbox"
              tabIndex={-1}
              aria-label={ariaLabel ?? "Options"}
              aria-activedescendant={active >= 0 ? `${uid}-o${active}` : undefined}
              onKeyDown={onListKey}
              className="ds-list"
            >
              {groups.map((group, gi) => (
                <li key={`${group.label}-${gi}`} role="presentation">
                  {group.label && <div className="ds-group" role="presentation">{group.label}</div>}
                  <ul role="presentation" className="ds-group-items">
                    {group.options.map((option) => {
                      index += 1;
                      const i = index;
                      const selected = option.value === selectedValue;
                      return (
                        <li
                          key={option.value}
                          id={`${uid}-o${i}`}
                          role="option"
                          aria-selected={selected}
                          aria-disabled={option.disabled || undefined}
                          onMouseEnter={() => setActive(i)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choose(option)}
                          className={`ds-opt ${i === active ? "is-active" : ""} ${selected ? "is-selected" : ""} ${option.disabled ? "is-disabled" : ""}`}
                        >
                          {(variant === "status" || option.tone) && (
                            <i className={`ds-dot tone-${option.tone ?? "gray"}`} aria-hidden="true" />
                          )}
                          <span className="ds-opt-text">
                            <span className="ds-opt-label">{option.label}</span>
                            {option.hint && <span className="ds-opt-hint">{option.hint}</span>}
                          </span>
                          {selected && <Icon name="check" className="ds-check" strokeWidth={2.4} />}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </span>
  );
}
