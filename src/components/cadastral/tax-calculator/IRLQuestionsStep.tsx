import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  ArrowRight, DollarSign, Shield
} from 'lucide-react';
import {
  TaxCalculationInput,
} from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';
import TaxpayerIdentitySection from './TaxpayerIdentitySection';
import TaxLocationSection from './TaxLocationSection';
import TaxPenaltySection from './TaxPenaltySection';
import TaxRedevableSection from './TaxRedevableSection';
import ConstructionDetailsSection from './ConstructionDetailsSection';
import IRLTenantsList, { TenantEntry } from './IRLTenantsList';
import ExemptionRequestInfoBlock from './ExemptionRequestInfoBlock';
import ExemptionRequestDialog from './ExemptionRequestDialog';

interface IRLQuestionsStepProps {
  parcelNumber: string;
  parcelData?: any;
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
  tenants: TenantEntry[];
  setTenants: React.Dispatch<React.SetStateAction<TenantEntry[]>>;
  zoneAutoDetected?: boolean;
  onCalculate: () => void;
  onOpenServiceCatalog?: () => void;
}

const IRLQuestionsStep: React.FC<IRLQuestionsStepProps> = ({
  parcelNumber, parcelData, input, setInput, nif, setNif,
  ownerName, setOwnerName, idDocumentFile, setIdDocumentFile, hasNif, setHasNif,
  tenants, setTenants, zoneAutoDetected,
  onCalculate, onOpenServiceCatalog
}) => {
  const currentYear = new Date().getFullYear();
  const [showExemptionRequest, setShowExemptionRequest] = useState(false);

  const hasNoConstruction = parcelData?.construction_type === 'Terrain nu' || (!input.constructionType && !parcelData?.construction_type);

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

      {/* Section: Localisation — shared component */}
      <TaxLocationSection input={input} parcelData={parcelData} showArea={false} />

      {/* Section: Détails de la construction — shared component */}
      <ConstructionDetailsSection
        input={input}
        parcelData={parcelData}
        hasNoConstruction={hasNoConstruction}
        showAdvancedFields={false}
      />

      {/* Section: Redevable différent */}
      <TaxRedevableSection input={input} setInput={setInput} />

      {/* Section: Locataires */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <IRLTenantsList
            tenants={tenants}
            setTenants={setTenants}
            fiscalYear={input.fiscalYear}
          />

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
        </CardContent>
      </Card>

      {/* Section: Exonération IRL - info block */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              Exonération fiscale
              <SectionHelpPopover
                title="Exonération IRL"
                description="Si vous estimez être éligible à une exonération de l'impôt sur le revenu locatif, vous pouvez demander un certificat d'exonération auprès de la DGR."
              />
            </Label>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Si vous disposez d'un certificat d'exonération, joignez-le dans la déclaration. 
            Sinon, vous pouvez soumettre une demande ci-dessous.
          </p>
          <ExemptionRequestInfoBlock onRequestExemption={() => setShowExemptionRequest(true)} />
        </CardContent>
      </Card>

      {/* Section: Retard de paiement — shared component */}
      <TaxPenaltySection fiscalYear={input.fiscalYear} taxType="irl" />

      <Button
        onClick={onCalculate}
        className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white gap-2"
      >
        <DollarSign className="h-4 w-4" />
        Calculer l'IRL
        <ArrowRight className="h-4 w-4" />
      </Button>

      {/* Exemption Request Dialog */}
      <ExemptionRequestDialog
        open={showExemptionRequest}
        onOpenChange={setShowExemptionRequest}
        parcelNumber={parcelNumber}
        parcelData={parcelData}
        defaultTab="irl"
      />
    </div>
  );
};

export default IRLQuestionsStep;
