import { useMemo, useState } from "react";
import { Link, useRouter } from "../router";
import { useStore } from "../store";
import { fmt } from "../data";
import { ProductCard, btnPrimary, btnGhost, inputCls, Field, Crumbs } from "../components";
import { Icon } from "../icons";
import { useSeo } from "../seo";
import { ResponsiveImage } from "../ResponsiveImage";

/* ---------- wishlist ---------- */

export function Wishlist() {
  const { wishlist, visibleProducts, toggleWishlist } = useStore();
  useSeo({ title: "Wishlist", description: "Your saved products.", path: "/wishlist" });
  const items = wishlist.map(slug => visibleProducts.find(p => p.slug === slug)).filter(Boolean);
  if (!items.length) return (
    <div className="shell flex flex-col items-center py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white ring-1 ring-stone-200"><Icon name="heart" className="h-7 w-7 text-stone-400" /></span>
      <h1 className="mt-5 text-2xl font-extrabold">Your wishlist is empty</h1>
      <p className="mt-1.5 max-w-xs text-sm text-stone-500">Tap the heart on any product card to save it here.</p>
      <Link to="/shop" className={`${btnPrimary} mt-6`}>Browse products</Link>
    </div>
  );
  return (
    <div className="shell py-8">
      <h1 className="text-[28px] font-extrabold tracking-tight sm:text-3xl">Wishlist <span className="ml-1 align-middle text-sm font-bold text-stone-400">{items.length} saved</span></h1>
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(p => <div key={p!.slug} className="relative"><ProductCard p={p!} /><button type="button" onClick={() => toggleWishlist(p!.slug)} aria-label={`Remove ${p!.name}`} className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white text-stone-500 shadow-sm ring-1 ring-stone-200 hover:text-red-600"><Icon name="close" className="h-3.5 w-3.5" /></button></div>)}
      </div>
    </div>
  );
}

/* ---------- compare ---------- */

export function Compare() {
  const { compare, visibleProducts, toggleCompare } = useStore();
  useSeo({ title: "Compare products", description: "Compare up to four products side by side.", path: "/compare" });
  const items = compare.map(slug => visibleProducts.find(p => p.slug === slug)).filter(Boolean);
  if (!items.length) return (
    <div className="shell flex flex-col items-center py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-white ring-1 ring-stone-200"><Icon name="sliders" className="h-7 w-7 text-stone-400" /></span>
      <h1 className="mt-5 text-2xl font-extrabold">Nothing to compare yet</h1>
      <p className="mt-1.5 max-w-xs text-sm text-stone-500">Use the compare icon on product cards to line up to four products.</p>
      <Link to="/shop" className={`${btnPrimary} mt-6`}>Browse products</Link>
    </div>
  );
  const specKeys = [...new Set(items.flatMap(p => p!.specs.map(([k]) => k)))];
  return (
    <div className="shell py-8">
      <h1 className="text-[28px] font-extrabold tracking-tight sm:text-3xl">Compare products</h1>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-stone-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="border-b border-stone-100">
            <th className="w-40 p-4 text-left text-xs uppercase tracking-wide text-stone-400">Product</th>
            {items.map(p => <th key={p!.slug} className="min-w-[200px] p-4 align-top text-left">
              <div className="relative">
                <Link to={`/product/${p!.slug}`}><ResponsiveImage src={p!.images[0]} alt="" sizes="160px" className="h-28 w-28 rounded-xl object-cover ring-1 ring-stone-200" /></Link>
                <button type="button" onClick={() => toggleCompare(p!.slug)} aria-label={`Remove ${p!.name}`} className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-stone-900 text-white"><Icon name="close" className="h-3 w-3" /></button>
              </div>
              <Link to={`/product/${p!.slug}`} className="mt-2 block text-[13px] font-bold leading-snug hover:underline">{p!.name}</Link>
            </th>)}
          </tr></thead>
          <tbody className="divide-y divide-stone-100">
            <tr><td className="p-4 text-xs font-bold text-stone-500">Price</td>{items.map(p => <td key={p!.slug} className="p-4"><b className="tnum">{fmt(p!.price)}</b>{p!.mrp && p!.mrp > p!.price && <span className="ml-1.5 text-xs text-stone-400 line-through tnum">{fmt(p!.mrp)}</span>}</td>)}</tr>
            <tr><td className="p-4 text-xs font-bold text-stone-500">Rating</td>{items.map(p => <td key={p!.slug} className="p-4"><span className="inline-flex items-center gap-1 text-xs font-semibold"><Icon name="star" className="h-3.5 w-3.5 text-amber-500" />{p!.rating.toFixed(1)} <span className="text-stone-400">({p!.reviews})</span></span></td>)}</tr>
            <tr><td className="p-4 text-xs font-bold text-stone-500">Stock</td>{items.map(p => <td key={p!.slug} className="p-4 text-xs">{p!.stock > 0 ? <span className="font-semibold text-emerald-700">In stock ({p!.stock})</span> : <span className="font-semibold text-stone-500">Sold out</span>}</td>)}</tr>
            <tr><td className="p-4 text-xs font-bold text-stone-500">Payment</td>{items.map(p => <td key={p!.slug} className="p-4 text-xs">{p!.pay === "cod" ? "COD available" : "Advance (bKash/Nagad)"}</td>)}</tr>
            {specKeys.map(k => <tr key={k}><td className="p-4 text-xs font-bold text-stone-500">{k}</td>{items.map(p => <td key={p!.slug} className="p-4 text-xs text-stone-700">{p!.specs.find(([sk]) => sk === k)?.[1] ?? "—"}</td>)}</tr>)}
            <tr><td className="p-4" /><td colSpan={items.length} className="p-4"><Link to="/shop" className="text-xs font-bold text-stone-600 underline underline-offset-4">Add more products to compare</Link></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- contact ---------- */

export function Contact() {
  const { settings } = useStore();
  const [f, setF] = useState({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [err, setErr] = useState("");
  useSeo({ title: "Contact us", description: "Questions about an order or a part? Message Glowing Space BD.", path: "/contact" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending"); setErr("");
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setState("sent");
    } catch (error) {
      setState("error"); setErr(error instanceof Error ? error.message : "Could not send. Please retry.");
    }
  };
  return (
    <div className="shell max-w-3xl py-10">
      <Crumbs items={[["Home", "/"], ["Contact us", "/contact"]]} />
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tight sm:text-4xl">Contact us</h1>
      <p className="mt-2 max-w-md text-sm text-stone-500">We’d love to hear from you — order questions, sourcing a part, or wholesale.</p>
      <div className="mt-7 grid gap-8 md:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4 text-sm">
          <p className="flex items-center gap-2.5"><Icon name="phone" className="h-4 w-4 text-amber-600" /><a href={`tel:${settings.contactPhone}`} className="font-bold">{settings.contactPhone}</a></p>
          <p className="flex items-center gap-2.5"><Icon name="mail" className="h-4 w-4 text-amber-600" /><a href={`mailto:${settings.contactEmail}`} className="font-bold">{settings.contactEmail}</a></p>
          <p className="flex items-start gap-2.5"><Icon name="map-pin" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span className="text-stone-600">{settings.contactAddress}</span></p>
          <p className="flex items-center gap-2.5"><Icon name="clock" className="h-4 w-4 text-amber-600" /><span className="text-stone-600">{settings.businessHours}</span></p>
          <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-bold text-stone-900"><Icon name="whatsapp" className="h-4 w-4" />Chat on WhatsApp</a>
        </div>
        {state === "sent" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white"><Icon name="check" className="h-6 w-6" /></span>
            <h2 className="mt-3 text-lg font-extrabold">Message sent</h2>
            <p className="mt-1 text-sm text-stone-600">Thanks! We usually reply within a few hours during business hours.</p>
            <button className={`${btnGhost} mt-5`} onClick={() => { setState("idle"); setF({ name: "", email: "", phone: "", subject: "", message: "", website: "" }); }}>Send another</button>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2">
            <Field label="Name"><input required className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
            <Field label="Email"><input required type="email" className={inputCls} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
            <Field label="Phone"><input className={inputCls} value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} inputMode="tel" autoComplete="tel" /></Field>
            <Field label="Subject"><input required className={inputCls} value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Message"><textarea required rows={5} className={inputCls} value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></Field></div>
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" value={f.website} onChange={e => setF({ ...f, website: e.target.value })} />
            {err && <p role="alert" className="text-xs font-semibold text-red-700 sm:col-span-2">{err}</p>}
            <div className="sm:col-span-2"><button disabled={state === "sending"} className={`${btnPrimary} w-full sm:w-auto`}>{state === "sending" ? "Sending…" : "Send message"}</button></div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------- brands ---------- */

export function BrandsPage() {
  const { content, visibleProducts } = useStore();
  useSeo({ title: "Brands", description: "Genuine products from brands we trust.", path: "/brands" });
  const brands = content.brands.filter(b => b.active);
  return (
    <div className="shell py-10">
      <Crumbs items={[["Home", "/"], ["Brands", "/brands"]]} />
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tight sm:text-4xl">All brands</h1>
      <p className="mt-1.5 text-sm text-stone-500">Genuine products from brands you trust.</p>
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {brands.map(b => (
          <Link key={b.id} to={`/brand/${b.slug}`} className="group flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-stone-400">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-[13px] font-extrabold text-stone-800">{b.name.slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-extrabold">{b.name}</span><span className="block text-[11px] text-stone-500">{visibleProducts.filter(p => p.brand === b.slug).length} products</span></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BrandPage({ slug }: { slug: string }) {
  const { content, visibleProducts, categoryLabel } = useStore();
  const brand = content.brands.find(b => b.slug === slug);
  useSeo({ title: brand?.name ?? "Brand", description: brand?.blurb ?? "", path: `/brand/${slug}` });
  const items = visibleProducts.filter(p => p.brand === slug);
  if (!brand) return <div className="shell py-32 text-center"><h1 className="text-2xl font-extrabold">Brand not found</h1><Link to="/brands" className={`${btnPrimary} mt-4`}>All brands</Link></div>;
  return (
    <div className="shell py-10">
      <Crumbs items={[["Home", "/"], ["Brands", "/brands"], [brand.name, `/brand/${slug}`]]} />
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tight sm:text-4xl">{brand.name}</h1>
      {brand.blurb && <p className="mt-1.5 text-sm text-stone-500">{brand.blurb}</p>}
      {items.length ? (
        <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">{items.map(p => <ProductCard key={p.slug} p={p} />)}</div>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-stone-500">No products from this brand yet. <Link to="/shop" className="font-bold underline">Browse everything</Link>.</p>
      )}
      <p className="mt-6 text-[11px] text-stone-400">{categoryLabel(items[0]?.category ?? "")}</p>
    </div>
  );
}

/* ---------- blog ---------- */

export function BlogPage() {
  const { content } = useStore();
  const posts = content.blogPosts.filter(p => p.status === "published");
  const cats = content.blogCategories;
  useSeo({ title: "Blog", description: "Guides and tutorials for makers in Bangladesh.", path: "/blog" });
  return (
    <div className="shell py-10">
      <Crumbs items={[["Home", "/"], ["Blog", "/blog"]]} />
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tight sm:text-4xl">Our blog</h1>
      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-6 sm:grid-cols-2">
          {posts.map(p => (
            <Link key={p.id} to={`/blog/${p.slug}`} className="group overflow-hidden rounded-2xl border border-stone-200 bg-white transition hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-900/5">
              <div className="aspect-[16/9] overflow-hidden bg-sand"><ResponsiveImage src={p.image} alt="" sizes="(max-width:640px) 100vw, 50vw" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div>
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">{cats.find(c => c.slug === p.category)?.name ?? p.category}</p>
                <h2 className="mt-1 line-clamp-2 text-[15px] font-extrabold leading-snug group-hover:underline">{p.title}</h2>
                <p className="mt-1.5 line-clamp-2 text-xs text-stone-500">{p.excerpt}</p>
                <p className="mt-2 text-[10px] font-semibold text-stone-400">{p.author} · {p.views.toLocaleString()} views</p>
              </div>
            </Link>
          ))}
        </div>
        <aside className="space-y-6">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-stone-500">Categories</p>
            <div className="mt-3 space-y-1.5">{cats.map(c => <Link key={c.id} to={`/blog`} className="block rounded-lg px-2 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100">{c.name} <span className="text-stone-400">({content.blogPosts.filter(p => p.category === c.slug && p.status === "published").length})</span></Link>)}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function BlogPostPage({ slug }: { slug: string }) {
  const { content } = useStore();
  const post = content.blogPosts.find(p => p.slug === slug && p.status === "published");
  useSeo({ title: post?.title ?? "Blog", description: post?.excerpt ?? "", path: `/blog/${slug}` });
  if (!post) return <div className="shell py-32 text-center"><h1 className="text-2xl font-extrabold">Post not found</h1><Link to="/blog" className={`${btnPrimary} mt-4`}>All posts</Link></div>;
  const related = content.blogPosts.filter(p => p.status === "published" && p.category === post.category && p.slug !== slug).slice(0, 3);
  return (
    <div className="shell max-w-3xl py-10">
      <Crumbs items={[["Home", "/"], ["Blog", "/blog"], [post.title, `/blog/${post.slug}`]]} />
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">{content.blogCategories.find(c => c.slug === post.category)?.name ?? post.category}</p>
      <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{post.title}</h1>
      <p className="mt-2 text-xs font-semibold text-stone-500">{post.author} · {new Date(post.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · {post.views.toLocaleString()} views</p>
      <ResponsiveImage src={post.image} alt="" sizes="768px" className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover" />
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-stone-700">{post.body.split(/\n+/).map((para, i) => <p key={i}>{para}</p>)}</div>
      {related.length > 0 && <div className="mt-12"><h2 className="text-lg font-extrabold">Related</h2><div className="mt-4 grid gap-4 sm:grid-cols-3">{related.map(r => <Link key={r.id} to={`/blog/${r.slug}`} className="rounded-xl border border-stone-200 bg-white p-3 text-xs font-bold leading-snug hover:border-stone-400">{r.title}</Link>)}</div></div>}
    </div>
  );
}

/* ---------- CMS page ---------- */

export function CmsPage({ slug }: { slug: string }) {
  const { content } = useStore();
  const page = content.pages.find(p => p.slug === slug && p.status === "published");
  useSeo({ title: page?.title ?? "Page", description: page?.title ?? "", path: `/page/${slug}` });
  if (!page) return <div className="shell py-32 text-center"><h1 className="text-2xl font-extrabold">Page not found</h1><Link to="/" className={`${btnPrimary} mt-4`}>Home</Link></div>;
  return (
    <div className="shell max-w-3xl py-10">
      <Crumbs items={[["Home", "/"], [page.title, `/page/${page.slug}`]]} />
      <h1 className="mt-2 text-[28px] font-extrabold tracking-tight sm:text-4xl">{page.title}</h1>
      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-stone-700">{page.body.split(/\n+/).map((para, i) => para.startsWith("**") ? <h2 key={i} className="pt-2 text-base font-extrabold">{para.replace(/\*\*/g, "")}</h2> : <p key={i}>{para}</p>)}</div>
    </div>
  );
}

/* ---------- newsletter ---------- */

export function NewsletterBox() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setState("done"); setMsg(data.already ? "You’re already subscribed." : "Subscribed — check your inbox for the 10% code.");
    } catch (error) { setState("error"); setMsg(error instanceof Error ? error.message : "Could not subscribe."); }
  };
  return (
    <div className="rounded-3xl bg-stone-900 p-7 text-white sm:p-9">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">Newsletter</p>
      <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Get 10% off your first order</h2>
      <p className="mt-2 max-w-md text-sm text-stone-400">Exclusive deals, new arrivals and maker guides. No spam — unsubscribe anytime.</p>
      {state === "done" ? <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-4 py-2.5 text-sm font-bold text-emerald-400"><Icon name="check-circle" className="h-4 w-4" />{msg}</p> : (
        <form onSubmit={submit} className="mt-5 flex max-w-md flex-col gap-2 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input id="newsletter-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="h-11 flex-1 rounded-full border border-white/15 bg-white/10 px-4 text-sm outline-none placeholder:text-stone-500 focus:border-amber-400" />
          <button className="h-11 shrink-0 rounded-full bg-amber-400 px-5 text-sm font-extrabold text-stone-900 transition hover:bg-amber-300">Subscribe</button>
        </form>
      )}
      {state === "error" && <p role="alert" className="mt-2 text-xs font-semibold text-red-400">{msg}</p>}
    </div>
  );
}
