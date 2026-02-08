import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calculator, Home, Building2, Factory, Tractor, Landmark, ArrowRight, MapPin, Shield, Upload, FileCheck, X
} from 'lucide-react';
import {
  TaxCalculationInput, DRC_PROVINCES, DRC_MAJOR_CITIES,
  EXEMPTION_DEFINITIONS, ROOFING_TYPES, ExemptionCheckType,
  getLatePenaltyInfo,
} from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';
import TaxpayerIdentitySection from './TaxpayerIdentitySection';
import { toast } from 'sonner';

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

interface PropertyTaxQuestionsStepProps {
  parcelNumber: string;
  parcelData?: any;
  input: TaxCalculationInput;
  setInput: React.Dispatch<React.SetStateAction<TaxCalculationInput>>;
  hasNoConstruction: boolean;
  setHasNoConstruction: (v: boolean) => void;
  nif: string;
  setNif: (v: string) => void;
  ownerName: string;
  setOwnerName: (v: string) => void;
  idDocumentFile: File | null;
  setIdDocumentFile: (f: File | null) => void;
  hasNif: boolean | null;
  setHasNif: (v: boolean | null) => void;
  exemptionCertificateFile: File | null;
  setExemptionCertificateFile: (f: File | null) => void;
  zoneAutoDetected?: boolean;
  onCalculate: () => void;
  onOpenServiceCatalog?: () => void;
}

