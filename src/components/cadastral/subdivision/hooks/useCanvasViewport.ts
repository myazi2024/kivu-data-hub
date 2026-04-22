import { useState, useCallback, useRef, useEffect, RefObject } from 'react';
import { Point2D } from '../types';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export function useCanvasViewport(
  canvasW: number,
  canvasH: number,
  svgRef?: RefObject<SVGSVGElement>,
) {
  const [viewport, setViewport] = useState<ViewportState>({ zoom: 1, panX: 0, panY: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const spaceDown = useRef(false);

  const viewBox = `${-viewport.panX} ${-viewport.panY} ${canvasW / viewport.zoom} ${canvasH / viewport.zoom}`;

  // Non-passive wheel listener attached directly to the SVG element so
  // preventDefault() actually stops the page from scrolling. Implements
  // cursor-centered zoom: the point under the cursor stays stable.
  useEffect(() => {
    const el = svgRef?.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const scaleX = canvasW / rect.width;
      const scaleY = canvasH / rect.height;
      // Mouse position in viewBox-local coords (before zoom change)
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      setViewport(prev => {
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * delta));
        if (newZoom === prev.zoom) return prev;
        // Keep the world point under the cursor stationary.
        // worldX = mx / prevZoom - prev.panX  ⇒  panX' = mx/newZoom - worldX
        const worldX = mx / prev.zoom - prev.panX;
        const worldY = my / prev.zoom - prev.panY;
        const panX = mx / newZoom - worldX;
        const panY = my / newZoom - worldY;
        return { zoom: newZoom, panX, panY };
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [svgRef, canvasW, canvasH]);

  // Legacy no-op kept for backward compatibility (was used as JSX onWheel).
  const handleWheel = useCallback((_e: React.WheelEvent) => {
    /* handled by native listener above */
  }, []);

  const startPan = useCallback((clientX: number, clientY: number) => {
    isPanning.current = true;
    panStart.current = { x: clientX, y: clientY };
  }, []);

  const movePan = useCallback((clientX: number, clientY: number, scaleX: number, scaleY: number) => {
    if (!isPanning.current) return false;
    const dx = (clientX - panStart.current.x) * scaleX / viewport.zoom;
    const dy = (clientY - panStart.current.y) * scaleY / viewport.zoom;
    setViewport(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }));
    panStart.current = { x: clientX, y: clientY };
    return true;
  }, [viewport.zoom]);

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  const resetView = useCallback(() => {
    setViewport({ zoom: 1, panX: 0, panY: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setViewport(prev => ({ ...prev, zoom: Math.min(MAX_ZOOM, prev.zoom * 1.3) }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport(prev => ({ ...prev, zoom: Math.max(MIN_ZOOM, prev.zoom / 1.3) }));
  }, []);

  const setSpaceDown = useCallback((down: boolean) => {
    spaceDown.current = down;
  }, []);

  return {
    viewport,
    viewBox,
    isPanning: () => isPanning.current,
    isSpaceDown: () => spaceDown.current,
    handleWheel,
    startPan,
    movePan,
    endPan,
    resetView,
    zoomIn,
    zoomOut,
    setSpaceDown,
  };
}
