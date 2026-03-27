import { useEffect, useCallback } from 'react';

interface KeyboardActions {
  onDelete?: () => void;
  onDuplicate?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onEscape?: () => void;
  onToggleGrid?: () => void;
  onToggleSnap?: () => void;
  onSpaceDown?: () => void;
  onSpaceUp?: () => void;
  onBackspace?: () => void;
  onArrowMove?: (dx: number, dy: number) => void;
}

export function useCanvasKeyboard(
  containerRef: React.RefObject<HTMLElement | null>,
  actions: KeyboardActions,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'Delete') {
      e.preventDefault();
      actions.onDelete?.();
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (actions.onBackspace) {
        actions.onBackspace();
      } else {
        actions.onDelete?.();
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      actions.onDuplicate?.();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      actions.onUndo?.();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      actions.onRedo?.();
    }
    if (e.key === 'Escape') {
      actions.onEscape?.();
    }
    if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
      actions.onToggleGrid?.();
    }
    if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
      actions.onToggleSnap?.();
    }
    if (e.key === ' ') {
      e.preventDefault();
      actions.onSpaceDown?.();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
      const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
      actions.onArrowMove?.(dx, dy);
    }
  }, [enabled, actions]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === ' ') {
      actions.onSpaceUp?.();
    }
  }, [actions]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
