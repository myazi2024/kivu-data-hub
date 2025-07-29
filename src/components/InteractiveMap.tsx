import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, BarChart3, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const InteractiveMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const initializeMap = () => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [29.2348, -1.6792], // Goma, RDC
      zoom: 12,
      pitch: 0,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      if (!map.current) return;

      // Add sample property markers
      const sampleProperties = [
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

      // Add markers for each property
      sampleProperties.forEach((property) => {
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundImage = 'url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDlDNSAxNC4yNSAxMiAyMiAxMiAyMkMxMiAyMiAxOSAxNC4yNSAxOSA5QzE5IDUuMTMgMTUuODcgMiAxMiAyWk0xMiAxMS41QzEwLjYyIDExLjUgOS41IDEwLjM4IDkuNSA5QzkuNSA3LjYyIDEwLjYyIDYuNSAxMiA2LjVDMTMuMzggNi41IDE0LjUgNy42MiAxNC41IDlDMTQuNSAxMC4zOCAxMy4zOCAxMS41IDEyIDExLjVaIiBmaWxsPSIjM0Y4M0Y4Ii8+Cjwvc3ZnPgo=)';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.backgroundSize = '100%';
        el.style.cursor = 'pointer';

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-3">
            <h3 class="font-semibold text-sm mb-2">${property.title}</h3>
            <p class="text-xs text-gray-600 mb-1">Type: ${property.type}</p>
            <p class="text-xs text-gray-600 mb-1">Surface: ${property.area}</p>
            <p class="text-xs font-semibold text-primary">${property.price}</p>
          </div>
        `);

        new mapboxgl.Marker(el)
          .setLngLat(property.coordinates as [number, number])
          .setPopup(popup)
          .addTo(map.current!);
      });

      setIsMapInitialized(true);
      toast({
        title: "Carte initialisée",
        description: "La cartographie interactive est prête à utiliser",
      });
    });
  };

  const handleSearch = () => {
    if (!map.current || !searchQuery) return;
    
    // Simple search simulation - you would integrate with actual geocoding API
    toast({
      title: "Recherche",
      description: `Recherche pour: ${searchQuery}`,
    });
  };

  const flyToGoma = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: [29.2348, -1.6792],
      zoom: 12,
      essential: true
    });
  };

  const flyToKinshasa = () => {
    if (!map.current) return;
    map.current.flyTo({
      center: [15.2663, -4.4419],
      zoom: 10,
      essential: true
    });
  };

  return (
    <div className="space-y-6">
      {!isMapInitialized && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Configuration Mapbox
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="mapbox-token">Token Mapbox Public</Label>
              <Input
                id="mapbox-token"
                type="text"
                placeholder="pk.eyJ1IjoibW9udXNlcm5hbWUiLCJhIjoiY2..."
                value={mapboxToken}
                onChange={(e) => setMapboxToken(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Obtenez votre token sur{' '}
                <a 
                  href="https://mapbox.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  mapbox.com
                </a>
              </p>
            </div>
            <Button onClick={initializeMap} disabled={!mapboxToken} className="w-full">
              Initialiser la carte
            </Button>
          </CardContent>
        </Card>
      )}

      {isMapInitialized && (
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
                    <span className="font-semibold">3</span>
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
            <div 
              ref={mapContainer} 
              className="w-full h-[600px] rounded-lg border border-border"
              style={{ minHeight: '600px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;