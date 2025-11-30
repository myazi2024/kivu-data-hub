import { useState, useCallback } from 'react';

export type MeasurementMode = 'none' | 'distance' | 'area' | 'perimeter';

interface MeasurementPoint {
  lat: number;
  lng: number;
}

export const useMapMeasurement = () => {
  const [mode, setMode] = useState<MeasurementMode>('none');
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [result, setResult] = useState<number>(0);

  const startMeasurement = (newMode: MeasurementMode) => {
    setMode(newMode);
    setPoints([]);
    setResult(0);
  };

  const addPoint = useCallback((lat: number, lng: number) => {
    if (mode === 'none') return;

    const newPoints = [...points, { lat, lng }];
    setPoints(newPoints);

    if (mode === 'distance' && newPoints.length === 2) {
      setResult(calculateDistance(newPoints[0], newPoints[1]));
    } else if ((mode === 'area' || mode === 'perimeter') && newPoints.length >= 3) {
      if (mode === 'area') {
        setResult(calculateArea(newPoints));
      } else {
        setResult(calculatePerimeter(newPoints));
      }
    }
  }, [mode, points]);

  const clearMeasurement = () => {
    setMode('none');
    setPoints([]);
    setResult(0);
  };

  return {
    mode,
    points,
    result,
    startMeasurement,
    addPoint,
    clearMeasurement
  };
};

// Calculer la distance entre deux points
const calculateDistance = (p1: MeasurementPoint, p2: MeasurementPoint): number => {
  const R = 6371e3; // Rayon de la Terre en mètres
  const φ1 = (p1.lat * Math.PI) / 180;
  const φ2 = (p2.lat * Math.PI) / 180;
  const Δφ = ((p2.lat - p1.lat) * Math.PI) / 180;
  const Δλ = ((p2.lng - p1.lng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Calculer le périmètre d'un polygone
const calculatePerimeter = (points: MeasurementPoint[]): number => {
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    perimeter += calculateDistance(points[i], points[j]);
  }
  return perimeter;
};

// Calculer la surface d'un polygone
const calculateArea = (points: MeasurementPoint[]): number => {
  if (points.length < 3) return 0;

  const avgLat = points.reduce((sum, p) => sum + p.lat, 0) / points.length;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(avgLat * Math.PI / 180);

  const cartesian = points.map(p => ({
    x: p.lng * metersPerDegreeLng,
    y: p.lat * metersPerDegreeLat
  }));

  let area = 0;
  for (let i = 0; i < cartesian.length; i++) {
    const j = (i + 1) % cartesian.length;
    area += cartesian[i].x * cartesian[j].y;
    area -= cartesian[j].x * cartesian[i].y;
  }

  return Math.abs(area / 2);
};
