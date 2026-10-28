import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PartnerCompany {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  href?: string;
  renderEmblem: () => ReactNode;
}

/**
 * Partner companies for the homepage showcase slideshow.
 * Emblems use responsive proportional dimensions (`h-10 sm:h-12 w-auto max-w-full`)
 * to prevent any overlapping or protrusion on small screens.
 */
export const PARTNER_COMPANIES: PartnerCompany[] = [
  {
    id: "hp-partner",
    name: "HP Imaging",
    tagline: "LaserJet & Enterprise Supplies",
    href: "/shop?search=HP",
    renderEmblem: () => (
      <svg
        viewBox="0 0 150 64"
        className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
        aria-hidden="true"
      >
        <circle cx="34" cy="32" r="25" className="fill-sky-600" />
        <text
          x="34"
          y="40"
          textAnchor="middle"
          className="fill-white font-black italic text-[26px]"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          hp
        </text>
        <text
          x="68"
          y="29"
          className="fill-current font-black text-[15px] tracking-wider"
        >
          IMAGING
        </text>
        <text
          x="68"
          y="45"
          className="fill-current opacity-65 font-bold text-[10.5px] tracking-widest"
        >
          PARTNER
        </text>
      </svg>
    ),
  },
  {
    id: "kyocera-partner",
    name: "Kyocera",
    tagline: "ECOSYS & TASKalfa Toners",
    href: "/shop?search=Kyocera",
    renderEmblem: () => (
      <svg
        viewBox="0 0 160 64"
        className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
        aria-hidden="true"
      >
        <polygon points="10,32 25,12 25,52" className="fill-brand-red" />
        <polygon points="25,32 40,17 40,47" className="fill-brand-red opacity-85" />
        <text
          x="48"
          y="39"
          className="fill-current font-black text-[19px] tracking-widest"
        >
          KYOCERA
        </text>
      </svg>
    ),
  },
  {
    id: "canon-partner",
    name: "Canon",
    tagline: "i-SENSYS & imageRUNNER",
    href: "/shop?search=Canon",
    renderEmblem: () => (
      <svg
        viewBox="0 0 150 64"
        className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
        aria-hidden="true"
      >
        <text
          x="75"
          y="41"
          textAnchor="middle"
          className="fill-brand-red font-black text-[28px] tracking-wider"
        >
          CANON
        </text>
      </svg>
    ),
  },
  {
    id: "brother-partner",
    name: "Brother",
    tagline: "HL & MFC Series Specialist",
    href: "/shop?search=Brother",
    renderEmblem: () => (
      <svg
        viewBox="0 0 150 64"
        className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
        aria-hidden="true"
      >
        <rect
          x="11"
          y="14"
          width="128"
          height="36"
          rx="8"
          className="fill-blue-600"
        />
        <text
          x="75"
          y="39"
          textAnchor="middle"
          className="fill-white font-black lowercase text-[22px] tracking-wide"
        >
          brother
        </text>
      </svg>
    ),
  },
  {
    id: "epson-partner",
    name: "Epson",
    tagline: "EcoTank & WorkForce Inks",
    href: "/shop?search=Epson",
    renderEmblem: () => (
      <svg
        viewBox="0 0 150 64"
        className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
        aria-hidden="true"
      >
        <text
          x="75"
          y="37"
          textAnchor="middle"
          className="fill-indigo-500 font-black text-[26px] tracking-widest"
        >
          EPSON
        </text>
        <line
          x1="22"
          y1="46"
          x2="128"
          y2="46"
          className="stroke-amber-500"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: "apex-office",
    name: "Apex Office KE",
    tagline: "Corporate Fleet Partner",
    href: "/shop",
    renderEmblem: () => (
      <svg
        viewBox="0 0 160 64"
        className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
        aria-hidden="true"
      >
        <circle cx="28" cy="32" r="20" className="fill-amber-500/20" />
        <path d="M28 18 L39 41 L17 41 Z" className="fill-amber-500" />
        <text
          x="56"
          y="30"
          className="fill-current font-black text-[16px] tracking-wider"
        >
          APEX KE
        </text>
        <text
          x="56"
          y="45"
          className="fill-current opacity-65 font-bold text-[10.5px] tracking-widest"
        >
          OFFICE FLEET
        </text>
      </svg>
    ),
  },
  {
    id: "savannah-press",
    name: "Savannah Press",
    tagline: "Commercial Print Partner",
    href: "/shop",
    renderEmblem: () => (
      <svg
        viewBox="0 0 160 64"
        className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
        aria-hidden="true"
      >
        <rect
          x="8"
          y="14"
          width="36"
          height="36"
          rx="9"
          className="fill-emerald-600"
        />
        <text
          x="26"
          y="39"
          textAnchor="middle"
          className="fill-white font-black text-[19px]"
        >
          SP
        </text>
        <text
          x="52"
          y="30"
          className="fill-current font-black text-[15px] tracking-wider"
        >
          SAVANNAH
        </text>
        <text
          x="52"
          y="45"
          className="fill-emerald-500 font-extrabold text-[10.5px] tracking-widest"
        >
          PRINT GROUP
        </text>
      </svg>
    ),
  },
  {
    id: "kifaru-logistics",
    name: "Kifaru Express",
    tagline: "Countrywide Dispatch Partner",
    href: "/shop",
    renderEmblem: () => (
      <svg
        viewBox="0 0 160 64"
        className="h-10 sm:h-12 w-auto max-w-[150px] sm:max-w-[180px] object-contain"
        aria-hidden="true"
      >
        <polygon
          points="26,10 44,23 37,48 15,48 8,23"
          className="fill-brand-red"
        />
        <text
          x="26"
          y="36"
          textAnchor="middle"
          className="fill-white font-black text-[13.5px]"
        >
          KX
        </text>
        <text
          x="52"
          y="30"
          className="fill-current font-black text-[16px] tracking-wider"
        >
          KIFARU
        </text>
        <text
          x="52"
          y="45"
          className="fill-current opacity-65 font-bold text-[10.5px] tracking-widest"
        >
          LOGISTICS
        </text>
      </svg>
    ),
  },
];

// Triple the list so we can slide smoothly in either direction and seamlessly recenter
const EXTENDED_PARTNERS = [
  ...PARTNER_COMPANIES,
  ...PARTNER_COMPANIES,
  ...PARTNER_COMPANIES,
];

export function PartnerLogosCarousel() {
  const total = PARTNER_COMPANIES.length;
  // Start at the middle copy so both left and right slides have buffer items
  const [trackIndex, setTrackIndex] = useState(total);
  const [enableTransition, setEnableTransition] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const lastManualClickRef = useRef<number>(0);
  const touchStartXRef = useRef<number | null>(null);

  // Responsive visible item count based on viewport width
  // Mobile (<640px) shows 1 logo at a time to prevent any overlapping
  useEffect(() => {
    function updateVisibleCount() {
      const w = window.innerWidth;
      if (w < 640) {
        setVisibleCount(1);
      } else if (w < 1024) {
        setVisibleCount(3);
      } else {
        setVisibleCount(5);
      }
    }
    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  // Automatically slide every 2.4 seconds when user is not actively interacting
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      const timeSinceClick = Date.now() - lastManualClickRef.current;
      if (timeSinceClick < 3000) {
        return;
      }
      setEnableTransition(true);
      setTrackIndex((prev) => prev + 1);
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  // Seamlessly recenter into the middle copy after the slide transition finishes
  useEffect(() => {
    if (trackIndex >= total * 2 || trackIndex < total) {
      const timer = setTimeout(() => {
        setEnableTransition(false);
        setTrackIndex((prev) => {
          const normalized = ((prev % total) + total) % total;
          return total + normalized;
        });
      }, 610);
      return () => clearTimeout(timer);
    }
  }, [trackIndex, total]);

  const handlePrev = () => {
    lastManualClickRef.current = Date.now();
    setEnableTransition(true);
    setTrackIndex((prev) => prev - 1);
  };

  const handleNext = () => {
    lastManualClickRef.current = Date.now();
    setEnableTransition(true);
    setTrackIndex((prev) => prev + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    if (Math.abs(deltaX) > 35) {
      if (deltaX > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartXRef.current = null;
  };

  const itemWidthPercent = 100 / visibleCount;
  const translatePercent = -(trackIndex * itemWidthPercent);

  return (
    <section
      aria-label="Partnered Companies & Brands"
      className="py-6 sm:py-10 relative overflow-hidden"
    >
      {/* Main Carousel Row: Left Arrow + Sliding Logos Track + Right Arrow */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-4 max-w-5xl mx-auto px-2">
        {/* Previous Slide Arrow */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous partner logo"
          className="shrink-0 p-1.5 sm:p-2 flex items-center justify-center text-brand-red hover:scale-110 active:scale-95 transition-transform cursor-pointer bg-transparent border-0 shadow-none touch-manipulation"
        >
          <ChevronLeft
            className="h-6 w-6 sm:h-9 sm:w-9 stroke-[2.5]"
            aria-hidden="true"
          />
        </button>

        {/* Smooth Sliding Viewport */}
        <div
          className="flex-1 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            style={{
              transform: `translate3d(${translatePercent}%, 0, 0)`,
              transition: enableTransition
                ? "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)"
                : "none",
            }}
            className="flex items-center will-change-transform"
          >
            {EXTENDED_PARTNERS.map((partner, idx) => {
              const content = (
                <div
                  title={`${partner.name} — ${partner.tagline}`}
                  className="group w-full max-w-[200px] h-16 sm:h-20 flex flex-col items-center justify-center text-ink-charcoal transition-transform duration-200 hover:scale-105"
                >
                  {partner.logoUrl ? (
                    <img
                      src={partner.logoUrl}
                      alt={partner.name}
                      className="max-h-10 sm:max-h-12 max-w-[150px] object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center max-w-full">
                      {partner.renderEmblem()}
                    </div>
                  )}
                </div>
              );

              return (
                <div
                  key={`${partner.id}-${idx}`}
                  style={{ width: `${itemWidthPercent}%` }}
                  className="shrink-0 px-2 sm:px-4 flex items-center justify-center overflow-hidden min-w-0"
                >
                  {partner.href ? (
                    <Link
                      to={partner.href}
                      className="w-full flex items-center justify-center focus:outline-none"
                      aria-label={partner.name}
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Slide Arrow */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next partner logo"
          className="shrink-0 p-1.5 sm:p-2 flex items-center justify-center text-brand-red hover:scale-110 active:scale-95 transition-transform cursor-pointer bg-transparent border-0 shadow-none touch-manipulation"
        >
          <ChevronRight
            className="h-6 w-6 sm:h-9 sm:w-9 stroke-[2.5]"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Bottom Call-To-Action Line */}
      <p className="mt-4 sm:mt-6 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-ink-charcoal px-4">
        Visit{" "}
        <Link
          to="/shop"
          className="text-brand-red underline decoration-2 underline-offset-4 hover:opacity-80 transition-opacity"
        >
          Our Shop Catalogue
        </Link>{" "}
        or{" "}
        <Link
          to="/compatibility"
          className="text-brand-red underline decoration-2 underline-offset-4 hover:opacity-80 transition-opacity"
        >
          Compatibility Finder
        </Link>{" "}
        to make your order today.
      </p>
    </section>
  );
}
