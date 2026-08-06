import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Home, AlertTriangle, ChevronDown, ChevronRight, Users, Layers } from 'lucide-react';
import { useUserAssets } from '@/hooks/useUserAssets';
import { formatUsd, formatDateFr } from '@/utils/userRentalMarket';

/** Vue « Locations » : locaux déclarés, loyers, occupation, capacité. */
export const RentalUnitsPanel: React.FC = () => {
  const { rentals, totals, loading } = useUserAssets();
  const [expanded, setExpanded] = useState<string | null>(null);

  const anomalies = useMemo(
    () => rentals.filter((r) => r.unitsCountMismatch || r.missingRent),
    [rentals],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (rentals.length === 0) {
    return (
      <div className="text-center py-10 bg-background rounded-2xl border">
        <Home className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Aucun bien déclaré en location</p>
        <p className="text-xs text-muted-foreground mt-1">
          Déclarez l'usage « Location » dans le formulaire cadastral pour piloter vos loyers ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Loyer mensuel', value: formatUsd(totals.monthlyRentUsd) },
          { label: 'Loyer annuel', value: formatUsd(totals.annualRentUsd) },
          { label: 'Locaux', value: `${totals.occupiedUnits}/${totals.unitsTotal} occupés` },
          { label: 'Taux d\u2019occupation', value: `${totals.occupancyRate}%` },
        ].map((s) => (
          <div key={s.label} className="bg-background rounded-2xl p-3 border shadow-sm">
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
            <p className="text-sm font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {anomalies.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {anomalies.length} bien(s) présentent une incohérence locative (loyer manquant ou nombre
            de locaux différent du nombre déclaré). Corrigez-les depuis vos contributions.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {rentals.map((r) => {
          const key = `${r.contributionId}-${r.constructionRef}`;
          const isOpen = expanded === key;
          return (
            <div key={key} className="bg-background rounded-2xl border overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : key)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40 transition-colors"
                aria-expanded={isOpen}
              >
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Home className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.parcelNumber}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.label}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold">{formatUsd(r.monthlyRentUsd)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.configuration === 'multi' ? `${r.units.length} locaux` : 'Local unique'}
                  </p>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {isOpen && (
                <div className="border-t p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Loyer annuel</span>
                      <p className="font-medium">{formatUsd(r.annualRentUsd)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Capacité d'accueil</span>
                      <p className="font-medium flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {r.totalCapacity || 'Non renseignée'}
                      </p>
                    </div>
                  </div>

                  {r.unitsCountMismatch && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        {r.units.length} local(aux) saisi(s) pour {r.unitsCount} déclaré(s).
                      </AlertDescription>
                    </Alert>
                  )}

                  {r.configuration === 'multi' ? (
                    <div className="space-y-1.5">
                      {r.units.map((u, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 rounded-xl bg-muted/30 text-xs"
                        >
                          <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{u.label || `Local ${i + 1}`}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {[
                                u.floor ? `Étage ${u.floor}` : null,
                                u.hostingCapacity ? `${u.hostingCapacity} pers.` : null,
                                u.rentalStartDate ? `Depuis ${formatDateFr(u.rentalStartDate)}` : null,
                              ]
                                .filter(Boolean)
                                .join(' • ') || 'Détails non renseignés'}
                            </p>
                          </div>
                          <Badge
                            variant={u.isOccupied ? 'default' : 'outline'}
                            className="text-[9px] shrink-0"
                          >
                            {u.isOccupied ? 'Occupé' : 'Vacant'}
                          </Badge>
                          <span className="font-semibold shrink-0">
                            {u.monthlyRentUsd !== null ? `${u.monthlyRentUsd} USD` : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Bien loué en local unique — loyer déclaré{' '}
                      {formatUsd(r.declaredMonthlyRentUsd)}.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Ces données proviennent de vos déclarations cadastrales. Pour les modifier, ouvrez la
        contribution correspondante dans l'onglet « Contributions ».
      </p>
    </div>
  );
};

export default RentalUnitsPanel;
