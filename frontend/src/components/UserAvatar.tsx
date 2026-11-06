import { useEffect, useState } from "react";

interface UserAvatarProps {
  user: { name?: string | null; email: string; picture?: string | null };
  /** Size and shape classes, e.g. "h-10 w-10 text-sm". */
  className?: string;
}

/**
 * A signed-in user's Google profile photo, falling back to their initial.
 *
 * Google's photo host (lh3.googleusercontent.com) often refuses images that
 * are requested with a Referer from another site — localhost especially —
 * returning 403 or 429 instead of the picture. Sending no referrer avoids
 * that, and if the photo still fails we show the initial instead of a
 * broken image.
 */
export function UserAvatar({ user, className = "h-10 w-10 text-sm" }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const label = user.name || user.email;
  const initial = label.charAt(0).toUpperCase();

  // A new photo URL (e.g. after signing in as someone else) gets a fresh try.
  useEffect(() => setFailed(false), [user.picture]);

  const shape = `${className} shrink-0 rounded-full overflow-hidden`;

  if (!user.picture || failed) {
    return (
      <span
        className={`${shape} inline-flex items-center justify-center bg-brand-red text-white font-bold select-none`}
        aria-label={label}
        role="img"
      >
        {initial}
      </span>
    );
  }

  return (
    <img
      src={user.picture}
      alt={label}
      referrerPolicy="no-referrer"
      decoding="async"
      onError={() => setFailed(true)}
      className={`${shape} object-cover bg-canvas-ivory`}
    />
  );
}
