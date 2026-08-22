import { isConstructionRented } from '@/utils/rentalStatus';
import React from 'react';
import { formatFloorLabel, rentalDateLabel } from '@/components/cadastral/RentalConfigurationFields';

export interface RentalUnitLike {
  label?: string;
  monthlyRentUsd?: number;
  isOccupied?: boolean;
  occupantCount?: number;
  hostingCapacity?: number;
  rentalStartDate?: string;
  floor?: string;
}

interface RentalSummaryProps {
  declaredUsage?: string;
  isRented?: boolean;
  rentalStartDate?: string;
  rentalConfiguration?: 'single' | 'multi';
  rentalUnitsCount?: number;
  monthlyRentUsd?: number;
  rentalUnits?: RentalUnitLike[];
  /** Préfixe de titre, ex. "Location" ou "Location (construction #2)" */
  title?: string;
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '');

/**
 * Restitution de la configuration locative (mono ou multi-locaux) dans le récapitulatif.
 * Partagée entre la construction principale et les constructions additionnelles.
 */
export const RentalSummary: React.FC<RentalSummaryProps> = ({
  declaredUsage,
  isRented,
  rentalStartDate,
  rentalConfiguration,
  rentalUnitsCount,
  monthlyRentUsd,
  rentalUnits,
  title = 'Mise en location',
}) => {
  if (!isConstructionRented({ declaredUsage, isRented })) return null;

  const isMulti = rentalConfiguration === 'multi';
  const units = isMulti ? (rentalUnits || []) : [];
  const monthlyTotal = isMulti
    ? units.reduce((s, u) => s + (Number(u?.monthlyRentUsd) || 0), 0)
    : Number(monthlyRentUsd) || 0;

  return (
    <div className="pt-1 border-t border-border/50">
      <div className="font-medium">🏠 {title}:</div>
      <div className="ml-2 text-muted-foreground space-y-0.5">
        {rentalStartDate && <div>{rentalDateLabel()}: {fmtDate(rentalStartDate)}</div>}
        <div>
          Configuration:{' '}
          {rentalConfiguration
            ? isMulti
              ? `Divisé en plusieurs locaux (${rentalUnitsCount ?? units.length})`
              : 'Un seul local'
            : 'Non renseigné'}
        </div>
        {!isMulti && (
          <div>Loyer mensuel: {monthlyTotal > 0 ? `${monthlyTotal.toFixed(2)} USD` : 'Non renseigné'}</div>
        )}
        {isMulti && units.length > 0 && (
          <div className="space-y-1 mt-1">
            {units.map((u, i) => (
              <div key={i} className="p-2 bg-muted/50 rounded-lg space-y-0.5">
                <div className="font-medium text-foreground">
                  Local #{i + 1}
                  {u.label ? ` — ${u.label}` : ''}
                </div>
                <div>Loyer: {u.monthlyRentUsd ? `${Number(u.monthlyRentUsd).toFixed(2)} USD` : 'Non renseigné'}</div>
                {u.floor && <div>Emplacement: {formatFloorLabel(u.floor)}</div>}
                {u.isOccupied !== undefined && <div>Occupé: {u.isOccupied ? 'Oui' : 'Non (vacant)'}</div>}
                {u.isOccupied === true && u.occupantCount ? <div>Occupants: {u.occupantCount} personne(s)</div> : null}
                {u.hostingCapacity ? <div>Capacité d'accueil: {u.hostingCapacity} personne(s)</div> : null}
                {u.rentalStartDate && <div>{rentalDateLabel(u.isOccupied)}: {fmtDate(u.rentalStartDate)}</div>}
              </div>
            ))}
          </div>
        )}
        {monthlyTotal > 0 && (
          <div className="pt-1 text-foreground font-medium">
            Total mensuel: {monthlyTotal.toFixed(2)} USD · Total annuel: {(monthlyTotal * 12).toFixed(2)} USD
          </div>
        )}
      </div>
    </div>
  );
};

export default RentalSummary;
