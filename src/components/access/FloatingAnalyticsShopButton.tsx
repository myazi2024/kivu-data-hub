import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import AnalyticsCatalogDialog from '@/components/analytics/catalog/AnalyticsCatalogDialog';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'bic-analytics-shop-fab';
/** Marge intérieure minimale avec les bords de l'écran. */
const EDGE_MARGIN = 8;
/** Hauteur à réserver sous la navigation fixe pour la position par défaut et le recadrage haut. */
const MIN_TOP = 64;
/** Distance minimale en pixels avant de considérer un déplacement (et non un simple appui). */
const DRAG_THRESHOLD = 8;

interface StoredFabState {
  x: number;
  y: number;
  collapsed: boolean;
}

const DEFAULT_STATE: StoredFabState = { x: 12, y: 80, collapsed: false };

function readStoredState(): StoredFabState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<StoredFabState>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return DEFAULT_STATE;
    return { x: parsed.x, y: parsed.y, collapsed: parsed.collapsed === true };
  } catch {
    return DEFAULT_STATE;
  }
}

function persistState(state: StoredFabState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* stockage indisponible : la position ne sera pas mémorisée */
  }
}

function readSafeInsets() {
  if (typeof document === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.padding =
    'env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px)';
  document.body.appendChild(probe);
  const cs = window.getComputedStyle(probe);
  const insets = {
    top: parseFloat(cs.paddingTop) || 0,
    right: parseFloat(cs.paddingRight) || 0,
    bottom: parseFloat(cs.paddingBottom) || 0,
    left: parseFloat(cs.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * Bouton flottant « Acheter d'autres visuels » : rétractable en une petite icône
 * ronde, déplaçable partout sur l'écran, position mémorisée sur l'appareil.
 */
export default function FloatingAnalyticsShopButton() {
  const initial = useRef<StoredFabState | null>(null);
  if (initial.current === null) initial.current = readStoredState();

  const [collapsed, setCollapsed] = useState(initial.current.collapsed);
  const [pos, setPos] = useState({ x: initial.current.x, y: initial.current.y });
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const collapsedRef = useRef(collapsed);
  collapsedRef.current = collapsed;
  /** Après un déplacement, on ignore brièvement le clic résiduel pour éviter une ouverture accidentelle. */
  const suppressUntil = useRef(0);
  const drag = useRef<{ id: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const [dragging, setDragging] = useState(false);

  const clamp = useCallback((next: { x: number; y: number }) => {
    const wrapper = wrapperRef.current;
    const width = wrapper?.offsetWidth ?? (collapsedRef.current ? 44 : 220);
    const height = wrapper?.offsetHeight ?? 44;
    const insets = readSafeInsets();
    const maxX = Math.max(EDGE_MARGIN + insets.left, window.innerWidth - insets.right - EDGE_MARGIN - width);
    const maxY = Math.max(MIN_TOP + insets.top, window.innerHeight - insets.bottom - EDGE_MARGIN - height);
    return {
      x: Math.min(Math.max(next.x, insets.left + EDGE_MARGIN), maxX),
      y: Math.min(Math.max(next.y, MIN_TOP + insets.top), maxY),
    };
  }, []);

  const save = useCallback((next: { x: number; y: number }, nextCollapsed: boolean) => {
    persistState({ x: next.x, y: next.y, collapsed: nextCollapsed });
  }, []);

  // Recadre la position si l'écran change (rotation, redimensionnement).
  useEffect(() => {
    const onResize = () => setPos(prev => clamp(prev));
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [clamp]);

  // Recadre après un changement de forme (pilule ↔ icône).
  useEffect(() => {
    setPos(prev => clamp(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed]);

  // Écouteurs de fenêtre : suivent le pointeur même en dehors du bouton, sans
  // capture (la capture retargeterait le clic final vers le conteneur).
  useEffect(() => {
    if (!dragging) return;
    const onMove = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== ev.pointerId) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      d.moved = true;
      setPos(clamp({ x: d.originX + dx, y: d.originY + dy }));
    };
    const onEnd = (ev: PointerEvent) => {
      const d = drag.current;
      if (!d || d.id !== ev.pointerId) return;
      drag.current = null;
      setDragging(false);
      if (d.moved) {
        suppressUntil.current = Date.now() + 400;
        save(posRef.current, collapsedRef.current);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [dragging, clamp, save]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Le chevron de réduction ne déclenche pas le déplacement.
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (drag.current) return;
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, originX: posRef.current.x, originY: posRef.current.y, moved: false };
    setDragging(true);
  };

  const onMainClick = () => {
    if (Date.now() < suppressUntil.current) return;
    setOpen(true);
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    save(posRef.current, next);
  };

  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

  return (
    <>
      <div
        ref={wrapperRef}
        className="fixed z-40"
        style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
        data-testid="analytics-shop-fab"
      >
        <div
          className="flex touch-none items-center gap-1 motion-reduce:transition-none"
          onPointerDown={onPointerDown}
        >
          {collapsed ? (
            <div className="relative h-[54px] w-10">
              <button
                type="button"
                onClick={onMainClick}
                aria-label="Acheter d'autres visuels"
                aria-expanded={false}
                title="Acheter d'autres visuels"
                className={cn(
                  'absolute bottom-0 left-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform active:scale-95',
                  focusRing,
                )}
              >
                <ShoppingBag aria-hidden="true" className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-no-drag
                onClick={toggleCollapsed}
                aria-label="Développer"
                className={cn(
                  'absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-colors hover:text-foreground',
                  focusRing,
                )}
              >
                <ChevronRight aria-hidden="true" className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={onMainClick}
                aria-expanded={true}
                className={cn(
                  'flex h-11 items-center gap-2 rounded-full border border-border bg-background/95 pl-3.5 pr-1.5 text-sm font-medium text-foreground shadow-md transition-colors hover:bg-accent/50',
                  focusRing,
                )}
              >
                <ShoppingBag aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                Acheter d'autres visuels
              </button>
              <button
                type="button"
                data-no-drag
                onClick={toggleCollapsed}
                aria-label="Réduire"
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-colors hover:text-foreground',
                  focusRing,
                )}
              >
                <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
      <AnalyticsCatalogDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
