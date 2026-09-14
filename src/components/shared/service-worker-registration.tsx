"use client";

import * as React from "react";

/** Registers the app-shell service worker so the PWA installs and works offline. */
export function ServiceWorkerRegistration() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Non-fatal — the app works fully without it, just not offline-installed.
    });
  }, []);

  return null;
}
