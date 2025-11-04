import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Layers, Filter } from 'lucide-react';
import { useCadastralParcels } from '@/hooks/useCadastralParcels';
import { Skeleton } from '@/components/ui/skeleton';
import L from 'leaflet';

// Fix Leaflet icons
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

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      dragging: true
    }).setView([-4.0383, 21.7587], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update parcels
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polygon) {
        map.removeLayer(layer);
      }
    });

    if (!filteredParcels.length) return;

    const bounds: [number, number][] = [];

    filteredParcels.forEach(parcel => {
      if (!parcel.gps_coordinates || parcel.gps_coordinates.length < 3) return;

      const coords: [number, number][] = parcel.gps_coordinates.map((c: any) => [c.lat, c.lng]);
      bounds.push(...coords);

      const polygon = L.polygon(coords, {
        color: '#dc2626',
        fillColor: '#ef4444',
        fillOpacity: 0.3,
        weight: 2
      }).addTo(map);

      polygon.bindPopup(`<strong>${parcel.parcel_number}</strong>`);
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [filteredParcels]);

  if (isLoading) {
    return <div className="p-4"><Skeleton className="h-[600px] w-full" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
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
        <div ref={mapRef} className="w-full h-[600px] rounded-lg border" />
      </div>
    </div>
  );
};

export default CollaborativeCadastralMap;
