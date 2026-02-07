import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calculator, ChevronRight, ChevronLeft, CheckCircle2,
  Loader2, MapPin, Home, Building2, Factory, Tractor,
  Landmark, ArrowRight, Receipt, Info, CreditCard
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePropertyTaxCalculator, TaxCalculationInput, TaxCalculationResult } from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from './SectionHelpPopover';
import { toast } from 'sonner';

interface PropertyTaxCalculatorProps {
  parcelNumber: string;
  parcelId?: string;
  parcelData?: any;
}

type CalcStep = 'questions' | 'result' | 'payment';

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

const PropertyTaxCalculator: React.FC<PropertyTaxCalculatorProps> = ({
  parcelNumber,
  parcelId,
  parcelData
}) => {
  const { user } = useAuth();
  const { calculate, loading: configLoading } = usePropertyTaxCalculator();

  const currentYear = new Date().getFullYear();
  const [calcStep, setCalcStep] = useState<CalcStep>('questions');
  const [result, setResult] = useState<TaxCalculationResult | null>(null);

  // Pre-fill from parcel data
  const defaultZone = parcelData?.parcel_type === 'rural' ? 'rural' : 'urban';
  const defaultUsage = parcelData?.declared_usage === 'Commercial' ? 'commercial'
    : parcelData?.declared_usage === 'Industriel' ? 'industrial'
    : parcelData?.declared_usage === 'Agricole' ? 'agricultural'
    : 'residential';
  const defaultConstruction = parcelData?.construction_type === 'En dur' ? 'en_dur'
    : parcelData?.construction_type === 'Semi-dur' ? 'semi_dur'
    : parcelData?.construction_type === 'En paille' ? 'en_paille'
    : parcelData?.construction_type === 'Terrain nu' ? 'none'
    : null;

  const [input, setInput] = useState<TaxCalculationInput>({
    zoneType: (defaultZone as any) || 'urban',
    usageType: (defaultUsage as any) || 'residential',
    constructionType: defaultConstruction === 'none' ? null : (defaultConstruction as any),
    areaSqm: parcelData?.area_sqm || 0,
    fiscalYear: currentYear,
  });

  const [hasNoConstruction, setHasNoConstruction] = useState(defaultConstruction === 'none');

  const handleConstructionChange = (value: string) => {
    if (value === 'none') {
      setHasNoConstruction(true);
      setInput(prev => ({ ...prev, constructionType: null }));
    } else {
      setHasNoConstruction(false);
      setInput(prev => ({ ...prev, constructionType: value as any }));
    }
  };

  const handleCalculate = () => {
    if (!input.areaSqm || input.areaSqm <= 0) {
      toast.error('Veuillez renseigner la superficie de la parcelle');
      return;
    }
    const res = calculate(input);
    setResult(res);
    setCalcStep('result');
  };

  const handlePayment = () => {
    if (!user) {
      toast.error('Vous devez être connecté pour effectuer le paiement');
      return;
    }
    toast.info('Le paiement en ligne sera disponible prochainement');
    // TODO: integrate with existing payment flow
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (calcStep === 'result' && result) {
    return (
      <div className="space-y-4 px-4 pb-4">
        {/* Result card */}
        <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <Label className="text-base font-semibold">Estimation fiscale</Label>
                <p className="text-xs text-muted-foreground">Exercice {input.fiscalYear}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Parcelle</span>
                <span className="font-mono font-bold">{parcelNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Zone</span>
                <span>{input.zoneType === 'urban' ? 'Urbaine' : 'Rurale'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Usage</span>
                <span>{USAGE_OPTIONS.find(o => o.value === input.usageType)?.label}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/50">
                <span className="text-muted-foreground">Superficie</span>
                <span>{input.areaSqm.toLocaleString()} m²</span>
              </div>
            </div>

            <Separator />

            {/* Tax breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Détail du calcul</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base fixe</span>
                  <span>{result.baseTax.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Composante surface</span>
                  <span>{result.areaComponent.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
                  <span>Impôt foncier</span>
                  <span>{result.totalTax.toLocaleString()} USD</span>
                </div>
              </div>
            </div>

            {result.fees.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5">
                    Frais applicables
                    <SectionHelpPopover
                      title="Frais de traitement"
                      description="Ces frais couvrent les coûts bancaires et administratifs liés au traitement de votre paiement en ligne."
                    />
                  </h4>
                  <div className="space-y-1.5 text-sm">
                    {result.fees.map((fee, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-muted-foreground">{fee.name}</span>
                        <span>{fee.amount.toLocaleString()} USD</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="flex justify-between text-base font-bold">
              <span>Total à payer</span>
              <span className="text-emerald-600">{result.grandTotal.toLocaleString()} USD</span>
            </div>

            {!result.matchedRate && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  ⚠️ Aucun barème correspondant trouvé pour cette configuration. Contactez l'administration pour une estimation personnalisée.
                </p>
              </div>
            )}

            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                ℹ️ Cette estimation est indicative et basée sur les barèmes en vigueur. Le montant définitif peut varier selon l'évaluation de l'administration fiscale.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCalcStep('questions')}
            className="flex-1 h-11 rounded-xl gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Modifier
          </Button>
          <Button
            onClick={handlePayment}
            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Payer
          </Button>
        </div>
      </div>
    );
  }

  // Questions step
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
                  description="Répondez à quelques questions pour estimer le montant de votre impôt foncier. Les données de la parcelle sont pré-remplies si disponibles."
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
        </CardContent>
      </Card>

      <Button
        onClick={handleCalculate}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2"
      >
        <Calculator className="h-4 w-4" />
        Calculer l'impôt
      </Button>
    </div>
  );
};

export default PropertyTaxCalculator;
