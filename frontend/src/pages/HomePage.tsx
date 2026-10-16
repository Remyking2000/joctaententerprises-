import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  Wrench,
} from "lucide-react";
import type { CategorySummary, ProductSummary } from "@jocta/shared";
import { catalogApi } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { useTheme } from "../context/ThemeContext";

interface CategoryShowcase {
  id: string;
  name: string;
  tag: string;
  countLabel: string;
  image: string;
  href: string;
}

const FIVE_CORE_CATEGORIES: CategoryShowcase[] = [
  {
    id: "laser-toners",
    name: "Laser Toners",
    tag: "OEM & High-Yield Compatible",
    countLabel: "140+ Models",
    image:
      "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=600&q=80",
    href: "/shop?productType=toner",
  },
  {
    id: "drum-units",
    name: "Drum & Imaging",
    tag: "OPC Kits & Imaging Units",
    countLabel: "45+ Models",
    image:
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80",
    href: "/shop?productType=drum",
  },
  {
    id: "spare-parts",
    name: "Spare Parts",
    tag: "Fusers, Rollers & Belts",
    countLabel: "90+ Components",
    image:
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
    href: "/shop?productType=printer_part",
  },
  {
    id: "ink-consumables",
    name: "Ink & Liquids",
    tag: "Tank Bottles & Cartridges",
    countLabel: "60+ Inks",
    image:
      "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80",
    href: "/shop?productType=ink",
  },
  {
    id: "printers",
    name: "Office Printers",
    tag: "Heavy-Duty & Workgroup",
    countLabel: "In Stock",
    image:
      "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&w=600&q=80",
    href: "/shop?productType=printer",
  },
];

const QUICK_FILTERS = [
  "HP LaserJet Pro M404dn",
  "Kyocera ECOSYS M2040dn",
  "Brother HL-L2360DN",
  "Epson EcoTank L3250",
];

