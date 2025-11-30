import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParcelData {
  id: string;
  parcel_number: string;
  current_owner_name: string;
  area_sqm: number;
  province: string;
  ville: string;
  commune: string;
  quartier: string;
  parcel_type: string;
  property_title_type: string;
}

interface ParcelComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parcels: ParcelData[];
}

const ParcelComparisonDialog: React.FC<ParcelComparisonDialogProps> = ({
  open,
  onOpenChange,
  parcels
}) => {
  if (parcels.length < 2) return null;

  const fields = [
    { key: 'parcel_number', label: 'Numéro parcelle' },
    { key: 'current_owner_name', label: 'Propriétaire' },
    { key: 'area_sqm', label: 'Superficie (m²)', format: (v: number) => v.toFixed(2) },
    { key: 'province', label: 'Province' },
    { key: 'ville', label: 'Ville' },
    { key: 'commune', label: 'Commune' },
    { key: 'quartier', label: 'Quartier' },
    { key: 'parcel_type', label: 'Type' },
    { key: 'property_title_type', label: 'Titre' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Comparaison de parcelles</DialogTitle>
          <DialogDescription>
            Comparez {parcels.length} parcelles sélectionnées
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-full pr-4">
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${parcels.length}, 1fr)` }}>
                  {parcels.map((parcel: any) => (
                    <div key={parcel.id} className="p-2 rounded-md border bg-card">
                      <p className="text-sm">
                        {field.format && typeof parcel[field.key] === 'number'
                          ? field.format(parcel[field.key])
                          : parcel[field.key] || '-'}
                      </p>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ParcelComparisonDialog;
