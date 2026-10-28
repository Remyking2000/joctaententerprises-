import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Info,
  Package,
  Printer,
  RefreshCw,
  Search,
} from "lucide-react";
import type { ProductSummary } from "@jocta/shared";
import { catalogApi } from "../lib/api";
import { isDemoRecord } from "../lib/format";
import { ProductCard } from "../components/ProductCard";
import { PartnerLogosCarousel } from "../components/PartnerLogosCarousel";

interface CategoryShowcase {
  id: string;
  name: string;
  actionLabel: string;
  image: string;
  fallbackSvg: string;
  imageAlt: string;
  href: string;
}

const FOUR_CORE_CATEGORIES: CategoryShowcase[] = [
  {
    id: "toners",
    name: "Toners",
    actionLabel: "Browse Toners",
    image:
      "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=700&q=80",
    fallbackSvg: "/images/category-toners.svg",
    imageAlt: "Laser toner cartridges and printer supplies",
    href: "/shop?productType=toner",
  },
  {
    id: "ink-supplies",
    name: "Ink Supplies",
    actionLabel: "Browse Ink Supplies",
    image:
      "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=700&q=80",
    fallbackSvg: "/images/category-ink.svg",
    imageAlt: "CMYK refill ink bottles and ink supplies",
    href: "/shop?productType=ink",
  },
  {
    id: "printer-parts",
    name: "Printer Parts",
    actionLabel: "Browse Printer Parts",
    image:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=700&q=80",
    fallbackSvg: "/images/category-parts.svg",
    imageAlt: "Replacement printer spare parts and fuser components",
    href: "/shop?productType=printer_part",
  },
  {
    id: "printers",
    name: "Printers",
    actionLabel: "Browse Printers",
    image:
      "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=700&q=80",
    fallbackSvg: "/images/category-printers.svg",
    imageAlt: "Office laser and ink tank printers",
    href: "/shop?productType=printer",
  },
];

const HERO_VIDEO_SRC = "/gemini_generated_video_03d92542.mp4";
// Slower playback rate (~0.65x) for an elegant, calm cinematic ambient hero background
const HERO_PLAYBACK_RATE = 0.65;

const HERO_TICKER_ITEMS = [
  "GENUINE OEM & COMPATIBLE TONERS",
  "VERIFIED PRINTER COMPATIBILITY",
  "SAME-DAY NAIROBI DISPATCH",
  "COUNTRYWIDE FAST DELIVERY",
];

