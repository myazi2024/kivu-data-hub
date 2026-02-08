import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calculator, Home, ArrowRight, Shield, Upload, FileCheck, X
} from 'lucide-react';
import {
  TaxCalculationInput,
  EXEMPTION_DEFINITIONS, ROOFING_TYPES, ExemptionCheckType,
} from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';
import TaxpayerIdentitySection from './TaxpayerIdentitySection';
import TaxLocationSection from './TaxLocationSection';
import TaxPenaltySection from './TaxPenaltySection';
import { CONSTRUCTION_OPTIONS } from './taxFormConstants';
import { toast } from 'sonner';

// Re-export for backward compatibility
export { USAGE_OPTIONS } from './taxFormConstants';

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
  const [hasExemption, setHasExemption] = useState<boolean | null>(
    input.selectedExemptions.length > 0 ? true : null
  );

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

      {/* Section 2: Localisation — shared component */}
      <TaxLocationSection input={input} parcelData={parcelData} />

      {/* Section 3: Détails de la construction */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Home className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <Label className="text-sm font-semibold">Détails de la construction</Label>
            <Badge variant="outline" className="text-[10px] ml-auto">Données auto-remplies</Badge>
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
                    : '—'
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
                          toast.error('Le fichier dépasse la taille maximale de 10 Mo');
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

      {/* Section 5: Retard de paiement — shared component */}
      <TaxPenaltySection fiscalYear={input.fiscalYear} taxType="property" />

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
