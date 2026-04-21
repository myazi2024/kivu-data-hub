import { useState, useEffect, useRef } from 'react';

export interface BBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export function flatCoords(geometry: any): [number, number][] {
  const coords: [number, number][] = [];
  const extract = (arr: any) => {
    if (typeof arr[0] === 'number') { coords.push(arr as [number, number]); return; }
    arr.forEach(extract);
  };
  extract(geometry.coordinates);
  return coords;
}

export function projectFeature(
  geometry: any,
  bbox: BBox,
  width: number,
  height: number,
  padding: number,
): string {
  const lngRange = bbox.maxLng - bbox.minLng || 0.01;
  const latRange = bbox.maxLat - bbox.minLat || 0.01;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;
  const scale = Math.min(drawW / lngRange, drawH / latRange);
  const offsetX = padding + (drawW - lngRange * scale) / 2;
  const offsetY = padding + (drawH - latRange * scale) / 2;

  const project = (lng: number, lat: number): [number, number] => [
    offsetX + (lng - bbox.minLng) * scale,
    offsetY + (bbox.maxLat - lat) * scale,
  ];

  const paths: string[] = [];
  const renderRing = (ring: any[]) => {
    if (ring.length === 0) return '';
    const pts = ring.map((c: number[]) => project(c[0], c[1]));
    return 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L') + 'Z';
  };

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach((ring: any[]) => { paths.push(renderRing(ring)); });
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach((poly: any[][]) => {
      poly.forEach((ring: any[]) => { paths.push(renderRing(ring)); });
    });
  }
  return paths.join(' ');
}

export function centroid(geometry: any, bbox: BBox, w: number, h: number, padding: number): [number, number] {
  const coords = flatCoords(geometry);
  if (coords.length === 0) return [w / 2, h / 2];
  const avgLng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
  const avgLat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
  const lngRange = bbox.maxLng - bbox.minLng || 0.01;
  const latRange = bbox.maxLat - bbox.minLat || 0.01;
  const drawW = w - padding * 2;
  const drawH = h - padding * 2;
  const scale = Math.min(drawW / lngRange, drawH / latRange);
  const offsetX = padding + (drawW - lngRange * scale) / 2;
  const offsetY = padding + (drawH - latRange * scale) / 2;
  return [
    offsetX + (avgLng - bbox.minLng) * scale,
    offsetY + (bbox.maxLat - avgLat) * scale,
  ];
}

export function bboxEqual(a: BBox, b: BBox): boolean {
  return a.minLng === b.minLng && a.maxLng === b.maxLng && a.minLat === b.minLat && a.maxLat === b.maxLat;
}

export function computeBBox(features: { geometry: any }[], selectedName?: string, nameGetter?: (f: any) => string): BBox {
  if (features.length === 0) return { minLng: 0, maxLng: 1, minLat: 0, maxLat: 1 };
  const source = selectedName && nameGetter
    ? features.filter(f => nameGetter(f).toLowerCase() === selectedName.toLowerCase())
    : features;
  const target = source.length > 0 ? source : features;
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  target.forEach(f => {
    flatCoords(f.geometry).forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });
  });
  const padLng = (maxLng - minLng) * 0.1;
  const padLat = (maxLat - minLat) * 0.1;
  return { minLng: minLng - padLng, maxLng: maxLng + padLng, minLat: minLat - padLat, maxLat: maxLat + padLat };
}

const ANIM_DURATION = 400;

export function useAnimatedBbox(targetBbox: BBox): BBox {
  const [animBbox, setAnimBbox] = useState<BBox>(targetBbox);
  const animRef = useRef<{ start: number; from: BBox; to: BBox }>({ start: 0, from: targetBbox, to: targetBbox });
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setAnimBbox(targetBbox);
      animRef.current = { start: 0, from: targetBbox, to: targetBbox };
      return;
    }
    if (bboxEqual(targetBbox, animRef.current.to)) return;

    const from = animBbox;
    animRef.current = { start: performance.now(), from, to: targetBbox };

    let rafId: number;
    const tick = (now: number) => {
      const t = Math.min((now - animRef.current.start) / ANIM_DURATION, 1);
      const ease = t * (2 - t); // easeOutQuad
      const lerp = (a: number, b: number) => a + (b - a) * ease;
      const next: BBox = {
        minLng: lerp(animRef.current.from.minLng, animRef.current.to.minLng),
        maxLng: lerp(animRef.current.from.maxLng, animRef.current.to.maxLng),
        minLat: lerp(animRef.current.from.minLat, animRef.current.to.minLat),
        maxLat: lerp(animRef.current.from.maxLat, animRef.current.to.maxLat),
      };
      setAnimBbox(next);
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBbox]);

  return animBbox;
}

// Module-level cache for GeoJSON data
const geoJsonCache = new Map<string, any>();

export function useGeoJsonData<T = any>(url: string): T[] {
  const [data, setData] = useState<T[]>(() => {
    const cached = geoJsonCache.get(url);
    return cached ? cached.features || [] : [];
  });

  useEffect(() => {
    if (geoJsonCache.has(url)) {
      setData(geoJsonCache.get(url).features || []);
      return;
    }
    fetch(url)
      .then(r => r.json())
      .then(json => {
        geoJsonCache.set(url, json);
        setData(json.features || []);
      })
      .catch(() => {});
  }, [url]);

  return data;
}
