import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Layers, Filter } from 'lucide-react';
import { useCadastralParcels } from '@/hooks/useCadastralParcels';
import { Skeleton } from '@/components/ui/skeleton';

const CollaborativeCadastralMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
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

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = await import('leaflet');
      delete (L as any).Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      const map = L.map(mapRef.current).setView([-4.0383, 21.7587], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);
      mapInstanceRef.current = map;
      setTimeout(() => map.invalidateSize(), 100);
    };
    initMap();
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }};
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !filteredParcels) return;
    const updateMap = async () => {
      const L = await import('leaflet');
      const map = mapInstanceRef.current;
      map.eachLayer((l: any) => { if (l instanceof L.Polygon) map.removeLayer(l); });
      const bounds: any[] = [];
      filteredParcels.forEach(p => {
        if (!p.gps_coordinates || p.gps_coordinates.length < 3) return;
        const coords = p.gps_coordinates.map((c: any) => [c.lat, c.lng]);
        bounds.push(...coords);
        const poly = L.polygon(coords, { color: '#dc2626', fillOpacity: 0.2 }).addTo(map);
        poly.bindPopup(`<b>${p.parcel_number}</b><br>Superficie: ${p.area_sqm ? p.area_sqm.toLocaleString() + ' m²' : 'N/A'}`);
      });
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
    };
    updateMap();
  }, [filteredParcels]);

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Skeleton className="h-full w-full" /></div>;

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 bg-background border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Cadastre Collaboratif</h1>
              <p className="text-sm text-muted-foreground">{filteredParcels?.length || 0} parcelles</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-2"><Layers className="h-3 w-3" />Données publiques</Badge>
        </div>
        <div className="flex gap-3">
          <Filter className="h-4 w-4 mt-2" />
          <Select value={selectedProvince} onValueChange={setSelectedProvince}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes provinces</SelectItem>
              {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedVille} onValueChange={setSelectedVille}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes villes</SelectItem>
              {villes.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div ref={mapRef} className="flex-1" />
    </div>
  );
};

export default CollaborativeCadastralMap;
