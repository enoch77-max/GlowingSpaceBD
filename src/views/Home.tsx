import { Link, usePageState } from "../router";
import { fmt } from "../data";
import { useStore } from "../store";
import { ProductCard, SectionHead, TrustRow, btnPrimary } from "../components";
import { CATEGORY_ICON, Icon } from "../icons";
import { orgLd, useSeo } from "../seo";
import { Hero } from "../hero";
import { CountUp, Marquee, Reveal } from "../motion";
import { ResponsiveImage } from "../ResponsiveImage";

const TESTIMONIALS: [string, string, string, string, string][] = [
  ["Rafiq H.", "RH", "Mobile repair · Chattogram", "bg-emerald-100 text-emerald-800", "Cells arrived with a capacity test sheet — real 2,900mAh. Finally a shop I trust for 18650."],
  ["Nusrat J.", "NJ", "EEE student · BUET", "bg-amber-100 text-amber-800", "The robot kit had every single part. Ordered at night, got it next afternoon in Dhaka."],
  ["Tanvir A.", "TA", "Car enthusiast · Sylhet", "bg-violet-100 text-violet-800", "H4 LEDs are seriously bright. bKash was smooth and WhatsApp support helped with install."],
];

export function Home() {
  const { visibleProducts, visibleCategories, findProduct, settings } = useStore();
  const [tab, setTab] = usePageState("home:tab", "all");

  const homeTabs = [
    { key: "all", label: "All" },
    ...visibleCategories.filter((c) => c.slug !== "kits" && c.slug !== "unique-parts").slice(0, 4).map((c) => ({
      key: c.slug,
      label: c.name.replace(" Circuits", "").replace(" Lights", "").replace("Circuits & ", ""),
    })),
  ];

  const trending = visibleProducts.filter((p) => p.trending && !p.kit && (tab === "all" || p.category === tab)).slice(0, 8);
  const kits = visibleProducts.filter((p) => p.kit && p.stock > 0).slice(0, 4);
  const photo = (slug: string, fallback: string) => findProduct(slug, true)?.images[0] ?? fallback;

  useSeo({
    title: "Tested 18650 batteries, charging modules & car LEDs",
    path: "/",
    image: "/img/kit.jpg",
    description: "Capacity-tested 18650 cells, TP4056 & BMS charging circuits, car LED lights and hard-to-find modules. Curated for makers in Bangladesh. COD, bKash & Nagad.",
    jsonLd: [
      orgLd,
      { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: settings.faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  });

  return (
    <>
      <Hero />

      {settings.marqueePromises.length > 0 && (
        <Marquee items={settings.marqueePromises} className="bg-stone-900 text-stone-100" />
      )}

      <section className="border-b border-stone-200 bg-white">
        <div className="shell py-5"><TrustRow /></div>
      </section>

      {/* Categories */}
      <section className="shell pt-10 sm:pt-14">
        <Reveal>
          <SectionHead title="Shop by category" sub="Focused aisles. No endless scrolling." href="/shop" label="Browse all" />
        </Reveal>
        <Reveal stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {visibleCategories.map((c) => {
            const count = visibleProducts.filter((p) => p.category === c.slug).length;
            const icon = c.icon ?? CATEGORY_ICON[c.slug] ?? "box";
            return (
              <Link key={c.slug} to={`/shop/${c.slug}`} className="group relative block overflow-hidden rounded-2xl bg-stone-200 ring-1 ring-stone-900/5">
                <div className="aspect-[4/3] overflow-hidden sm:aspect-[4/4.4]">
                  <ResponsiveImage src={c.img} alt="" loading="lazy" sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 16vw" className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-105" />
                </div>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/25 to-transparent" />
                <span className="absolute left-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full bg-white/95 text-stone-900 shadow-sm transition duration-300 group-hover:-translate-y-0.5">
                  <Icon name={icon} className="h-4 w-4" />
                </span>
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1 p-3 text-white">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold leading-tight">{c.name}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-white/70">{count} products</p>
                  </div>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15 opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:opacity-100">
                    <Icon name="arrow-right" className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </Reveal>
      </section>

      {/* Trending */}
      <section className="shell pt-12">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">Trending this week</h2>
              <p className="mt-1 text-sm text-stone-500">What Bangladesh's makers are buying right now.</p>
            </div>
            <Link to="/shop" className="group flex items-center gap-1.5 text-xs font-bold text-stone-700">
              <span>Shop all</span>
              <Icon name="arrow-right" className="h-4 w-4 transition duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div role="tablist" aria-label="Filter trending products" className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {homeTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition duration-300 ${tab === t.key ? "bg-stone-900 text-white" : "bg-[#efeee9] text-stone-600 hover:bg-[#e6e4dd] hover:text-stone-900"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal key={tab} stagger className="mt-5 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-5 lg:gap-y-9">
          {trending.map((p) => <ProductCard key={p.slug} p={p} />)}
        </Reveal>
      </section>

      {/* Promotions */}
      <section className="shell pt-14">
        <Reveal stagger className="grid gap-3 md:grid-cols-2">
          <Link to="/shop/batteries" className="group relative flex min-h-[190px] items-center overflow-hidden rounded-3xl bg-stone-900 p-6 text-white sm:p-8">
            <div className="relative z-10 max-w-[62%]">
              <p className="eyebrow text-amber-400">Verified capacity</p>
              <h3 className="mt-2 text-2xl font-extrabold leading-tight">Tested 18650 cells</h3>
              <p className="mt-1.5 text-sm text-stone-400">Real mAh, fair prices — not mystery cells.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-stone-900">
                <span>Shop batteries</span>
                <Icon name="arrow-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </div>
            <ResponsiveImage src={photo("samsung-30q-18650-3000mah", "/img/18650.jpg")} alt="" loading="lazy" sizes="150px" className="anim-float absolute -bottom-4 -right-3 h-[150px] w-[150px] rotate-3 rounded-2xl object-cover ring-4 ring-white/10" />
          </Link>
          <Link to="/shop/kits" className="group relative flex min-h-[190px] items-center overflow-hidden rounded-3xl bg-amber-300 p-6 text-stone-900 sm:p-8">
            <div className="relative z-10 max-w-[62%]">
              <p className="eyebrow text-stone-700">For students & hobbyists</p>
              <h3 className="mt-2 text-2xl font-extrabold leading-tight">Project kits, sorted.</h3>
              <p className="mt-1.5 text-sm text-stone-700">Every part and a Bangla guide in one box.</p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-2 text-xs font-bold text-white">
                <span>Explore kits</span>
                <Icon name="arrow-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </div>
            <ResponsiveImage src={photo("smart-obstacle-robot-kit", "/img/kit.jpg")} alt="" loading="lazy" sizes="150px" className="anim-float absolute -bottom-4 -right-3 h-[150px] w-[150px] -rotate-3 rounded-2xl object-cover ring-4 ring-white/30" />
          </Link>
        </Reveal>
      </section>

      {/* Kits */}
      <section className="mt-14 border-y border-stone-200 bg-white py-12">
        <div className="shell grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <Reveal>
            <p className="eyebrow text-amber-700">Complete, not confusing</p>
            <h2 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Kits that just work.</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-stone-600">Stop hunting the same resistor across three shops. Every kit is checked, bagged and labelled before it leaves our bench.</p>
            <ul className="mt-5 grid gap-2.5 text-sm">
              {["All parts included, checked against the build", "Bangla + English step-by-step guide", "Tested before dispatch, dead-on-arrival replaced free"].map((t) => (
                <li key={t} className="flex items-start gap-2.5">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Icon name="check" className="h-3 w-3" strokeWidth={2.4} /></span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Link to="/shop/kits" className={`${btnPrimary} mt-6`}><span>Browse project kits</span><Icon name="arrow-right" className="h-4 w-4" /></Link>
          </Reveal>
          <Reveal stagger className="grid grid-cols-2 gap-3">
            {kits.map((p) => (
              <Link key={p.slug} to={`/product/${p.slug}`} className="group rounded-2xl bg-[#f5f4ef] p-2.5 transition duration-300 hover:-translate-y-1 hover:bg-[#eeece5]">
                <div className="overflow-hidden rounded-xl">
                  <ResponsiveImage src={p.images[0]} alt={p.name} loading="lazy" sizes="(max-width: 767px) 50vw, 25vw" className="aspect-[4/3] w-full object-cover transition duration-700 ease-out group-hover:scale-105" />
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug">{p.name}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold tnum">{fmt(p.price)}</span>
                  <Icon name="arrow-up-right" className="h-3.5 w-3.5 text-stone-400 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </div>
              </Link>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Social proof */}
      <section className="shell pt-12">
        <Reveal>
          <div className="grid items-end justify-between gap-3 sm:flex">
            <div>
              <h2 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">Makers in Bangladesh trust us</h2>
              <p className="mt-1 text-sm text-stone-500">Real feedback from technicians, students and tinkerers.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-stone-200">
              <Icon name="star" className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-extrabold tnum"><CountUp to={4.8} format={(n) => n.toFixed(1)} /></span>
              <span className="text-xs text-stone-500">· <CountUp to={1400} format={(n) => `${Math.round(n).toLocaleString("en-US")}+`} /> reviews</span>
            </div>
          </div>
        </Reveal>
        <Reveal stagger className="mt-6 grid gap-3 md:grid-cols-3">
          {TESTIMONIALS.map(([name, initials, role, tone, quote]) => (
            <figure key={name} className="rounded-2xl border border-stone-200 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-900/5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex gap-0.5 text-amber-500" aria-label="5 out of 5 stars">
                  {Array.from({ length: 5 }).map((_, i) => <Icon key={i} name="star" className="h-3.5 w-3.5" />)}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><Icon name="check-circle" className="h-3.5 w-3.5" />Verified</span>
              </div>
              <blockquote className="mt-3 text-[13.5px] leading-relaxed text-stone-700">“{quote}”</blockquote>
              <figcaption className="mt-4 flex items-center gap-2.5">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-extrabold ${tone}`}>{initials}</span>
                <span className="min-w-0">
                  <span className="block truncate text-xs font-bold">{name}</span>
                  <span className="block truncate text-[11px] text-stone-500">{role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="shell grid gap-8 pt-14 lg:grid-cols-[0.75fr_1.25fr]">
        <Reveal>
          <p className="eyebrow text-amber-700">Good to know</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Questions, answered.</h2>
          <p className="mt-2 text-sm text-stone-600">Still unsure about a part or a payment method? Message a real human.</p>
          <a href={`https://wa.me/${settings.whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="group mt-5 flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-stone-400">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Icon name="whatsapp" className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold">Ask us on WhatsApp</span>
              <span className="block truncate text-xs text-stone-500">Replies in a few minutes, 10am–8pm</span>
            </span>
            <Icon name="arrow-up-right" className="h-4 w-4 text-stone-400 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </a>
        </Reveal>
        <Reveal>
          <div className="divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {settings.faqs.map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-semibold">
                  <span>{q}</span>
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-500 transition duration-300 group-open:rotate-45 group-open:bg-stone-900 group-open:text-white">
                    <Icon name="plus" className="h-3.5 w-3.5" />
                  </span>
                </summary>
                <p className="anim-open px-5 pb-4 pr-12 text-sm leading-relaxed text-stone-600">{a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  );
}
