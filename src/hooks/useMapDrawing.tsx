import { useState, useCallback } from 'react';

export type DrawingMode = 'none' | 'polygon' | 'rectangle' | 'circle';

interface DrawingCoordinate {
  lat: number;
  lng: number;
}

export const useMapDrawing = () => {
  const [mode, setMode] = useState<DrawingMode>('none');
  const [coordinates, setCoordinates] = useState<DrawingCoordinate[]>([]);
  const [circleCenter, setCircleCenter] = useState<DrawingCoordinate | null>(null);
  const [circleRadius, setCircleRadius] = useState<number>(0);

  const startDrawing = (newMode: DrawingMode) => {
    setMode(newMode);
    setCoordinates([]);
    setCircleCenter(null);
    setCircleRadius(0);
  };

  const addPoint = useCallback((lat: number, lng: number) => {
    if (mode === 'none') return;

    if (mode === 'polygon') {
      setCoordinates(prev => [...prev, { lat, lng }]);
    } else if (mode === 'rectangle') {
      if (coordinates.length === 0) {
        setCoordinates([{ lat, lng }]);
      } else if (coordinates.length === 1) {
        const [first] = coordinates;
        setCoordinates([
          first,
          { lat: first.lat, lng },
          { lat, lng },
          { lat, lng: first.lng }
        ]);
      }
    } else if (mode === 'circle') {
      if (!circleCenter) {
        setCircleCenter({ lat, lng });
      } else {
        const R = 6371e3;
        const φ1 = (circleCenter.lat * Math.PI) / 180;
        const φ2 = (lat * Math.PI) / 180;
        const Δφ = ((lat - circleCenter.lat) * Math.PI) / 180;
        const Δλ = ((lng - circleCenter.lng) * Math.PI) / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        setCircleRadius(distance);
        
        // Générer les points du cercle
        const points: DrawingCoordinate[] = [];
        for (let i = 0; i <= 32; i++) {
          const angle = (i / 32) * 2 * Math.PI;
          const latOffset = (distance / R) * Math.cos(angle) * (180 / Math.PI);
          const lngOffset = (distance / (R * Math.cos(circleCenter.lat * Math.PI / 180))) * Math.sin(angle) * (180 / Math.PI);
          
          points.push({
            lat: circleCenter.lat + latOffset,
            lng: circleCenter.lng + lngOffset
          });
        }
        setCoordinates(points);
      }
    }
  }, [mode, coordinates, circleCenter]);

  const finishDrawing = () => {
    setMode('none');
    return coordinates;
  };

  const clearDrawing = () => {
    setMode('none');
    setCoordinates([]);
    setCircleCenter(null);
    setCircleRadius(0);
  };

  return {
    mode,
    coordinates,
    circleCenter,
    circleRadius,
    startDrawing,
    addPoint,
    finishDrawing,
    clearDrawing
  };
};
