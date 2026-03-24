import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Building2, 
  DollarSign,
  MapPin
} from 'lucide-react';
import type { ZoneData } from '../TerritorialMap';

interface ZoneDetailsPanelProps {
  zone: ZoneData;
  onClose: () => void;
}

export const ZoneDetailsPanel: React.FC<ZoneDetailsPanelProps> = ({ zone, onClose }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getPressureColor = (pression: string) => {
    switch (pression) {
      case 'Très élevé': return '#dc2626';
      case 'Élevé': return '#ea580c';
      case 'Modéré': return '#ca8a04';
      case 'Faible': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const getTypologyIcon = (typologie: string) => {
    if (typologie.includes('immeuble') || typologie.includes('Appartements')) return '🏢';
    if (typologie.includes('maison') || typologie.includes('villa')) return '🏠';
    return '🏘️';
  };

  return (
    <Card className="fixed inset-1 sm:inset-2 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 max-w-full max-h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-2 pt-2">
        <div className="flex items-center gap-2">
          <span className="text-lg sm:text-2xl">{getTypologyIcon(zone.typologie_dominante)}</span>
          <div>
            <CardTitle className="text-sm sm:text-lg">{zone.name}</CardTitle>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="outline" className="text-xs px-1 py-0">{zone.type}</Badge>
              <Badge 
                style={{ backgroundColor: getPressureColor(zone.indicepressionfonciere) }}
                className="text-white text-xs px-1 py-0"
              >
                Pression {zone.indicepressionfonciere}
              </Badge>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="touch-target">
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      
      <CardContent className="max-h-[calc(100vh-4rem)] sm:max-h-[calc(100vh-6rem)] overflow-y-auto p-1 sm:p-3">
        <div className="space-y-3">
          {/* Informations générales */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <p className="text-xs font-medium">Type de zone</p>
                </div>
                <p className="text-lg font-bold capitalize">{zone.type}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-2">
                <div className="flex items-center gap-1 mb-1">
                  <Building2 className="w-3 h-3 text-primary" />
                  <p className="text-xs font-medium">Typologie</p>
                </div>
                <p className="text-sm font-bold">{zone.typologie_dominante}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-2">
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="w-3 h-3 text-primary" />
                  <p className="text-xs font-medium">Recettes théoriques</p>
                </div>
                <p className="text-lg font-bold">{formatCurrency(zone.recetteslocativestheoriques_usd)}</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs">Caractéristiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Densité résidentielle</span>
                  <span className="font-semibold text-xs">{zone.densite_residentielle} hab/km²</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Typologie dominante</span>
                  <span className="font-semibold text-xs">{zone.typologie_dominante}</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs">Pression foncière</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-2">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Indice pression foncière</span>
                  <Badge 
                    style={{ backgroundColor: getPressureColor(zone.indicepressionfonciere) }}
                    className="text-white text-xs px-1 py-0"
                  >
                    {zone.indicepressionfonciere}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Recettes théoriques</span>
                  <span className="font-semibold text-xs">{formatCurrency(zone.recetteslocativestheoriques_usd)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
