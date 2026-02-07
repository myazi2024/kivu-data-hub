import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Calculator, Home, Building2, Factory, Tractor, Landmark, ArrowRight, MapPin, Shield
} from 'lucide-react';
import {
  TaxCalculationInput, DRC_PROVINCES, DRC_MAJOR_CITIES,
  EXEMPTION_DEFINITIONS, ROOFING_TYPES, ExemptionCheckType,
} from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';

const ZONE_OPTIONS = [
  { value: 'urban', label: 'Urbaine', icon: Building2, desc: 'Ville, commune urbaine' },
  { value: 'rural', label: 'Rurale', icon: Tractor, desc: 'Territoire, collectivité' },
];

export const USAGE_OPTIONS = [
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

const REDEVABLE_QUALITES = [
  { value: 'gerant', label: 'Gérant' },
  { value: 'mandataire', label: 'Mandataire' },
  { value: 'locataire', label: 'Locataire principal' },
  { value: 'syndic', label: 'Syndic de copropriété' },
];

interface PropertyTaxQuestionsStepProps {
  parcelNumber: string;
  parcelData?: any;
  input: TaxCalculationInput;
  setInput: React.Dispatch<React.SetStateAction<TaxCalculationInput>>;
  hasNoConstruction: boolean;
  setHasNoConstruction: (v: boolean) => void;
  nif: string;
  setNif: (v: string) => void;
  onCalculate: () => void;
}

const PropertyTaxQuestionsStep: React.FC<PropertyTaxQuestionsStepProps> = ({
  parcelNumber, parcelData, input, setInput,
  hasNoConstruction, setHasNoConstruction, nif, setNif, onCalculate
}) => {
  const currentYear = new Date().getFullYear();
  const cities = DRC_MAJOR_CITIES[input.province] || [];

  const handleConstructionChange = (value: string) => {
    if (value === 'none') {
      setHasNoConstruction(true);
      setInput(prev => ({ ...prev, constructionType: null }));
    } else {
      setHasNoConstruction(false);
      setInput(prev => ({ ...prev, constructionType: value as any }));
    }
  };

  const toggleExemption = (type: ExemptionCheckType, checked: boolean) => {
    setInput(prev => ({
      ...prev,
      selectedExemptions: checked
        ? [...prev.selectedExemptions, type]
        : prev.selectedExemptions.filter(e => e !== type),
    }));
  };

  return (
    <div className="space-y-3 px-4 pb-4">
      {/* Section 1: Identification fiscale */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <Label className="text-base font-semibold flex items-center gap-1.5">
                Impôt foncier annuel
                <SectionHelpPopover
                  title="Impôt foncier annuel"
                  description="Déclaration conforme à l'Ordonnance-loi n°69-006 du 10/02/1969. Impôt perçu par la Direction Générale des Impôts (DGI). Les taux varient selon la province, le type de zone et la nature de la construction."
                />
              </Label>
              <p className="text-xs text-muted-foreground">Parcelle: {parcelNumber}</p>
            </div>
          </div>

          {/* NIF */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">NIF du contribuable *</Label>
            <Input
              value={nif}
              onChange={(e) => setNif(e.target.value)}
              placeholder="Ex: A0123456B"
              className="h-10 text-sm rounded-xl"
            />
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

          {/* Redevable différent */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Redevable différent du propriétaire ?
                <SectionHelpPopover
                  title="Contribuable vs Redevable"
                  description="Le contribuable est le propriétaire du bien. Le redevable est la personne tenue au paiement (gérant, mandataire, locataire principal). Si différent, renseignez les informations du redevable."
                />
              </Label>
              <Switch
                checked={input.redevableIsDifferent}
                onCheckedChange={(v) => setInput(prev => ({ ...prev, redevableIsDifferent: v }))}
              />
            </div>
            {input.redevableIsDifferent && (
              <div className="space-y-2 pl-2 border-l-2 border-primary/20 ml-1">
                <Input
                  value={input.redevableNom}
                  onChange={(e) => setInput(prev => ({ ...prev, redevableNom: e.target.value }))}
                  placeholder="Nom du redevable"
                  className="h-9 text-sm rounded-xl"
                />
                <Input
                  value={input.redevableNif}
                  onChange={(e) => setInput(prev => ({ ...prev, redevableNif: e.target.value }))}
                  placeholder="NIF du redevable"
                  className="h-9 text-sm rounded-xl"
                />
                <Select
                  value={input.redevableQualite || '_placeholder'}
                  onValueChange={(v) => setInput(prev => ({ ...prev, redevableQualite: v === '_placeholder' ? '' : v }))}
                >
                  <SelectTrigger className="h-9 text-sm rounded-xl">
                    <SelectValue placeholder="Qualité du redevable" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl bg-popover">
                    {REDEVABLE_QUALITES.map(q => (
                      <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Localisation géographique */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <Label className="text-sm font-semibold">Localisation & zone fiscale</Label>
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

          {/* Ville (if urban and cities exist) */}
          {input.zoneType === 'urban' && cities.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Ville</Label>
              <Select
                value={input.ville || '_other'}
                onValueChange={(v) => setInput(prev => ({ ...prev, ville: v === '_other' ? '' : v }))}
              >
                <SelectTrigger className="h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Sélectionner la ville" />
                </SelectTrigger>
                <SelectContent className="rounded-xl bg-popover">
                  {cities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                  <SelectItem value="_other">Autre ville</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {input.province === 'Kinshasa'
                  ? '⚡ Kinshasa : taux majoré (×1.5)'
                  : cities.includes(input.ville)
                    ? '📍 Capitale provinciale : taux standard (×1.2)'
                    : '🏘️ Ville secondaire : taux de base'}
              </p>
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
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Construction */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Home className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <Label className="text-sm font-semibold">Détails de la construction</Label>
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

          {!hasNoConstruction && (
            <>
              {/* Construction year */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Année de construction</Label>
                <Input
                  type="number"
                  value={input.constructionYear || ''}
                  onChange={(e) => setInput(prev => ({ ...prev, constructionYear: parseInt(e.target.value) || null }))}
                  placeholder="Ex: 2019"
                  className="h-9 text-sm rounded-xl"
                  min={1900}
                  max={currentYear}
                />
                {input.constructionYear && (currentYear - input.constructionYear) < 5 && (
                  <p className="text-xs text-emerald-600 font-medium">
                    ✅ Éligible à l'exonération temporaire (construction &lt; 5 ans)
                  </p>
                )}
              </div>

              {/* Number of floors */}
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

              {/* Roofing type */}
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
        </CardContent>
      </Card>

      {/* Section 4: Exonérations */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              Exonérations fiscales
              <SectionHelpPopover
                title="Exonérations"
                description="Conformément à l'art. 8 de l'Ordonnance-loi n°69-006. Les exonérations doivent être confirmées par l'administration fiscale compétente."
              />
            </Label>
          </div>

          <div className="space-y-2">
            {EXEMPTION_DEFINITIONS.map(ex => (
              <div key={ex.type} className="flex items-start gap-2.5">
                <Checkbox
                  id={ex.type}
                  checked={input.selectedExemptions.includes(ex.type)}
                  onCheckedChange={(checked) => toggleExemption(ex.type, !!checked)}
                  className="mt-0.5"
                />
                <div>
                  <label htmlFor={ex.type} className="text-sm font-medium cursor-pointer">{ex.label}</label>
                  <p className="text-xs text-muted-foreground">{ex.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Pénalités de retard */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            Retard de paiement
            <SectionHelpPopover
              title="Pénalités de retard"
              description="Intérêts moratoires de 2% par mois de retard. Majoration de 25% au-delà de 3 mois de retard. Ces pénalités sont calculées automatiquement à titre indicatif."
            />
          </Label>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Mois de retard</Label>
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
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={onCalculate}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2"
      >
        <Calculator className="h-4 w-4" />
        Calculer l'impôt foncier
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default PropertyTaxQuestionsStep;
