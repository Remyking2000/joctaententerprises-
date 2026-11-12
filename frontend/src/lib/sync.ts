import { useEffect, useRef } from "react";

/**
 * Keeps the admin panel and the inventory system in step.
 *
 * Both read the same products and stock from the server, so there is never a
 * second copy to reconcile — but a screen that is already open shows what it
 * loaded. After any successful change made through the admin API (a product
 * saved, stock received, a sale recorded…) every open admin or inventory
 * screen, in this tab and in other tabs, reloads its data. Screens also
 * reload when you come back to a tab you left in the background.
 */

const CHANNEL_NAME = "jocta-catalog-sync";
const STORAGE_SYNC_KEY = "jocta_catalog_last_sync_at";
const listeners = new Set<() => void>();

let channel: BroadcastChannel | null = null;
try {
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => listeners.forEach((fn) => fn());
  }
} catch {
  channel = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_SYNC_KEY) {
      listeners.forEach((fn) => fn());
    }
  });
}

/** Tells every open screen (this tab and others) that catalogue data changed. */
export function notifyCatalogChanged(): void {
  const now = Date.now();
  // Let the current screen finish its own update before others reload.
  queueMicrotask(() => listeners.forEach((fn) => fn()));
  try {
    channel?.postMessage({ type: "changed", at: now });
  } catch {
    // Messaging unavailable: other tabs refresh via storage event or focus.
  }
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_SYNC_KEY, String(now));
    }
  } catch {
    // Ignore storage quota / privacy errors
  }
}

/**
 * Calls `reload` when catalogue data changes anywhere, or when this tab comes
 * back into view. Bursts (e.g. a delivery with many lines) are coalesced.
 */
export function useCatalogRefresh(reload: () => void): void {
  const latest = useRef(reload);
  latest.current = reload;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => latest.current(), 120);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") trigger();
    };
    const onFocus = () => trigger();

    listeners.add(trigger);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      listeners.delete(trigger);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      if (timer) clearTimeout(timer);
    };
  }, []);
}
