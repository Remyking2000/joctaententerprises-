import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Cpu,
  Droplets,
  Package,
  Printer,
} from "lucide-react";

export interface CategoryItem {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  icon: typeof Package;
}

export const CATEGORY_ITEMS: CategoryItem[] = [
  {
    id: "toners",
    name: "Toners",
    subtitle: "Original & compatible laser toner cartridges",
    href: "/shop?productType=toner",
    icon: Package,
  },
  {
    id: "ink-supplies",
    name: "Ink Supplies",
    subtitle: "Refill ink bottles & inkjet cartridges",
    href: "/shop?productType=ink",
    icon: Droplets,
  },
  {
    id: "printer-parts",
    name: "Printer Parts",
    subtitle: "Fusers, rollers, drums & replacement parts",
    href: "/shop?productType=printer_part",
    icon: Cpu,
  },
  {
    id: "printers",
    name: "Printers",
    subtitle: "Laser & ink tank office printers",
    href: "/shop?productType=printer",
    icon: Printer,
  },
];

export function CategoriesDropdown({
  inverted = false,
}: {
  inverted?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

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
    }, 150);
  };

  return (
    <div
      ref={dropdownRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative inline-block"
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Browse product categories"
        className={`inline-flex items-center gap-1.5 rounded-neo-sm px-3.5 py-2 text-sm font-semibold transition-colors cursor-pointer ${
          isOpen
            ? inverted
              ? "bg-white/15 text-white"
              : "bg-canvas-ivory text-brand-red"
            : inverted
              ? "text-white hover:bg-white/15 hover:text-white"
              : "neo-nav-link"
        }`}
      >
        <span>Categories</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-150 ${
            isOpen
              ? inverted
                ? "rotate-180 text-white"
                : "rotate-180 text-brand-red"
              : inverted
                ? "text-white/80"
                : "text-ink-muted"
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Categories menu"
          className="absolute left-0 top-full pt-2 z-50 w-80 sm:w-96"
        >
          <div className="neo-card p-3 space-y-1">
            {CATEGORY_ITEMS.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                  className="group flex items-center gap-3 rounded-neo-sm p-2.5 transition-colors hover:bg-canvas-ivory"
                >
                  <div className="neo-surface-inset h-10 w-10 shrink-0 flex items-center justify-center text-brand-red">
                    <IconComponent className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink-charcoal group-hover:text-brand-red transition-colors">
                      {item.name}
                    </p>
                    <p className="text-xs text-ink-secondary truncate">
                      {item.subtitle}
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-ink-muted group-hover:text-brand-red shrink-0 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}

            <div className="pt-2 mt-1 border-t border-surface-border">
              <Link
                to="/shop"
                onClick={() => setIsOpen(false)}
                role="menuitem"
                className="flex items-center justify-between rounded-neo-sm px-3 py-2 text-xs font-bold text-brand-red hover:bg-canvas-ivory transition-colors"
              >
                <span>View All Products</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
