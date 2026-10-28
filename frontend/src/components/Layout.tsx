import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ChevronDown,
  Home,
  LayoutGrid,
  Menu,
  Printer,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { JoctaLogo } from "./JoctaLogo";
import { CartDrawer } from "./CartDrawer";
import { CategoriesDropdown, CATEGORY_ITEMS } from "./CategoriesDropdown";
import { useCart } from "../context/CartContext";

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { totalCount, openCart } = useCart();

  const isHomePage = location.pathname === "/";
  const isHeroOverlay =
    isHomePage && !isScrolled && !searchOpen && !mobileMenuOpen;

  // Track scroll position so navbar is transparent over the hero video at the top of Home
  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 30);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname]);

  // Always load every opened page from the very top
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  // Focus search input when the search bar is opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [searchOpen]);

  // Close search bar or mobile menu on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMobileNav = () => {
    setMobileMenuOpen(false);
    setMobileCategoriesOpen(false);
    setSearchOpen(false);
  };

  function handleHeaderSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const q = headerSearch.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    if (q) {
      navigate(`/shop?search=${encodeURIComponent(q)}`);
    } else {
      navigate("/shop");
    }
  }

  return (
    <div className="neo-app-shell flex min-h-screen flex-col pb-16 md:pb-0 selection:bg-brand-red selection:text-white">
      {/* Header (Transparent overlay on full-screen hero at the top of Home, solid neo-navbar elsewhere) */}
      <header
        className={`z-40 transition-colors duration-200 ${
          isHeroOverlay
            ? "absolute top-0 inset-x-0 bg-transparent border-0 shadow-none"
            : isHomePage
              ? "fixed top-0 inset-x-0 neo-navbar"
              : "sticky top-0 neo-navbar"
        }`}
      >
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-2 sm:gap-4">
            {/* Brand Logo */}
            <Link
              to="/"
              onClick={handleMobileNav}
              className="shrink-0"
              aria-label="Jocta Enterprises Home"
            >
              <JoctaLogo size="sm" inverted={isHeroOverlay} />
            </Link>

            {/* Primary Navigation Links (Desktop) */}
            <nav
              aria-label="Main Navigation"
              className="hidden md:flex items-center gap-1 lg:gap-2"
            >
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `rounded-neo-sm px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive && location.pathname === "/"
                      ? "bg-brand-red text-white"
                      : isHeroOverlay
                        ? "text-white hover:bg-white/15"
                        : "neo-nav-link"
                  }`
                }
              >
                Home
              </NavLink>

              <NavLink
                to="/shop"
                className={({ isActive }) =>
                  `rounded-neo-sm px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-brand-red text-white"
                      : isHeroOverlay
                        ? "text-white hover:bg-white/15"
                        : "neo-nav-link"
                  }`
                }
              >
                Shop
              </NavLink>

              <CategoriesDropdown inverted={isHeroOverlay} />

              <NavLink
                to="/compatibility"
                className={({ isActive }) =>
                  `rounded-neo-sm px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-brand-red text-white"
                      : isHeroOverlay
                        ? "text-white hover:bg-white/15"
                        : "neo-nav-link"
                  }`
                }
              >
                Find Toner
              </NavLink>
            </nav>

            {/* Right Controls: Search Toggle Icon, Cart & Hamburger Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Search Toggle Button (Opens search bar only when clicked) */}
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((prev) => !prev);
                  setMobileMenuOpen(false);
                }}
                aria-label={searchOpen ? "Close search bar" : "Open search bar"}
                aria-expanded={searchOpen}
                title="Search products"
                className={`h-10 w-10 p-0 cursor-pointer rounded-neo-sm inline-flex items-center justify-center transition-colors ${
                  isHeroOverlay
                    ? "bg-black/35 text-white border border-white/25 hover:bg-black/55"
                    : `neo-button-secondary ${
                        searchOpen ? "border-brand-red text-brand-red" : ""
                      }`
                }`}
              >
                {searchOpen ? (
                  <X className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              {/* Cart Button */}
              <button
                type="button"
                onClick={openCart}
                aria-label={`Cart (${totalCount} items)`}
                className={`h-10 px-2.5 sm:px-3.5 text-xs sm:text-sm font-semibold cursor-pointer rounded-neo-sm inline-flex items-center justify-center gap-2 transition-colors ${
                  isHeroOverlay
                    ? "bg-black/35 text-white border border-white/25 hover:bg-black/55"
                    : "neo-button-secondary"
                }`}
              >
                <ShoppingBag
                  className={`h-4 w-4 ${
                    isHeroOverlay ? "text-white" : "text-brand-red"
                  }`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Cart</span>
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-neo-pill bg-brand-red px-1.5 text-xs font-bold text-white">
                  {totalCount}
                </span>
              </button>

              {/* Hamburger Menu Button */}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen((prev) => !prev);
                  setSearchOpen(false);
                }}
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                className={`md:hidden h-10 w-10 p-0 cursor-pointer rounded-neo-sm inline-flex items-center justify-center transition-colors ${
                  isHeroOverlay
                    ? "bg-black/35 text-white border border-white/25 hover:bg-black/55"
                    : "neo-button-secondary"
                }`}
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

        {/* Collapsible Search Bar (Only opens when search icon is clicked) */}
        {searchOpen && (
          <div className="border-t border-surface-border bg-surface-white px-4 py-3">
            <div className="mx-auto max-w-3xl">
              <form
                onSubmit={handleHeaderSearchSubmit}
                role="search"
                aria-label="Search catalogue"
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={headerSearch}
                    onChange={(e) => setHeaderSearch(e.target.value)}
                    placeholder="Search toner code, SKU, or printer model (e.g. CF259A, M404dn)..."
                    aria-label="Search toner code, SKU, or printer model"
                    className="neo-input pl-9 pr-3 py-2.5 text-xs sm:text-sm"
                  />
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-muted"
                    aria-hidden="true"
                  />
                </div>
                <button
                  type="submit"
                  className="neo-button-primary px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold shrink-0 cursor-pointer"
                >
                  Search
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Hamburger Menu Drawer (Mobile) */}
        {mobileMenuOpen && (
          <div className="border-t border-surface-border bg-surface-white px-4 py-4 md:hidden space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-2">
              <NavLink
                to="/"
                end
                onClick={handleMobileNav}
                className={({ isActive }) =>
                  `rounded-neo-sm px-4 py-2.5 text-sm font-semibold ${
                    isActive && location.pathname === "/"
                      ? "bg-brand-red text-white"
                      : "neo-button-secondary justify-start"
                  }`
                }
              >
                Home
              </NavLink>

              <NavLink
                to="/shop"
                onClick={handleMobileNav}
                className={({ isActive }) =>
                  `rounded-neo-sm px-4 py-2.5 text-sm font-semibold ${
                    isActive
                      ? "bg-brand-red text-white"
                      : "neo-button-secondary justify-start"
                  }`
                }
              >
                Shop Catalogue
              </NavLink>

              {/* Categories Accordion */}
              <div className="rounded-neo-sm border border-surface-border bg-surface-raised overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMobileCategoriesOpen((prev) => !prev)}
                  aria-expanded={mobileCategoriesOpen}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-ink-charcoal hover:text-brand-red cursor-pointer"
                >
                  <span>Categories</span>
                  <ChevronDown
                    className={`h-4 w-4 text-ink-muted transition-transform ${
                      mobileCategoriesOpen ? "rotate-180 text-brand-red" : ""
                    }`}
                  />
                </button>

                {mobileCategoriesOpen && (
                  <div className="border-t border-surface-border bg-canvas-ivory p-2 space-y-1">
                    {CATEGORY_ITEMS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.id}
                          to={item.href}
                          onClick={handleMobileNav}
                          className="flex items-center gap-2.5 rounded-neo-sm px-3 py-2 text-xs font-semibold text-ink-charcoal hover:bg-surface-white hover:text-brand-red"
                        >
                          <Icon className="h-4 w-4 text-brand-red shrink-0" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              <NavLink
                to="/compatibility"
                onClick={handleMobileNav}
                className={({ isActive }) =>
                  `rounded-neo-sm px-4 py-2.5 text-sm font-semibold ${
                    isActive
                      ? "bg-brand-red text-white"
                      : "neo-button-secondary justify-start"
                  }`
                }
              >
                Find Toner by Printer
              </NavLink>
            </nav>
          </div>
        )}
      </header>

      {/* Main Page Body */}
      <div className="flex-1">
        <Outlet />
      </div>

      {/* Cart Drawer */}
      <CartDrawer />

      {/* Clean, Compact Footer */}
      <footer className="neo-footer mt-16 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 space-y-3">
              <JoctaLogo size="sm" />
              <p className="max-w-sm text-xs text-ink-secondary leading-relaxed">
                Printer toner cartridges, ink supplies, replacement parts, and
                office printers.
              </p>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-charcoal">
                Navigation
              </h2>
              <ul className="mt-2.5 space-y-2 text-xs text-ink-secondary">
                <li>
                  <Link to="/shop" className="hover:text-brand-red">
                    Shop All Products
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop?productType=toner"
                    className="hover:text-brand-red"
                  >
                    Toners
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop?productType=ink"
                    className="hover:text-brand-red"
                  >
                    Ink Supplies
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shop?productType=printer_part"
                    className="hover:text-brand-red"
                  >
                    Printer Parts
                  </Link>
                </li>
                <li>
                  <Link to="/compatibility" className="hover:text-brand-red">
                    Find Toner by Printer
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-charcoal">
                Location
              </h2>
              <p className="mt-2.5 text-xs text-ink-secondary leading-relaxed">
                Jocta Enterprises
                <br />
                Nairobi, Kenya
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-surface-border pt-6 text-xs text-ink-muted">
            <p>
              &copy; {new Date().getFullYear()} Jocta Enterprises. All rights
              reserved.
            </p>
            <p>Prices displayed in Kenyan Shillings (KSh).</p>
          </div>
        </div>
      </footer>

      {/* Concept 1 Mobile Sticky Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-white border-t border-surface-border shadow-neo px-2 py-1.5"
      >
        <div className="grid grid-cols-4 gap-1">
          <NavLink
            to="/"
            end
            onClick={handleMobileNav}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 rounded-neo-sm text-[11px] font-bold transition-colors ${
                isActive && location.pathname === "/"
                  ? "text-brand-red"
                  : "text-ink-secondary hover:text-ink-charcoal"
              }`
            }
          >
            <Home className="h-4 w-4 mb-0.5" aria-hidden="true" />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/shop"
            onClick={handleMobileNav}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 rounded-neo-sm text-[11px] font-bold transition-colors ${
                isActive
                  ? "text-brand-red"
                  : "text-ink-secondary hover:text-ink-charcoal"
              }`
            }
          >
            <LayoutGrid className="h-4 w-4 mb-0.5" aria-hidden="true" />
            <span>Categories</span>
          </NavLink>

          <NavLink
            to="/compatibility"
            onClick={handleMobileNav}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 rounded-neo-sm text-[11px] font-bold transition-colors ${
                isActive
                  ? "text-brand-red"
                  : "text-ink-secondary hover:text-ink-charcoal"
              }`
            }
          >
            <Printer className="h-4 w-4 mb-0.5" aria-hidden="true" />
            <span>Find Toner</span>
          </NavLink>

          <button
            type="button"
            onClick={openCart}
            className="relative flex flex-col items-center justify-center py-1 rounded-neo-sm text-[11px] font-bold text-ink-secondary hover:text-ink-charcoal cursor-pointer"
          >
            <div className="relative">
              <ShoppingBag className="h-4 w-4 mb-0.5" aria-hidden="true" />
              {totalCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-extrabold text-white">
                  {totalCount}
                </span>
              )}
            </div>
            <span>Cart</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
