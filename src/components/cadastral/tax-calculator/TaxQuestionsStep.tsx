import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Calculator, Home, Building2, Factory, Tractor, Landmark, ArrowRight
} from 'lucide-react';
import { TaxCalculationInput } from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';

const ZONE_OPTIONS = [
  { value: 'urban', label: 'Urbaine', icon: Building2, desc: 'Ville, commune urbaine' },
  { value: 'rural', label: 'Rurale', icon: Tractor, desc: 'Territoire, collectivité' },
];

const USAGE_OPTIONS = [
  { value: 'residential', label: 'Résidentiel', icon: Home, desc: 'Habitation principale ou secondaire' },
  { value: 'commercial', label: 'Commercial', icon: Building2, desc: 'Bureau, boutique, entrepôt' },
  { value: 'industrial', label: 'Industriel', icon: Factory, desc: 'Usine, atelier de production' },
  { value: 'agricultural', label: 'Agricole', icon: Tractor, desc: 'Exploitation agricole' },
  { value: 'mixed', label: 'Mixte', icon: Landmark, desc: 'Usage combiné' },
];

const CONSTRUCTION_OPTIONS = [
  { value: 'en_dur', label: 'En dur', desc: 'Béton, briques, ciment' },
  { value: 'semi_dur', label: 'Semi-dur', desc: 'Matériaux mixtes' },
  { value: 'en_paille', label: 'En paille/bois', desc: 'Matériaux traditionnels' },
  { value: 'none', label: 'Terrain nu', desc: 'Pas de construction' },
];

interface TaxQuestionsStepProps {
  parcelNumber: string;
  parcelData?: any;
  input: TaxCalculationInput;
  setInput: React.Dispatch<React.SetStateAction<TaxCalculationInput>>;
  hasNoConstruction: boolean;
  setHasNoConstruction: (v: boolean) => void;
  onCalculate: () => void;
}

const TaxQuestionsStep: React.FC<TaxQuestionsStepProps> = ({
  parcelNumber, parcelData, input, setInput,
  hasNoConstruction, setHasNoConstruction, onCalculate
}) => {
  const currentYear = new Date().getFullYear();

  const handleConstructionChange = (value: string) => {
    if (value === 'none') {
      setHasNoConstruction(true);
      setInput(prev => ({ ...prev, constructionType: null }));
    } else {
      setHasNoConstruction(false);
      setInput(prev => ({ ...prev, constructionType: value as any }));
    }
  };

  return (
    <div className="space-y-4 px-4 pb-4">
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <Label className="text-base font-semibold flex items-center gap-1.5">
                Calculateur d'impôt
                <SectionHelpPopover
                  title="Calculateur fiscal"
                  description="Répondez à quelques questions pour estimer le montant de votre impôt foncier et/ou revenu locatif. Les données de la parcelle sont pré-remplies si disponibles."
                />
              </Label>
              <p className="text-xs text-muted-foreground">Parcelle: {parcelNumber}</p>
            </div>
          </div>

          {/* Fiscal year */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Exercice fiscal *</Label>
            <Select
              value={input.fiscalYear.toString()}
              onValueChange={(v) => setInput(prev => ({ ...prev, fiscalYear: parseInt(v) }))}
            >
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover">
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zone type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Type de zone *</Label>
            <div className="grid grid-cols-2 gap-2">
              {ZONE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = input.zoneType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setInput(prev => ({ ...prev, zoneType: opt.value as any }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selected ? 'text-primary' : ''}`}>{opt.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Usage type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Usage déclaré *</Label>
            <Select
              value={input.usageType}
              onValueChange={(v) => setInput(prev => ({ ...prev, usageType: v as any }))}
            >
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover">
                {USAGE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">— {opt.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Construction type */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Type de construction *</Label>
            <Select
              value={hasNoConstruction ? 'none' : (input.constructionType || '')}
              onValueChange={handleConstructionChange}
            >
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover">
                {CONSTRUCTION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">— {opt.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Area */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Superficie (m²) *</Label>
            <div className="relative">
              <input
                type="number"
                value={input.areaSqm || ''}
                onChange={(e) => setInput(prev => ({ ...prev, areaSqm: parseFloat(e.target.value) || 0 }))}
                placeholder="Ex: 500"
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
              {parcelData?.area_sqm && (
                <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px]">
                  Auto
                </Badge>
              )}
            </div>
            {parcelData?.area_sqm && (
              <p className="text-xs text-muted-foreground">
                Pré-rempli depuis les données cadastrales
              </p>
            )}
          </div>

          {/* IRL Section */}
          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Revenu locatif (IRL)
                <SectionHelpPopover
                  title="Impôt sur le Revenu Locatif"
                  description="Si votre bien est mis en location, un impôt de 22% est appliqué sur le revenu brut locatif annuel (article 13 de l'Ordonnance-loi n°69-009 du 10/02/1969)."
                />
              </Label>
              <Switch
                checked={input.isRented}
                onCheckedChange={(checked) => setInput(prev => ({ ...prev, isRented: checked }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Activez si ce bien génère des revenus locatifs
            </p>

            {input.isRented && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Loyer mensuel (USD) *</Label>
                  <input
                    type="number"
                    value={input.monthlyRentUsd || ''}
                    onChange={(e) => setInput(prev => ({ ...prev, monthlyRentUsd: parseFloat(e.target.value) || 0 }))}
                    placeholder="Ex: 500"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Mois d'occupation *</Label>
                  <Select
                    value={input.occupancyMonths.toString()}
                    onValueChange={(v) => setInput(prev => ({ ...prev, occupancyMonths: parseInt(v) }))}
                  >
                    <SelectTrigger className="h-10 text-sm rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl bg-popover">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={m.toString()}>
                          {m} mois
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Nombre de mois pendant lesquels le bien a été loué durant l'exercice
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onCalculate}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2"
      >
        <Calculator className="h-4 w-4" />
        Calculer l'impôt
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export { USAGE_OPTIONS };
export default TaxQuestionsStep;
