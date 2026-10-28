import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PartnerCompany {
  id: string;
  name: string;
  tagline: string;
  logoUrl: string;
  href: string;
}

/**
 * Official featured printer and supplies brand partners.
 * Only the 5 official manufacturers: Canon, Kyocera, HP, Konica Minolta, and Brother.
 */
export const PARTNER_COMPANIES: PartnerCompany[] = [
  {
    id: "canon",
    name: "Canon",
    tagline: "i-SENSYS & imageRUNNER",
    logoUrl: "/brands/canon.png",
    href: "/shop?search=Canon",
  },
  {
    id: "kyocera",
    name: "Kyocera",
    tagline: "ECOSYS & TASKalfa",
    logoUrl: "/brands/kyocera.png",
    href: "/shop?search=Kyocera",
  },
  {
    id: "hp",
    name: "HP",
    tagline: "LaserJet & OfficeJet",
    logoUrl: "/brands/hp.png",
    href: "/shop?search=HP",
  },
  {
    id: "konica-minolta",
    name: "Konica Minolta",
    tagline: "bizhub & PagePro",
    logoUrl: "/brands/konica-minolta.png",
    href: "/shop?search=Konica",
  },
  {
    id: "brother",
    name: "Brother",
    tagline: "HL & MFC Series",
    logoUrl: "/brands/brother.png",
    href: "/shop?search=Brother",
  },
];

// Extended list for continuous carousel animation
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

  // Responsive visible count:
  // Mobile (<640px) shows 1 logo at a time to prevent any overlapping
  // Tablet (640-1023px) shows 3
  // Desktop (1024px+) shows all 5
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

  // Automatically slide every 2.5 seconds when user is not actively interacting
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      const timeSinceClick = Date.now() - lastManualClickRef.current;
      if (timeSinceClick < 3000) {
        return;
      }
      setEnableTransition(true);
      setTrackIndex((prev) => prev + 1);
    }, 2500);

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
      aria-label="Partnered Brands & Manufacturers"
      className="py-6 sm:py-10 relative overflow-hidden"
    >
      {/* Main Carousel Row: Left Arrow + Sliding Logos Track + Right Arrow */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-4 max-w-5xl mx-auto px-2">
        {/* Previous Slide Arrow */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous brand logo"
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
            {EXTENDED_PARTNERS.map((brand, idx) => (
              <div
                key={`${brand.id}-${idx}`}
                style={{ width: `${itemWidthPercent}%` }}
                className="shrink-0 px-2 sm:px-3 flex items-center justify-center overflow-hidden min-w-0"
              >
                <Link
                  to={brand.href}
                  className="w-full flex items-center justify-center focus:outline-none group"
                  aria-label={`${brand.name} — ${brand.tagline}`}
                >
                  <div className="w-full max-w-[170px] sm:max-w-[190px] h-16 sm:h-20 px-3 py-2 flex items-center justify-center rounded-neo-sm bg-surface-white border border-surface-border shadow-neo-sm group-hover:border-brand-red transition-all duration-200">
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      loading="lazy"
                      className="max-h-10 sm:max-h-12 max-w-full object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Next Slide Arrow */}
        <button
          type="button"
          onClick={handleNext}
          aria-label="Next brand logo"
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
