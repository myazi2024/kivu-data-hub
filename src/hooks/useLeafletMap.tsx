import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapProvider } from '@/hooks/useMapProvider';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ParcelData, SubdivisionLot } from '@/hooks/useCadastralMapData';

// Use bundled Leaflet marker assets (no external CDN)
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

interface UseLeafletMapOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  ready: boolean;
  onParcelClick?: (parcel: ParcelData) => void;
}

interface RenderOptions {
  parcels: ParcelData[];
  subdivisionLots: SubdivisionLot[];
}

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Encapsulates Leaflet map initialization, tile-provider wiring, and
 * incremental rendering of parcels/subdivision lots.
 *
 * Diffing strategy: we keep a Map<parcelId, layerGroup>. On render, layers
 * for removed parcels are torn down, layers for new parcels added — the
 * majority of layers are reused untouched.
 */
export const useLeafletMap = ({ containerRef, ready, onParcelClick }: UseLeafletMapOptions) => {
  const isMobile = useIsMobile();
  const { provider, getTileUrl, getTileLayerOptions } = useMapProvider();
  const mapRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const parcelLayersRef = useRef<Map<string, any>>(new Map());
  const lotLayersRef = useRef<Map<string, any>>(new Map());
  const userLocationLayerRef = useRef<any>(null);
  const clusterRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const onParcelClickRef = useRef(onParcelClick);
  onParcelClickRef.current = onParcelClick;
  const [mapReady, setMapReady] = useState(false);

  // Init map once container is ready
  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;

    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      await import('leaflet.markercluster');
      // Marker cluster CSS
      await import('leaflet.markercluster/dist/MarkerCluster.css' as any).catch(() => {});
      await import('leaflet.markercluster/dist/MarkerCluster.Default.css' as any).catch(() => {});
      if (cancelled || !containerRef.current) return;

      LRef.current = L;
      // Bundle-served marker icons (no CDN dependency)
      delete (L as any).Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
      });

      const map = L.map(containerRef.current, {
        zoomControl: false,
        scrollWheelZoom: !isMobile,
        doubleClickZoom: !isMobile,
        dragging: true,
      }).setView([-1.6794, 29.2273], 13);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 100);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        setMapReady(false);
        parcelLayersRef.current.clear();
        lotLayersRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Apply provider tiles (re-applied if provider changes)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const url = getTileUrl();
    const opts = getTileLayerOptions();
    tileLayerRef.current = L.tileLayer(url, opts).addTo(map);
  }, [mapReady, provider.id, getTileUrl, getTileLayerOptions]);

  /** On-demand geolocation. Caller wires this to a button (no auto-prompt). */
  const requestUserLocation = useCallback(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!('geolocation' in navigator)) {
      toast.error('Géolocalisation non disponible sur ce navigateur.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (userLocationLayerRef.current) {
          map.removeLayer(userLocationLayerRef.current);
        }
        const group = L.layerGroup();
        L.circleMarker([latitude, longitude], {
          radius: 10,
          fillColor: '#3b82f6',
          color: '#1d4ed8',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8,
        }).addTo(group);
        if (accuracy) {
          L.circle([latitude, longitude], {
            radius: accuracy,
            fillColor: '#3b82f6',
            color: '#3b82f6',
            weight: 1,
            opacity: 0.2,
            fillOpacity: 0.07,
          }).addTo(group);
        }
        group.addTo(map);
        userLocationLayerRef.current = group;
        map.setView([latitude, longitude], 18);
      },
      (err) => {
        toast.error(err.message || 'Impossible d\'obtenir votre position');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  /** Center the map on a specific parcel. */
  const centerOnParcel = useCallback((parcel: ParcelData, zoom = 19) => {
    if (!mapRef.current || !parcel.latitude || !parcel.longitude) return;
    mapRef.current.setView([parcel.latitude, parcel.longitude], zoom);
  }, []);

  /**
   * Incrementally render parcels and subdivision lots.
   * Layers for unchanged parcels are kept; only diffs are applied.
   * For >300 single-point markers, we cluster.
   */
  const renderLayers = useCallback(({ parcels, subdivisionLots }: RenderOptions) => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    const nextParcelIds = new Set(parcels.map(p => p.id));
    // Remove parcels no longer present
    for (const [id, layer] of parcelLayersRef.current) {
      if (!nextParcelIds.has(id)) {
        map.removeLayer(layer);
        parcelLayersRef.current.delete(id);
      }
    }

    // Cluster group for plain markers (no polygon)
    if (!clusterRef.current && (L as any).markerClusterGroup) {
      clusterRef.current = (L as any).markerClusterGroup({ chunkedLoading: true, maxClusterRadius: 50 });
      map.addLayer(clusterRef.current);
    }
    if (clusterRef.current) clusterRef.current.clearLayers();

    const bounds = L.latLngBounds([]);
    let polygonCount = 0;

    parcels.forEach((parcel) => {
      if (parcelLayersRef.current.has(parcel.id)) {
        const existing = parcelLayersRef.current.get(parcel.id);
        try { bounds.extend(existing.getBounds?.() || existing.getLatLng?.()); } catch { /* noop */ }
        return;
      }

      const group = L.layerGroup();
      const isSubdivided = parcel.is_subdivided === true;
      const hasDispute = parcel.has_dispute === true;

      if (Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length >= 3) {
        polygonCount += 1;
        const points: [number, number][] = parcel.gps_coordinates.map((c: any) => [c.lat, c.lng]);

        let color = '#ef4444', weight = 2, fillOpacity = 0.2;
        let dashArray: string | undefined;
        if (isSubdivided) { color = '#6b7280'; weight = 1.5; fillOpacity = 0.05; dashArray = '6 4'; }
        else if (hasDispute) { color = '#f97316'; weight = 2.5; fillOpacity = 0.15; dashArray = '8 4'; }

        const polygon = L.polygon(points, { color, weight, fillColor: color, fillOpacity, dashArray });
        polygon.on('click', () => onParcelClickRef.current?.(parcel));
        polygon.addTo(group);

        if (isSubdivided || hasDispute) {
          const cLat = points.reduce((s, p) => s + p[0], 0) / points.length;
          const cLng = points.reduce((s, p) => s + p[1], 0) / points.length;
          if (isSubdivided) {
            L.marker([cLat, cLng], {
              icon: L.divIcon({
                className: 'subdivided-label',
                html: '<div style="background:hsl(var(--muted));color:hsl(var(--muted-foreground));padding:1px 6px;border-radius:4px;border:1px solid hsl(var(--border));font-size:9px;font-weight:600;white-space:nowrap;opacity:.85">Lotie</div>',
                iconSize: [36, 16], iconAnchor: [18, 8],
              }),
            }).addTo(group);
          }
          if (hasDispute) {
            L.marker([cLat, cLng], {
              icon: L.divIcon({
                className: 'dispute-label',
                html: '<div style="background:#fff7ed;color:#c2410c;padding:1px 6px;border-radius:4px;border:1px solid #f97316;font-size:9px;font-weight:600;white-space:nowrap;opacity:.9">⚠ Litige</div>',
                iconSize: [50, 16], iconAnchor: [25, isSubdivided ? -4 : 8],
              }),
            }).addTo(group);
          }
        }

        // Side dimensions: only for the small-result mode (avoid 3000+ markers)
        if (parcels.length <= 50) {
          const parcelSides = Array.isArray(parcel.parcel_sides) ? parcel.parcel_sides : null;
          parcel.gps_coordinates.forEach((coord: any, index: number) => {
            const next = parcel.gps_coordinates[(index + 1) % parcel.gps_coordinates.length];
            let distance: number;
            if (parcelSides && parcelSides[index]?.length) {
              distance = parseFloat(parcelSides[index].length);
            } else {
              distance = calculateDistance(coord.lat, coord.lng, next.lat, next.lng);
            }
            const midLat = (coord.lat + next.lat) / 2;
            const midLng = (coord.lng + next.lng) / 2;
            L.marker([midLat, midLng], {
              icon: L.divIcon({
                className: 'dimension-label',
                html: `<div style="background:white;padding:2px 6px;border-radius:4px;border:1px solid #ef4444;font-size:11px;font-weight:600;color:#ef4444;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,.2)">${distance.toFixed(1)} m</div>`,
                iconSize: [60, 20], iconAnchor: [30, 10],
              }),
            }).addTo(group);
          });
        }

        bounds.extend(polygon.getBounds());
        group.addTo(map);
      } else if (parcel.latitude && parcel.longitude) {
        const marker = L.marker([parcel.latitude, parcel.longitude]);
        marker.on('click', () => onParcelClickRef.current?.(parcel));
        if (clusterRef.current) clusterRef.current.addLayer(marker);
        else marker.addTo(group).addTo(map);
        bounds.extend([parcel.latitude, parcel.longitude]);
      }

      parcelLayersRef.current.set(parcel.id, group);
    });

    // Subdivision lots: similar diff
    const nextLotIds = new Set(subdivisionLots.map(l => l.id));
    for (const [id, layer] of lotLayersRef.current) {
      if (!nextLotIds.has(id)) {
        map.removeLayer(layer);
        lotLayersRef.current.delete(id);
      }
    }
    subdivisionLots.forEach((lot) => {
      if (lotLayersRef.current.has(lot.id)) return;
      if (!Array.isArray(lot.gps_coordinates) || lot.gps_coordinates.length < 3) return;
      const points: [number, number][] = lot.gps_coordinates.map((c: any) => [c.lat, c.lng]);
      const lotColor = lot.color || '#22c55e';
      const group = L.layerGroup();
      const polygon = L.polygon(points, {
        color: lotColor, weight: 2, fillColor: lotColor, fillOpacity: 0.3, dashArray: '4 4',
      }).addTo(group);
      polygon.bindPopup(
        `<div style="font-size:12px;min-width:120px"><strong>Lot ${lot.lot_number}</strong><br/>` +
        `<span style="color:#666">Parcelle: ${lot.parcel_number}</span><br/>` +
        `<span>Surface: ${lot.area_sqm?.toLocaleString()} m²</span><br/>` +
        `<span>Usage: ${lot.intended_use || 'Habitation'}</span>` +
        (lot.owner_name ? `<br/><span>Propriétaire: ${lot.owner_name}</span>` : '') +
        '</div>'
      );
      const cLat = points.reduce((s, p) => s + p[0], 0) / points.length;
      const cLng = points.reduce((s, p) => s + p[1], 0) / points.length;
      L.marker([cLat, cLng], {
        icon: L.divIcon({
          className: 'lot-label',
          html: `<div style="background:${lotColor};color:white;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;white-space:nowrap;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.3)">Lot ${lot.lot_number}</div>`,
          iconSize: [50, 18], iconAnchor: [25, 9],
        }),
      }).addTo(group);
      group.addTo(map);
      lotLayersRef.current.set(lot.id, group);
      bounds.extend(polygon.getBounds());
    });

    if (bounds.isValid() && polygonCount > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, []);

  return { mapReady, renderLayers, requestUserLocation, centerOnParcel };
};
