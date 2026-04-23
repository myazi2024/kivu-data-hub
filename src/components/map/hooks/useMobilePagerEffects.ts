import { RefObject, useEffect, useRef } from 'react';

interface Params {
  isMobile: boolean;
  onAnalyticsPanel: boolean;
  prefersReducedMotion: boolean;
  trackRef: RefObject<HTMLDivElement>;
  analyticsColRef: RefObject<HTMLDivElement>;
  analyticsTitleRef: RefObject<HTMLSpanElement>;
  mapTitleRef: RefObject<HTMLHeadingElement>;
  activeMobilePanel: 'map' | 'analytics';
}

/**
 * Mobile pager side-effects:
 * - Resets scroll & focuses the active panel title for a11y on panel switch.
 * - Plays a one-shot "teaser" animation hinting that a second analytics page
 *   exists (skipped when reduced motion is set or already seen).
 */
export const useMobilePagerEffects = ({
  isMobile,
  onAnalyticsPanel,
  prefersReducedMotion,
  trackRef,
  analyticsColRef,
  analyticsTitleRef,
  mapTitleRef,
  activeMobilePanel,
}: Params) => {
  const teaserTimersRef = useRef<number[]>([]);

  // Reset scroll + focus when active mobile panel changes
  useEffect(() => {
    if (!isMobile) return;
    const id = window.setTimeout(() => {
      if (onAnalyticsPanel) {
        const scrollEl = analyticsColRef.current?.querySelector(
          '[data-radix-scroll-area-viewport]'
        ) as HTMLElement | null;
        if (scrollEl) scrollEl.scrollTop = 0;
        analyticsTitleRef.current?.focus({ preventScroll: true });
      } else {
        mapTitleRef.current?.focus({ preventScroll: true });
      }
    }, 320);
    return () => window.clearTimeout(id);
  }, [activeMobilePanel, isMobile, onAnalyticsPanel, analyticsColRef, analyticsTitleRef, mapTitleRef]);

  // One-shot teaser animation
  useEffect(() => {
    if (!isMobile || prefersReducedMotion) return;
    let seen = false;
    try { seen = localStorage.getItem('drc-pager-teaser-seen') === '1'; } catch { /* noop */ }
    if (seen) return;
    const el = trackRef.current;
    if (!el) return;
    const startId = window.setTimeout(() => {
      const prevTransition = el.style.transition;
      el.style.transition = 'transform 320ms cubic-bezier(.34,1.56,.64,1)';
      el.style.setProperty('--pager-teaser', '-40px');
      const t1 = window.setTimeout(() => { el.style.setProperty('--pager-teaser', '18px'); }, 340);
      const t2 = window.setTimeout(() => { el.style.setProperty('--pager-teaser', '0px'); }, 640);
      const t3 = window.setTimeout(() => {
        el.style.transition = prevTransition;
        try { localStorage.setItem('drc-pager-teaser-seen', '1'); } catch { /* noop */ }
      }, 980);
      teaserTimersRef.current = [t1, t2, t3];
    }, 600);
    return () => {
      window.clearTimeout(startId);
      teaserTimersRef.current.forEach((t) => window.clearTimeout(t));
      teaserTimersRef.current = [];
      el.style.setProperty('--pager-teaser', '0px');
    };
  }, [isMobile, prefersReducedMotion, trackRef]);
};