export function HomePage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [printerQuery, setPrinterQuery] = useState("");
  const [heroLogoFailed, setHeroLogoFailed] = useState(false);
  const [failedCatIds, setFailedCatIds] = useState<Record<string, boolean>>({});
  const [featuredProducts, setFeaturedProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadFeaturedProducts() {
    setLoading(true);
    setError(null);
    try {
      const featuredRes = await catalogApi.getProducts({
        featured: true,
        limit: 4,
        sort: "featured",
      });

      if (featuredRes.items.length > 0) {
        setFeaturedProducts(featuredRes.items);
      } else {
        const recentRes = await catalogApi.getProducts({
          limit: 4,
          sort: "newest",
        });
        setFeaturedProducts(recentRes.items);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load catalogue data from the API.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFeaturedProducts();
  }, []);

  // Ensure hero video playback rate is consistently slowed down across all browsers & reloads
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = HERO_PLAYBACK_RATE;
    }
  }, []);

  function handleCompatibilitySubmit(e: FormEvent) {
    e.preventDefault();
    const q = printerQuery.trim();
    if (q) {
      navigate(`/compatibility?search=${encodeURIComponent(q)}`);
    } else {
      navigate("/compatibility");
    }
  }

  const hasDemoItems = featuredProducts.some(isDemoRecord);

  return (
    <main className="w-full">
      {/* 1. Full-Screen Borderless Background-Video Hero Section */}
      <section
        aria-labelledby="hero-heading"
        className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-ink-charcoal"
      >
        {/* Video Viewport Area */}
        <div className="relative flex-1 flex flex-col justify-between pt-24 pb-8 sm:pt-28 sm:pb-12 lg:pt-32 lg:pb-14 bg-ink-charcoal">
          {/* Background Video */}
          <video
            ref={videoRef}
            src={HERO_VIDEO_SRC}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            onLoadedMetadata={(e) => {
              e.currentTarget.playbackRate = HERO_PLAYBACK_RATE;
            }}
            onPlay={(e) => {
              e.currentTarget.playbackRate = HERO_PLAYBACK_RATE;
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Contrast Overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-ink-charcoal/50"
          />

          <div className="relative z-10 mx-auto w-full max-w-7xl flex-1 flex flex-col justify-between px-4 sm:px-6 lg:px-8">
            {/* Top-Left: Oversized Iconic Brand Lockup */}
            <div className="flex items-start">
              <div className="inline-flex items-stretch gap-3 sm:gap-4 select-none">
                <div className="flex flex-col justify-between text-right font-black uppercase tracking-tighter text-white leading-[0.88]">
                  <span className="text-3xl sm:text-5xl lg:text-6xl">THE</span>
                  <span className="text-3xl sm:text-5xl lg:text-6xl">
                    JOCTA
                  </span>
                  <span className="text-2xl sm:text-4xl lg:text-5xl flex items-center justify-end gap-1.5">
                    <span className="text-xs sm:text-base font-bold text-brand-red">
                      ®
                    </span>
                    <span>PRINT</span>
                  </span>
                </div>

                {/* Bold Brand Mark Emblem */}
                <div className="w-16 sm:w-24 lg:w-28 rounded-r-full bg-white/95 p-2 sm:p-3 flex items-center justify-center">
                  {!heroLogoFailed ? (
                    <img
                      src="/jocta-logo.png"
                      alt="Jocta Enterprises emblem"
                      onError={() => setHeroLogoFailed(true)}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xl sm:text-3xl font-black text-brand-red">
                      JE
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom-Right: Bold Headline & Dual Explore Cards */}
            <div className="mt-10 sm:mt-14 lg:mt-0 lg:self-end w-full max-w-md lg:max-w-lg space-y-5 sm:space-y-6">
              <h1
                id="hero-heading"
                className="text-3xl sm:text-5xl lg:text-[56px] font-black uppercase tracking-tight text-white leading-[1.03]"
              >
                POWER YOUR
                <br />
                PRINTING.
              </h1>

              {/* Stacked Dark Explore Action Boxes */}
              <div className="space-y-3">
                <Link
                  to="/shop"
                  className="group flex items-center justify-between rounded-neo-sm bg-black/85 hover:bg-black text-white border border-white/15 hover:border-brand-red transition-all duration-200 overflow-hidden"
                >
                  <div className="px-5 py-3.5 sm:px-6 sm:py-4">
                    <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white/60">
                      EXPLORE
                    </span>
                    <span className="mt-0.5 block text-sm sm:text-lg font-bold text-white group-hover:text-brand-red transition-colors">
                      Shop Toners, Ink &amp; Spare Parts
                    </span>
                  </div>
                  <div className="self-stretch flex items-center justify-center border-l border-white/10 px-5 sm:px-6 text-white group-hover:text-brand-red">
                    <ArrowRight
                      className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </Link>

                <Link
                  to="/compatibility"
                  className="group flex items-center justify-between rounded-neo-sm bg-black/85 hover:bg-black text-white border border-white/15 hover:border-brand-red transition-all duration-200 overflow-hidden"
                >
                  <div className="px-5 py-3.5 sm:px-6 sm:py-4">
                    <span className="block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white/60">
                      EXPLORE
                    </span>
                    <span className="mt-0.5 block text-sm sm:text-lg font-bold text-white group-hover:text-brand-red transition-colors">
                      Find Toner by Printer Model
                    </span>
                  </div>
                  <div className="self-stretch flex items-center justify-center border-l border-white/10 px-5 sm:px-6 text-white group-hover:text-brand-red">
                    <ArrowRight
                      className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom White Feature Ribbon (Full-Width Matching Reference Strip) */}
        <div className="relative z-10 w-full border-y border-surface-border bg-surface-white px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-ink-charcoal">
            {HERO_TICKER_ITEMS.map((item) => (
              <div key={item} className="inline-flex items-center gap-1.5">
                <ArrowRight
                  className="h-3.5 w-3.5 text-brand-red shrink-0"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">

      {/* 2. Four Prominent Image-Led Category Cards (2x2 on mobile, 4 cols on desktop) */}
      <section
        id="categories"
        aria-labelledby="categories-heading"
        className="space-y-4 sm:space-y-5"
      >
        <div className="flex items-end justify-between gap-4">
          <h2
            id="categories-heading"
            className="text-lg sm:text-2xl font-extrabold text-ink-charcoal"
          >
            Shop by Category
          </h2>
          <Link
            to="/shop"
            className="text-xs sm:text-sm font-bold text-brand-red hover:underline inline-flex items-center gap-1"
          >
            <span>All Categories</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {FOUR_CORE_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              to={category.href}
              className="neo-card-interactive group flex flex-col justify-between p-2.5 sm:p-4"
            >
              <div>
                <div className="neo-surface-inset aspect-[4/3] w-full overflow-hidden">
                  <img
                    src={
                      !failedCatIds[category.id]
                        ? category.image
                        : category.fallbackSvg
                    }
                    alt={category.imageAlt}
                    loading="lazy"
                    width={600}
                    height={450}
                    onError={() =>
                      setFailedCatIds((prev) => ({
                        ...prev,
                        [category.id]: true,
                      }))
                    }
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <h3 className="mt-2.5 sm:mt-3.5 text-sm sm:text-base font-bold text-ink-charcoal group-hover:text-brand-red transition-colors">
                  {category.name}
                </h3>
              </div>

              <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t border-surface-border flex items-center justify-between text-[11px] sm:text-xs font-bold text-brand-red">
                <span className="truncate">{category.actionLabel}</span>
                <ArrowRight
                  className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. Featured Products Section (2 cols on mobile, 4 cols on desktop) */}
      <section
        aria-labelledby="featured-products-heading"
        className="space-y-4 sm:space-y-5"
      >
        <div className="flex items-end justify-between gap-4">
          <h2
            id="featured-products-heading"
            className="text-lg sm:text-2xl font-extrabold text-ink-charcoal"
          >
            Featured Products
          </h2>
          <Link
            to="/shop"
            className="neo-button-secondary px-3.5 sm:px-4 py-2 text-xs font-bold"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {hasDemoItems && !loading && !error && (
          <div className="neo-surface-inset px-4 py-3 text-xs text-ink-secondary flex items-start gap-2.5">
            <Info
              className="h-4 w-4 text-brand-red shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>
              <strong>Development Seed Notice:</strong> Items marked with{" "}
              <strong>[DEMO]</strong> are sample development records and do not
              represent verified Jocta Enterprises inventory or pricing.
            </span>
          </div>
        )}

        {loading ? (
          <div
            aria-live="polite"
            className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
          >
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="neo-card p-3 sm:p-4 space-y-3">
                <div className="aspect-[4/3] w-full rounded-neo-sm bg-canvas-warm" />
                <div className="h-4 w-3/4 rounded bg-canvas-warm" />
                <div className="h-4 w-1/2 rounded bg-canvas-warm" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="neo-card p-8 text-center space-y-3">
            <AlertCircle
              className="mx-auto h-8 w-8 text-brand-red"
              aria-hidden="true"
            />
            <h3 className="text-base font-bold text-ink-charcoal">
              Catalogue Data Unavailable
            </h3>
            <p className="mx-auto max-w-md text-xs sm:text-sm text-ink-secondary">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadFeaturedProducts()}
              className="neo-button-primary px-5 py-2.5 text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry</span>
            </button>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="neo-card p-8 text-center space-y-2">
            <Package
              className="mx-auto h-9 w-9 text-ink-muted"
              aria-hidden="true"
            />
            <h3 className="text-base font-bold text-ink-charcoal">
              No Published Products Available
            </h3>
            <p className="text-xs sm:text-sm text-ink-secondary">
              There are currently no published products in the catalogue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 4. Compatibility Finder Section (Below Main Shopping Sections) */}
      <section
        aria-labelledby="compatibility-finder-heading"
        className="neo-card p-4 sm:p-6 lg:p-8"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6 space-y-1.5 sm:space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-red">
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>Printer Compatibility Lookup</span>
            </div>
            <h2
              id="compatibility-finder-heading"
              className="text-lg sm:text-2xl font-extrabold text-ink-charcoal leading-snug"
            >
              Find the Right Toner for Your Printer
            </h2>
            <p className="text-xs sm:text-sm text-ink-secondary leading-relaxed">
              Enter your printer model number to look up compatible cartridges
              and replacement parts recorded in our catalogue database.
            </p>
          </div>

          <div className="lg:col-span-6">
            <form
              onSubmit={handleCompatibilitySubmit}
              role="search"
              aria-label="Find toner by printer model"
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <input
                  type="search"
                  value={printerQuery}
                  onChange={(e) => setPrinterQuery(e.target.value)}
                  placeholder="Enter printer model (e.g. LaserJet Pro M404dn)..."
                  aria-label="Printer model number"
                  className="neo-input pr-9"
                />
                <Search
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
                  aria-hidden="true"
                />
              </div>
              <button
                type="submit"
                className="neo-button-primary px-6 py-2.5 text-sm font-bold shrink-0 cursor-pointer"
              >
                <span>Find Supplies</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* 5. Partnered Companies & Brands Logo Slideshow */}
      <PartnerLogosCarousel />
      </div>
    </main>
  );
}
