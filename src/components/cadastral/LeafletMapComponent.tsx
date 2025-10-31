import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Popup } from 'react-leaflet';
import { Home, FileText, Ruler, MapPin } from 'lucide-react';
import type { CadastralParcelData } from '@/hooks/useCadastralParcels';

interface LeafletMapComponentProps {
  parcels: CadastralParcelData[];
}

const getPolygonColor = (parcel: CadastralParcelData) => {
  const area = parcel.area_sqm;
  if (area < 500) return '#22c55e'; // Vert - Petite parcelle
  if (area < 2000) return '#3b82f6'; // Bleu - Moyenne parcelle
  if (area < 5000) return '#f59e0b'; // Orange - Grande parcelle
  return '#ef4444'; // Rouge - Très grande parcelle
};

const calculateMapCenter = (parcels: CadastralParcelData[]): { center: [number, number]; zoom: number } => {
  if (parcels.length === 0) {
    return { center: [-1.6746, 29.2342], zoom: 12 }; // Goma par défaut
  }
  
  const allCoords = parcels.flatMap(p => 
    p.gps_coordinates.map(c => [c.lat, c.lng] as [number, number])
  );
  
  if (allCoords.length === 0) {
    return { center: [-1.6746, 29.2342], zoom: 12 };
  }
  
  // Calculer le centre moyen
  const avgLat = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
  const avgLng = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
  
  return { center: [avgLat, avgLng], zoom: 13 };
};

const LeafletMapComponent: React.FC<LeafletMapComponentProps> = ({ parcels }) => {
  const mapConfig = useMemo(() => calculateMapCenter(parcels), [parcels]);

  return (
    <MapContainer
      key={`map-${parcels.length}`}
      center={mapConfig.center}
      zoom={mapConfig.zoom}
      scrollWheelZoom={true}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {parcels.map((parcel) => {
        const coords = parcel.gps_coordinates.map(c => [c.lat, c.lng] as [number, number]);
        const color = getPolygonColor(parcel);

        return (
          <Polygon
            key={parcel.id}
            positions={coords}
            pathOptions={{
              color: color,
              fillColor: color,
              fillOpacity: 0.4,
              weight: 2,
            }}
          >
            <Popup>
              <div className="min-w-[200px] space-y-2">
                <div className="font-semibold text-sm border-b pb-1">
                  {parcel.parcel_number}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-start gap-2">
                    <Home className="h-3 w-3 mt-0.5 text-muted-foreground" />
                    <span>{parcel.current_owner_name}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="h-3 w-3 mt-0.5 text-muted-foreground" />
                    <span>{parcel.property_title_type}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Ruler className="h-3 w-3 mt-0.5 text-muted-foreground" />
                    <span>
                      {parcel.area_sqm.toLocaleString('fr-FR')} m²
                      {parcel.area_hectares && ` (${parcel.area_hectares.toFixed(2)} ha)`}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {[parcel.quartier, parcel.commune, parcel.ville].filter(Boolean).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </MapContainer>
  );
};

export default LeafletMapComponent;
