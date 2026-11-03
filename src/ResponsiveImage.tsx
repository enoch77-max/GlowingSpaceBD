/* eslint-disable @next/next/no-img-element */
import { forwardRef, type ComponentPropsWithoutRef, type SyntheticEvent } from "react";

const FALLBACK_IMAGE = "/img/kit.jpg";

/** Product image with an accessible default alt and a non-looping local fallback. */
export const ResponsiveImage = forwardRef<HTMLImageElement, ComponentPropsWithoutRef<"img">>(function ResponsiveImage(props, ref) {
  const { src, alt = "", onError, ...rest } = props;
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    onError?.(event);
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied === "true") return;
    image.dataset.fallbackApplied = "true";
    image.src = FALLBACK_IMAGE;
  };
  return <img {...rest} ref={ref} src={src || FALLBACK_IMAGE} alt={alt} onError={handleError} />;
});

/** Warm the carousel image the visitor is likely to see next. */
export function heroPrefetchUrl(src: string): string {
  return src;
}
