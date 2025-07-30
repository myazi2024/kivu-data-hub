import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Search, BarChart3, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Fix for default markers in React Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = new Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Property {
  id: number;
  coordinates: [number, number];
  type: string;
  price: string;
  area: string;
  title: string;
}

const InteractiveMap = () => {
  const mapRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const sampleProperties: Property[] = [
    {
      id: 1,
      coordinates: [29.2348, -1.6792],
      type: 'Résidentiel',
      price: '$250,000',
      area: '150m²',
      title: 'Villa Moderne - Centre Goma'
    },
    {
      id: 2,
      coordinates: [29.2400, -1.6850],
      type: 'Commercial',
      price: '$500,000',
      area: '300m²',
      title: 'Bureau Commercial - Quartier Industriel'
    },
    {
      id: 3,
      coordinates: [29.2280, -1.6720],
      type: 'Résidentiel',
      price: '$180,000',
      area: '120m²',
      title: 'Maison Familiale - Quartier Résidentiel'
    }
  ];

  const handleSearch = () => {
    if (!searchQuery) return;
    
    toast({
      title: "Recherche",
      description: `Recherche pour: ${searchQuery}`,
    });
  };

  const flyToGoma = () => {
    if (mapRef.current) {
      mapRef.current.setView(new LatLng(-1.6792, 29.2348), 12);
    }
  };

  const flyToKinshasa = () => {
    if (mapRef.current) {
      mapRef.current.setView(new LatLng(-4.4419, 15.2663), 10);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Search className="w-4 h-4" />
                Recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher une adresse..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button size="sm" onClick={handleSearch}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" />
                Navigation Rapide
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" onClick={flyToGoma} className="w-full justify-start">
                <Home className="w-4 h-4 mr-2" />
                Goma
              </Button>
              <Button variant="outline" size="sm" onClick={flyToKinshasa} className="w-full justify-start">
                <Home className="w-4 h-4 mr-2" />
                Kinshasa
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4" />
                Statistiques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs">
                <div className="flex justify-between">
                  <span>Propriétés visualisées:</span>
                  <span className="font-semibold">{sampleProperties.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prix moyen:</span>
                  <span className="font-semibold">$310,000</span>
                </div>
                <div className="flex justify-between">
                  <span>Surface moyenne:</span>
                  <span className="font-semibold">190m²</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Map Container */}
        <div className="lg:col-span-3">
          <div className="w-full h-[600px] rounded-lg border border-border overflow-hidden">
            <MapContainer
              center={[-1.6792, 29.2348]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {sampleProperties.map((property) => (
                <Marker
                  key={property.id}
                  position={[property.coordinates[1], property.coordinates[0]]}
                  icon={DefaultIcon}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-semibold text-sm mb-2">{property.title}</h3>
                      <p className="text-xs text-gray-600 mb-1">Type: {property.type}</p>
                      <p className="text-xs text-gray-600 mb-1">Surface: {property.area}</p>
                      <p className="text-xs font-semibold text-primary">{property.price}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveMap;