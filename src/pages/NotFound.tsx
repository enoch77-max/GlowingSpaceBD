import { Link, useRouter } from "../router";
import { btnPrimary } from "../components";
import { Icon } from "../icons";
import { useSeo } from "../seo";

export function NotFound() {
  const { path, previous, back } = useRouter();
  useSeo({ title: "Page not found", description: "That page is not on our shelf. Browse electronics and maker parts at Glowing Space BD.", path });

  return (
    <div className="shell flex min-h-[55vh] max-w-xl flex-col items-start justify-center py-16">
      <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">404 / Not on this shelf</span>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">We couldn't find that page.</h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-600">The link may have changed. You can return to where you were or browse the current range.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {previous && <button type="button" onClick={() => back("/shop")} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold"><Icon name="arrow-left" className="h-4 w-4" />Go back</button>}
        <Link to="/shop" className={btnPrimary}>Shop all parts <Icon name="arrow-right" className="h-4 w-4" /></Link>
      </div>
    </div>
  );
}