export function HomePage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [searchTab, setSearchTab] = useState<"code" | "model">("code");
  const [searchQuery, setSearchQuery] = useState("");

  const [, setCategories] = useState<CategorySummary[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadHomeCatalogue() {
    setLoading(true);
    setError(null);
    try {
      const [cats, featuredRes] = await Promise.all([
        catalogApi.getCategories(),
        catalogApi.getProducts({ featured: true, limit: 4, sort: "featured" }),
      ]);

      setCategories(cats);

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
    void loadHomeCatalogue();
  }, []);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      if (searchTab === "model") {
        navigate("/compatibility");
      } else {
        navigate("/shop");
      }
      return;
    }

    if (searchTab === "model") {
      navigate(`/compatibility?search=${encodeURIComponent(q)}`);
    } else {
      navigate(`/shop?search=${encodeURIComponent(q)}`);
    }
  }

  function handleQuickFilterClick(modelName: string) {
    navigate(`/compatibility?search=${encodeURIComponent(modelName)}`);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
      {/* 1. Redesigned Hero Section (2-Column Grid) */}
      <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
        {/* Left Column (7 cols): Headlines & Neomorphic Tabbed Search */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Soft Sunken Pill Badge */}
            <div className="neo-pill-inset inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold">
              <span className="h-2 w-2 rounded-full bg-brand-red animate-pulse" />
              <span>Kenya’s Printer Supplies &amp; Spare Parts Specialist</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink-charcoal leading-[1.15]">
              Right Toner. Right Part.{" "}
              <span className="text-brand-red">Zero Guesswork.</span>
            </h1>

            <p className="text-base sm:text-lg text-ink-secondary leading-relaxed max-w-2xl">
              Precision consumables and direct replacement spare parts for HP,
              Kyocera, Canon, Brother, and Epson printers across Kenya.
              Model-verified fit before you place your order.
            </p>
          </div>

          {/* Unified Tabbed Neomorphic Search Card */}
          <div className="neo-hero-card p-5 space-y-4">
            {/* State Tabs */}
            <div className="neo-tab-track flex rounded-2xl p-1.5">
              <button
                type="button"
                onClick={() => setSearchTab("code")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                  searchTab === "code" ? "neo-tab-active" : "neo-tab-inactive"
                }`}
              >
                Search by Toner / Part Code
              </button>
              <button
                type="button"
                onClick={() => setSearchTab("model")}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all text-center cursor-pointer ${
                  searchTab === "model" ? "neo-tab-active" : "neo-tab-inactive"
                }`}
              >
                Find by Printer Model
              </button>
            </div>

            {/* Search Input and Extruded Red Submit Button */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    searchTab === "code"
                      ? "Enter code e.g. CF259A, 85A, TK-1170..."
                      : "Enter printer model e.g. HP LaserJet Pro M404dn..."
                  }
                  aria-label={
                    searchTab === "code"
                      ? "Search by toner or part code"
                      : "Find by printer model"
                  }
                  className="neo-input rounded-2xl py-3.5 pl-11 font-medium"
                />
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-muted"
                  aria-hidden="true"
                />
              </div>

              <button
                type="submit"
                className="neo-button-primary shrink-0 rounded-2xl px-6 py-3.5 text-sm font-bold cursor-pointer"
              >
                <span>
                  {searchTab === "code" ? "Search Code" : "Match Printer"}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            {/* Clickable Quick-Filter Chips */}
            <div className="pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-ink-muted mr-1">
                  Popular:
                </span>
                {QUICK_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => handleQuickFilterClick(filter)}
                    className="neo-button-secondary rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Visual Showcase Card (Adapts cleanly to Light & Dark modes) */}
        <div className="lg:col-span-5 flex">
          <div
            className={`w-full flex flex-col justify-between rounded-3xl p-6 sm:p-7 relative overflow-hidden transition-all duration-200 ${
              isDark
                ? "bg-gradient-to-br from-zinc-950 via-zinc-900 to-red-950 text-white border border-zinc-700/50 shadow-[8px_8px_24px_#06080b,-6px_-6px_20px_#1c222c]"
                : "neo-hero-card text-ink-charcoal"
            }`}
          >
            {/* Background ambient lighting */}
            <div
              className={`pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full blur-3xl ${
                isDark ? "bg-red-600/20" : "bg-red-500/10"
              }`}
            />
            <div
              className={`pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full blur-3xl ${
                isDark ? "bg-zinc-700/30" : "bg-stone-300/40"
              }`}
            />

            {/* Top Showcase Header & Floating Badges */}
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
                    isDark
                      ? "bg-white/10 backdrop-blur-md border-white/20 text-red-400"
                      : "bg-brand-red-tint border-brand-red/30 text-brand-red"
                  }`}
                >
                  Hardware Assurance
                </span>
                <span
                  className={`text-xs font-semibold ${
                    isDark ? "text-zinc-400" : "text-ink-secondary"
                  }`}
                >
                  OEM &amp; Compatible
                </span>
              </div>

              <h2 className="text-2xl font-black tracking-tight leading-snug">
                Precision Consumables for Kenyan Offices &amp; Techs
              </h2>
            </div>

            {/* Printer Hardware Visual Container with Glassmorphic Badges */}
            <div
              className={`relative my-6 z-10 rounded-2xl overflow-hidden shadow-xl ${
                isDark
                  ? "border border-white/15 bg-zinc-900/60"
                  : "neo-surface-inset"
              }`}
            >
              <img
                src="https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=800&q=80"
                alt="Jocta Printer Hardware and Toners"
                className="h-48 sm:h-52 w-full object-cover brightness-95 contrast-105"
              />

              {/* Floating Glassmorphic Badges */}
              <div className="absolute top-3 left-3 rounded-xl bg-zinc-950/80 backdrop-blur-md border border-white/20 px-3 py-1.5 text-xs font-bold text-white shadow-lg flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>100% Model-Verified Fit</span>
              </div>

              <div className="absolute bottom-3 right-3 rounded-xl bg-red-950/85 backdrop-blur-md border border-red-500/30 px-3 py-1.5 text-xs font-bold text-white shadow-lg flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-red-400" />
                <span>Fast Dispatch Across Kenya</span>
              </div>
            </div>

            {/* Bottom Brand Bar */}
            <div
              className={`relative z-10 rounded-2xl px-4 py-3 flex items-center justify-between ${
                isDark
                  ? "bg-white/5 backdrop-blur-sm border border-white/10 text-zinc-400"
                  : "neo-pill-inset font-bold text-ink-secondary"
              }`}
            >
              <span className="text-xs font-black tracking-widest">HP</span>
              <span className="opacity-50">•</span>
              <span className="text-xs font-black tracking-widest">
                KYOCERA
              </span>
              <span className="opacity-50">•</span>
              <span className="text-xs font-black tracking-widest">CANON</span>
              <span className="opacity-50">•</span>
              <span className="text-xs font-black tracking-widest">EPSON</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Compact Trust Bar (Directly below Hero) */}
      <section
        aria-label="Jocta Commitments"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="neo-soft flex items-center gap-4 p-4">
          <div className="neo-surface-inset h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center text-brand-red">
            <CheckCircle className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-charcoal">
              100% Fit Guarantee
            </h3>
            <p className="text-xs text-ink-secondary leading-snug">
              Verified OEM and compatible cross-compatibility specs.
            </p>
          </div>
        </div>

        <div className="neo-soft flex items-center gap-4 p-4">
          <div className="neo-surface-inset h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center text-brand-red">
            <Truck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-charcoal">
              Fast Countrywide Dispatch
            </h3>
            <p className="text-xs text-ink-secondary leading-snug">
              Rapid dispatch across Nairobi and all 47 Kenyan counties.
            </p>
          </div>
        </div>

        <div className="neo-soft flex items-center gap-4 p-4">
          <div className="neo-surface-inset h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center text-brand-red">
            <Wrench className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-charcoal">
              Technician-Tested Quality
            </h3>
            <p className="text-xs text-ink-secondary leading-snug">
              Direct replacement fusers, rollers, drums and toners.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Category Grid (5 Columns with Hardware Images) */}
      <section
        id="categories"
        aria-labelledby="categories-heading"
        className="space-y-6 pt-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-red">
              Product Lines
            </span>
            <h2
              id="categories-heading"
              className="mt-1 text-2xl sm:text-3xl font-black text-ink-charcoal"
            >
              Shop by Category
            </h2>
          </div>
          <Link
            to="/shop"
            className="neo-button-secondary px-4 py-2 text-xs font-bold self-start sm:self-auto"
          >
            <span>Full Catalogue</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {FIVE_CORE_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              to={category.href}
              className="neo-card-interactive group flex flex-col justify-between p-3.5"
            >
              <div className="space-y-3">
                {/* Hardware Image */}
                <div className="neo-surface-inset relative h-36 w-full overflow-hidden rounded-2xl border-0">
                  <img
                    src={category.image}
                    alt={category.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 right-2.5 rounded-full bg-zinc-950/75 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                    {category.countLabel}
                  </div>
                </div>

                {/* Title & Tag */}
                <div>
                  <h3 className="text-base font-extrabold text-ink-charcoal group-hover:text-brand-red transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-xs font-medium text-ink-secondary mt-0.5">
                    {category.tag}
                  </p>
                </div>
              </div>

              {/* Action Link */}
              <div className="mt-4 pt-2.5 border-t border-surface-border flex items-center justify-between text-xs font-bold text-brand-red">
                <span>Explore</span>
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Featured Product Cards (4 Columns) */}
      <section
        aria-labelledby="featured-products-heading"
        className="space-y-6 pt-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-red">
              In Stock Now
            </span>
            <h2
              id="featured-products-heading"
              className="mt-1 text-2xl sm:text-3xl font-black text-ink-charcoal"
            >
              Featured Toners &amp; Spare Parts
            </h2>
          </div>
          <Link
            to="/shop"
            className="neo-button-secondary px-4 py-2 text-xs font-bold self-start sm:self-auto"
          >
            <span>View All Products</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="neo-card p-4 space-y-4 animate-pulse">
                <div className="h-48 w-full rounded-2xl bg-canvas-warm" />
                <div className="h-4 w-3/4 rounded bg-canvas-warm" />
                <div className="h-3 w-1/2 rounded bg-canvas-warm" />
                <div className="h-9 w-full rounded-xl bg-canvas-warm" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="neo-card p-8 text-center space-y-3">
            <AlertCircle className="mx-auto h-9 w-9 text-brand-red" />
            <h3 className="text-base font-bold text-ink-charcoal">
              Catalogue Data Temporarily Unavailable
            </h3>
            <p className="mx-auto max-w-md text-sm text-ink-secondary">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadHomeCatalogue()}
              className="neo-button-primary px-5 py-2.5 text-xs font-bold cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="neo-card p-8 text-center space-y-3">
            <Package className="mx-auto h-10 w-10 text-ink-muted" />
            <h3 className="text-base font-bold text-ink-charcoal">
              No Published Products Yet
            </h3>
            <p className="text-sm text-ink-secondary">
              Seed the catalogue with products using{" "}
              <code className="font-mono bg-canvas-warm px-2 py-0.5 rounded text-xs text-brand-red">
                npm run db:seed
              </code>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
