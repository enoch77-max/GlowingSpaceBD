import type { ReactElement, SVGProps } from "react";

export type IconName =
  | "search" | "cart" | "menu" | "close" | "chevron-down" | "chevron-right" | "chevron-left"
  | "arrow-right" | "arrow-left" | "arrow-up-right" | "truck" | "shield" | "return" | "star"
  | "bolt" | "battery" | "chip" | "car" | "box" | "check" | "check-circle" | "whatsapp"
  | "phone" | "lock" | "minus" | "plus" | "sliders" | "grid" | "list" | "heart" | "map-pin"
  | "card" | "info" | "user" | "clock" | "copy" | "share" | "tag" | "mail" | "trash"
  | "alert" | "external" | "wrench" | "book" | "headphones" | "cash" | "home" | "receipt"
  | "refresh" | "spark" | "pin" | "bag" | "pause" | "play" | "wifi"
  | "chart" | "trend-up" | "key" | "eye" | "eye-off" | "users" | "settings"
  | "edit" | "layers" | "terminal" | "server" | "download" | "logout" | "duplicate" | "archive"
  | "calendar" | "filter" | "more" | "printer" | "undo" | "arrow-down"
  | "beaker" | "package" | "gauge" | "truck-fast";

const P: Record<IconName, ReactElement> = {
  search: <><circle cx="11" cy="11" r="6.8" /><path d="m16.2 16.2 4.3 4.3" /></>,
  cart: <><path d="M2.8 3.5h2.1l2.3 11.1a1.6 1.6 0 0 0 1.6 1.3h8.5a1.6 1.6 0 0 0 1.6-1.2l1.6-7.2H5.6" /><circle cx="9.2" cy="20" r="1.3" /><circle cx="17.8" cy="20" r="1.3" /></>,
  bag: <><path d="M5 8h14l-1.1 12.2a1.5 1.5 0 0 1-1.5 1.3H7.6a1.5 1.5 0 0 1-1.5-1.3Z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></>,
  menu: <path d="M3.5 7h17M3.5 12h17M3.5 17h17" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "arrow-right": <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
  "arrow-left": <><path d="M20 12H4" /><path d="m10 6-6 6 6 6" /></>,
  "arrow-up-right": <><path d="M6.5 17.5 17.5 6.5" /><path d="M8 6.5h9.5V16" /></>,
  truck: <><path d="M2.5 6.5h12v10h-12z" /><path d="M14.5 10h3.8l3.2 3.4v3.1h-7" /><circle cx="6.5" cy="18.5" r="1.8" /><circle cx="17.5" cy="18.5" r="1.8" /></>,
  shield: <><path d="M12 3 19 5.8v5.4c0 4.5-2.9 7.8-7 9.8-4.1-2-7-5.3-7-9.8V5.8Z" /><path d="m8.8 11.8 2.2 2.2 4.3-4.3" /></>,
  return: <><path d="M3.5 8.5h10.8a5.2 5.2 0 0 1 0 10.4H7" /><path d="m7.5 4.5-4 4 4 4" /></>,
  star: <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9Z" />,
  bolt: <path d="M13.3 2.2 4.6 13.6h6.1L10.7 21.8l8.7-11.4h-6.1Z" />,
  battery: <><rect x="2.5" y="7" width="16.5" height="10" rx="2.2" /><path d="M21.5 10.2v3.6" /><path d="m10.7 9.4-2.3 3.1h2.9l-.6 2.6 2.6-3.4H10.4Z" /></>,
  chip: <><rect x="7" y="7" width="10" height="10" rx="2" /><rect x="10.2" y="10.2" width="3.6" height="3.6" rx=".6" /><path d="M9.5 2.5v3M14.5 2.5v3M9.5 18.5v3M14.5 18.5v3M2.5 9.5h3M2.5 14.5h3M18.5 9.5h3M18.5 14.5h3" /></>,
  car: <><path d="M5.2 16.8 4 12.2 6.3 7h11.4L20 12.2l-1.2 4.6" /><path d="M2.5 16.8h19v3.2h-3.2M5.7 20H2.5" /><circle cx="7.5" cy="16.8" r="1.9" /><circle cx="16.5" cy="16.8" r="1.9" /><path d="M9.4 16.8h5.2" /></>,
  box: <><path d="M21 8.2v7.6L12 21l-9-5.2V8.2L12 3Z" /><path d="m3 8.2 9 5.2 9-5.2M12 13.4V21" /></>,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  "check-circle": <><circle cx="12" cy="12" r="9" /><path d="m8 12.2 2.7 2.7 5.4-5.6" /></>,
  whatsapp: <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.7 15.6 2.2 13.8 2.2 12 2.2 6.6 6.6 2.2 12 2.2c2.6 0 5.1 1 6.9 2.9 1.8 1.8 2.9 4.3 2.9 6.9 0 5.4-4.4 9.8-9.8 9.8M12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.2 1.6 6L0 24l6.2-1.6c1.8 1 3.8 1.5 5.8 1.5 6.6 0 12-5.4 12-12S18.6 0 12 0" />,
  phone: <path d="M6.2 3h2.6l2 4.8-2.1 1.4a12.5 12.5 0 0 0 6.1 6.1l1.4-2.1 4.8 2v2.6a2 2 0 0 1-2.2 2A17.2 17.2 0 0 1 4.2 5.2 2 2 0 0 1 6.2 3Z" />,
  lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.2" /><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7M12 14.5v2.5" /></>,
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></>,
  list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" /></>,
  heart: <path d="M12 20.5S3 15.2 3 9.2a4.7 4.7 0 0 1 9-1.6 4.7 4.7 0 0 1 9 1.6c0 6-9 11.3-9 11.3Z" />,
  "map-pin": <><path d="M12 21.5S4.8 15.7 4.8 9.8a7.2 7.2 0 1 1 14.4 0c0 5.9-7.2 11.7-7.2 11.7Z" /><circle cx="12" cy="9.8" r="2.7" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2.6" /><path d="M2.5 9.6h19M6.2 15h4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8h.01" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.2 2" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2" /><path d="M15.5 5.5v-1a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 4.5v9A1.5 1.5 0 0 0 5 15h1" /></>,
  share: <><circle cx="18" cy="5.5" r="2.8" /><circle cx="6" cy="12" r="2.8" /><circle cx="18" cy="18.5" r="2.8" /><path d="m8.4 10.7 7.2-3.8M8.4 13.3l7.2 3.8" /></>,
  tag: <><path d="m3 11.8 8.8-8.8H21v9.2L12.2 21Z" /><circle cx="16.5" cy="7.5" r="1.4" /></>,
  mail: <><rect x="2.5" y="4.5" width="19" height="15" rx="2.2" /><path d="m3.5 6 8.5 6.5L20.5 6" /></>,
  trash: <><path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5 7.5 21h9l1-14.5M10 10.5v6M14 10.5v6" /></>,
  alert: <><path d="M12 3 21.2 20H2.8Z" /><path d="M12 9v4.5M12 16.8h.01" /></>,
  external: <><path d="M14 4h6v6M20 4l-8.5 8.5" /><path d="M18 14v5a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h5" /></>,
  wrench: <path d="M14.5 6.5a4.8 4.8 0 0 0 6 6L11 22a3.5 3.5 0 0 1-5-5l9.5-9.5a4.8 4.8 0 0 0-1-1M17.5 3l3.5 3.5" />,
  book: <><path d="M3 5.5C3 4.1 4.1 3 5.5 3H11v18H5.5A2.5 2.5 0 0 1 3 18.5Z" /><path d="M21 5.5C21 4.1 19.9 3 18.5 3H13v18h5.5a2.5 2.5 0 0 0 2.5-2.5Z" /></>,
  headphones: <><path d="M4 13v-1a8 8 0 0 1 16 0v1" /><rect x="2.5" y="13" width="4" height="7" rx="2" /><rect x="17.5" y="13" width="4" height="7" rx="2" /><path d="M20 20a4 4 0 0 1-4 2.5h-2" /></>,
  cash: <><rect x="2.5" y="6" width="19" height="12" rx="2.2" /><circle cx="12" cy="12" r="2.7" /><path d="M6 12h.01M18 12h.01" /></>,
  home: <path d="m3 10.2 9-7.2 9 7.2V20a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H4.5A1.5 1.5 0 0 1 3 20Z" />,
  receipt: <><path d="M5 3h14v18l-2.4-1.5L14 21l-2-1.5L10 21l-2.6-1.5L5 21Z" /><path d="M9 8h6M9 12h6" /></>,
  refresh: <><path d="M20 5v5h-5" /><path d="M19.2 14a7.6 7.6 0 1 1-1.5-6.4L20 10" /></>,
  spark: <path d="m12 2.5 2.2 6.8 6.8 2.2-6.8 2.2L12 20.5l-2.2-6.8L3 11.5l6.8-2.2Z" />,
  pin: <><path d="M9 3h6l1 6 3 3v2H5v-2l3-3Z" /><path d="M12 14v7" /></>,
  pause: <><rect x="6" y="5" width="4" height="14" rx="1.2" /><rect x="14" y="5" width="4" height="14" rx="1.2" /></>,
  play: <path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.2-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6Z" />,
  wifi: <><path d="M2.5 9.2a14 14 0 0 1 19 0" /><path d="M5.6 12.6a9.5 9.5 0 0 1 12.8 0" /><path d="M8.8 16a5 5 0 0 1 6.4 0" /><circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none" /></>,
  chart: <><rect x="3.5" y="12" width="4" height="8.5" rx="1" /><rect x="10" y="7.5" width="4" height="13" rx="1" /><rect x="16.5" y="3.5" width="4" height="17" rx="1" /></>,
  "trend-up": <><path d="m3.5 16.5 5.5-5.5 3.8 3.8 7.7-7.8" /><path d="M15.5 7h5v5" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m10.9 12.1 9.1-9.1M17 6l3 3M14.5 8.5l2.5 2.5" /></>,
  eye: <><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  "eye-off": <><path d="m3.5 3.5 17 17M10.5 10.5a2.1 2.1 0 0 0 3 3" /><path d="M9.8 5.7A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.8 16.8 0 0 1-3.1 4.1M6.3 6.4C4 8.1 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.4 0 2.7-.3 3.9-.8" /></>,
  users: <><circle cx="9" cy="8" r="3.4" /><path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0" /><circle cx="17" cy="9" r="2.4" /><path d="M17.2 14.3a4.8 4.8 0 0 1 4 5.2" /></>,
  settings: <><circle cx="12" cy="12" r="3.1" /><path d="M12 3v2.3M12 18.7V21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M3 12h2.3M18.7 12H21M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" /></>,
  edit: <path d="M16.3 3.8a2.1 2.1 0 0 1 3 3L8 18.1l-4.5 1.3 1.3-4.5Z" />,
  layers: <><path d="m12 3.2 8.8 4.6-8.8 4.6-8.8-4.6Z" /><path d="m3.2 12.4 8.8 4.6 8.8-4.6M3.2 16.6 12 21l8.8-4.4" /></>,
  terminal: <><rect x="2.5" y="4" width="19" height="16" rx="2.5" /><path d="m7 9.5 3 2.5-3 2.5M12.5 14.5H17" /></>,
  server: <><rect x="3" y="4" width="18" height="6.5" rx="1.8" /><rect x="3" y="13.5" width="18" height="6.5" rx="1.8" /><path d="M7 7.2h.01M7 16.8h.01M13 7.2h4.5M13 16.8h4.5" /></>,
  download: <><path d="M12 3.5v11.5M7.5 10.8 12 15.3l4.5-4.5M4 19.5h16" /></>,
  logout: <><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10M15.5 16.5 20 12l-4.5-4.5M9.5 12H20" /></>,
  duplicate: <><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" /><path d="M5.5 15.5H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8.5a2 2 0 0 1 2 2v.5" /></>,
  archive: <><rect x="2.5" y="4" width="19" height="4.5" rx="1.2" /><path d="M4.5 8.5v10A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-10M10 13h4" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M7.5 3v4M16.5 3v4M3.5 10h17M7.5 14h2M14.5 14h2M7.5 17.5h2" /></>,
  filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
  more: <><circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /></>,
  printer: <><path d="M7 8V3.5h10V8M7 17H4V9h16v8h-3" /><path d="M7 14h10v7H7zM16.5 11.5h.01" /></>,
  undo: <><path d="M8 5 3.5 9.5 8 14M4 9.5h10a5.5 5.5 0 0 1 0 11H9" /></>,
  "arrow-down": <><path d="M12 4v16M6 14l6 6 6-6" /></>,
  beaker: <><path d="M8.5 3.5v5.2L4 18.2a2.4 2.4 0 0 0 2.1 3.5h11.8a2.4 2.4 0 0 0 2.1-3.5l-4.5-9.5V3.5" /><path d="M7.2 3.5h9.6M5.6 14.5h12.8" /></>,
  package: <><path d="M21 7.6v8.8L12 21l-9-4.6V7.6L12 3Z" /><path d="M3 7.6 12 12l9-4.4M12 12v9" /><path d="m7.5 5.4 9 4.6v4.8" /></>,
  gauge: <><path d="M4.5 15.5a8 8 0 1 1 15 0" /><path d="M12 15.5 16.2 10" /><circle cx="12" cy="15.5" r="1.4" /></>,
  "truck-fast": <><path d="M1.8 9.5h3.2M1 13.5h3.2" /><path d="M7.5 6.5h8.5v10h-8.5z" /><path d="M16 10h2.4l2.6 2.8v3.7h-5" /><circle cx="10.5" cy="18.3" r="1.7" /><circle cx="18.3" cy="18.3" r="1.7" /></>,
};

