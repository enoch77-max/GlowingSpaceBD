import { getVariants, productAvailable } from "./catalog/inventory";
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Link, usePageState, useRouter } from "./router";
import { useStore } from "./store";
import { fmt, type HeroSlideConfig, type Product } from "./data";
import { CATEGORY_ICON, Icon, type IconName } from "./icons";
import { flyToCart, useIsVisible, usePrefersReducedMotion } from "./motion";
import { ResponsiveImage, heroPrefetchUrl } from "./ResponsiveImage";

type Slide = HeroSlideConfig & { p: Product };

const SLIDE_MS = 4600;
const cssVar = (name: string, value: string | number) => ({ [name]: value }) as CSSProperties;

function DispatchCountdown({ dispatchHourBdt, active }: { dispatchHourBdt: number; active: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (document.visibilityState === "hidden") return;
      setNow(Date.now());
      timer = setInterval(() => setNow(Date.now()), 1000);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => { if (timer) clearInterval(timer); document.removeEventListener("visibilitychange", sync); };
  }, [active]);
  const bd = new Date(now + 6 * 3600000);
  const secondsLeft = dispatchHourBdt * 3600 - (bd.getUTCHours() * 3600 + bd.getUTCMinutes() * 60 + bd.getUTCSeconds());
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <span role="timer" className="hero-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold">
      <Icon name="clock" className="h-3.5 w-3.5" />
      {secondsLeft > 0 ? (
        <span>
          Order in <b className="font-extrabold tnum">{pad(Math.floor(secondsLeft / 3600))}:{pad(Math.floor((secondsLeft % 3600) / 60))}:{pad(secondsLeft % 60)}</b> to ship today
        </span>
      ) : (
        <span>Orders placed now ship tomorrow</span>
      )}
    </span>
  );
}

