import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PartnerCompany {
  id: string;
  name: string;
  tagline: string;
  /**
   * Optional image URL for when real client partner logos are added.
   * When omitted, the bespoke SVG emblem below is rendered.
   */
  logoUrl?: string;
  href?: string;
  renderEmblem: () => ReactNode;
}

/**
 * Dummy partner companies for the homepage slideshow.
 * Replace entries here (or set `logoUrl`) when the real client partner logos are provided.
 */
export const PARTNER_COMPANIES: PartnerCompany[] = [
  {
    id: "hp-partner",
    name: "HP Imaging",
    tagline: "LaserJet & Enterprise Supplies",
    href: "/shop?search=HP",
    renderEmblem: () => (
      <svg viewBox="0 0 140 60" className="h-14 w-32" aria-hidden="true">
        <circle cx="34" cy="30" r="22" className="fill-sky-600" />
        <text
          x="34"
          y="37"
          textAnchor="middle"
          className="fill-white font-black italic text-[22px]"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          hp
        </text>
        <text
          x="66"
          y="27"
          className="fill-current font-black text-[13px] tracking-wider"
        >
          IMAGING
        </text>
        <text
          x="66"
          y="41"
          className="fill-current opacity-60 font-bold text-[9px] tracking-widest"
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
      <svg viewBox="0 0 150 60" className="h-14 w-36" aria-hidden="true">
        <polygon points="16,30 28,14 28,46" className="fill-red-600" />
        <polygon points="28,30 40,18 40,42" className="fill-red-500" />
        <text
          x="47"
          y="35"
          className="fill-current font-black text-[16px] tracking-widest"
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
      <svg viewBox="0 0 140 60" className="h-14 w-32" aria-hidden="true">
        <text
          x="70"
          y="38"
          textAnchor="middle"
          className="fill-red-600 font-black text-[24px] tracking-wider"
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
      <svg viewBox="0 0 140 60" className="h-14 w-32" aria-hidden="true">
        <rect
          x="14"
          y="16"
          width="112"
          height="28"
          rx="6"
          className="fill-blue-600"
        />
        <text
          x="70"
          y="35"
          textAnchor="middle"
          className="fill-white font-black lowercase text-[18px] tracking-wide"
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
      <svg viewBox="0 0 140 60" className="h-14 w-32" aria-hidden="true">
        <text
          x="70"
          y="34"
          textAnchor="middle"
          className="fill-indigo-600 font-black text-[22px] tracking-widest"
        >
          EPSON
        </text>
        <line
          x1="28"
          y1="41"
          x2="112"
          y2="41"
          className="stroke-amber-500"
          strokeWidth="3"
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
      <svg viewBox="0 0 150 60" className="h-14 w-36" aria-hidden="true">
        <circle cx="28" cy="30" r="16" className="fill-amber-500/20" />
        <path d="M28 19 L36 37 L20 37 Z" className="fill-amber-500" />
        <text
          x="52"
          y="29"
          className="fill-current font-black text-[14px] tracking-wider"
        >
          APEX KE
        </text>
        <text
          x="52"
          y="41"
          className="fill-current opacity-60 font-bold text-[9px] tracking-widest"
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
      <svg viewBox="0 0 150 60" className="h-14 w-36" aria-hidden="true">
        <rect
          x="12"
          y="16"
          width="28"
          height="28"
          rx="7"
          className="fill-emerald-600"
        />
        <text
          x="26"
          y="36"
          textAnchor="middle"
          className="fill-white font-black text-[16px]"
        >
          SP
        </text>
        <text
          x="48"
          y="29"
          className="fill-current font-black text-[13px] tracking-wider"
        >
          SAVANNAH
        </text>
        <text
          x="48"
          y="41"
          className="fill-emerald-600 font-extrabold text-[9px] tracking-widest"
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
      <svg viewBox="0 0 150 60" className="h-14 w-36" aria-hidden="true">
        <polygon
          points="26,12 40,22 35,42 17,42 12,22"
          className="fill-red-600"
        />
        <text
          x="26"
          y="33"
          textAnchor="middle"
          className="fill-white font-black text-[11px]"
        >
          KX
        </text>
        <text
          x="48"
          y="29"
          className="fill-current font-black text-[14px] tracking-wider"
        >
          KIFARU
        </text>
        <text
          x="48"
          y="41"
          className="fill-current opacity-60 font-bold text-[9px] tracking-widest"
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
  const [visibleCount, setVisibleCount] = useState(6);
  const lastManualClickRef = useRef<number>(0);

  // Responsive visible item count based on viewport width
  useEffect(() => {
    function updateVisibleCount() {
      const w = window.innerWidth;
      if (w < 640) {
        setVisibleCount(2);
      } else if (w < 768) {
        setVisibleCount(3);
      } else if (w < 1024) {
        setVisibleCount(4);
      } else {
        setVisibleCount(6);
      }
    }
    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, []);

  // Automatically slide every 2.2 seconds when user is not actively clicking arrows
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      const timeSinceClick = Date.now() - lastManualClickRef.current;
      if (timeSinceClick < 3000) {
        return;
      }
      setEnableTransition(true);
      setTrackIndex((prev) => prev + 1);
    }, 2200);

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

  const itemWidthPercent = 100 / visibleCount;
  const translatePercent = -(trackIndex * itemWidthPercent);

  return (
    <section
      aria-label="Partnered Companies & Brands"
      className="py-6 sm:py-8 relative overflow-hidden"
    >
      {/* Main Carousel Row: Left Arrow + Sliding Logos Track + Right Arrow */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Previous Slide Arrow (Borderless) */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous partner logos"
          className="shrink-0 p-2 flex items-center justify-center text-brand-red hover:scale-110 active:scale-95 transition-transform cursor-pointer bg-transparent border-0 shadow-none"
        >
          <ChevronLeft
            className="h-9 w-9 sm:h-11 sm:w-11 stroke-[1.75]"
            aria-hidden="true"
          />
        </button>

        {/* Smooth Sliding Viewport (Borderless) */}
        <div className="flex-1 overflow-hidden">
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
                  className="group w-full h-20 flex flex-col items-center justify-center text-ink-charcoal transition-transform duration-200 hover:scale-105"
                >
                  {partner.logoUrl ? (
                    <img
                      src={partner.logoUrl}
                      alt={partner.name}
                      className="max-h-14 max-w-[130px] object-contain"
                    />
                  ) : (
                    <div>{partner.renderEmblem()}</div>
                  )}
                </div>
              );

              return (
                <div
                  key={`${partner.id}-${idx}`}
                  style={{ width: `${itemWidthPercent}%` }}
                  className="shrink-0 px-2 sm:px-3 flex items-center justify-center"
                >
                  {partner.href ? (
                    <Link
                      to={partner.href}
                      className="w-full focus:outline-none"
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

        {/* Next Slide Arrow (Borderless) */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next partner logos"
          className="shrink-0 p-2 flex items-center justify-center text-brand-red hover:scale-110 active:scale-95 transition-transform cursor-pointer bg-transparent border-0 shadow-none"
        >
          <ChevronRight
            className="h-9 w-9 sm:h-11 sm:w-11 stroke-[1.75]"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Bottom Call-To-Action Line */}
      <p className="mt-4 text-center text-xs sm:text-sm font-black uppercase tracking-wider text-ink-charcoal">
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
