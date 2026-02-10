import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calculator, ArrowRight, Shield, Upload, FileCheck, X
} from 'lucide-react';
import {
  TaxCalculationInput,
  EXEMPTION_DEFINITIONS, ExemptionCheckType,
} from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';
import TaxpayerIdentitySection from './TaxpayerIdentitySection';
import TaxLocationSection from './TaxLocationSection';
import TaxPenaltySection from './TaxPenaltySection';
import TaxRedevableSection from './TaxRedevableSection';
import ConstructionDetailsSection from './ConstructionDetailsSection';
import { toast } from 'sonner';
import ExemptionRequestInfoBlock from './ExemptionRequestInfoBlock';
import ExemptionRequestDialog from './ExemptionRequestDialog';

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
  const [showExemptionRequest, setShowExemptionRequest] = useState(false);

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

      {/* Section: Localisation — shared component */}
      <TaxLocationSection input={input} parcelData={parcelData} />

      {/* Section: Détails de la construction — shared component */}
      <ConstructionDetailsSection
        input={input}
        setInput={setInput}
        parcelData={parcelData}
        hasNoConstruction={hasNoConstruction}
        showAdvancedFields={true}
      />

      {/* Section: Exonérations */}
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

                {/* Info block when no certificate is uploaded */}
                {!exemptionCertificateFile && (
                  <ExemptionRequestInfoBlock onRequestExemption={() => setShowExemptionRequest(true)} />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section: Redevable différent */}
      <TaxRedevableSection input={input} setInput={setInput} />

      {/* Section: Retard de paiement — shared component */}
      <TaxPenaltySection fiscalYear={input.fiscalYear} taxType="property" />

      <Button
        onClick={onCalculate}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2"
      >
        <Calculator className="h-4 w-4" />
        Calculer l'impôt foncier
        <ArrowRight className="h-4 w-4" />
      </Button>

      {/* Exemption Request Dialog */}
      <ExemptionRequestDialog
        open={showExemptionRequest}
        onOpenChange={setShowExemptionRequest}
        parcelNumber={parcelNumber}
        parcelData={parcelData}
      />
    </div>
  );
};

export default PropertyTaxQuestionsStep;
