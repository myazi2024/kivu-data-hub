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
  /** Durée minimale du geste (ms) pour filtrer les flicks parasites. Défaut 80. */
  minDuration?: number;
  /** Si vrai, augmente le threshold à 60px sur écrans étroits (<400px). Défaut true. */
  adaptiveThreshold?: boolean;
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
 * v3 — Détection swipe horizontal optimisée :
 * - Pointer events (couvre touch + souris + stylet) avec fallback touch si non supporté
 * - touchmove : annulation précoce si geste vertical, exposition de swipeDelta
 * - vélocité (flick) : seuil abaissé pour gestes rapides
 * - threshold adaptatif : 60px sur écran <400px (réduit bascules accidentelles)
 * - durée min : filtre les flicks parasites <80ms
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
  minDuration = 80,
  adaptiveThreshold = true,
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
    let activePointerId: number | null = null;

    // Threshold adaptatif : écrans étroits → seuil plus large pour éviter les bascules accidentelles
    const effectiveThreshold = adaptiveThreshold && typeof window !== 'undefined' && window.innerWidth < 400
      ? Math.max(threshold, 60)
      : threshold;

    const reset = () => {
      active = false;
      activePointerId = null;
      lastDx = 0;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setStateThrottled({ isSwiping: false, swipeDelta: 0 });
    };

    const beginGesture = (clientX: number, clientY: number, target: EventTarget | null) => {
      const el2 = target as Element | null;
      if (ignoreSelector && el2 && el2.closest && el2.closest(ignoreSelector)) {
        active = false;
        return false;
      }
      startX = clientX;
      startY = clientY;
      startTime = performance.now();
      lastDx = 0;
      active = true;
      return true;
    };

    const updateGesture = (clientX: number, clientY: number) => {
      if (!active) return;
      const dx = clientX - startX;
      const dy = clientY - startY;

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

    const endGesture = (clientX: number, clientY: number) => {
      if (!active) {
        setStateThrottled({ isSwiping: false, swipeDelta: 0 });
        return;
      }
      active = false;
      activePointerId = null;
      const dx = clientX - startX;
      const dy = clientY - startY;
      const dt = Math.max(1, performance.now() - startTime);
      const velocity = Math.abs(dx) / dt;

      // Reset visuel
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setStateThrottled({ isSwiping: false, swipeDelta: 0 });

      // Filtre temporel : geste trop court = flick parasite
      if (dt < minDuration) return;

      // Ratio horizontal/vertical
      if (Math.abs(dx) < Math.abs(dy) * ratio) return;

      const isFlick = velocity > flickVelocity;
      const minDist = isFlick ? flickThreshold : effectiveThreshold;
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

      // Anti-clic fantôme : bloque le prochain click synthétique généré par le tap.
      // { once: true } suffit à le retirer après déclenchement — pas besoin de setTimeout.
      const suppressClick = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      window.addEventListener('click', suppressClick, { capture: true, once: true });

      if (goingLeft) {
        cbRef.current.onSwipeLeft?.();
      } else {
        cbRef.current.onSwipeRight?.();
      }
    };

    // ===== Pointer events (priorité) =====
    const supportsPointer = typeof window !== 'undefined' && 'PointerEvent' in window;

    const onPointerDown = (e: PointerEvent) => {
      // Ignore boutons souris secondaires et stylet en mode bouton
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (activePointerId !== null) return; // un seul pointeur à la fois
      if (!beginGesture(e.clientX, e.clientY, e.target)) return;
      activePointerId = e.pointerId;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      updateGesture(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      endGesture(e.clientX, e.clientY);
    };

    const onPointerCancel = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      reset();
    };

    // ===== Fallback touch events =====
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        reset();
        return;
      }
      const t = e.touches[0];
      beginGesture(t.clientX, t.clientY, e.target);
    };

    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      updateGesture(t.clientX, t.clientY);
    };

    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) {
        reset();
        return;
      }
      endGesture(t.clientX, t.clientY);
    };

    const onTouchCancel = () => reset();

    if (supportsPointer) {
      el.addEventListener('pointerdown', onPointerDown, { passive: true });
      el.addEventListener('pointermove', onPointerMove, { passive: true });
      el.addEventListener('pointerup', onPointerUp);
      el.addEventListener('pointercancel', onPointerCancel);
    } else {
      el.addEventListener('touchstart', onTouchStart, { passive: true });
      el.addEventListener('touchmove', onTouchMove, { passive: true });
      el.addEventListener('touchend', onTouchEnd);
      el.addEventListener('touchcancel', onTouchCancel);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (supportsPointer) {
        el.removeEventListener('pointerdown', onPointerDown);
        el.removeEventListener('pointermove', onPointerMove);
        el.removeEventListener('pointerup', onPointerUp);
        el.removeEventListener('pointercancel', onPointerCancel);
      } else {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchCancel);
      }
    };
  }, [enabled, threshold, flickThreshold, flickVelocity, ratio, minDuration, adaptiveThreshold, ignoreSelector, setStateThrottled]);

  return { ref, isSwiping: state.isSwiping, swipeDelta: state.swipeDelta };
}
