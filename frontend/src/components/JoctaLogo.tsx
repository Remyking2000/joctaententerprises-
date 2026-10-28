import { useState } from "react";

interface JoctaLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  inverted?: boolean;
}

/**
 * Renders the Jocta Enterprises brand logo using `/jocta-logo.png` with a clean neomorphic container and fallback.
 */
export function JoctaLogo({
  size = "md",
  showText = true,
  inverted = false,
}: JoctaLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClasses = {
    sm: "h-9 w-9 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  }[size];

  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className={`${sizeClasses} shrink-0 rounded-neo-sm bg-surface-white p-1 flex items-center justify-center overflow-hidden ${
          inverted
            ? "border border-white/25"
            : "shadow-neo-sm border border-surface-border"
        }`}
      >
        {!imgFailed ? (
          <img
            src="/jocta-logo.png"
            alt="Jocta Enterprises logo"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain"
          />
        ) : (
          <span
            aria-hidden="true"
            className="h-full w-full inline-flex items-center justify-center rounded-neo-sm bg-brand-red text-white font-extrabold tracking-tight"
          >
            JE
          </span>
        )}
      </div>

      {showText && (
        <div className="flex flex-col leading-tight select-none">
          <div className="flex items-center gap-1">
            <span
              className={`text-sm sm:text-base font-extrabold tracking-tight ${
                inverted ? "text-white" : "text-ink-charcoal"
              }`}
            >
              JOCTA
            </span>
            <span className="text-sm sm:text-base font-extrabold tracking-tight text-brand-red">
              ENTERPRISES
            </span>
          </div>
          <span
            className={`hidden sm:block text-[11px] font-medium ${
              inverted ? "text-white/75" : "text-ink-muted"
            }`}
          >
            Printer Supplies &amp; Parts
          </span>
        </div>
      )}
    </div>
  );
}
