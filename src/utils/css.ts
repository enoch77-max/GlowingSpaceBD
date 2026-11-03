/** Escapes an admin-editable URL so it cannot break out of a CSS url("…") string. */
export function escapeCssUrl(url: string): string {
  return url.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\a ").replace(/\r/g, "\\d ");
}
