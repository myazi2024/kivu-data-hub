import React from 'react';
import { X, MapPin, Ruler, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

interface Coordinate {
  lat: number;
  lng: number;
  borne?: string;
}

interface ParcelData {
  id: string;
  parcel_number: string;
  gps_coordinates: Coordinate[] | any;
  current_owner_name?: string;
  area_sqm: number;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
  parcel_type?: string;
  property_title_type?: string;
}

interface ParcelInfoPanelProps {
  parcel: ParcelData;
  onClose: () => void;
}

// Fonction pour calculer la distance entre deux points GPS (formule de Haversine)
const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
  const R = 6371000; // Rayon de la Terre en mètres
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Fonction pour calculer les longueurs de chaque côté
const calculateSideLengths = (coordinates: Coordinate[]): { side: string; length: number }[] => {
  if (!coordinates || coordinates.length < 3) return [];

  const sides: { side: string; length: number }[] = [];

  for (let i = 0; i < coordinates.length; i++) {
    const nextIndex = (i + 1) % coordinates.length;
    const length = calculateDistance(coordinates[i], coordinates[nextIndex]);
    
    const borne1 = coordinates[i].borne || `B${i + 1}`;
    const borne2 = coordinates[nextIndex].borne || `B${nextIndex + 1}`;
    
    sides.push({
      side: `${borne1} → ${borne2}`,
      length: Math.round(length * 100) / 100, // Arrondir à 2 décimales
    });
  }

  return sides;
};

const ParcelInfoPanel: React.FC<ParcelInfoPanelProps> = ({ parcel, onClose }) => {
  const navigate = useNavigate();

  const formatArea = (sqm: number) => {
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha`;
    }
    return `${sqm.toLocaleString()} m²`;
  };

  const sideLengths = React.useMemo(() => {
    if (Array.isArray(parcel.gps_coordinates) && parcel.gps_coordinates.length >= 3) {
      return calculateSideLengths(parcel.gps_coordinates);
    }
    return [];
  }, [parcel.gps_coordinates]);

  const handleShowMoreData = () => {
    // Naviguer vers le catalogue de services avec le numéro de parcelle
    navigate(`/services?parcel=${parcel.parcel_number}`);
  };

  return (
    <Card className="shadow-lg border-border h-fit sticky top-4 animate-fade-in">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="truncate">Parcelle {parcel.parcel_number}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 hover:bg-destructive/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant={parcel.parcel_type === 'SU' ? 'default' : 'secondary'} className="text-xs">
            {parcel.parcel_type === 'SU' ? 'Section Urbaine' : 'Section Rurale'}
          </Badge>
          {parcel.property_title_type && (
            <Badge variant="outline" className="text-xs">
              {parcel.property_title_type}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-4">
        {/* Localisation */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Localisation
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Province:</span>
              <span className="font-medium">{parcel.province || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ville:</span>
              <span className="font-medium">{parcel.ville || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Commune:</span>
              <span className="font-medium">{parcel.commune || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quartier:</span>
              <span className="font-medium">{parcel.quartier || 'N/A'}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Surface */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Surface
          </h4>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Superficie:</span>
            <span className="font-medium">{formatArea(parcel.area_sqm)}</span>
          </div>
        </div>

        {/* Longueurs des côtés */}
        {sideLengths.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                Longueurs des côtés
              </h4>
              <div className="space-y-1.5">
                {sideLengths.map((side, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-mono text-xs">{side.side}</span>
                    <span className="font-medium">{side.length} m</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Bouton pour afficher plus de données */}
        <Button
          onClick={handleShowMoreData}
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Afficher plus de données
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Accédez au catalogue de services complet pour obtenir l'historique, les obligations fiscales et plus encore.
        </p>
      </CardContent>
    </Card>
  );
};

export default ParcelInfoPanel;
