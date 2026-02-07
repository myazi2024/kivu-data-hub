import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calculator, ChevronLeft, CreditCard, AlertTriangle, CheckCircle2, Home, Building2
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { TaxCalculationInput, TaxCalculationResult } from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';
import { USAGE_OPTIONS } from './TaxQuestionsStep';

interface TaxSummaryStepProps {
  parcelNumber: string;
  input: TaxCalculationInput;
  result: TaxCalculationResult;
  onBack: () => void;
  onPayment: () => void;
}

const TaxSummaryStep: React.FC<TaxSummaryStepProps> = ({
  parcelNumber, input, result, onBack, onPayment
}) => {
  return (
    <div className="space-y-4 px-4 pb-4">
      {/* Summary header */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <Label className="text-base font-semibold">Récapitulatif</Label>
              <p className="text-xs text-muted-foreground">Vérifiez les informations avant paiement</p>
            </div>
          </div>

          {/* Parcel info */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Parcelle</span>
              <span className="font-mono font-bold">{parcelNumber}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Exercice fiscal</span>
              <Badge variant="secondary" className="text-xs">{input.fiscalYear}</Badge>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Zone</span>
              <span className="flex items-center gap-1.5">
                {input.zoneType === 'urban' ? <Building2 className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}
                {input.zoneType === 'urban' ? 'Urbaine' : 'Rurale'}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Usage</span>
              <span>{USAGE_OPTIONS.find(o => o.value === input.usageType)?.label}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Superficie</span>
              <span>{input.areaSqm.toLocaleString()} m²</span>
            </div>
            {input.isRented && (
              <>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Loyer mensuel</span>
                  <span>{input.monthlyRentUsd.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Occupation</span>
                  <span>{input.occupancyMonths} mois</span>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Impôt foncier breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-emerald-600" />
              Impôt foncier annuel
            </h4>
            <div className="space-y-1.5 text-sm pl-5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base fixe</span>
                <span>{result.baseTax.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Composante surface</span>
                <span>{result.areaComponent.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
                <span>Sous-total foncier</span>
                <span>{result.totalPropertyTax.toLocaleString()} USD</span>
              </div>
            </div>
          </div>

          {/* IRL breakdown */}
          {input.isRented && result.irlAmount > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Home className="h-3.5 w-3.5 text-blue-600" />
                  Impôt sur le Revenu Locatif (IRL)
                  <SectionHelpPopover
                    title="IRL — 22%"
                    description="L'impôt sur le revenu locatif est calculé à 22% du revenu brut annuel des loyers perçus, conformément à la législation fiscale de la RDC."
                  />
                </h4>
                <div className="space-y-1.5 text-sm pl-5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Revenu brut annuel</span>
                    <span>{result.annualRentalIncome.toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taux IRL</span>
                    <span>{result.irlRate}%</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
                    <span>Sous-total IRL</span>
                    <span>{result.irlAmount.toLocaleString()} USD</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Exemptions */}
          {result.appliedExemptions.length > 0 && (
            <>
              <Separator />
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                  ⚠️ Exonérations potentielles détectées
                </p>
                {result.appliedExemptions.map((ex, i) => (
                  <p key={i} className="text-xs text-amber-600 dark:text-amber-400">• {ex}</p>
                ))}
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  Contactez l'administration fiscale pour confirmer votre éligibilité.
                </p>
              </div>
            </>
          )}

          {/* Fees */}
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
                ⚠️ Aucun barème correspondant trouvé. Contactez l'administration pour une estimation personnalisée.
              </p>
            </div>
          )}

          {/* Warning */}
          <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-destructive font-medium">
                Une fois la déclaration soumise et le paiement effectué, cette opération ne peut plus être modifiée. Veuillez vérifier toutes les informations avant de continuer.
              </p>
            </div>
          </div>

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
          onClick={onBack}
          className="flex-1 h-11 rounded-xl gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Modifier
        </Button>
        <Button
          onClick={onPayment}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2"
        >
          <CreditCard className="h-4 w-4" />
          Payer
        </Button>
      </div>
    </div>
  );
};

export default TaxSummaryStep;