const PropertyTaxQuestionsStep: React.FC<PropertyTaxQuestionsStepProps> = ({
  parcelNumber, parcelData, input, setInput,
  hasNoConstruction, setHasNoConstruction, nif, setNif,
  ownerName, setOwnerName, idDocumentFile, setIdDocumentFile, hasNif, setHasNif,
  exemptionCertificateFile, setExemptionCertificateFile, zoneAutoDetected, onCalculate,
  onOpenServiceCatalog
}) => {
  const currentYear = new Date().getFullYear();
  const cities = DRC_MAJOR_CITIES[input.province] || [];
  const [hasExemption, setHasExemption] = useState<boolean | null>(
    input.selectedExemptions.length > 0 ? true : null
  );

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
        onOpenServiceCatalog={onOpenServiceCatalog}
      />

      {/* Section 2: Identification fiscale */}
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
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Province *
              {parcelData?.province && (
                <Badge variant="secondary" className="text-[10px]">Auto</Badge>
              )}
            </Label>
            <Select
              value={input.province}
              disabled={!!parcelData?.province}
              onValueChange={(v) => setInput(prev => ({ ...prev, province: v, ville: '' }))}
            >
              <SelectTrigger className={`h-10 text-sm rounded-xl ${parcelData?.province ? 'opacity-70' : ''}`}>
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
              <Label className="text-sm font-medium flex items-center gap-1.5">
                Ville
                {parcelData?.ville && (
                  <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                )}
              </Label>
              <Select
                value={input.ville || '_other'}
                disabled={!!parcelData?.ville}
                onValueChange={(v) => setInput(prev => ({ ...prev, ville: v === '_other' ? '' : v }))}
              >
                <SelectTrigger className={`h-10 text-sm rounded-xl ${parcelData?.ville ? 'opacity-70' : ''}`}>
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
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Type de zone *
              {zoneAutoDetected && (
                <Badge variant="secondary" className="text-[10px]">Auto (préfixe {input.zoneType === 'rural' ? 'SR' : 'SU'})</Badge>
              )}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {ZONE_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = input.zoneType === opt.value;
                return (
                  <button
                    key={opt.value}
                    disabled={zoneAutoDetected}
                    onClick={() => setInput(prev => ({ ...prev, zoneType: opt.value as any }))}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/30'
                    } ${zoneAutoDetected ? 'opacity-70 cursor-not-allowed' : ''}`}
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
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Usage déclaré *
              {parcelData?.declared_usage && (
                <Badge variant="secondary" className="text-[10px]">Auto</Badge>
              )}
            </Label>
            <Select
              value={input.usageType}
              disabled={!!parcelData?.declared_usage}
              onValueChange={(v) => setInput(prev => ({ ...prev, usageType: v as any }))}
            >
              <SelectTrigger className={`h-10 text-sm rounded-xl ${parcelData?.declared_usage ? 'opacity-70' : ''}`}>
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
            <Label className="text-sm font-medium flex items-center gap-1.5">
              Superficie (m²) *
              {parcelData?.area_sqm && (
                <Badge variant="secondary" className="text-[10px]">Auto</Badge>
              )}
            </Label>
            <div className="relative">
              <input
                type="number"
                value={input.areaSqm || ''}
                disabled={!!parcelData?.area_sqm}
                onChange={(e) => setInput(prev => ({ ...prev, areaSqm: parseFloat(e.target.value) || 0 }))}
                placeholder="Ex: 500"
                className={`flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${parcelData?.area_sqm ? 'opacity-70' : ''}`}
              />
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

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Bénéficiez-vous d'une exonération fiscale ? *</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: true, label: 'Oui', desc: 'Je suis exonéré(e)' },
                { value: false, label: 'Non', desc: 'Pas d\'exonération' },
              ].map(opt => {
                const selected = hasExemption === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => {
                      setHasExemption(opt.value);
                      if (!opt.value) {
                        setInput(prev => ({ ...prev, selectedExemptions: [] }));
                      }
                    }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <span className={`text-sm font-medium ${selected ? 'text-primary' : ''}`}>{opt.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {hasExemption === true && (
            <div className="space-y-3 pt-1">
              <Label className="text-sm font-medium">Cochez les exonérations applicables :</Label>
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

              {/* Certificat d'exonération fiscale */}
              <div className="mt-3 p-3 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold text-primary">Certificat d'exonération fiscale *</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Joignez votre certificat d'exonération délivré par la Direction Générale des Impôts (DGI). Format PDF ou image, max 10 Mo.
                </p>
                {exemptionCertificateFile ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                    <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm truncate flex-1">{exemptionCertificateFile.name}</span>
                    <button
                      onClick={() => setExemptionCertificateFile(null)}
                      className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Choisir un fichier…</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && file.size <= 10 * 1024 * 1024) {
                          setExemptionCertificateFile(file);
                        } else if (file) {
                          toast?.('Le fichier dépasse la taille maximale de 10 Mo');
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Retard de paiement (auto-calculé) */}
      {(() => {
        const penaltyInfo = getLatePenaltyInfo(input.fiscalYear);
        return (
          <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                Retard de paiement
                <SectionHelpPopover
                  title="Calendrier fiscal — RDC"
                  description="Janvier : constat de la situation du bien. Avant le 1er février : dépôt de la déclaration. Janvier–mars : paiement de l'impôt foncier. Au-delà du 31 mars : pénalités de retard (2 % par mois, plafonnées à 24 %). Majoration de 25 % au-delà de 3 mois de retard."
                />
              </Label>

              <div className={`p-3 rounded-xl border ${penaltyInfo.isLate ? 'bg-destructive/5 border-destructive/30' : 'bg-emerald-50 border-emerald-200'}`}>
                <p className={`text-sm font-medium ${penaltyInfo.isLate ? 'text-destructive' : 'text-emerald-700'}`}>
                  {penaltyInfo.isLate
                    ? `⚠️ Retard de ${penaltyInfo.monthsLate} mois — Pénalité : ${penaltyInfo.penaltyRate}%${penaltyInfo.hasSurcharge ? ' + majoration 25%' : ''}`
                    : `✅ Aucun retard — Échéance : ${penaltyInfo.deadlineStr}`
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Exercice fiscal {input.fiscalYear} — Échéance légale : {penaltyInfo.deadlineStr}
                </p>
                {penaltyInfo.isLate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Intérêts moratoires : 2 % par mois de retard (plafonné à 24 %).
                    {penaltyInfo.hasSurcharge && ' Majoration de 25 % applicable (retard supérieur à 3 mois).'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })()}

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
