import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f8f7f3" }, { media: "(prefers-color-scheme: dark)", color: "#181814" }],
};

export const metadata: Metadata = {
  title: "Glowing Space BD — Tested 18650 cells, modules & car LEDs",
  description:
    "Tested 18650 batteries, charging circuits, car LED lights and unique electronics parts in Bangladesh. COD, bKash & Nagad.",
  openGraph: {
    siteName: "Glowing Space BD",
    title: "Glowing Space BD",
    type: "website",
    locale: "en_BD",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400..800&family=Noto+Sans+Bengali:wght@400..700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paper font-sans text-stone-900 antialiased">{children}</body>
    </html>
  );
}
