import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Info, Loader2, Lock } from 'lucide-react';
import {
  useSubdivisionInfrastructureTariffs,
  type InfrastructureCategory,
  type InfrastructureUnit,
} from '@/hooks/useSubdivisionInfrastructureTariffs';

export interface InfrastructureSelectionEntry {
  infrastructure_key: string;
  label: string;
  unit: InfrastructureUnit;
  quantity: number;
  rate_usd: number;
  subtotal_usd: number;
}

interface StepInfrastructuresProps {
  sectionType: 'urban' | 'rural';
  selections: Record<string, number>; // key -> quantity
  onChange: (next: Record<string, number>) => void;
  numberOfLots: number;
}

const UNIT_LABEL: Record<InfrastructureUnit, string> = {
  linear_m: 'mètre linéaire',
  sqm: 'm²',
  unit: 'unité',
  lot: 'lot',
};

const CATEGORY_LABEL: Record<InfrastructureCategory, string> = {
  voirie: 'Voirie & accès',
  amenagement: 'Aménagements',
  reseau: 'Réseaux',
  equipement: 'Équipements collectifs',
};

const StepInfrastructures: React.FC<StepInfrastructuresProps> = ({
  sectionType,
  selections,
  onChange,
  numberOfLots,
}) => {
  const { tariffs, loading } = useSubdivisionInfrastructureTariffs({ sectionType });

  // Force-include required ones (quantity defaults: 0 → user must fill)
  const grouped = useMemo(() => {
    const map = new Map<InfrastructureCategory, typeof tariffs>();
    for (const t of tariffs) {
      const arr = map.get(t.category) || [];
      arr.push(t);
      map.set(t.category, arr);
    }
    return Array.from(map.entries());
  }, [tariffs]);

  const setQty = (key: string, qty: number) => {
    const next = { ...selections };
    if (qty <= 0) delete next[key];
    else next[key] = qty;
    onChange(next);
  };

  const toggle = (key: string, checked: boolean, defaultQty: number) => {
    const next = { ...selections };
    if (checked) next[key] = next[key] || defaultQty;
    else delete next[key];
    onChange(next);
  };

  const total = useMemo(() => {
    return tariffs.reduce((sum, t) => {
      const qty = selections[t.infrastructure_key] || 0;
      return sum + qty * t.rate_usd;
    }, 0);
  }, [tariffs, selections]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Infrastructures du lotissement</h3>
      </div>

      <Alert className="py-2">
        <Info className="h-3.5 w-3.5" />
        <AlertDescription className="text-xs">
          Sélectionnez les infrastructures prévues sur votre lotissement et
          renseignez les quantités estimées. Le surcoût est ajouté
          automatiquement au montant de la demande.
        </AlertDescription>
      </Alert>

      {grouped.map(([category, items]) => (
        <Card key={category}>
          <CardContent className="pt-3 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {CATEGORY_LABEL[category] || category}
            </div>
            <div className="space-y-2">
              {items.map(t => {
                const isSelected = selections[t.infrastructure_key] != null;
                const qty = selections[t.infrastructure_key] || 0;
                const subtotal = qty * t.rate_usd;
                const defaultQty = t.unit === 'lot' ? Math.max(1, numberOfLots) : 1;
                const required = t.is_required;
                return (
                  <div
                    key={t.id}
                    className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3 p-2 rounded-md border bg-card/40"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <Checkbox
                        id={`infra-${t.id}`}
                        checked={isSelected || required}
                        disabled={required}
                        onCheckedChange={(c) =>
                          toggle(t.infrastructure_key, !!c, defaultQty)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`infra-${t.id}`}
                          className="text-xs font-medium cursor-pointer flex items-center gap-1.5"
                        >
                          {t.label}
                          {required && (
                            <Badge variant="secondary" className="h-4 text-[9px] gap-0.5">
                              <Lock className="h-2.5 w-2.5" /> Obligatoire
                            </Badge>
                          )}
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          {t.rate_usd.toFixed(2)} USD / {UNIT_LABEL[t.unit]}
                          {t.description ? ` — ${t.description}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:w-56">
                      <Input
                        type="number"
                        min={0}
                        step={t.unit === 'sqm' || t.unit === 'linear_m' ? 1 : 1}
                        value={qty || ''}
                        placeholder={`Qté (${UNIT_LABEL[t.unit]})`}
                        disabled={!isSelected && !required}
                        onChange={(e) => {
                          const v = Math.max(0, Number(e.target.value) || 0);
                          if (required && v === 0) setQty(t.infrastructure_key, defaultQty);
                          else setQty(t.infrastructure_key, v);
                        }}
                        onFocus={() => {
                          if (required && !selections[t.infrastructure_key]) {
                            setQty(t.infrastructure_key, defaultQty);
                          }
                        }}
                        className="h-7 text-xs"
                      />
                      <span className="text-xs font-mono whitespace-nowrap min-w-[80px] text-right">
                        {subtotal > 0 ? `${subtotal.toFixed(2)} $` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-3 flex items-center justify-between">
          <span className="text-xs font-semibold">Surcoût infrastructures</span>
          <span className="text-base font-bold text-primary">
            {total.toFixed(2)} USD
          </span>
        </CardContent>
      </Card>
    </div>
  );
};

export default StepInfrastructures;
