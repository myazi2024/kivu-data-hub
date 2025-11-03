import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Layers, Filter } from 'lucide-react';
import { useCadastralParcels } from '@/hooks/useCadastralParcels';
import { Skeleton } from '@/components/ui/skeleton';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CollaborativeCadastralMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const { data: parcels, isLoading } = useCadastralParcels();
  
  const [selectedProvince, setSelectedProvince] = useState<string>('all');
  const [selectedVille, setSelectedVille] = useState<string>('all');

  const provinces = useMemo(() => {
    if (!parcels) return [];
    return Array.from(new Set(parcels.map(p => p.province).filter(Boolean))) as string[];
  }, [parcels]);

  const villes = useMemo(() => {
    if (!parcels) return [];
    const filtered = selectedProvince === 'all' ? parcels : parcels.filter(p => p.province === selectedProvince);
    return Array.from(new Set(filtered.map(p => p.ville).filter(Boolean))) as string[];
  }, [parcels, selectedProvince]);

  const filteredParcels = useMemo(() => {
    if (!parcels) return [];
    let filtered = parcels;
    if (selectedProvince !== 'all') filtered = filtered.filter(p => p.province === selectedProvince);
    if (selectedVille !== 'all') filtered = filtered.filter(p => p.ville === selectedVille);
    return filtered;
  }, [parcels, selectedProvince, selectedVille]);

  // Initialize map - simplified
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    setTimeout(() => {
      if (!mapRef.current) return;
      
      const map = L.map(mapRef.current).setView([-4.0383, 21.7587], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);
      mapInstanceRef.current = map;
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update parcels on map
  useEffect(() => {
    if (!mapInstanceRef.current || !filteredParcels.length) return;

    const map = mapInstanceRef.current;
    
    // Clear existing markers and polygons
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon) {
        map.removeLayer(layer);
      }
    });

    const bounds: L.LatLngExpression[] = [];

    filteredParcels.forEach(parcel => {
      if (!parcel.gps_coordinates || parcel.gps_coordinates.length < 3) return;

      const coords: L.LatLngExpression[] = parcel.gps_coordinates.map((c: any) => [c.lat, c.lng]);
      bounds.push(...coords);

      // Calculate side measurements
      const sideMeasurements = parcel.gps_coordinates.map((coord: any, idx: number) => {
        const next = parcel.gps_coordinates[(idx + 1) % parcel.gps_coordinates.length];
        const distance = calculateDistance(coord.lat, coord.lng, next.lat, next.lng);
        return `${coord.borne || `B${idx + 1}`} → ${next.borne || `B${((idx + 1) % parcel.gps_coordinates.length) + 1}`}: ${distance.toFixed(2)}m`;
      }).join('<br>');

      const popupContent = `
        <div style="min-width: 250px; font-family: system-ui;">
          <strong style="font-size: 14px;">${parcel.parcel_number}</strong><br><br>
          <strong>Superficie déclarée:</strong> ${parcel.area_sqm ? parcel.area_sqm.toLocaleString() + ' m²' : 'N/A'}<br>
          <strong>Superficie calculée:</strong> ${parcel.surface_calculee_bornes ? parcel.surface_calculee_bornes.toLocaleString() + ' m²' : 'N/A'}<br>
          <strong>Localisation:</strong> ${[parcel.province, parcel.ville, parcel.commune].filter(Boolean).join(', ')}<br>
          <hr style="margin: 8px 0;">
          <strong>Coordonnées GPS:</strong><br>
          ${parcel.gps_coordinates.map((c: any, i: number) => 
            `${c.borne || `B${i + 1}`}: ${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`
          ).join('<br>')}<br>
          <hr style="margin: 8px 0;">
          <strong>Mesures des côtés:</strong><br>
          ${sideMeasurements}
        </div>
      `;

      const polygon = L.polygon(coords, {
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.3,
        weight: 2
      }).addTo(map);

      polygon.bindPopup(popupContent);

      // Add label at centroid
      const centroid = calculateCentroid(coords as [number, number][]);
      L.marker(centroid, {
        icon: L.divIcon({
          className: 'parcel-label',
          html: `<div style="background: white; padding: 4px 8px; border-radius: 4px; border: 2px solid #dc2626; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); white-space: nowrap;">${parcel.parcel_number}</div>`,
          iconSize: [0, 0]
        })
      }).addTo(map);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    }
  }, [filteredParcels]);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const calculateCentroid = (coords: [number, number][]): [number, number] => {
    let latSum = 0, lngSum = 0;
    coords.forEach(([lat, lng]) => { latSum += lat; lngSum += lng; });
    return [latSum / coords.length, lngSum / coords.length];
  };

  console.log('🗺️ CollaborativeCadastralMap render', { isLoading, parcelsCount: parcels?.length, filteredCount: filteredParcels.length });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Cadastre Collaboratif</h1>
              <p className="text-sm text-muted-foreground">{filteredParcels?.length || 0} parcelles</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-2">
            <Layers className="h-3 w-3" />
            Données publiques
          </Badge>
        </div>
        <div className="flex gap-3 items-center flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedProvince} onValueChange={(v) => { setSelectedProvince(v); setSelectedVille('all'); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes provinces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes provinces</SelectItem>
              {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedVille} onValueChange={setSelectedVille} disabled={selectedProvince === 'all'}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Toutes villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes villes</SelectItem>
              {villes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="p-4">
        <div 
          ref={mapRef} 
          style={{ width: '100%', height: '600px', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
        />
      </div>
    </div>
  );
};

export default CollaborativeCadastralMap;
