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

/** Tells every open screen (this tab and others) that catalogue data changed. */
export function notifyCatalogChanged(): void {
  // Let the current screen finish its own update before others reload.
  queueMicrotask(() => listeners.forEach((fn) => fn()));
  try {
    channel?.postMessage({ type: "changed", at: Date.now() });
  } catch {
    // Messaging unavailable: other tabs refresh when they regain focus.
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
      timer = setTimeout(() => latest.current(), 150);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") trigger();
    };

    listeners.add(trigger);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      listeners.delete(trigger);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer) clearTimeout(timer);
    };
  }, []);
}
