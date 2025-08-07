import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { MapPin, Search, BarChart3, Home, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  id: string;
  title: string;
  description?: string;
  property_type: string;
  price: number;
  currency: string;
  area_sqm: number;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  bedrooms?: number;
  bathrooms?: number;
  features?: string[];
}

const InteractiveMap = () => {
  const mapRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    propertyType: 'all',
    priceRange: [0, 1000000],
    bedrooms: 'all'
  });
  const { toast } = useToast();

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('is_available', true);

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des propriétés:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les propriétés",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Filter properties based on current filters
  useEffect(() => {
    let filtered = [...properties];

    // Filter by property type
    if (filters.propertyType !== 'all') {
      filtered = filtered.filter(p => p.property_type === filters.propertyType);
    }

    // Filter by price range
    filtered = filtered.filter(p => 
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Filter by bedrooms
    if (filters.bedrooms !== 'all') {
      const bedroomCount = parseInt(filters.bedrooms);
      filtered = filtered.filter(p => p.bedrooms === bedroomCount);
    }

    setFilteredProperties(filtered);
  }, [properties, filters]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'CDF' ? 'USD' : currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPropertyTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'residential': 'Résidentiel',
      'commercial': 'Commercial',
      'industrial': 'Industriel',
      'land': 'Terrain'
    };
    return labels[type] || type;
  };

  const calculateStats = () => {
    if (properties.length === 0) return { count: 0, avgPrice: 0, avgArea: 0 };
    
    const avgPrice = properties.reduce((sum, p) => sum + p.price, 0) / properties.length;
    const avgArea = properties.reduce((sum, p) => sum + p.area_sqm, 0) / properties.length;
    
    return {
      count: properties.length,
      avgPrice: Math.round(avgPrice),
      avgArea: Math.round(avgArea)
    };
  };

  const stats = calculateStats();

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
                <Filter className="w-4 h-4" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block">Type de propriété</label>
                <Select 
                  value={filters.propertyType} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, propertyType: value }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="residential">Résidentiel</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industriel</SelectItem>
                    <SelectItem value="land">Terrain</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium mb-2 block">
                  Prix ({formatPrice(filters.priceRange[0], 'USD')} - {formatPrice(filters.priceRange[1], 'USD')})
                </label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
                  max={1000000}
                  min={0}
                  step={10000}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block">Nombre de chambres</label>
                <Select 
                  value={filters.bedrooms} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, bedrooms: value }))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="1">1 chambre</SelectItem>
                    <SelectItem value="2">2 chambres</SelectItem>
                    <SelectItem value="3">3 chambres</SelectItem>
                    <SelectItem value="4">4+ chambres</SelectItem>
                  </SelectContent>
                </Select>
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
                  <span className="font-semibold">{loading ? '...' : stats.count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prix moyen:</span>
                  <span className="font-semibold">{loading ? '...' : formatPrice(stats.avgPrice, 'USD')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Surface moyenne:</span>
                  <span className="font-semibold">{loading ? '...' : `${stats.avgArea}m²`}</span>
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
              
              {!loading && filteredProperties.map((property) => (
                <Marker
                  key={property.id}
                  position={[property.latitude, property.longitude]}
                  icon={DefaultIcon}
                >
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <h3 className="font-semibold text-sm mb-2">{property.title}</h3>
                       <p className="text-xs text-muted-foreground mb-1">Type: {getPropertyTypeLabel(property.property_type)}</p>
                       <p className="text-xs text-muted-foreground mb-1">Surface: {property.area_sqm}m²</p>
                       {property.bedrooms && (
                         <p className="text-xs text-muted-foreground mb-1">Chambres: {property.bedrooms}</p>
                       )}
                       <p className="text-xs text-muted-foreground mb-2">Adresse: {property.address}</p>
                      <p className="text-xs font-semibold text-primary">{formatPrice(property.price, property.currency)}</p>
                      {property.features && property.features.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground/80">Équipements:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {property.features.slice(0, 3).map((feature, index) => (
                              <span key={index} className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
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