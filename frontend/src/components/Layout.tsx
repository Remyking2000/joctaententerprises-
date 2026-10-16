import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Menu, Moon, ShoppingBag, Sun, X } from "lucide-react";
import { JoctaLogo } from "./JoctaLogo";
import { CartDrawer } from "./CartDrawer";
import { useCart } from "../context/CartContext";
import { useTheme } from "../context/ThemeContext";

const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/#categories", label: "Categories", end: false, isHash: true },
  { to: "/shop", label: "Shop Catalogue", end: false },
  { to: "/compatibility", label: "Compatibility Finder", end: false },
];

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { totalCount, openCart } = useCart();
  const { theme, isDark, toggleTheme } = useTheme();

  const handleNavClick = (to: string, isHash?: boolean) => {
    setMobileMenuOpen(false);
    if (isHash) {
      if (location.pathname === "/") {
        const el = document.getElementById("categories");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        navigate("/");
        setTimeout(() => {
          const el = document.getElementById("categories");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
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
              onClick={() => setMobileMenuOpen(false)}
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
              {NAV_LINKS.map((link) => {
                if (link.isHash) {
                  return (
                    <a
                      key={link.to}
                      href="#categories"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(link.to, true);
                      }}
                      className="neo-nav-link rounded-xl px-4 py-2 text-sm font-semibold cursor-pointer"
                    >
                      {link.label}
                    </a>
                  );
                }

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-brand-red text-white shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
                          : "neo-nav-link"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                );
              })}
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
          <div className="border-t border-surface-border bg-surface-white px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-2">
              {NAV_LINKS.map((link) => {
                if (link.isHash) {
                  return (
                    <a
                      key={link.to}
                      href="#categories"
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(link.to, true);
                      }}
                      className="neo-button-secondary justify-start rounded-xl px-4 py-2.5 text-sm font-semibold"
                    >
                      {link.label}
                    </a>
                  );
                }

                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-brand-red text-white shadow-[0_4px_12px_rgba(220,38,38,0.35)]"
                          : "neo-button-secondary justify-start"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                );
              })}
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
