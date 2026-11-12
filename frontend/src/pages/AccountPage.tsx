import { Link } from "react-router-dom";
import {
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  Package,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  Warehouse,
} from "lucide-react";
import { AccountNavBar } from "../components/AccountNavBar";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";
import { formatKes } from "../lib/format";
import { getStoreWhatsAppNumber } from "../lib/whatsapp";

const STORE_WHATSAPP = getStoreWhatsAppNumber() || "254723494623";

export function AccountPage() {
  const { user, logout } = useAdminAuth();
  const { totalCount, subtotalKes, openCart } = useCart();
  const {
    orders,
    wishlistCount,
    openLoginModal,
  } = useCustomer();

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-2 text-xs font-medium text-ink-secondary"
      >
        <Link to="/" className="hover:text-brand-red">
          Home
        </Link>
        <span>/</span>
        <span className="text-ink-charcoal font-semibold">My Account</span>
      </nav>

      {/* Unified Account Header & Tabs */}
      <AccountNavBar />

      {/* Quick Summary Cards */}
      <section
        aria-label="Account summary"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <Link
          to="/orders"
          className="neo-card-interactive p-5 flex items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              My Orders
            </p>
            <p className="text-2xl font-extrabold text-ink-charcoal">
              {orders.length}
            </p>
            <p className="text-xs text-ink-secondary">
              View order history &amp; reorder items
            </p>
          </div>
          <div className="h-11 w-11 rounded-neo-sm bg-brand-red-tint border border-brand-red/20 flex items-center justify-center text-brand-red shrink-0">
            <Package className="h-5 w-5" />
          </div>
        </Link>

        <Link
          to="/wishlist"
          className="neo-card-interactive p-5 flex items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Saved Wishlist
            </p>
            <p className="text-2xl font-extrabold text-ink-charcoal">
              {wishlistCount}
            </p>
            <p className="text-xs text-ink-secondary">
              Shortlisted toners, drums &amp; printers
            </p>
          </div>
          <div className="h-11 w-11 rounded-neo-sm bg-brand-red-tint border border-brand-red/20 flex items-center justify-center text-brand-red shrink-0">
            <Heart className="h-5 w-5" />
          </div>
        </Link>

        <button
          type="button"
          onClick={openCart}
          className="neo-card-interactive p-5 flex items-center justify-between gap-4 text-left cursor-pointer"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Selection List (Cart)
            </p>
            <p className="text-2xl font-extrabold text-ink-charcoal">
              {totalCount}{" "}
              <span className="text-sm font-bold text-ink-secondary">
                ({formatKes(subtotalKes)})
              </span>
            </p>
            <p className="text-xs text-ink-secondary">
              Open cart to review or order on WhatsApp
            </p>
          </div>
          <div className="h-11 w-11 rounded-neo-sm bg-brand-red-tint border border-brand-red/20 flex items-center justify-center text-brand-red shrink-0">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </button>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Direct WhatsApp Ordering & Quick Contact Info */}
        <section className="lg:col-span-8 space-y-6">
          {/* WhatsApp Direct Ordering Explainer */}
          <div className="neo-card p-6 sm:p-7 space-y-4 border-l-4 border-l-emerald-600 bg-linear-to-r from-emerald-50/40 to-surface-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-neo-sm bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-ink-charcoal uppercase tracking-tight">
                    WhatsApp Direct Ordering &amp; Delivery
                  </h2>
                  <p className="text-xs text-ink-secondary">
                    Orders and deliveries are handled directly in WhatsApp chat — no long address forms required.
                  </p>
                </div>
              </div>

              <a
                href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(
                  "Hello Jocta Enterprises, I would like to inquire about printing supplies.",
                )}`}
                target="_blank"
                rel="noreferrer"
                className="neo-button-primary inline-flex items-center gap-1.5 text-xs py-2 px-3.5 bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>Chat on WhatsApp</span>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3 space-y-1">
                <p className="font-bold text-ink-charcoal flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-brand-red" />
                  1. Pick Your Supplies
                </p>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Browse toners, inks, drums, or printers and click &ldquo;Order via WhatsApp&rdquo; from the cart.
                </p>
              </div>

              <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3 space-y-1">
                <p className="font-bold text-ink-charcoal flex items-center gap-1.5">
                  <Truck className="h-3.5 w-3.5 text-emerald-700" />
                  2. Share Address in Chat
                </p>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Discuss your building, floor, office number, or courier drop-off directly with the sales representative.
                </p>
              </div>

              <div className="rounded-neo-sm border border-surface-border bg-surface-white p-3 space-y-1">
                <p className="font-bold text-ink-charcoal flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  3. Same-Day Dispatch
                </p>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Confirm payment via M-Pesa or bank transfer and receive fast delivery with an official receipt.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Orders Overview or Quick Shopping */}
          <div className="neo-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div>
                <h2 className="text-base font-extrabold text-ink-charcoal">
                  Recent WhatsApp Orders
                </h2>
                <p className="text-xs text-ink-secondary mt-0.5">
                  Your recent product inquiries sent to Jocta Enterprises.
                </p>
              </div>
              {orders.length > 0 && (
                <Link
                  to="/orders"
                  className="text-xs font-bold text-brand-red hover:underline"
                >
                  View All Orders &rarr;
                </Link>
              )}
            </div>

            {orders.length > 0 ? (
              <div className="divide-y divide-surface-border">
                {orders.slice(0, 3).map((order) => (
                  <div
                    key={order.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-ink-charcoal">
                        Ref: {order.reference}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {new Date(order.createdAt).toLocaleDateString("en-KE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        • {order.totalItems} {order.totalItems === 1 ? "item" : "items"}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-ink-charcoal">
                        {formatKes(order.subtotalKes)}
                      </span>
                      <Link
                        to="/orders"
                        className="neo-button-secondary py-1 px-2.5 text-[11px]"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center space-y-3">
                <p className="text-xs text-ink-secondary">
                  You have not initiated any WhatsApp orders yet. Browse our catalogue to get started.
                </p>
                <Link
                  to="/catalogue"
                  className="neo-button-primary inline-flex items-center gap-1.5 text-xs py-2 px-4"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Browse Products</span>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Signed-in Account Status & Quick Links */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="neo-card p-6 space-y-4">
            <h2 className="text-base font-extrabold text-ink-charcoal">
              Account &amp; Security
            </h2>

            {user ? (
              <div className="space-y-4">
                <div className="neo-surface-inset p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-muted font-medium">Name</span>
                    <span className="font-bold text-ink-charcoal truncate">
                      {user.name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-muted font-medium">Email</span>
                    <span
                      className="font-bold text-ink-charcoal truncate"
                      title={user.email}
                    >
                      {user.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-muted font-medium">
                      Sign-In Method
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <Mail className="h-3.5 w-3.5" />
                      Google Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-muted font-medium">Role</span>
                    <span className="font-bold text-ink-charcoal">
                      {user.isAdmin ? "Administrator" : "Customer"}
                    </span>
                  </div>
                </div>

                {user.isAdmin && (
                  <div className="rounded-neo-sm border border-emerald-300 bg-emerald-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Administrator Access Enabled</span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Your account is authorized to manage the Jocta product
                      catalogue and stock inventory.
                    </p>
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <Link
                        to="/admin"
                        className="neo-button-primary py-2 px-3 text-xs justify-center"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        <span>Open Admin Dashboard</span>
                      </Link>
                      <Link
                        to="/inventory"
                        className="neo-button-secondary py-2 px-3 text-xs justify-center"
                      >
                        <Warehouse className="h-3.5 w-3.5 text-brand-red" />
                        <span>Open Inventory System</span>
                      </Link>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void logout()}
                  className="neo-button-secondary w-full py-2.5 text-xs text-ink-charcoal hover:text-brand-red cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out of Account</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-ink-secondary leading-relaxed">
                  You are currently browsing as a guest. Sign in with your
                  Google account to personalize your profile and keep your
                  preferences linked to your email.
                </p>
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="neo-button-primary w-full py-2.5 text-xs cursor-pointer"
                >
                  <User className="h-4 w-4" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            )}
          </div>

          <div className="neo-card p-6 space-y-3">
            <h2 className="text-sm font-extrabold text-ink-charcoal">
              Need Help Finding a Toner?
            </h2>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Use our Printer Compatibility Finder to match your exact HP,
              Konica Minolta, Brother, Canon, or Kyocera model with verified
              cartridges.
            </p>
            <Link
              to="/compatibility"
              className="neo-button-secondary w-full py-2.5 text-xs"
            >
              <Printer className="h-4 w-4 text-brand-red" />
              <span>Open Compatibility Finder</span>
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
