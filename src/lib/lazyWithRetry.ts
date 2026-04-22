import React, { ComponentType } from "react";

/**
 * Wraps React.lazy with automatic retry for transient chunk-load failures
 * (Vite HMR sync issues, network blips, deploys with new chunk hashes).
 *
 * - Retries the dynamic import once after `retryDelayMs`.
 * - If the second attempt also fails, forces a full page reload so the
 *   browser fetches the freshly built bundle.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retryDelayMs = 800
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const message = String(err?.message || err || "");
      const isChunkError =
        err?.name === "ChunkLoadError" ||
        message.includes("Failed to fetch dynamically imported module") ||
        message.includes("Importing a module script failed") ||
        message.includes("error loading dynamically imported module");

      if (!isChunkError) {
        throw err;
      }

      // Wait then retry once
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      try {
        return await factory();
      } catch (retryErr) {
        // Force a full reload to pick up the new bundle.
        // Guard against reload loops with a session flag.
        try {
          const key = "__lazy_retry_reload__";
          if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, String(Date.now()));
            window.location.reload();
            // Return a placeholder while the reload happens
            return { default: (() => null) as unknown as T };
          }
        } catch {
          // ignore storage errors
        }
        throw retryErr;
      }
    }
  });
}
