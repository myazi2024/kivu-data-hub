import { useState, useCallback, useRef } from 'react';
import { Point2D } from '../types';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export function useCanvasViewport(canvasW: number, canvasH: number) {
  const [viewport, setViewport] = useState<ViewportState>({ zoom: 1, panX: 0, panY: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const spaceDown = useRef(false);

  const viewBox = `${-viewport.panX} ${-viewport.panY} ${canvasW / viewport.zoom} ${canvasH / viewport.zoom}`;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewport(prev => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom * delta));
      return { ...prev, zoom: newZoom };
    });
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
