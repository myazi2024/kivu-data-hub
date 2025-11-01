import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCadastralParcels, type ParcelFilters } from '@/hooks/useCadastralParcels';
import { MapPin, Layers, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CollaborativeCadastralMapSimple = () => {
  const [filters] = useState<ParcelFilters>({});
  const { parcels, loading, error, totalCount } = useCadastralParcels(filters);

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Plan Cadastral Collaboratif
          </CardTitle>
          <CardDescription>
            Visualisez les parcelles cadastrales géolocalisées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{totalCount} parcelles</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{parcels.length} géolocalisées</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground">Chargement...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {parcels.map((parcel) => (
                <Card key={parcel.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{parcel.parcel_number}</CardTitle>
                    <CardDescription className="text-xs">
                      {parcel.current_owner_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{parcel.property_title_type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {parcel.area_sqm.toLocaleString('fr-FR')} m²
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[parcel.quartier, parcel.commune, parcel.ville].filter(Boolean).join(', ')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CollaborativeCadastralMapSimple;
