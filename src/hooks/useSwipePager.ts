import { useEffect, useRef, useState, useCallback } from 'react';

interface UseSwipePagerOptions {
  pageCount: number;
  index: number;
  onIndexChange: (i: number) => void;
  enabled?: boolean;
  ignoreSelector?: string;
  /** Distance ratio (0..1) of width to trigger snap. Default 0.25 */
  snapDistanceRatio?: number;
  /** Velocity (px/ms) for flick snap. Default 0.4 */
  flickVelocity?: number;
  /** Lock threshold (px) before considering the gesture horizontal. Default 8 */
  lockThreshold?: number;
}

/**
 * Continuous carousel pager — finger drives the page in real-time.
 * Exposes drag state via React state (for indicators) AND pushes
 * a CSS variable --pager-drag-x directly to the DOM during the gesture
 * so the track can move at 60fps without React re-renders.
 *
 * The consumer uses:
 *   transform: translate3d(calc(var(--pager-base) + var(--pager-drag-x, 0px)), 0, 0)
 * where --pager-base is computed from `index`.
 */
export function useSwipePager<T extends HTMLElement = HTMLDivElement>({
  pageCount,
  index,
  onIndexChange,
  enabled = true,
  ignoreSelector,
  snapDistanceRatio = 0.25,
  flickVelocity = 0.4,
  lockThreshold = 8,
}: UseSwipePagerOptions): {
  ref: React.MutableRefObject<T | null>;
  isDragging: boolean;
  /** Current drag offset in px (signed). 0 when idle. */
  dragOffset: number;
  /** Width of one page in px (= container width). 0 before measure. */
  pageWidth: number;
  /** Drag progress signed (-1..1) — useful for fluid indicators. */
  dragProgress: number;
} {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState({ isDragging: false, dragOffset: 0, pageWidth: 0 });

  const cb = useRef({ onIndexChange, index, pageCount });
  cb.current = { onIndexChange, index, pageCount };

  // Push a CSS variable on the element without triggering React re-render
  const pushDragVar = useCallback((px: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--pager-drag-x', `${px}px`);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) {
      // ensure the var is reset when disabled
      el?.style.setProperty('--pager-drag-x', '0px');
      return;
    }

    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocityX = 0;
    let dragging = false;
    let locked = false;
    let cancelled = false;
    let activePointerId: number | null = null;
    let rafId: number | null = null;
    let pendingDx = 0;

    const measure = () => el.getBoundingClientRect().width || 1;

    const applyDx = (dx: number) => {
      // Rubber-band only at extremities
      const w = measure();
      const i = cb.current.index;
      const last = cb.current.pageCount - 1;
      let bounded = dx;
      if (i === 0 && dx > 0) {
        // pulling right at first page → resist
        bounded = w * 0.18 * (1 - Math.exp(-dx / (w * 0.5)));
      } else if (i === last && dx < 0) {
        bounded = -w * 0.18 * (1 - Math.exp(dx / (w * 0.5)));
      }
      pendingDx = bounded;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          pushDragVar(pendingDx);
        });
      }
    };

    const reset = (animate = true) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      activePointerId = null;
      dragging = false;
      locked = false;
      cancelled = false;
      pushDragVar(0);
      setState((s) => (s.isDragging || s.dragOffset !== 0 ? { ...s, isDragging: false, dragOffset: 0 } : s));
    };

    const begin = (clientX: number, clientY: number, target: EventTarget | null): boolean => {
      if (ignoreSelector) {
        const t = target as Element | null;
        if (t && t.closest && t.closest(ignoreSelector)) return false;
      }
      startX = clientX;
      startY = clientY;
      lastX = clientX;
      startTime = performance.now();
      lastTime = startTime;
      velocityX = 0;
      dragging = false;
      locked = false;
      cancelled = false;
      return true;
    };

    const move = (clientX: number, clientY: number) => {
      if (cancelled) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (!locked) {
        // Decide direction once we exceed threshold
        if (Math.abs(dx) < lockThreshold && Math.abs(dy) < lockThreshold) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          // Vertical scroll — release
          cancelled = true;
          reset(false);
          return;
        }
        locked = true;
        dragging = true;
        setState((s) => ({ ...s, isDragging: true, pageWidth: measure() }));
      }
      // Track velocity (px/ms)
      const now = performance.now();
      const dt = Math.max(1, now - lastTime);
      velocityX = (clientX - lastX) / dt;
      lastX = clientX;
      lastTime = now;
      applyDx(dx);
    };

    const end = (clientX: number) => {
      if (!dragging) {
        reset(false);
        return;
      }
      const w = measure();
      const dx = clientX - startX;
      const i = cb.current.index;
      const last = cb.current.pageCount - 1;

      let target = i;
      const distanceTrigger = Math.abs(dx) >= w * snapDistanceRatio;
      const flickTrigger = Math.abs(velocityX) >= flickVelocity;

      if (distanceTrigger || flickTrigger) {
        const goNext = (flickTrigger ? velocityX < 0 : dx < 0);
        target = goNext ? Math.min(last, i + 1) : Math.max(0, i - 1);
      }

      // Suppress next click if we actually dragged
      if (Math.abs(dx) > 4) {
        const suppress = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
        };
        window.addEventListener('click', suppress, { capture: true, once: true });
      }

      // Reset visuals; the consumer's CSS transition takes over to snap
      reset(true);

      if (target !== i) {
        cb.current.onIndexChange(target);
      }
    };

    const supportsPointer = typeof window !== 'undefined' && 'PointerEvent' in window;

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (activePointerId !== null) return;
      if (!begin(e.clientX, e.clientY, e.target)) return;
      activePointerId = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch { /* noop */ }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      move(e.clientX, e.clientY);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      try { el.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      end(e.clientX);
    };
    const onPointerCancel = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      reset(true);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { reset(true); return; }
      const t = e.touches[0];
      begin(t.clientX, t.clientY, e.target);
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]; if (!t) return;
      move(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0]; if (!t) { reset(true); return; }
      end(t.clientX);
    };
    const onTouchCancel = () => reset(true);

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

    // initial measurement
    setState((s) => ({ ...s, pageWidth: measure() }));
    const onResize = () => setState((s) => ({ ...s, pageWidth: measure() }));
    window.addEventListener('resize', onResize);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
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
      el.style.setProperty('--pager-drag-x', '0px');
    };
  }, [enabled, ignoreSelector, snapDistanceRatio, flickVelocity, lockThreshold, pushDragVar]);

  // Compute dragProgress from the live CSS variable when dragging — fallback to 0
  // We read it via rAF loop only while dragging to keep indicators fluid.
  const [dragProgress, setDragProgress] = useState(0);
  useEffect(() => {
    if (!state.isDragging) {
      setDragProgress(0);
      return;
    }
    let raf: number;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const v = parseFloat(getComputedStyle(el).getPropertyValue('--pager-drag-x') || '0');
        const w = state.pageWidth || el.getBoundingClientRect().width || 1;
        setDragProgress(Math.max(-1, Math.min(1, v / w)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.isDragging, state.pageWidth]);

  return {
    ref,
    isDragging: state.isDragging,
    dragOffset: 0, // unused externally — DOM is updated via CSS var
    pageWidth: state.pageWidth,
    dragProgress,
  };
}
