import { useState } from "react";

interface JoctaLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

/**
 * Renders the Jocta Enterprises brand logo.
 * Loads `/jocta-logo.png` with a clean neomorphic container and fallback.
 */
export function JoctaLogo({ size = "md", showText = true }: JoctaLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const sizeClasses = {
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-14 w-14 text-base",
  }[size];

  return (
    <div className="inline-flex items-center gap-3">
      <div
        className={`${sizeClasses} shrink-0 rounded-2xl bg-surface-raised shadow-neo-sm p-1 flex items-center justify-center overflow-hidden border border-surface-border transition-colors`}
      >
        {!imgFailed ? (
          <img
            src="/jocta-logo.png"
            alt="Jocta Enterprises"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-contain rounded-xl"
          />
        ) : (
          <span
            aria-hidden="true"
            className="h-full w-full inline-flex items-center justify-center rounded-xl bg-brand-red text-white font-extrabold tracking-tight"
          >
            JE
          </span>
        )}
      </div>

      {showText && (
        <div className="flex flex-col leading-tight select-none">
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-black tracking-tight text-ink-charcoal transition-colors">
              JOCTA
            </span>
            <span className="text-base sm:text-lg font-black tracking-tight text-brand-red">
              ENTERPRISES
            </span>
          </div>
          <span className="text-[11px] font-semibold text-ink-muted tracking-tight transition-colors">
            Toners • Printer Parts • Consumables
          </span>
        </div>
      )}
    </div>
  );
}
