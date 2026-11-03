import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center font-sans text-stone-900 antialiased">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-400 text-stone-900">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor" aria-hidden="true">
          <path d="M13.3 2.2 4.6 13.6h6.1L10.7 21.8l8.7-11.4h-6.1Z" />
        </svg>
      </span>
      <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.2em] text-stone-500">404 · Not on this shelf</p>
      <h1 className="mt-2 max-w-md text-3xl font-extrabold tracking-tight sm:text-4xl">This part isn’t in the store.</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-500">
        The page may have moved or the product was removed. Browse the catalog or search for what you need.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700">
          Browse all products
        </Link>
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-900">
          Back to home
        </Link>
      </div>
    </div>
  );
}
