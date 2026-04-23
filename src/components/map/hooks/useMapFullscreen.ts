import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Manages browser fullscreen state for the interactive map, syncs with
 * `document.fullscreenElement`, exposes a toggle, notifies a parent callback,
 * and binds the keyboard shortcut `F` (skipped while typing in form fields).
 */
export const useMapFullscreen = (onFullscreenChange?: (isFullscreen: boolean) => void) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      onFullscreenChange?.(fs);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, [onFullscreenChange]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        toast.error("Le mode plein écran n'est pas disponible");
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'f') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && target.matches('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      toggleFullscreen();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  return { isFullscreen, toggleFullscreen };
};
