import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Home, Building2, Factory, Tractor, Landmark, ArrowRight, DollarSign, MapPin
} from 'lucide-react';
import {
  TaxCalculationInput, DRC_PROVINCES, DRC_MAJOR_CITIES,
} from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';
import TaxpayerIdentitySection from './TaxpayerIdentitySection';

const ZONE_OPTIONS = [
  { value: 'urban', label: 'Urbaine', icon: Building2, desc: 'Ville, commune urbaine' },
  { value: 'rural', label: 'Rurale', icon: Tractor, desc: 'Territoire, collectivité' },
];

const USAGE_OPTIONS = [
  { value: 'residential', label: 'Résidentiel', icon: Home, desc: 'Habitation' },
  { value: 'commercial', label: 'Commercial', icon: Building2, desc: 'Bureau, boutique' },
  { value: 'industrial', label: 'Industriel', icon: Factory, desc: 'Usine, atelier' },
  { value: 'agricultural', label: 'Agricole', icon: Tractor, desc: 'Exploitation' },
  { value: 'mixed', label: 'Mixte', icon: Landmark, desc: 'Usage combiné' },
];

interface IRLQuestionsStepProps {
  parcelNumber: string;
  input: TaxCalculationInput;
  setInput: React.Dispatch<React.SetStateAction<TaxCalculationInput>>;
  nif: string;
  setNif: (v: string) => void;
  ownerName: string;
  setOwnerName: (v: string) => void;
  idDocumentFile: File | null;
  setIdDocumentFile: (f: File | null) => void;
  hasNif: boolean | null;
  setHasNif: (v: boolean | null) => void;
  onCalculate: () => void;
}

const IRLQuestionsStep: React.FC<IRLQuestionsStepProps> = ({
  parcelNumber, input, setInput, nif, setNif,
  ownerName, setOwnerName, idDocumentFile, setIdDocumentFile, hasNif, setHasNif,
  onCalculate
}) => {
  const currentYear = new Date().getFullYear();
  const cities = DRC_MAJOR_CITIES[input.province] || [];

  return (
    <div className="space-y-3 px-4 pb-4">
      {/* Section 1: Identité du contribuable */}
      <TaxpayerIdentitySection
        ownerName={ownerName}
        setOwnerName={setOwnerName}
        idDocumentFile={idDocumentFile}
        setIdDocumentFile={setIdDocumentFile}
        hasNif={hasNif}
        setHasNif={setHasNif}
        nif={nif}
        setNif={setNif}
      />

      {/* Section 2: IRL Info */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <Label className="text-base font-semibold flex items-center gap-1.5">
                Impôt sur le Revenu Locatif
                <SectionHelpPopover
                  title="IRL — Ordonnance-loi n°69-009"
                  description="Taux de 22% sur les revenus locatifs bruts ou nets (après déduction forfaitaire de 30% pour frais d'entretien). Perçu par la Direction Générale des Recettes (DGR)."
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
        </CardContent>
      </Card>

      {/* Section 2: Localisation */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <Label className="text-sm font-semibold">Localisation</Label>
          </div>

          {/* Province */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Province *</Label>
            <Select
              value={input.province}
              onValueChange={(v) => setInput(prev => ({ ...prev, province: v, ville: '' }))}
            >
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl bg-popover max-h-60">
                {DRC_PROVINCES.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ville */}
          {input.zoneType === 'urban' && cities.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ville</Label>
              <Select
                value={input.ville || '_other'}
                onValueChange={(v) => setInput(prev => ({ ...prev, ville: v === '_other' ? '' : v }))}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover">
                  {cities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="_other">Autre ville</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
                    <span>{opt.label} — {opt.desc}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Revenus locatifs */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <Label className="text-sm font-semibold">Revenus locatifs</Label>
          </div>

          {/* Monthly rent */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Loyer mensuel (USD) *</Label>
            <Input
              type="number"
              value={input.monthlyRentUsd || ''}
              onChange={(e) => setInput(prev => ({ ...prev, monthlyRentUsd: parseFloat(e.target.value) || 0 }))}
              placeholder="Ex: 500"
              className="h-10 text-sm rounded-xl"
            />
          </div>

          {/* Occupancy months */}
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
          </div>

          {/* 30% deduction */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
            <div className="flex-1">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Déduction forfaitaire 30%
                <SectionHelpPopover
                  title="Déduction pour frais d'entretien"
                  description="Art. 13 de l'Ordonnance-loi n°69-009 : déduction forfaitaire de 30% sur le revenu brut locatif pour frais d'entretien et de réparation. Cette déduction réduit la base imposable."
                />
              </Label>
              <p className="text-xs text-muted-foreground">Frais d'entretien et réparation</p>
            </div>
            <Switch
              checked={input.applyDeduction30}
              onCheckedChange={(v) => setInput(prev => ({ ...prev, applyDeduction30: v }))}
            />
          </div>

          {input.applyDeduction30 && input.monthlyRentUsd > 0 && (
            <p className="text-xs text-emerald-600 font-medium pl-1">
              ✅ Base imposable réduite : {((input.monthlyRentUsd * input.occupancyMonths) * 0.7).toLocaleString()} USD au lieu de {(input.monthlyRentUsd * input.occupancyMonths).toLocaleString()} USD
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Pénalités */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            Retard de paiement
            <SectionHelpPopover
              title="Pénalités de retard"
              description="Intérêts moratoires de 2% par mois de retard. Majoration de 25% au-delà de 3 mois. Calculées à titre indicatif."
            />
          </Label>
          <Select
            value={input.monthsLate.toString()}
            onValueChange={(v) => setInput(prev => ({ ...prev, monthsLate: parseInt(v) }))}
          >
            <SelectTrigger className="h-9 text-sm rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-popover">
              <SelectItem value="0">Aucun retard</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                <SelectItem key={m} value={m.toString()}>
                  {m} mois {m > 3 ? '(+ majoration 25%)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Button
        onClick={onCalculate}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white gap-2"
      >
        <DollarSign className="h-4 w-4" />
        Calculer l'IRL
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default IRLQuestionsStep;
