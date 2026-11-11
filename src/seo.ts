import { useEffect } from "react";

export const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://glowingspace.com.bd";
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "8801400788738";

function meta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}

export function useSeo({ title, description, image, path, jsonLd }: { title: string; description: string; image?: string; path: string; jsonLd?: object[] }) {
  useEffect(() => {
    const t = `${title} | Glowing Space BD`;
    document.title = t;
    meta("name", "description", description);
    meta("property", "og:title", t);
    meta("property", "og:description", description);
    meta("property", "og:url", SITE + path);
    meta("property", "og:type", "website");
    if (image) meta("property", "og:image", image);
    meta("name", "twitter:card", "summary_large_image");
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = SITE + path;
    document.querySelectorAll("script[data-ld]").forEach((s) => s.remove());
    (jsonLd ?? []).forEach((d) => {
      const s = document.createElement("script");
      s.type = "application/ld+json"; s.dataset.ld = "1"; s.text = JSON.stringify(d);
      document.head.appendChild(s);
    });
  }, [title, description, image, path, JSON.stringify(jsonLd)]);
}

export const breadcrumbLd = (items: [string, string][]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, url], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + url })),
});

export const orgLd = {
  "@context": "https://schema.org", "@type": "Organization", name: "Glowing Space BD", url: SITE,
  logo: SITE + "/favicon.svg", contactPoint: { "@type": "ContactPoint", telephone: "+" + WHATSAPP, contactType: "customer service", areaServed: "BD" },
};
