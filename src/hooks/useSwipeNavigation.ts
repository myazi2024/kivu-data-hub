import { useEffect, useRef } from 'react';

interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  enabled?: boolean;
  ignoreSelector?: string;
}

/**
 * Détecte les balayages horizontaux (gauche/droite) sur un conteneur.
 * Ignore les gestes verticaux et les cibles correspondant à `ignoreSelector`
 * (ex. carte SVG interactive, dialogues Radix).
 */
export function useSwipeNavigation<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
  enabled = true,
  ignoreSelector,
}: UseSwipeNavigationOptions) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let active = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        active = false;
        return;
      }
      const target = e.target as Element | null;
      if (ignoreSelector && target && target.closest && target.closest(ignoreSelector)) {
        active = false;
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      active = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.5) return;

      try {
        navigator.vibrate?.(15);
      } catch {
        /* noop */
      }

      if (dx < 0) {
        onSwipeLeft?.();
      } else {
        onSwipeRight?.();
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, threshold, ignoreSelector, onSwipeLeft, onSwipeRight]);

  return ref;
}