function HeroSlide({
  slide,
  position,
  total,
  active,
  catIcon,
  dispatchHourBdt,
  showCountdown,
  onScreen,
}: {
  slide: Slide;
  position: number;
  total: number;
  active: boolean;
  catIcon: IconName;
  dispatchHourBdt: number;
  showCountdown: boolean;
  onScreen: boolean;
}) {
  const { p } = slide;
  const { add } = useStore();
  const { go } = useRouter();
  const imgRef = useRef<HTMLImageElement>(null);
  const inStock = productAvailable(p);
  const save = p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0;
  const lines = slide.title.map((line) => line.split(" "));
  const wordTotal = lines.reduce((sum, words) => sum + words.length, 0);
  const Heading = position === 0 ? "h1" : "h2";
  let wordIndex = 0;

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`${position + 1} of ${total}: ${slide.label}`}
      aria-hidden={!active}
      inert={!active}
      data-active={active ? "true" : "false"}
      className="hero-slide w-full"
    >
      <div className="shell grid items-center gap-8 py-8 md:py-12 lg:grid-cols-[1.02fr_1fr] lg:gap-12 lg:py-16">
        <div className="order-2 min-w-0 lg:order-1">
          <div className="hero-in hero-chip hero-eyebrow-row inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold" style={cssVar("--i", 0)}>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="ping text-emerald-500" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="truncate">{slide.eyebrow}</span>
          </div>

          <Heading className="hero-title mt-5 text-[38px] font-extrabold leading-[1.04] tracking-[-0.04em] sm:text-5xl lg:text-[58px]">
            {lines.map((words, lineIndex) => (
              <Fragment key={lineIndex}>
                <span className="block">
                  {words.map((word, i) => {
                    const delay = wordIndex++;
                    return (
                      <Fragment key={i}>
                        <span className="word"><span className="word-in" style={cssVar("--i", delay)}>{word}</span></span>
                        {i < words.length - 1 ? " " : null}
                      </Fragment>
                    );
                  })}
                </span>
                {lineIndex < lines.length - 1 ? " " : null}
              </Fragment>
            ))}
          </Heading>

          <p className="hero-in hero-body hero-muted mt-5 max-w-md text-[15px] leading-relaxed" style={cssVar("--i", wordTotal + 1)}>
            {slide.body}
          </p>

          <div className="hero-in hero-price-row mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-2" style={cssVar("--i", wordTotal + 2)}>
            <span className="hero-price text-[30px] font-extrabold leading-none tracking-tight tnum">{fmt(p.price)}</span>
            {p.mrp && p.mrp > p.price ? <span className="hero-muted text-sm line-through tnum">{fmt(p.mrp)}</span> : null}
            {save > 0 ? <span className="hero-tag rounded-full px-2.5 py-1 text-[11px] font-bold">Save {save}%</span> : null}
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <Icon name="star" className="h-3.5 w-3.5 text-amber-500" />
              <span>{p.rating.toFixed(1)}</span>
              <span className="hero-muted">({p.reviews} reviews)</span>
            </span>
          </div>

          <div className="hero-in hero-chip-row mt-5 flex flex-wrap items-center gap-2" style={cssVar("--i", wordTotal + 3)}>
            {slide.chips.map(([icon, text]) => (
              <span key={text} className="hero-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold">
                <Icon name={icon} className="h-3.5 w-3.5" />
                <span>{text}</span>
              </span>
            ))}
            {inStock && p.stock < (p.lowStockAt ?? 5) ? (
              <span className="hero-chip inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="ping text-amber-500" />
                  <span className="relative h-2 w-2 rounded-full bg-amber-500" />
                </span>
                Only {p.stock} left
              </span>
            ) : null}
          </div>

          {showCountdown && (
            <div className="hero-in hero-countdown mt-4" style={cssVar("--i", wordTotal + 4)}>
              <DispatchCountdown dispatchHourBdt={dispatchHourBdt} active={active && onScreen} />
            </div>
          )}

          <div className="hero-in hero-cta-row mt-6 flex flex-wrap items-center gap-3" style={cssVar("--i", wordTotal + 5)}>
            <button
              type="button"
              disabled={!inStock}
              onClick={() => { if (getVariants(p).filter(v => v.enabled !== false).length > 1) go(`/product/${p.slug}`); else if (add(p.slug)) go("/checkout"); }}
              className="hero-cta sheen inline-flex min-h-[48px] min-w-[150px] items-center justify-center gap-2 rounded-full px-6 text-sm font-bold transition duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>{inStock ? "Buy now" : "Sold out"}</span>
              <Icon name="arrow-right" className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!inStock}
              onClick={() => { if (getVariants(p).filter(v => v.enabled !== false).length > 1) go(`/product/${p.slug}`); else if (add(p.slug)) flyToCart(imgRef.current, p.images[0]); }}
              className="hero-ghost inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon name="cart" className="h-4 w-4" />
              <span>Add to cart</span>
            </button>
            <Link to={`/product/${p.slug}`} className="hero-link text-xs font-bold underline underline-offset-4">What's inside?</Link>
          </div>
        </div>

        <div className="hero-media relative order-1 lg:order-2">
          <div className="hero-shine relative overflow-hidden rounded-[28px] bg-white shadow-[0_34px_70px_-34px_rgba(20,20,16,0.55)] ring-1 ring-black/5">
            <ResponsiveImage
              ref={imgRef}
              src={p.images[0]}
              alt={p.name}
              width={900}
              height={720}
              decoding="async"
              loading={position === 0 ? "eager" : "lazy"}
              fetchPriority={position === 0 ? "high" : "auto"}
              sizes="(max-width: 640px) 100vw, (max-width: 1023px) 90vw, 50vw"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          <span className="hero-tag absolute right-3 top-3 rounded-full px-3 py-1.5 text-[11px] font-extrabold shadow-sm">
            {save > 0 ? `Save ${save}%` : slide.tag}
          </span>
          <div className="hero-float absolute -bottom-5 left-3 right-3 flex items-center gap-3 rounded-2xl bg-white p-3 text-stone-900 shadow-xl shadow-black/10 ring-1 ring-black/5 sm:left-6 sm:right-auto sm:w-[340px]">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#efebe1] text-stone-800">
              <Icon name={catIcon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold">{p.name}</span>
                <span className="mt-1 block truncate text-[11px] text-stone-500">{p.short}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const reduced = usePrefersReducedMotion();
  const { heroSlides, findProduct, catalogCategories, settings } = useStore();

  const slides = useMemo<Slide[]>(
    () =>
      heroSlides
        .filter((s) => s.active)
        .flatMap((def) => {
          const p = findProduct(def.slug);
          return p ? [{ ...def, p }] : [];
        }),
    [heroSlides, findProduct],
  );

  const count = slides.length;
  const [rawIndex, setIndex] = usePageState("home:heroSlide", 0);
  const index = count > 0 ? Math.min(rawIndex, count - 1) : 0;
  const [userPaused, setUserPaused] = useState(reduced);
  const [hovering, setHovering] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [sectionRef, onScreen] = useIsVisible<HTMLElement>();
  const elapsed = useRef(0);
  const fills = useRef<(HTMLSpanElement | null)[]>([]);
  const swipeStart = useRef<number | null>(null);
  const paused = userPaused || hovering || keyboardFocus || !onScreen;

  const goTo = useCallback(
    (next: number) => {
      if (!count) return;
      elapsed.current = 0;
      setIndex(((next % count) + count) % count);
    },
    [count, setIndex],
  );

  useLayoutEffect(() => {
    fills.current.forEach((el, i) => {
      if (el) el.style.transform = `scaleX(${i < index ? 1 : 0})`;
    });
  }, [index, count]);

  useEffect(() => {
    if (paused || count < 2) return;
    let frame = 0;
    let last = performance.now();
    // Follow wall-clock time so a throttled tab or slow device never stretches the slide.
    const resume = () => { last = performance.now(); };
    document.addEventListener("visibilitychange", resume);
    const tick = (now: number) => {
      elapsed.current += Math.min(Math.max(now - last, 0), 1500);
      last = now;
      const progress = Math.min(elapsed.current / SLIDE_MS, 1);
      const bar = fills.current[index];
      if (bar) bar.style.transform = `scaleX(${progress})`;
      if (progress >= 1) {
        elapsed.current = 0;
        setIndex((i) => (i + 1) % count);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [index, paused, count, setIndex]);

  useEffect(() => {
    if (count < 2) return;
    let idle: number | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const warm = () => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      if (connection?.saveData || connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g") return;
      [1, 2].forEach((step) => {
        const img = new Image();
        img.src = heroPrefetchUrl(slides[(index + step) % count].p.images[0]);
      });
    };
    const schedule = () => {
      if ("requestIdleCallback" in window) idle = window.requestIdleCallback(warm, { timeout: 2000 });
      else timeout = setTimeout(warm, 300);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timeout) clearTimeout(timeout);
    };
  }, [index, count, slides]);

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); goTo(index + 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); goTo(index - 1); }
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    swipeStart.current = e.pointerType === "mouse" ? null : e.clientX;
  };
  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) > 48) goTo(dx < 0 ? index + 1 : index - 1);
  };

  if (!count) return null;
  const current = slides[index];

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Featured products"
      className={`hero-section relative overflow-hidden hero-theme-${current.theme}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={(e) => {
        if ((e.target as Element).matches(":focus-visible")) setKeyboardFocus(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setKeyboardFocus(false);
      }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { swipeStart.current = null; }}
    >
      <div aria-hidden="true" className="hero-dots pointer-events-none absolute inset-0" />

      <div className="relative z-10 touch-pan-y overflow-hidden">
        <div className="hero-track flex" style={{ transform: `translate3d(${-index * 100}%, 0, 0)` }}>
          {slides.map((slide, i) => {
            const cat = catalogCategories.find((c) => c.slug === slide.p.category);
            const catIcon = cat?.icon ?? CATEGORY_ICON[slide.p.category] ?? "box";
            return (
              <HeroSlide
                key={slide.id}
                slide={slide}
                position={i}
                total={count}
                active={i === index}
                catIcon={catIcon}
                dispatchHourBdt={settings.dispatchHourBdt}
                showCountdown={settings.showDispatchCountdown}
                onScreen={onScreen}
              />
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <div className="hero-controls shell relative z-10 flex items-center gap-2 pb-6 sm:gap-3">
          <button type="button" onClick={() => goTo(index - 1)} aria-label="Previous slide" className="hero-ctrl">
            <Icon name="chevron-left" className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => goTo(index + 1)} aria-label="Next slide" className="hero-ctrl">
            <Icon name="chevron-right" className="h-4 w-4" />
          </button>
          <ol className="mx-1 flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2" aria-label="Choose a slide">
            {slides.map((slide, i) => (
              <li key={slide.id} className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show ${slide.label}`}
                  aria-current={i === index ? "true" : undefined}
                  className="hero-seg"
                >
                  <span ref={(el) => { fills.current[i] = el; }} className="hero-seg-fill" />
                </button>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => setUserPaused((prev) => !prev)}
            aria-label={userPaused ? "Play slideshow" : "Pause slideshow"}
            className="hero-ctrl"
          >
            <Icon name={userPaused ? "play" : "pause"} className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  );
}
