import type { Metadata } from "next";
import App from "@/App";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page is not on our shelf. Browse electronics and maker parts at Glowing Space BD.",
};

export default function NotFoundRoute() {
  return <App initialUrl="/not-found" />;
}