const FILLED: IconName[] = ["star", "whatsapp", "bolt", "play", "pause"];

export function Icon({ name, className = "h-5 w-5", strokeWidth = 1.75, ...rest }: { name: IconName; className?: string; strokeWidth?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const filled = FILLED.includes(name);
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 select-none ${className}`}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {P[name]}
    </svg>
  );
}

export const CATEGORY_ICON: Record<string, IconName> = {
  batteries: "battery", "charging-modules": "bolt", "car-led": "car", modules: "chip", "unique-parts": "spark", kits: "box",
};

export function Logo({ light = false, badge }: { light?: boolean; badge?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-amber-400 text-stone-900">
        <Icon name="bolt" className="h-[18px] w-[18px]" />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5">
          <span className="ping text-emerald-400" />
          <span className="absolute inset-0 rounded-full border-2 border-white bg-emerald-500" />
        </span>
      </span>
      <span className="min-w-0 leading-none">
        <span className={`flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight ${light ? "text-white" : "text-stone-900"}`}>
          <span className="truncate">Glowing Space</span>
          {badge && (
            <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.14em] ${light ? "bg-white/15 text-amber-300" : "bg-stone-900 text-amber-300"}`}>
              {badge}
            </span>
          )}
        </span>
        <span className={`mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] ${light ? "text-stone-400" : "text-stone-500"}`}>Electronics · BD</span>
      </span>
    </span>
  );
}
