import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign, ChevronLeft, Send, AlertTriangle, CheckCircle2, Home, Building2, MapPin
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  TaxCalculationInput, TaxCalculationResult, FISCAL_ZONE_LABELS,
} from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';

const USAGE_LABELS: Record<string, string> = {
  residential: 'Résidentiel',
  commercial: 'Commercial',
  industrial: 'Industriel',
  agricultural: 'Agricole',
  mixed: 'Mixte',
};

interface IRLSummaryStepProps {
  parcelNumber: string;
  nif: string;
  input: TaxCalculationInput;
  result: TaxCalculationResult;
  onBack: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

const IRLSummaryStep: React.FC<IRLSummaryStepProps> = ({
  parcelNumber, nif, input, result, onBack, onSubmit, loading
}) => {
  return (
    <div className="space-y-4 px-4 pb-4">
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <Label className="text-base font-semibold">Fiche de déclaration — IRL</Label>
              <p className="text-xs text-muted-foreground">Direction Générale des Recettes (DGR)</p>
            </div>
          </div>

          {/* Identification */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">NIF contribuable</span>
              <span className="font-mono font-bold">{nif || '—'}</span>
            </div>
            {input.redevableIsDifferent && input.redevableNom && (
              <>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Redevable</span>
                  <span className="font-medium">{input.redevableNom}</span>
                </div>
                {input.redevableNif && (
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">NIF redevable</span>
                    <span className="font-mono">{input.redevableNif}</span>
                  </div>
                )}
                {input.redevableQualite && (
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Qualité</span>
                    <Badge variant="outline" className="text-xs capitalize">{input.redevableQualite}</Badge>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Parcelle</span>
              <span className="font-mono font-bold">{parcelNumber}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Exercice fiscal</span>
              <Badge variant="secondary" className="text-xs">{input.fiscalYear}</Badge>
            </div>
          </div>

          <Separator />

          {/* Localisation */}
          <div className="space-y-1.5 text-sm">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              Localisation
            </h4>
            <div className="pl-5 space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Province</span>
                <span>{input.province}</span>
              </div>
              {input.ville && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ville</span>
                  <span>{input.ville}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zone</span>
                <span className="flex items-center gap-1.5">
                  {input.zoneType === 'urban' ? <Building2 className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}
                  {input.zoneType === 'urban' ? 'Urbaine' : 'Rurale'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usage</span>
                <span>{USAGE_LABELS[input.usageType] || input.usageType}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* IRL breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-blue-600" />
              Calcul de l'IRL (22%)
              <SectionHelpPopover
                title="IRL — Ordonnance-loi n°69-009"
                description="L'impôt sur le revenu locatif est calculé à 22% du revenu locatif. La déduction forfaitaire de 30% réduit la base imposable pour frais d'entretien."
              />
            </h4>
            <div className="space-y-1.5 text-sm pl-5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loyer mensuel</span>
                <span>{input.monthlyRentUsd.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mois d'occupation</span>
                <span>{input.occupancyMonths} mois</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Revenu brut annuel</span>
                <span>{result.annualRentalIncome.toLocaleString()} USD</span>
              </div>
              {input.applyDeduction30 && result.deduction30Amount > 0 && (
                <>
                  <div className="flex justify-between text-emerald-600">
                    <span>Déduction forfaitaire 30%</span>
                    <span>-{result.deduction30Amount.toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Revenu net imposable</span>
                    <span>{result.taxableRentalIncome.toLocaleString()} USD</span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taux IRL</span>
                <span>{result.irlRate}%</span>
              </div>
              <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
                <span>Montant IRL</span>
                <span>{result.irlAmount.toLocaleString()} USD</span>
              </div>
            </div>
          </div>

          {/* Penalties */}
          {result.totalPenalties > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5 text-sm">
                <h4 className="text-sm font-semibold text-destructive">Pénalités de retard</h4>
                <div className="pl-5 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Intérêts ({result.penaltyRate}%)</span>
                    <span>{result.penaltyAmount.toLocaleString()} USD</span>
                  </div>
                  {result.majorationAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Majoration 25%</span>
                      <span>{result.majorationAmount.toLocaleString()} USD</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-destructive border-t border-border/50 pt-1">
                    <span>Total pénalités</span>
                    <span>{result.totalPenalties.toLocaleString()} USD</span>
                  </div>
                </div>
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
                    description="Frais bancaires et administratifs liés au traitement du paiement en ligne."
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
            <span className="text-blue-600">{result.grandTotal.toLocaleString()} USD</span>
          </div>

          {/* Warning */}
          <div className="p-3 bg-destructive/10 rounded-xl border border-destructive/30">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-xs text-destructive font-medium">
                Cette fiche sera transmise à la DGR. Une fois soumise, elle ne peut plus être modifiée.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              ℹ️ Estimation indicative. Le montant définitif peut varier selon l'évaluation de l'administration fiscale.
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
          onClick={onSubmit}
          disabled={loading}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white gap-2"
        >
          <Send className="h-4 w-4" />
          Soumettre
        </Button>
      </div>
    </div>
  );
};

export default IRLSummaryStep;
