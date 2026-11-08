import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Heart,
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  ShoppingBag,
  User,
  Warehouse,
} from "lucide-react";
import { AccountNavBar } from "../components/AccountNavBar";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useCart } from "../context/CartContext";
import { useCustomer } from "../context/CustomerContext";
import { formatKes } from "../lib/format";

export function AccountPage() {
  const { user, logout } = useAdminAuth();
  const { totalCount, subtotalKes, openCart } = useCart();
  const {
    profile,
    updateProfile,
    resetProfile,
    orders,
    wishlistCount,
    openLoginModal,
  } = useCustomer();

  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [company, setCompany] = useState(profile.company);
  const [deliveryAddress, setDeliveryAddress] = useState(
    profile.deliveryAddress,
  );
  const [city, setCity] = useState(profile.city);
  const [preferredPrinterModel, setPreferredPrinterModel] = useState(
    profile.preferredPrinterModel,
  );
  const [deliveryNotes, setDeliveryNotes] = useState(profile.deliveryNotes);
  const [savedNotice, setSavedNotice] = useState(false);

  // Sync form fields when profile updates (e.g. on user sign-in/sign-out)
  useEffect(() => {
    setFullName(profile.fullName);
    setPhone(profile.phone);
    setCompany(profile.company);
    setDeliveryAddress(profile.deliveryAddress);
    setCity(profile.city);
    setPreferredPrinterModel(profile.preferredPrinterModel);
    setDeliveryNotes(profile.deliveryNotes);
  }, [profile]);

  function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    updateProfile({
      fullName: fullName.trim(),
      phone: phone.trim(),
      company: company.trim(),
      deliveryAddress: deliveryAddress.trim(),
      city: city.trim() || "Nairobi",
      preferredPrinterModel: preferredPrinterModel.trim(),
      deliveryNotes: deliveryNotes.trim(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 4000);
  }

  function handleReset() {
    resetProfile();
    setSavedNotice(false);
  }

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
        {/* Left Column: Delivery & Contact Preferences Form */}
        <section
          aria-labelledby="delivery-profile-heading"
          className="lg:col-span-8 neo-card p-6 sm:p-8 space-y-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-surface-border pb-4">
            <div>
              <h2
                id="delivery-profile-heading"
                className="text-lg font-extrabold text-ink-charcoal"
              >
                Delivery &amp; Contact Preferences
              </h2>
              <p className="text-xs text-ink-secondary mt-1">
                Save your contact and office delivery details to speed up
                WhatsApp orders and quotes with Jocta Enterprises.
              </p>
            </div>
            {profile.updatedAt && (
              <span className="text-[11px] font-medium text-ink-muted">
                Last updated:{" "}
                {new Date(profile.updatedAt).toLocaleDateString("en-KE", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {savedNotice && (
            <div
              role="status"
              className="rounded-neo-sm border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 flex items-center gap-2.5"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Your account preferences have been saved and will be included
                with your orders.
              </span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="account-full-name"
                  className="flex items-center gap-1.5 text-xs font-bold text-ink-charcoal"
                >
                  <User className="h-3.5 w-3.5 text-brand-red" />
                  <span>Full Name / Contact Person</span>
                </label>
                <input
                  id="account-full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Richard Remy"
                  className="neo-input"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="account-phone"
                  className="flex items-center gap-1.5 text-xs font-bold text-ink-charcoal"
                >
                  <Phone className="h-3.5 w-3.5 text-brand-red" />
                  <span>Phone / WhatsApp Number</span>
                </label>
                <input
                  id="account-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0712 345 678"
                  className="neo-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="account-company"
                  className="flex items-center gap-1.5 text-xs font-bold text-ink-charcoal"
                >
                  <Building2 className="h-3.5 w-3.5 text-brand-red" />
                  <span>Company / Organization (Optional)</span>
                </label>
                <input
                  id="account-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Office Solutions Ltd"
                  className="neo-input"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="account-city"
                  className="flex items-center gap-1.5 text-xs font-bold text-ink-charcoal"
                >
                  <MapPin className="h-3.5 w-3.5 text-brand-red" />
                  <span>City / Town</span>
                </label>
                <input
                  id="account-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Nairobi"
                  className="neo-input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="account-address"
                className="flex items-center gap-1.5 text-xs font-bold text-ink-charcoal"
              >
                <MapPin className="h-3.5 w-3.5 text-brand-red" />
                <span>Delivery Address / Building / Floor</span>
              </label>
              <input
                id="account-address"
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="e.g. Kimathi Street, Eagle House 4th Floor, Suite 402"
                className="neo-input"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="account-printer"
                  className="flex items-center gap-1.5 text-xs font-bold text-ink-charcoal"
                >
                  <Printer className="h-3.5 w-3.5 text-brand-red" />
                  <span>Primary Office Printer Model(s)</span>
                </label>
                <Link
                  to="/compatibility"
                  className="text-[11px] font-bold text-brand-red hover:underline"
                >
                  Find compatible toners &rarr;
                </Link>
              </div>
              <input
                id="account-printer"
                type="text"
                value={preferredPrinterModel}
                onChange={(e) => setPreferredPrinterModel(e.target.value)}
                placeholder="e.g. HP LaserJet Pro M404dn, Canon imageRUNNER 2425"
                className="neo-input"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="account-notes"
                className="block text-xs font-bold text-ink-charcoal"
              >
                Default Delivery / Order Notes
              </label>
              <textarea
                id="account-notes"
                rows={3}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Call reception upon arrival, include ETR receipt..."
                className="neo-input"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-border">
              <button
                type="button"
                onClick={handleReset}
                className="neo-button-secondary px-4 py-2.5 text-xs cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Fields</span>
              </button>

              <button
                type="submit"
                className="neo-button-primary px-6 py-2.5 text-xs sm:text-sm cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>Save Account Preferences</span>
              </button>
            </div>
          </form>
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
