import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home } from 'lucide-react';
import { TaxCalculationInput, ROOFING_TYPES } from '@/hooks/usePropertyTaxCalculator';
import { CONSTRUCTION_OPTIONS } from './taxFormConstants';

interface ConstructionDetailsSectionProps {
  input: TaxCalculationInput;
  setInput?: React.Dispatch<React.SetStateAction<TaxCalculationInput>>;
  parcelData?: any;
  hasNoConstruction: boolean;
  /** Show floors/roofing selectors (only for property tax) */
  showAdvancedFields?: boolean;
}

const ConstructionDetailsSection: React.FC<ConstructionDetailsSectionProps> = ({
  input, setInput, parcelData, hasNoConstruction, showAdvancedFields = false
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Home className="h-3.5 w-3.5 text-amber-600" />
          </div>
          <Label className="text-sm font-semibold">Détails de la construction</Label>
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal ml-auto">Données auto-remplies</span>
        </div>

        {/* Type de construction */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            Type de construction
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
          </Label>
          <Input
            value={
              hasNoConstruction
                ? 'Terrain nu — Pas de construction'
                : CONSTRUCTION_OPTIONS.find(o => o.value === input.constructionType)
                  ? `${CONSTRUCTION_OPTIONS.find(o => o.value === input.constructionType)?.label} — ${CONSTRUCTION_OPTIONS.find(o => o.value === input.constructionType)?.desc}`
                  : parcelData?.construction_type || '—'
            }
            disabled
            className="h-10 text-sm rounded-xl opacity-70"
          />
        </div>

        {/* Nature de la construction */}
        {parcelData?.construction_nature && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Nature de la construction
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
            </Label>
            <Input value={parcelData.construction_nature} disabled className="h-10 text-sm rounded-xl opacity-70" />
          </div>
        )}

        {!hasNoConstruction && (
          <>
            {/* Année de construction */}
            {(input.constructionYear || parcelData?.construction_year) && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  Année de construction
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
                </Label>
                <Input
                  value={input.constructionYear || parcelData?.construction_year || '—'}
                  disabled
                  className="h-10 text-sm rounded-xl opacity-70"
                />
                {input.constructionYear && (currentYear - input.constructionYear) < 5 && (
                  <p className="text-xs text-emerald-600 font-medium">
                    ✅ Éligible à l'exonération temporaire (construction &lt; 5 ans)
                  </p>
                )}
              </div>
            )}

            {/* Advanced fields: floors & roofing (property tax only) */}
            {showAdvancedFields && setInput && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Nombre d'étages</Label>
                  <Select
                    value={input.numberOfFloors.toString()}
                    onValueChange={(v) => setInput(prev => ({ ...prev, numberOfFloors: parseInt(v) }))}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-popover">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n === 1 ? 'Rez-de-chaussée' : `R+${n - 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Type de toiture</Label>
                  <Select
                    value={input.roofingType || '_placeholder'}
                    onValueChange={(v) => setInput(prev => ({ ...prev, roofingType: v === '_placeholder' ? '' : v }))}
                  >
                    <SelectTrigger className="h-9 text-sm rounded-xl">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-popover">
                      {ROOFING_TYPES.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </>
        )}

        {/* Superficie */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            Superficie (m²)
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md font-normal">Auto</span>
          </Label>
          <Input
            value={
              (input.areaSqm || Number(parcelData?.area_sqm))
                ? `${(input.areaSqm || Number(parcelData?.area_sqm)).toLocaleString('fr-FR')} m²`
                : '—'
            }
            disabled
            className="h-10 text-sm rounded-xl opacity-70"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ConstructionDetailsSection;
