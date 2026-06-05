import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Home, Building2, DollarSign } from 'lucide-react';

export type RentalConfiguration = 'single' | 'multi';

export interface RentalUnit {
  label?: string;
  monthlyRentUsd?: number;
}

export interface RentalConfigurationState {
  rentalConfiguration?: RentalConfiguration;
  rentalUnitsCount?: number;
  monthlyRentUsd?: number;
  rentalUnits?: RentalUnit[];
}

export interface RentalConfigurationPatch extends RentalConfigurationState {}

interface CommonProps {
  state: RentalConfigurationState;
  /** Receive a partial patch — caller merges into its data object. */
  onPatch: (patch: RentalConfigurationPatch) => void;
  propertyCategory?: string;
  constructionType?: string;
  /** Highlight required fields if validation has been attempted. */
  highlightRequired?: boolean;
}

const buildSubject = (cat?: string, type?: string): string => {
  const c = (cat || '').trim();
  const t = (type || '').trim();
  if (c && t) return `Ce ${c.toLowerCase()} (type ${t.toLowerCase()})`;
  if (c) return `Ce ${c.toLowerCase()}`;
  if (t) return `Ce bien de type ${t.toLowerCase()}`;
  return 'Ce bien';
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

/** ─── A. Configuration locative (sélecteur single/multi + count) ─── */
export const RentalConfigurationSelector: React.FC<CommonProps> = ({
  state, onPatch, propertyCategory, constructionType, highlightRequired,
}) => {
  const subject = buildSubject(propertyCategory, constructionType);
  const isMissing = highlightRequired && !state.rentalConfiguration;

  const selectMode = (mode: RentalConfiguration) => {
    if (mode === 'single') {
      // multi → single : conserver le 1er loyer
      const firstRent = state.rentalUnits?.[0]?.monthlyRentUsd;
      onPatch({
        rentalConfiguration: 'single',
        rentalUnitsCount: undefined,
        rentalUnits: undefined,
        monthlyRentUsd: state.monthlyRentUsd ?? firstRent,
      });
    } else {
      const count = clampCount(state.rentalUnitsCount ?? MIN_UNITS);
      const seeded: RentalUnit[] = resizeUnits(state.rentalUnits, count);
      // single → multi : seed le premier local avec monthlyRentUsd existant
      if (state.monthlyRentUsd && !seeded[0]?.monthlyRentUsd) {
        seeded[0] = { ...seeded[0], monthlyRentUsd: state.monthlyRentUsd };
      }
      onPatch({
        rentalConfiguration: 'multi',
        rentalUnitsCount: count,
        rentalUnits: seeded,
        monthlyRentUsd: undefined,
      });
    }
  };

  const setCount = (raw: string) => {
    const n = clampCount(parseInt(raw, 10) || MIN_UNITS);
    onPatch({
      rentalUnitsCount: n,
      rentalUnits: resizeUnits(state.rentalUnits, n),
    });
  };

  return (
    <div className="space-y-2 animate-fade-in">
      <Label className={cn('text-sm font-medium leading-snug block', isMissing && 'text-destructive')}>
        Comment ce bien est-il mis en location ?
        {isMissing && <span className="text-destructive ml-1">*</span>}
      </Label>
      <p className="text-[11px] text-muted-foreground leading-snug">
        {subject} est-il loué comme un seul local à un unique locataire, ou divisé en plusieurs locaux loués séparément ?
      </p>

      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
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
            <div className="text-sm font-semibold text-foreground">Un seul local</div>
            <div className="text-[11px] text-muted-foreground">Le bien est loué comme une unique construction à un seul locataire.</div>
          </div>
        </button>

        <button
          type="button"
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
            <div className="text-sm font-semibold text-foreground">Divisé en plusieurs locaux</div>
            <div className="text-[11px] text-muted-foreground">Chaque local est loué séparément à un locataire distinct.</div>
          </div>
        </button>
      </div>

      {state.rentalConfiguration === 'multi' && (
        <div className="space-y-1.5 pt-1 animate-fade-in">
          <Label className="text-sm font-medium">Nombre de locaux mis en location</Label>
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
    </div>
  );
};

/** ─── B. Loyer mensuel (1 champ si single, x cartes si multi) ─── */
export const MonthlyRentFields: React.FC<CommonProps> = ({
  state, onPatch, propertyCategory, constructionType, highlightRequired,
}) => {
  const total = useMemo(() => {
    if (state.rentalConfiguration === 'multi') {
      return (state.rentalUnits || []).reduce((sum, u) => sum + (Number(u?.monthlyRentUsd) || 0), 0);
    }
    return Number(state.monthlyRentUsd) || 0;
  }, [state.rentalConfiguration, state.rentalUnits, state.monthlyRentUsd]);

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
            const missing = highlightRequired && !unit.monthlyRentUsd;
            return (
              <div
                key={idx}
                className="rounded-2xl border-2 border-border bg-card shadow-sm p-3 space-y-2 animate-fade-in"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Local #{idx + 1}</span>
                  {unit.monthlyRentUsd ? (
                    <span className="text-[11px] text-muted-foreground">
                      {Number(unit.monthlyRentUsd).toFixed(2)} USD/mois
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Nom du local (optionnel)
                    </Label>
                    <Input
                      value={unit.label ?? ''}
                      onChange={(e) => updateUnit(idx, { label: e.target.value })}
                      placeholder={`Ex: Appartement A${idx + 1}`}
                      className="h-9 rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={cn('text-xs font-medium', missing ? 'text-destructive' : 'text-muted-foreground')}>
                      Loyer mensuel (USD) {missing && <span className="text-destructive">*</span>}
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
                        missing && 'border-destructive ring-1 ring-destructive/40',
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
