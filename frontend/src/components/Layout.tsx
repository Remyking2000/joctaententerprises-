import { useLayoutEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
} from "react-router-dom";
import {
  ChevronDown,
  Menu,
  Moon,
  ShoppingBag,
  Sun,
  X,
  Sparkles,
} from "lucide-react";
import { JoctaLogo } from "./JoctaLogo";
import { CartDrawer } from "./CartDrawer";
import { CategoriesDropdown, CATEGORY_ITEMS } from "./CategoriesDropdown";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const location = useLocation();
  const { totalCount, openCart } = useCart();
  const { theme, isDark, toggleTheme } = useTheme();

  // Always load every opened page from the very top
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  const handleMobileNav = () => {
    setMobileMenuOpen(false);
    setMobileCategoriesOpen(false);
  };

  return (
    <div
      data-theme={theme}
      className="neo-app-shell flex min-h-screen flex-col selection:bg-brand-red selection:text-white"
    >
      {/* Single-Tier Sticky Navbar */}
      <header className="neo-navbar sticky top-0 z-40 backdrop-blur shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between gap-4">
            {/* Brand Logo (Left) */}
            <Link
              to="/"
              onClick={handleMobileNav}
              className="shrink-0 transition-transform hover:scale-[1.01]"
              aria-label="Jocta Enterprises Home"
            >
              <JoctaLogo size="md" />
            </Link>

            {/* Navigation Links (Center) */}
            <nav
              aria-label="Main Navigation"
              className="hidden md:flex items-center gap-1.5 lg:gap-2"
            >
              {/* Home */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isActive && location.pathname === "/"
                      ? "bg-brand-red text-white shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
                      : "neo-nav-link"
                  }`
                }
              >
                Home
              </NavLink>

              {/* Lively Categories Dropdown */}
              <CategoriesDropdown />

              {/* Shop Catalogue */}
              <NavLink
                to="/shop"
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-brand-red text-white shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
                      : "neo-nav-link"
                  }`
                }
              >
                Shop Catalogue
              </NavLink>

              {/* Compatibility Finder */}
              <NavLink
                to="/compatibility"
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-brand-red text-white shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
                      : "neo-nav-link"
                  }`
                }
              >
                Compatibility Finder
              </NavLink>
            </nav>

            {/* Right: Theme Toggle Switch, Neomorphic Selection Counter Button & Mobile Menu Toggle */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Dark / Light Mode Switcher */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="neo-button-secondary h-10 sm:h-11 px-3 sm:px-3.5 text-xs sm:text-sm font-bold cursor-pointer"
              >
                {isDark ? (
                  <>
                    <Sun
                      className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 transition-transform hover:rotate-45"
                      aria-hidden="true"
                    />
                    <span className="hidden md:inline font-bold">Light</span>
                  </>
                ) : (
                  <>
                    <Moon
                      className="h-4 w-4 sm:h-5 sm:w-5 text-ink-secondary transition-transform hover:-rotate-12"
                      aria-hidden="true"
                    />
                    <span className="hidden md:inline font-bold">Dark</span>
                  </>
                )}
              </button>

              {/* Selection Counter */}
              <button
                type="button"
                onClick={openCart}
                aria-label={`Open selection list (${totalCount} items)`}
                className="neo-button-secondary group relative px-3.5 sm:px-4 py-2 sm:py-2.5 text-sm font-semibold cursor-pointer"
              >
                <ShoppingBag
                  className="h-4 w-4 text-brand-red transition-transform group-hover:scale-110"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline font-bold">Selection</span>
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-red px-1.5 text-xs font-bold text-white shadow-sm">
                  {totalCount}
                </span>
              </button>

              {/* Mobile menu button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                className="neo-button-secondary md:hidden h-10 w-10 p-0"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="border-t border-surface-border bg-surface-white px-4 py-4 md:hidden max-h-[calc(100vh-5rem)] overflow-y-auto">
            <nav className="flex flex-col gap-2">
              <NavLink
                to="/"
                end
                onClick={handleMobileNav}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    isActive && location.pathname === "/"
                      ? "bg-brand-red text-white shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
                      : "neo-button-secondary justify-start"
                  }`
                }
              >
                Home
              </NavLink>

              {/* Lively Categories Accordion on Mobile */}
              <div className="rounded-2xl border border-surface-border overflow-hidden bg-surface-white">
                <button
                  type="button"
                  onClick={() => setMobileCategoriesOpen((prev) => !prev)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-bold text-ink-charcoal hover:text-brand-red transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-red" />
                    <span>Categories</span>
                    <span className="neo-pill-inset text-[10px] px-1.5 py-0.5 rounded font-extrabold">
                      5 Lines
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-ink-muted transition-transform duration-200 ${
                      mobileCategoriesOpen ? "rotate-180 text-brand-red" : ""
                    }`}
                  />
                </button>

                {mobileCategoriesOpen && (
                  <div className="border-t border-surface-border px-2 py-2 space-y-1 bg-surface-raised/40">
                    {CATEGORY_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.id}
                          to={item.href}
                          onClick={handleMobileNav}
                          className="flex items-center justify-between rounded-xl p-2.5 hover:bg-surface-white transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg neo-surface-inset flex items-center justify-center">
                              <Icon className={`h-4 w-4 ${item.iconColor}`} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-ink-charcoal">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-ink-secondary">
                                {item.countLabel}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-brand-red font-bold">
                            →
                          </span>
                        </Link>
                      );
                    })}

                    <div className="pt-2 border-t border-surface-border">
                      <Link
                        to="/shop"
                        onClick={handleMobileNav}
                        className="block text-center text-xs font-bold text-brand-red py-1 hover:underline"
                      >
                        Explore All in Catalogue →
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Shop Catalogue */}
              <NavLink
                to="/shop"
                onClick={handleMobileNav}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-brand-red text-white shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
                      : "neo-button-secondary justify-start"
                  }`
                }
              >
                Shop Catalogue
              </NavLink>

              {/* Compatibility Finder */}
              <NavLink
                to="/compatibility"
                onClick={handleMobileNav}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-brand-red text-white shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
                      : "neo-button-secondary justify-start"
                  }`
                }
              >
                Compatibility Finder
              </NavLink>
            </nav>

            {/* Mobile Theme Switcher */}
            <div className="pt-3 mt-3 border-t border-surface-border flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
                Appearance
              </span>
              <button
                type="button"
                onClick={toggleTheme}
                className="neo-button-secondary px-3.5 py-2 text-xs font-bold cursor-pointer"
              >
                {isDark ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-400" />
                    <span>Switch to Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-ink-secondary" />
                    <span>Switch to Dark</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <div className="flex-1">
        <Outlet />
      </div>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Footer */}
      <footer className="neo-footer mt-20 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div className="md:col-span-2 space-y-4">
              <JoctaLogo size="sm" />
              <p className="max-w-md text-sm text-ink-secondary leading-relaxed">
                Jocta Enterprises is Kenya’s trusted specialist for laser printer
                toners, drum imaging units, replacement spare parts, ink
                consumables, and office printers. Verified compatibility and
                tested reliability.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-charcoal">
                Quick Links
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-ink-secondary">
                <li>
                  <Link
                    to="/shop"
                    className="hover:text-brand-red transition-colors"
                  >
                    Full Product Catalogue
                  </Link>
                </li>
                <li>
                  <Link
                    to="/compatibility"
                    className="hover:text-brand-red transition-colors"
                  >
                    Printer Compatibility Finder
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop?productType=toner"
                    className="hover:text-brand-red transition-colors"
                  >
                    Laser Toners
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop?productType=printer_part"
                    className="hover:text-brand-red transition-colors"
                  >
                    Printer Spare Parts
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-charcoal">
                Customer Support
              </h3>
              <div className="neo-surface-inset mt-3 p-4 text-xs text-ink-secondary leading-relaxed">
                <p className="font-bold text-ink-charcoal">Nairobi, Kenya</p>
                <p className="mt-1">
                  Orders dispatched countrywide across all Kenyan counties. Fast
                  verification for fleet maintenance and office supplies.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-surface-border pt-6 text-xs text-ink-muted">
            <p>
              &copy; {new Date().getFullYear()} Jocta Enterprises. All rights
              reserved.
            </p>
            <p>All prices in Kenyan Shillings (KES).</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
