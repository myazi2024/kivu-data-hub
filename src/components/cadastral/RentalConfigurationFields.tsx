import React, { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Home, Building2, DollarSign } from 'lucide-react';
import { isTerrainNuCategory as isTerrainNuCategoryShared } from '@/utils/cccPredicates';

export type RentalConfiguration = 'single' | 'multi';

export interface RentalUnit {
  label?: string;
  monthlyRentUsd?: number;
  isOccupied?: boolean;
  /** Nombre de personnes vivant actuellement dans le local (si occupé). */
  occupantCount?: number;
  hostingCapacity?: number;
  rentalStartDate?: string; // ISO yyyy-MM-dd
  floor?: string;           // 'RDC' | '1' | '2' …
}

export interface RentalConfigurationState {
  rentalConfiguration?: RentalConfiguration;
  rentalUnitsCount?: number;
  monthlyRentUsd?: number;
  rentalUnits?: RentalUnit[];
}

export interface RentalConfigurationPatch extends RentalConfigurationState {
  /** Reset de l'occupation globale au changement de mode (single ↔ multi). */
  isOccupied?: boolean;
  hostingCapacity?: number;
  occupantCount?: number;
}

interface CommonProps {
  state: RentalConfigurationState;
  /** Receive a partial patch — caller merges into its data object. */
  onPatch: (patch: RentalConfigurationPatch) => void;
  propertyCategory?: string;
  constructionType?: string;
  /** Highlight required fields if validation has been attempted. */
  highlightRequired?: boolean;
  /** Nombre d'étages déclarés sur la construction parente (pour le sélecteur d'emplacement). */
  numberOfFloors?: number;
  /** Année de construction parente (borne min de la date de mise en location). */
  constructionYear?: number;
}

const buildSubject = (cat?: string, type?: string): string => {
  const c = (cat || '').trim();
  const t = (type || '').trim();
  if (c && t) return `Ce ${c.toLowerCase()} (type ${t.toLowerCase()})`;
  if (c) return `Ce ${c.toLowerCase()}`;
  if (t) return `Ce bien de type ${t.toLowerCase()}`;
  return 'Ce bien';
};

/** Terrain nu : le vocabulaire « local » n'est pas pertinent. Délègue au prédicat canonique. */
export const isTerrainNuCategory = (cat?: string, type?: string): boolean =>
  isTerrainNuCategoryShared({ propertyCategory: cat, constructionType: type });

/** Vocabulaire d'unité locative selon la catégorie de bien. */
const unitVocab = (cat?: string, type?: string) => {
  const terrain = isTerrainNuCategory(cat, type);
  return {
    isTerrainNu: terrain,
    singular: terrain ? 'terrain' : 'local',
    plural: terrain ? 'terrains' : 'locaux',
    cardTitle: terrain ? 'Terrain' : 'Local',
    singleOption: terrain ? 'Un seul terrain nu' : 'Un seul local',
    singleHelp: terrain
      ? "Le terrain est loué en entier à un seul locataire."
      : 'Le bien est loué comme une unique construction à un seul locataire.',
    multiOption: terrain ? 'Divisé en plusieurs terrains' : 'Divisé en plusieurs locaux',
    multiHelp: terrain
      ? 'Chaque terrain est loué séparément à un locataire distinct.'
      : 'Chaque local est loué séparément à un locataire distinct.',
    introQuestion: terrain
      ? "est-il loué en entier à un unique locataire, ou divisé en plusieurs terrains loués séparément ?"
      : 'est-il loué comme un seul local à un unique locataire, ou divisé en plusieurs locaux loués séparément ?',
  };
};


const MIN_UNITS = 2;
const MAX_UNITS = 50;

const clampCount = (n: number): number => Math.max(MIN_UNITS, Math.min(MAX_UNITS, Math.trunc(n) || MIN_UNITS));

/** Synchronize rentalUnits array length with rentalUnitsCount, preserving values. */
const resizeUnits = (units: RentalUnit[] | undefined, count: number): RentalUnit[] => {
  const current = Array.isArray(units) ? units.slice(0, count) : [];
  while (current.length < count) current.push({});
  return current;
};

