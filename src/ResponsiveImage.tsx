import { forwardRef, type ComponentPropsWithoutRef } from "react";

/**
 * Image with explicit dimensions passthrough. Product photos are JPEGs served
 * from /img; remote URLs pass through untouched.
 */
export const ResponsiveImage = forwardRef<HTMLImageElement, ComponentPropsWithoutRef<"img">>(function ResponsiveImage(props, ref) {
  return <img {...props} ref={ref} />;
});

/** Warm the carousel image the visitor is likely to see next. */
export function heroPrefetchUrl(src: string): string {
  return src;
}