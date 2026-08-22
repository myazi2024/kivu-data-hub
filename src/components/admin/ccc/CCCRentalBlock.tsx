import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Home, Layers } from 'lucide-react';
import { parseRentalUnits, sumUnitsRent, sumUnitsCapacity } from './cccConsistency';
import { formatFloorLabel, rentalDateLabel } from '@/components/cadastral/RentalConfigurationFields';

interface Props {
  contribution: any;
}

const fmtUsd = (n: number | null | undefined) =>
  n === null || n === undefined ? 'Non renseigné' : `${Number(n).toLocaleString('fr-FR')} USD`;

/** Bloc admin : configuration locative (mono-local ou multi-locaux). */
export const CCCRentalBlock: React.FC<Props> = ({ contribution }) => {
  const units = useMemo(() => parseRentalUnits(contribution?.rental_units), [contribution]);
  const totalRent = useMemo(() => sumUnitsRent(units), [units]);
  const totalCapacity = useMemo(() => sumUnitsCapacity(units), [units]);

  const mode = contribution?.rental_configuration as string | null;
  if (!mode && !contribution?.monthly_rent_usd && units.length === 0) return null;

  return (
    <div className="p-2 md:p-3 border rounded space-y-2">
      <div className="flex items-center gap-2">
        {mode === 'multi' ? <Layers className="h-4 w-4 text-primary" /> : <Home className="h-4 w-4 text-primary" />}
        <Label className="text-xs md:text-sm font-semibold">Configuration locative</Label>
        <Badge variant="outline" className="text-[10px]">
          {mode === 'multi' ? 'Divisé en plusieurs locaux' : mode === 'single' ? 'Un seul local' : 'Non renseigné'}
        </Badge>
      </div>

      {mode !== 'multi' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Loyer mensuel</Label>
            <p className="text-sm">{fmtUsd(contribution.monthly_rent_usd)}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Loyer annuel estimé</Label>
            <p className="text-sm">
              {contribution.monthly_rent_usd ? fmtUsd(Number(contribution.monthly_rent_usd) * 12) : 'Non renseigné'}
            </p>
          </div>
        </div>
      )}

      {mode === 'multi' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Nombre de locaux</Label>
              <p className="text-sm">{contribution.rental_units_count ?? units.length}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total mensuel</Label>
              <p className="text-sm font-medium">{fmtUsd(totalRent)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total annuel</Label>
              <p className="text-sm font-medium">{fmtUsd(totalRent * 12)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Capacité cumulée</Label>
              <p className="text-sm">{totalCapacity || 'Non renseigné'}</p>
            </div>
          </div>

          {units.length > 0 && (
            <div className="space-y-1.5">
              {units.map((u, i) => (
                <div key={i} className="p-2 bg-secondary rounded text-xs space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{u.label || `Local ${i + 1}`}</span>
                    <div className="flex items-center gap-1">
                      {u.floor && <Badge variant="outline" className="text-[9px]">{formatFloorLabel(u.floor)}</Badge>}
                      <Badge variant={u.isOccupied ? 'default' : 'outline'} className="text-[9px]">
                        {u.isOccupied ? 'Occupé' : 'Vacant'}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    Loyer : {fmtUsd(u.monthlyRentUsd)}
                    {u.hostingCapacity ? ` · Capacité : ${u.hostingCapacity}` : ''}
                    {u.isOccupied === true && u.occupantCount ? ` · Occupants : ${u.occupantCount}` : ''}
                    {u.rentalStartDate ? ` · ${rentalDateLabel(u.isOccupied)} le ${new Date(u.rentalStartDate).toLocaleDateString('fr-FR')}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CCCRentalBlock;