const floorLabel = (i: number): string => {
  if (i === 0) return 'Rez-de-chaussée';
  if (i === 1) return '1er étage';
  return `${i}e étage`;
};
const floorValue = (i: number): string => (i === 0 ? 'RDC' : String(i));

const TODAY = new Date().toISOString().slice(0, 10);

/** ─── A. Configuration locative (sélecteur single/multi + count) ─── */
export const RentalConfigurationSelector: React.FC<CommonProps> = ({
  state, onPatch, propertyCategory, constructionType, highlightRequired,
}) => {
  const subject = buildSubject(propertyCategory, constructionType);
  const vocab = unitVocab(propertyCategory, constructionType);
  const isMissing = highlightRequired && !state.rentalConfiguration;

  /** Locaux qui seraient supprimés par une réduction du nombre de locaux. */
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const selectMode = (mode: RentalConfiguration) => {
    // Garde-fou : recliquer sur le mode déjà actif ne doit rien effacer.
    if (mode === state.rentalConfiguration) return;

    // Reset explicite de l'occupation globale : évite qu'une valeur héritée du
    // mode précédent ne subsiste transitoirement (l'agrégation multi la
    // recalculera à partir des locaux, le mode single la fera ressaisir).
    const occupancyReset = {
      isOccupied: undefined,
      hostingCapacity: undefined,
      occupantCount: undefined,
    } as const;

    if (mode === 'single') {
      const firstRent = state.rentalUnits?.[0]?.monthlyRentUsd;
      onPatch({
        rentalConfiguration: 'single',
        rentalUnitsCount: undefined,
        rentalUnits: undefined,
        monthlyRentUsd: state.monthlyRentUsd ?? firstRent,
        ...occupancyReset,
      });
    } else {
      const count = clampCount(state.rentalUnitsCount ?? MIN_UNITS);
      const seeded: RentalUnit[] = resizeUnits(state.rentalUnits, count);
      if (state.monthlyRentUsd && !seeded[0]?.monthlyRentUsd) {
        seeded[0] = { ...seeded[0], monthlyRentUsd: state.monthlyRentUsd };
      }
      onPatch({
        rentalConfiguration: 'multi',
        rentalUnitsCount: count,
        rentalUnits: seeded,
        monthlyRentUsd: undefined,
        ...occupancyReset,
      });
    }
  };

  const applyCount = (n: number) => {
    onPatch({
      rentalUnitsCount: n,
      rentalUnits: resizeUnits(state.rentalUnits, n),
    });
  };

  /** Locaux au-delà du nouveau total contenant des données saisies. */
  const droppedFilledUnits = (n: number) =>
    (state.rentalUnits || [])
      .map((u, i) => ({ u, i }))
      .filter(({ u, i }) => i >= n && u && Object.values(u).some((v) => v !== undefined && v !== '' && v !== null));

  const setCount = (raw: string) => {
    const n = clampCount(parseInt(raw, 10) || MIN_UNITS);
    if (droppedFilledUnits(n).length > 0) {
      setPendingCount(n);
      return;
    }
    applyCount(n);
  };


  return (
    <div className="space-y-2 animate-fade-in">
      <Label className={cn('text-sm font-medium leading-snug block', isMissing && 'text-destructive')}>
        Comment ce bien est-il mis en location ?
        {isMissing && <span className="text-destructive ml-1">*</span>}
      </Label>
      <p className="text-[11px] text-muted-foreground leading-snug">
        {subject} {vocab.introQuestion}
      </p>

      <div className="grid grid-cols-1 gap-2" role="radiogroup" aria-label="Mode de mise en location">
        <button
          type="button"
          role="radio"
          aria-checked={state.rentalConfiguration === 'single'}
          onClick={() => selectMode('single')}
          className={cn(
            'flex items-start gap-2 rounded-2xl border-2 p-3 text-left transition-all',
            state.rentalConfiguration === 'single'
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-border bg-card hover:bg-muted/40',
          )}
        >
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Home className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">{vocab.singleOption}</div>
            <div className="text-[11px] text-muted-foreground">{vocab.singleHelp}</div>

          </div>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={state.rentalConfiguration === 'multi'}
          onClick={() => selectMode('multi')}
          className={cn(
            'flex items-start gap-2 rounded-2xl border-2 p-3 text-left transition-all',
            state.rentalConfiguration === 'multi'
              ? 'border-primary bg-primary/5 shadow-md'
              : 'border-border bg-card hover:bg-muted/40',
          )}
        >
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-foreground">{vocab.multiOption}</div>
            <div className="text-[11px] text-muted-foreground">{vocab.multiHelp}</div>
          </div>
        </button>
      </div>

      {state.rentalConfiguration === 'multi' && (
        <div className="space-y-1.5 pt-1 animate-fade-in">
          <Label className="text-sm font-medium">Nombre de {vocab.plural} mis en location</Label>
          <Input
            type="number"
            min={MIN_UNITS}
            max={MAX_UNITS}
            value={state.rentalUnitsCount ?? ''}
            onChange={(e) => setCount(e.target.value)}
            placeholder={`Min. ${MIN_UNITS}`}
            className="h-10 rounded-xl text-sm"
          />
        </div>
      )}

      <AlertDialog open={pendingCount !== null} onOpenChange={(o) => { if (!o) setPendingCount(null); }}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer des {vocab.plural} déjà renseignés ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCount !== null && (
                <>
                  Réduire à {pendingCount} {vocab.singular}(aux) supprimera définitivement les données saisies pour :{' '}
                  {droppedFilledUnits(pendingCount)
                    .map(({ u, i }) => u.label?.trim() || `${vocab.cardTitle} #${i + 1}`)
                    .join(', ')}

                  . Cette action est irréversible.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingCount(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (pendingCount !== null) applyCount(pendingCount); setPendingCount(null); }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/** ─── B. Loyer mensuel (1 champ si single, x cartes si multi) ─── */
export const MonthlyRentFields: React.FC<CommonProps> = ({
  state, onPatch, propertyCategory, constructionType, highlightRequired, numberOfFloors, constructionYear,
}) => {
  const total = useMemo(() => {
    if (state.rentalConfiguration === 'multi') {
      return (state.rentalUnits || []).reduce((sum, u) => sum + (Number(u?.monthlyRentUsd) || 0), 0);
    }
    return Number(state.monthlyRentUsd) || 0;
  }, [state.rentalConfiguration, state.rentalUnits, state.monthlyRentUsd]);

  // Min date pour la mise en location : 1er janvier de l'année de construction.
  const minRentalDate = useMemo(() => {
    if (!constructionYear) return undefined;
    return `${constructionYear}-01-01`;
  }, [constructionYear]);

  const vocab = unitVocab(propertyCategory, constructionType);
  const showFloorSelect = !vocab.isTerrainNu && Number(numberOfFloors) >= 1;
  const floorOptions = useMemo(() => {
    const max = Math.max(0, Math.min(50, Number(numberOfFloors) || 0));
    return Array.from({ length: max + 1 }, (_, i) => ({ value: floorValue(i), label: floorLabel(i) }));
  }, [numberOfFloors]);

  // Don't render if user hasn't chosen a configuration yet.
  if (!state.rentalConfiguration) return null;

  const setSingleRent = (raw: string) => {
    const v = raw === '' ? undefined : Number(raw);
    onPatch({ monthlyRentUsd: Number.isFinite(v as number) ? (v as number) : undefined });
  };

  const updateUnit = (idx: number, patch: Partial<RentalUnit>) => {
    const list = resizeUnits(state.rentalUnits, state.rentalUnitsCount ?? MIN_UNITS);
    list[idx] = { ...list[idx], ...patch };
    onPatch({ rentalUnits: list });
  };


  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-start gap-2">
        <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <DollarSign className="h-3.5 w-3.5 text-primary" />
        </div>
        <div>
          <Label className="text-sm font-semibold leading-tight">Loyer mensuel actuel</Label>
          <p className="text-[11px] text-muted-foreground leading-snug">
            À quel prix par mois ce bien est-il actuellement loué ? (USD)
          </p>
        </div>
      </div>

      {state.rentalConfiguration === 'single' && (
        <div className="space-y-1.5 pl-1">
          <Label className="text-sm font-medium">Loyer mensuel (USD)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={state.monthlyRentUsd ?? ''}
            onChange={(e) => setSingleRent(e.target.value)}
            placeholder="Ex: 350"
            className={cn(
              'h-10 rounded-xl text-sm',
              highlightRequired && !state.monthlyRentUsd && 'border-destructive ring-1 ring-destructive/40',
            )}
          />
        </div>
      )}

      {state.rentalConfiguration === 'multi' && (
        <div className="space-y-2 pl-1">
          {resizeUnits(state.rentalUnits, state.rentalUnitsCount ?? MIN_UNITS).map((unit, idx) => {
            const missingRent = highlightRequired && !unit.monthlyRentUsd;
            const missingOccupied = !vocab.isTerrainNu && highlightRequired && unit.isOccupied === undefined;
            const missingCapacity = !vocab.isTerrainNu && highlightRequired && unit.isOccupied !== undefined && !unit.hostingCapacity;
            const missingOccupants = !vocab.isTerrainNu && highlightRequired && unit.isOccupied === true && !unit.occupantCount;
            const missingDate = highlightRequired && !unit.rentalStartDate;
            const missingFloor = highlightRequired && showFloorSelect && !unit.floor;
            return (
              <div
                key={idx}
                className="rounded-2xl border-2 border-border bg-card shadow-sm p-3 space-y-2 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{vocab.cardTitle} #{idx + 1}</span>
                  {unit.monthlyRentUsd ? (
                    <span className="text-[11px] text-muted-foreground">
                      {Number(unit.monthlyRentUsd).toFixed(2)} USD/mois
                    </span>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Nom du {vocab.singular} (optionnel)
                    </Label>
                    <Input
                      value={unit.label ?? ''}
                      onChange={(e) => updateUnit(idx, { label: e.target.value })}
                      placeholder={vocab.isTerrainNu ? `Ex: Terrain T${idx + 1}` : `Ex: Appartement A${idx + 1}`}
                      className="h-9 rounded-xl text-sm"
                    />
                  </div>

                  {showFloorSelect && (
                    <div className="space-y-1">
                      <Label className={cn('text-xs font-medium', missingFloor ? 'text-destructive' : 'text-muted-foreground')}>
                        Emplacement du local {missingFloor && <span className="text-destructive">*</span>}
                      </Label>
                      <Select
                        value={unit.floor ?? ''}
                        onValueChange={(v) => updateUnit(idx, { floor: v })}
                      >
                        <SelectTrigger className={cn('h-9 rounded-xl text-sm', missingFloor && 'border-destructive ring-1 ring-destructive/40')}>
                          <SelectValue placeholder="Sélectionner l'étage" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {floorOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {!vocab.isTerrainNu && (
                  <div className="space-y-1">
                    <Label className={cn('text-xs font-medium', missingOccupied ? 'text-destructive' : 'text-muted-foreground')}>
                      Ce local est-il actuellement occupé ? {missingOccupied && <span className="text-destructive">*</span>}
                    </Label>
                    <div className="flex gap-2" role="radiogroup" aria-label={`Local ${idx + 1} : occupation`}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={unit.isOccupied === true}
                        onClick={() => updateUnit(idx, { isOccupied: true })}
                        className={cn(
                          'flex-1 h-9 rounded-xl text-xs font-semibold transition-all border-2',
                          unit.isOccupied === true
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-foreground hover:border-primary/40',
                        )}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={unit.isOccupied === false}
                        onClick={() => updateUnit(idx, { isOccupied: false, occupantCount: undefined })}
                        className={cn(
                          'flex-1 h-9 rounded-xl text-xs font-semibold transition-all border-2',
                          unit.isOccupied === false
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-foreground hover:border-primary/40',
                        )}
                      >
                        Non
                      </button>
                    </div>
                  </div>
                  )}

                  {!vocab.isTerrainNu && unit.isOccupied === true && (
                    <div className="space-y-1">
                      <Label className={cn('text-xs font-medium', missingOccupants ? 'text-destructive' : 'text-muted-foreground')}>
                        Combien de personnes y vivent ? {missingOccupants && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={unit.occupantCount ?? ''}
                        onChange={(e) => updateUnit(idx, { occupantCount: e.target.value ? Math.max(1, parseInt(e.target.value)) : undefined })}
                        placeholder="Ex: 3"
                        className={cn('h-9 rounded-xl text-sm', missingOccupants && 'border-destructive ring-1 ring-destructive/40')}
                      />
                    </div>
                  )}

                  {!vocab.isTerrainNu && unit.isOccupied !== undefined && (
                    <div className="space-y-1">
                      <Label className={cn('text-xs font-medium', missingCapacity ? 'text-destructive' : 'text-muted-foreground')}>
                        Capacité d'accueil (personnes) {missingCapacity && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={unit.hostingCapacity ?? ''}
                        onChange={(e) => updateUnit(idx, { hostingCapacity: e.target.value ? parseInt(e.target.value) : undefined })}
                        placeholder="Ex: 4"
                        className={cn('h-9 rounded-xl text-sm', missingCapacity && 'border-destructive ring-1 ring-destructive/40')}
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className={cn('text-xs font-medium', missingDate ? 'text-destructive' : 'text-muted-foreground')}>
                      {!vocab.isTerrainNu && unit.isOccupied === false ? 'Inoccupé depuis le' : 'En location depuis le'} {missingDate && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      type="date"
                      min={minRentalDate}
                      max={TODAY}
                      value={unit.rentalStartDate ?? ''}
                      onChange={(e) => updateUnit(idx, { rentalStartDate: e.target.value || undefined })}
                      className={cn('h-9 rounded-xl text-sm', missingDate && 'border-destructive ring-1 ring-destructive/40')}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className={cn('text-xs font-medium', missingRent ? 'text-destructive' : 'text-muted-foreground')}>
                      Loyer mensuel (USD) {missingRent && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={unit.monthlyRentUsd ?? ''}
                      onChange={(e) =>
                        updateUnit(idx, { monthlyRentUsd: e.target.value === '' ? undefined : Number(e.target.value) })
                      }
                      placeholder="Ex: 250"
                      className={cn(
                        'h-9 rounded-xl text-sm',
                        missingRent && 'border-destructive ring-1 ring-destructive/40',
                      )}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <div className="rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-foreground flex justify-between">
          <span className="text-muted-foreground">
            Total mensuel · annuel estimé
          </span>
          <span className="font-semibold">
            {total.toFixed(2)} USD · {(total * 12).toFixed(2)} USD
          </span>
        </div>
      )}
    </div>
  );
};

/** Compute total monthly rent (USD) given a rental state. */
export const computeMonthlyRentTotal = (state: RentalConfigurationState): number => {
  if (state.rentalConfiguration === 'multi') {
    return (state.rentalUnits || []).reduce((s, u) => s + (Number(u?.monthlyRentUsd) || 0), 0);
  }
  return Number(state.monthlyRentUsd) || 0;
};

/** Compute total hosting capacity (somme des locaux si multi, sinon la valeur globale). */
export const computeHostingCapacityTotal = (
  state: RentalConfigurationState & { hostingCapacity?: number },
): number | undefined => {
  if (state.rentalConfiguration === 'multi') {
    const sum = (state.rentalUnits || []).reduce((s, u) => s + (Number(u?.hostingCapacity) || 0), 0);
    return sum > 0 ? sum : undefined;
  }
  return state.hostingCapacity;
};

/** Compute total occupants (somme des locaux occupés si multi, sinon la valeur globale). */
export const computeOccupantCountTotal = (
  state: RentalConfigurationState & { occupantCount?: number },
): number | undefined => {
  if (state.rentalConfiguration === 'multi') {
    const sum = (state.rentalUnits || []).reduce((s, u) => s + (Number(u?.occupantCount) || 0), 0);
    return sum > 0 ? sum : undefined;
  }
  return state.occupantCount;
};

/** Libellé lisible d'un emplacement de local ('RDC' → 'Rez-de-chaussée'). */
export const formatFloorLabel = (value?: string | null): string => {
  if (!value) return '';
  const v = String(value).trim();
  if (v.toUpperCase() === 'RDC' || v === '0') return 'Rez-de-chaussée';
  if (v === '1') return '1er étage';
  return /^\d+$/.test(v) ? `${v}e étage` : v;
};

/** Libellé de date adapté au statut d'occupation du local. */
export const rentalDateLabel = (isOccupied?: boolean | null): string =>
  isOccupied === false ? 'Inoccupé depuis' : 'En location depuis';
