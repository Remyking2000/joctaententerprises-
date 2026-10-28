import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Cookie,
  CreditCard,
  FileText,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  UserCheck,
} from "lucide-react";

export function PrivacyPolicyPage() {
  const lastUpdated = "October 2026";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-10">
      {/* Back button & Breadcrumb */}
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-brand-red transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Hero Header */}
      <div className="neo-card p-6 sm:p-10 space-y-4">
        <div className="inline-flex items-center gap-2 rounded-neo-pill bg-brand-red-tint px-3 py-1 text-xs font-bold text-brand-red border border-brand-red/20">
          <ShieldCheck className="h-4 w-4" />
          <span>Trust &amp; Transparency</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-ink-charcoal">
          Privacy Policy
        </h1>

        <p className="max-w-3xl text-sm sm:text-base text-ink-secondary leading-relaxed">
          At <strong className="text-ink-charcoal font-bold">Jocta Enterprises</strong>,
          we value your business and are dedicated to protecting your personal data.
          This Privacy Policy explains how we collect, handle, store, and safeguard
          your information when you browse our storefront, query printer compatibility,
          or purchase toners, ink supplies, spare parts, and office printers across Kenya.
        </p>

        <p className="text-xs font-medium text-ink-muted">
          Last revised: <span className="font-bold text-ink-charcoal">{lastUpdated}</span> |
          Compliance: <span className="font-bold text-ink-charcoal">Kenya Data Protection Act, 2019</span>
        </p>
      </div>

      {/* Key Guarantees Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="neo-card p-4 space-y-2">
          <div className="h-8 w-8 rounded-neo-sm bg-brand-red-tint flex items-center justify-center text-brand-red border border-brand-red/20">
            <Lock className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-charcoal">
            No Stored PINs / Cards
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed">
            We never store your M-Pesa PINs or private bank/card details. Payments are processed securely.
          </p>
        </div>

        <div className="neo-card p-4 space-y-2">
          <div className="h-8 w-8 rounded-neo-sm bg-brand-red-tint flex items-center justify-center text-brand-red border border-brand-red/20">
            <Truck className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-charcoal">
            Logistics Only
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Your delivery address and phone number are used strictly to dispatch and deliver your hardware.
          </p>
        </div>

        <div className="neo-card p-4 space-y-2">
          <div className="h-8 w-8 rounded-neo-sm bg-brand-red-tint flex items-center justify-center text-brand-red border border-brand-red/20">
            <UserCheck className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-charcoal">
            Zero Marketing Brokers
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed">
            We do not sell, rent, or trade your contact records to commercial marketing brokers or third parties.
          </p>
        </div>

        <div className="neo-card p-4 space-y-2">
          <div className="h-8 w-8 rounded-neo-sm bg-brand-red-tint flex items-center justify-center text-brand-red border border-brand-red/20">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-wide text-ink-charcoal">
            Your Legal Rights
          </h3>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Under the Kenya DPA 2019, you retain full rights to inspect, update, or request deletion of your records.
          </p>
        </div>
      </div>

      {/* Main Legal Content Sections */}
      <div className="neo-card p-6 sm:p-10 space-y-10 divide-y divide-surface-border">
        {/* Section 1 */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand-red">
            <FileText className="h-5 w-5" />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-ink-charcoal">
              1. Information We Collect
            </h2>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">
            Depending on how you interact with our website and ordering channels, we may collect the following categories of information:
          </p>
          <ul className="space-y-2.5 text-xs sm:text-sm text-ink-secondary list-disc pl-5 leading-relaxed">
            <li>
              <strong className="text-ink-charcoal">Contact &amp; Identification Data:</strong> Your name, phone number, and email address provided during checkout or customer inquiry.
            </li>
            <li>
              <strong className="text-ink-charcoal">Delivery &amp; Logistics Details:</strong> Your office or residential delivery address, building name, floor/room number, and city/town/county across Kenya for dispatch fulfillment.
            </li>
            <li>
              <strong className="text-ink-charcoal">Order &amp; Hardware Details:</strong> The cartridges, toners, parts, or printers you add to your cart or purchase, along with printer model numbers entered in our Compatibility Finder.
            </li>
            <li>
              <strong className="text-ink-charcoal">Transaction References:</strong> Payment confirmation codes (e.g. M-Pesa transaction reference numbers, receipt references, timestamps, and payment status).
            </li>
            <li>
              <strong className="text-ink-charcoal">Technical &amp; Session Data:</strong> Standard server logs, IP addresses, browser types, and device screen dimensions to ensure smooth website rendering and cart persistence.
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="pt-8 space-y-4">
          <div className="flex items-center gap-2 text-brand-red">
            <CheckCircle2 className="h-5 w-5" />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-ink-charcoal">
              2. How We Use Your Information
            </h2>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">
            We use your personal data exclusively for legitimate commercial, operational, and customer support purposes:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-ink-secondary list-disc pl-5 leading-relaxed">
            <li>
              <strong className="text-ink-charcoal">Order Processing:</strong> Verifying order details, preparing inventory, and executing dispatch from our Nairobi fulfillment base.
            </li>
            <li>
              <strong className="text-ink-charcoal">Delivery &amp; Courier Coordination:</strong> Transmitting recipient contact and address details to our Nairobi dispatch riders or designated countrywide couriers (e.g., Wells Fargo, G4S, Easy Coach, or pickup points).
            </li>
            <li>
              <strong className="text-ink-charcoal">Compatibility Verification:</strong> Assisting you in confirming that toner cartridges and spare parts accurately match your office printer hardware.
            </li>
            <li>
              <strong className="text-ink-charcoal">Customer Support:</strong> Assisting with warranty claims, product inquiries, returns, or replacement requests.
            </li>
            <li>
              <strong className="text-ink-charcoal">Legal &amp; Tax Compliance:</strong> Maintaining statutory accounting, sales invoices, and tax records required under Kenyan commercial laws.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="pt-8 space-y-4">
          <div className="flex items-center gap-2 text-brand-red">
            <CreditCard className="h-5 w-5" />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-ink-charcoal">
              3. Payment Processing &amp; Financial Security
            </h2>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">
            All payments made to Jocta Enterprises are processed using secure, industry-standard protocols.
          </p>
          <div className="rounded-neo-sm border border-surface-border bg-surface-raised p-4 space-y-2 text-xs sm:text-sm text-ink-secondary">
            <p className="font-semibold text-ink-charcoal">
              Financial Information Protection:
            </p>
            <p>
              When paying via M-Pesa, debit/credit cards, or bank transfer, your transaction is conducted directly through secure payment rails. <strong>Jocta Enterprises does not have access to, nor do we ever capture or store, your secret M-Pesa PIN, card CVV/CVC codes, or online banking credentials.</strong>
            </p>
          </div>
        </section>

        {/* Section 4 */}
        <section className="pt-8 space-y-4">
          <div className="flex items-center gap-2 text-brand-red">
            <Truck className="h-5 w-5" />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-ink-charcoal">
              4. Sharing With Third-Party Service Providers
            </h2>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">
            We only share the minimum necessary details with verified service partners who assist in fulfilling your service:
          </p>
          <ul className="space-y-2 text-xs sm:text-sm text-ink-secondary list-disc pl-5 leading-relaxed">
            <li>
              <strong className="text-ink-charcoal">Courier &amp; Delivery Drivers:</strong> Delivery personnel receive only your recipient name, phone number, and physical destination to coordinate package drop-off.
            </li>
            <li>
              <strong className="text-ink-charcoal">Infrastructure &amp; Hosting Partners:</strong> Reliable cloud hosting, database platforms, and security monitoring providers operating under strict data confidentiality obligations.
            </li>
            <li>
              <strong className="text-ink-charcoal">Statutory &amp; Law Enforcement Authorities:</strong> We disclose data only where strictly required by a court order, summons, or governing Kenyan statutory authority.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="pt-8 space-y-4">
          <div className="flex items-center gap-2 text-brand-red">
            <UserCheck className="h-5 w-5" />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-ink-charcoal">
              5. Your Rights Under the Kenya Data Protection Act, 2019
            </h2>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">
            As a data subject under the Data Protection Act (No. 24 of 2019) of Kenya, you hold comprehensive rights concerning your personal information:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="rounded-neo-sm border border-surface-border p-3 space-y-1">
              <span className="font-bold text-ink-charcoal block">Right to Access</span>
              <span className="text-ink-secondary">Request copies of personal records and order histories held in our systems.</span>
            </div>
            <div className="rounded-neo-sm border border-surface-border p-3 space-y-1">
              <span className="font-bold text-ink-charcoal block">Right to Rectification</span>
              <span className="text-ink-secondary">Request immediate correction of inaccurate contact or delivery details.</span>
            </div>
            <div className="rounded-neo-sm border border-surface-border p-3 space-y-1">
              <span className="font-bold text-ink-charcoal block">Right to Erasure</span>
              <span className="text-ink-secondary">Request deletion of non-statutory records when no longer necessary.</span>
            </div>
            <div className="rounded-neo-sm border border-surface-border p-3 space-y-1">
              <span className="font-bold text-ink-charcoal block">Right to Object</span>
              <span className="text-ink-secondary">Opt out of any non-essential communications or promotional newsletters.</span>
            </div>
          </div>
        </section>

        {/* Section 6 */}
        <section className="pt-8 space-y-4">
          <div className="flex items-center gap-2 text-brand-red">
            <Cookie className="h-5 w-5" />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-ink-charcoal">
              6. Cookies &amp; Local Browser Storage
            </h2>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">
            Our platform uses cookies and browser local storage strictly to deliver core functionality:
          </p>
          <ul className="space-y-1.5 text-xs sm:text-sm text-ink-secondary list-disc pl-5 leading-relaxed">
            <li>
              <strong className="text-ink-charcoal">Essential Shopping Storage:</strong> Preserving items in your cart between page reloads and browser sessions.
            </li>
            <li>
              <strong className="text-ink-charcoal">Security &amp; Performance:</strong> Remembering authentication tokens for administrative staff and protecting against CSRF attacks.
            </li>
          </ul>
          <p className="text-xs text-ink-muted">
            You may manage or disable cookies via your browser settings; however, disabling essential cookies may impact cart persistence.
          </p>
        </section>

        {/* Section 7 */}
        <section className="pt-8 space-y-4">
          <div className="flex items-center gap-2 text-brand-red">
            <Lock className="h-5 w-5" />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-ink-charcoal">
              7. Data Retention &amp; Security Measures
            </h2>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">
            We retain order and invoice data for as long as necessary to fulfill warranty obligations, verify product authenticity, and satisfy Kenyan financial reporting regulations.
          </p>
          <p className="text-sm text-ink-secondary leading-relaxed">
            We implement technical safeguards including SSL/TLS 256-bit encryption for all transmitted data, secure role-based access controls, and regular database security evaluations.
          </p>
        </section>

        {/* Section 8 - Contact Information */}
        <section className="pt-8 space-y-4">
          <div className="flex items-center gap-2 text-brand-red">
            <Mail className="h-5 w-5" />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-ink-charcoal">
              8. Contact Our Data Protection Team
            </h2>
          </div>
          <p className="text-sm text-ink-secondary leading-relaxed">
            If you have questions regarding this Privacy Policy, wish to exercise any of your statutory rights, or require assistance with your account data, please reach out to us:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="rounded-neo-sm border border-surface-border bg-surface-raised p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-brand-red font-bold text-xs uppercase">
                <MapPin className="h-4 w-4" />
                <span>Physical Base</span>
              </div>
              <p className="text-xs text-ink-charcoal font-semibold">Jocta Enterprises</p>
              <p className="text-xs text-ink-secondary">Nairobi, Kenya</p>
            </div>

            <div className="rounded-neo-sm border border-surface-border bg-surface-raised p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-brand-red font-bold text-xs uppercase">
                <Phone className="h-4 w-4" />
                <span>Phone / WhatsApp</span>
              </div>
              <p className="text-xs text-ink-charcoal font-semibold">Direct Customer Desk</p>
              <p className="text-xs text-ink-secondary">Nairobi Express Dispatch</p>
            </div>

            <div className="rounded-neo-sm border border-surface-border bg-surface-raised p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-brand-red font-bold text-xs uppercase">
                <Mail className="h-4 w-4" />
                <span>Electronic Mail</span>
              </div>
              <p className="text-xs text-ink-charcoal font-semibold">Inquiries &amp; Orders</p>
              <p className="text-xs text-ink-secondary">support@joctaenterprises.co.ke</p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Navigation CTA */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-surface-border">
        <Link
          to="/"
          className="neo-button-secondary px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          <ArrowLeft className="h-4 w-4 text-brand-red" />
          <span>Return to Homepage</span>
        </Link>
        <Link
          to="/shop"
          className="neo-button-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
        >
          <span>Explore Shop Catalogue</span>
        </Link>
      </div>
    </main>
  );
}
