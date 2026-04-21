import { useEffect, useRef, useState, useCallback } from 'react';

interface UseSwipeNavigationOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Distance minimale (px) pour valider un swipe lent. Défaut 45. */
  threshold?: number;
  /** Distance minimale (px) pour valider un flick rapide. Défaut 30. */
  flickThreshold?: number;
  /** Vélocité (px/ms) au-delà de laquelle on considère un flick. Défaut 0.5. */
  flickVelocity?: number;
  /** Ratio min |dx|/|dy| pour accepter le geste comme horizontal. Défaut 1.2. */
  ratio?: number;
  enabled?: boolean;
  ignoreSelector?: string;
  /** Filtre directionnel : ne déclenche que dans la direction autorisée. */
  direction?: 'left' | 'right' | 'both';
}

interface SwipeState {
  isSwiping: boolean;
  /** Déplacement horizontal courant en px (signé). 0 si inactif. */
  swipeDelta: number;
}

/**
 * v2 — Détection swipe horizontal optimisée :
 * - touchmove : annulation précoce si geste vertical, exposition de swipeDelta
 * - vélocité (flick) : seuil abaissé pour gestes rapides
 * - garde directionnelle, callback ref pattern (pas de re-bind), rAF throttling
 * - respecte prefers-reduced-motion (les feedbacks visuels sont à la charge du conso)
 */
export function useSwipeNavigation<T extends HTMLElement = HTMLDivElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 45,
  flickThreshold = 30,
  flickVelocity = 0.5,
  ratio = 1.2,
  enabled = true,
  ignoreSelector,
  direction = 'both',
}: UseSwipeNavigationOptions): {
  ref: React.MutableRefObject<T | null>;
  isSwiping: boolean;
  swipeDelta: number;
} {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<SwipeState>({ isSwiping: false, swipeDelta: 0 });

  // Stabilise les callbacks et options dynamiques pour éviter le rebranchement.
  const cbRef = useRef({ onSwipeLeft, onSwipeRight, direction });
  cbRef.current = { onSwipeLeft, onSwipeRight, direction };

  const setStateThrottled = useCallback((next: SwipeState) => {
    setState((prev) =>
      prev.isSwiping === next.isSwiping && prev.swipeDelta === next.swipeDelta ? prev : next,
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let active = false;
    let lastDx = 0;
    let rafId: number | null = null;

    const reset = () => {
      active = false;
      lastDx = 0;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setStateThrottled({ isSwiping: false, swipeDelta: 0 });
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        reset();
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
      startTime = performance.now();
      lastDx = 0;
      active = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!active) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      // Annulation précoce : geste vertical dominant → laisse le scroll natif
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        reset();
        return;
      }

      // Garde directionnelle : si non autorisée, ignore le feedback
      const dir = cbRef.current.direction;
      if (dir === 'left' && dx > 0) return;
      if (dir === 'right' && dx < 0) return;

      lastDx = dx;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          setStateThrottled({ isSwiping: Math.abs(lastDx) > 4, swipeDelta: lastDx });
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!active) {
        setStateThrottled({ isSwiping: false, swipeDelta: 0 });
        return;
      }
      active = false;
      const t = e.changedTouches[0];
      if (!t) {
        reset();
        return;
      }
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dt = Math.max(1, performance.now() - startTime);
      const velocity = Math.abs(dx) / dt;

      // Reset visuel
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setStateThrottled({ isSwiping: false, swipeDelta: 0 });

      // Ratio horizontal/vertical
      if (Math.abs(dx) < Math.abs(dy) * ratio) return;

      const isFlick = velocity > flickVelocity;
      const minDist = isFlick ? flickThreshold : threshold;
      if (Math.abs(dx) < minDist) return;

      const dir = cbRef.current.direction;
      const goingLeft = dx < 0;
      if (dir === 'left' && !goingLeft) return;
      if (dir === 'right' && goingLeft) return;

      try {
        navigator.vibrate?.(15);
      } catch {
        /* noop */
      }

      if (goingLeft) {
        cbRef.current.onSwipeLeft?.();
      } else {
        cbRef.current.onSwipeRight?.();
      }
    };

    const onTouchCancel = () => reset();

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchCancel);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [enabled, threshold, flickThreshold, flickVelocity, ratio, ignoreSelector, setStateThrottled]);

  return { ref, isSwiping: state.isSwiping, swipeDelta: state.swipeDelta };
}
