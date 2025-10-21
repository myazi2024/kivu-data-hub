import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, MapPin } from 'lucide-react';
import { GPSCoordinate } from '@/hooks/useCCCFormState';

interface CCCFormGPSProps {
  coordinates: GPSCoordinate[];
  onUpdate: (index: number, field: keyof GPSCoordinate, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export const CCCFormGPS: React.FC<CCCFormGPSProps> = ({
  coordinates,
  onUpdate,
  onAdd,
  onRemove
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Coordonnées GPS des bornes</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Renseignez les coordonnées GPS de chaque borne délimitant votre parcelle.
      </p>

      {coordinates.map((coord, index) => (
        <Card key={index} className="p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              {coord.borne || `Borne ${index + 1}`}
            </span>
            {coordinates.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`gps-${index}-borne`} className="text-sm">
                Nom de la borne
              </Label>
              <Input
                id={`gps-${index}-borne`}
                value={coord.borne}
                onChange={(e) => onUpdate(index, 'borne', e.target.value)}
                placeholder="Borne 1"
                className="touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`gps-${index}-lat`} className="text-sm">
                Latitude
              </Label>
              <Input
                id={`gps-${index}-lat`}
                type="number"
                step="0.000001"
                value={coord.lat}
                onChange={(e) => onUpdate(index, 'lat', e.target.value)}
                placeholder="-1.670000"
                className="touch-manipulation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`gps-${index}-lng`} className="text-sm">
                Longitude
              </Label>
              <Input
                id={`gps-${index}-lng`}
                type="number"
                step="0.000001"
                value={coord.lng}
                onChange={(e) => onUpdate(index, 'lng', e.target.value)}
                placeholder="29.250000"
                className="touch-manipulation"
              />
            </div>
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={onAdd}
        className="w-full sm:w-auto touch-manipulation min-h-[44px]"
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter une borne
      </Button>
    </div>
  );
};
