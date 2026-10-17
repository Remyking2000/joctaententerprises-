import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Cpu,
  Disc,
  Droplets,
  Package,
  Printer,
  Sparkles,
} from "lucide-react";

export interface CategoryItem {
  id: string;
  name: string;
  subtitle: string;
  countLabel: string;
  href: string;
  productType?: string;
  icon: typeof Package;
  accentGradient: string;
  iconColor: string;
}

export const CATEGORY_ITEMS: CategoryItem[] = [
  {
    id: "laser-toners",
    name: "Laser Toners",
    subtitle: "OEM & high-yield compatible cartridges",
    countLabel: "140+ Models",
    href: "/shop?productType=toner",
    productType: "toner",
    icon: Package,
    accentGradient: "from-red-500/15 via-rose-500/10 to-transparent",
    iconColor: "text-red-500",
  },
  {
    id: "drum-units",
    name: "Drum & Imaging",
    subtitle: "OPC kits, imaging drums & units",
    countLabel: "45+ Models",
    href: "/shop?productType=drum",
    productType: "drum",
    icon: Disc,
    accentGradient: "from-sky-500/15 via-blue-500/10 to-transparent",
    iconColor: "text-sky-500",
  },
  {
    id: "spare-parts",
    name: "Printer Spare Parts",
    subtitle: "Fusers, rollers, separation pads & gears",
    countLabel: "90+ Components",
    href: "/shop?productType=printer_part",
    productType: "printer_part",
    icon: Cpu,
    accentGradient: "from-amber-500/15 via-yellow-500/10 to-transparent",
    iconColor: "text-amber-500",
  },
  {
    id: "ink-consumables",
    name: "Ink & Liquids",
    subtitle: "Continuous ink tank bottles & cartridges",
    countLabel: "60+ Inks",
    href: "/shop?productType=ink",
    productType: "ink",
    icon: Droplets,
    accentGradient: "from-violet-500/15 via-purple-500/10 to-transparent",
    iconColor: "text-violet-500",
  },
  {
    id: "printers",
    name: "Office Printers",
    subtitle: "Heavy-duty laser & workgroup inkjets",
    countLabel: "In Stock",
    href: "/shop?productType=printer",
    productType: "printer",
    icon: Printer,
    accentGradient: "from-emerald-500/15 via-teal-500/10 to-transparent",
    iconColor: "text-emerald-500",
  },
];

const POPULAR_BRANDS = [
  { name: "HP", query: "HP" },
  { name: "Kyocera", query: "Kyocera" },
  { name: "Canon", query: "Canon" },
  { name: "Brother", query: "Brother" },
  { name: "Epson", query: "Epson" },
];

export function CategoriesDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();

  // Close dropdown whenever the route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard navigation: Escape closes dropdown
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block"
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Browse product categories"
        className={`group inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
          isOpen
            ? "bg-surface-raised text-brand-red shadow-neo-sm border border-surface-border"
            : "neo-nav-link"
        }`}
      >
        <span className="relative flex items-center gap-2">
          Categories
          <span className="hidden lg:inline-flex h-1.5 w-1.5 rounded-full bg-brand-red animate-pulse" />
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen
              ? "rotate-180 text-brand-red"
              : "text-ink-muted group-hover:text-brand-red"
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Lively Dropdown Panel */}
      {isOpen && (
        <div
          role="menu"
          aria-label="Categories menu"
          className="absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 w-[720px] lg:w-[840px] animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="neo-hero-card p-6 shadow-2xl backdrop-blur-md overflow-hidden relative">
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand-red/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
              {/* Left Column: 5 Interactive Category Cards (8 cols) */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-surface-border">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-red" />
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-charcoal">
                      Hardware Categories
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-ink-muted">
                    OEM &amp; High-Yield Compatible
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {CATEGORY_ITEMS.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Link
                        key={item.id}
                        to={item.href}
                        onClick={() => setIsOpen(false)}
                        role="menuitem"
                        className="group flex items-start gap-3 rounded-2xl p-3 transition-all duration-150 border border-transparent hover:border-surface-border hover:bg-surface-raised hover:shadow-neo-sm relative overflow-hidden"
                      >
                        {/* Hover Gradient Wash */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${item.accentGradient} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
                        />

                        {/* Icon Badge */}
                        <div className="neo-surface-inset h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 group-hover:shadow-neo-sm">
                          <IconComponent
                            className={`h-5 w-5 ${item.iconColor} transition-transform group-hover:rotate-6`}
                            aria-hidden="true"
                          />
                        </div>

                        {/* Text Information */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-sm font-extrabold text-ink-charcoal group-hover:text-brand-red transition-colors truncate">
                              {item.name}
                            </h4>
                            <span className="neo-pill-inset shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                              {item.countLabel}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-secondary leading-snug line-clamp-1">
                            {item.subtitle}
                          </p>
                        </div>

                        {/* Slide-in Arrow Indicator */}
                        <ArrowRight
                          className="h-3.5 w-3.5 text-brand-red shrink-0 self-center opacity-0 -translate-x-2 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
                          aria-hidden="true"
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Quick Brand Shortcuts & Compatibility Action (4 cols) */}
              <div className="lg:col-span-4 flex flex-col justify-between space-y-4 border-t lg:border-t-0 lg:border-l border-surface-border pt-4 lg:pt-0 lg:pl-6">
                {/* Popular Printer Brands */}
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-secondary block mb-2.5">
                    Filter by Brand
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_BRANDS.map((brand) => (
                      <Link
                        key={brand.name}
                        to={`/shop?search=${encodeURIComponent(brand.query)}`}
                        onClick={() => setIsOpen(false)}
                        className="neo-button-secondary rounded-lg px-2.5 py-1 text-xs font-bold transition-all hover:text-brand-red"
                      >
                        {brand.name}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Compatibility Finder Callout Tile */}
                <div className="neo-surface-inset p-3.5 rounded-2xl space-y-2 border border-surface-border/80">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-lg bg-brand-red/15 text-brand-red flex items-center justify-center">
                      <Printer className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-bold text-ink-charcoal">
                      Not Sure What Fits?
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-secondary leading-relaxed">
                    Search by your printer model to find guaranteed compatible
                    toners &amp; parts.
                  </p>
                  <Link
                    to="/compatibility"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-red hover:underline pt-0.5"
                  >
                    <span>Open Compatibility Finder</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Bottom View All Link */}
                <div className="pt-2 border-t border-surface-border">
                  <Link
                    to="/shop"
                    onClick={() => setIsOpen(false)}
                    className="neo-button-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <span>Browse All Catalogue</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
