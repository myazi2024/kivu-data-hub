import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Calculator, ChevronLeft, Send, AlertTriangle, CheckCircle2, Home, Building2, MapPin
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  TaxCalculationInput, TaxCalculationResult, FISCAL_ZONE_LABELS,
} from '@/hooks/usePropertyTaxCalculator';
import SectionHelpPopover from '../SectionHelpPopover';
import { USAGE_OPTIONS } from './PropertyTaxQuestionsStep';

const CONSTRUCTION_LABELS: Record<string, string> = {
  en_dur: 'En dur',
  semi_dur: 'Semi-dur',
  en_paille: 'En paille/bois',
};

const ROOFING_LABELS: Record<string, string> = {
  tole: 'Tôle ondulée', tuile: 'Tuile', beton: 'Dalle en béton',
  chaume: 'Chaume / Paille', autre: 'Autre',
};

interface PropertyTaxSummaryStepProps {
  parcelNumber: string;
  nif: string;
  input: TaxCalculationInput;
  result: TaxCalculationResult;
  onBack: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

const PropertyTaxSummaryStep: React.FC<PropertyTaxSummaryStepProps> = ({
  parcelNumber, nif, input, result, onBack, onSubmit, loading
}) => {
  return (
    <div className="space-y-4 px-4 pb-4">
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <Label className="text-base font-semibold">Fiche de déclaration — Impôt foncier</Label>
              <p className="text-xs text-muted-foreground">Direction Générale des Impôts (DGI)</p>
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
          <div className="space-y-2 text-sm">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-blue-600" />
              Localisation fiscale
            </h4>
            <div className="space-y-1.5 pl-5">
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
                <span className="text-muted-foreground">Catégorie fiscale</span>
                <Badge variant="outline" className="text-xs">{FISCAL_ZONE_LABELS[result.fiscalZoneCategory]}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usage</span>
                <span>{USAGE_OPTIONS.find(o => o.value === input.usageType)?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Superficie</span>
                <span>{input.areaSqm.toLocaleString()} m²</span>
              </div>
            </div>
          </div>

          {/* Construction details */}
          {input.constructionType && (
            <>
              <Separator />
              <div className="space-y-1.5 text-sm pl-5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Construction</span>
                  <span>{CONSTRUCTION_LABELS[input.constructionType] || input.constructionType}</span>
                </div>
                {input.constructionYear && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Année</span>
                    <span>{input.constructionYear}</span>
                  </div>
                )}
                {input.numberOfFloors > 1 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Étages</span>
                    <span>R+{input.numberOfFloors - 1}</span>
                  </div>
                )}
                {input.roofingType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Toiture</span>
                    <span>{ROOFING_LABELS[input.roofingType] || input.roofingType}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Tax breakdown */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-emerald-600" />
              Calcul de l'impôt foncier annuel
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
              {result.fiscalZoneMultiplier !== 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coefficient zone (×{result.fiscalZoneMultiplier})</span>
                  <span>{result.zoneAdjustedTax.toLocaleString()} USD</span>
                </div>
              )}
              {result.isExempt ? (
                <div className="flex justify-between font-semibold pt-1 border-t border-border/50 text-emerald-600">
                  <span>Exonéré</span>
                  <span>0 USD</span>
                </div>
              ) : (
                <div className="flex justify-between font-semibold pt-1 border-t border-border/50">
                  <span>Sous-total foncier</span>
                  <span>{result.totalPropertyTax.toLocaleString()} USD</span>
                </div>
              )}
            </div>
          </div>

          {/* Exemptions */}
          {result.appliedExemptions.length > 0 && (
            <>
              <Separator />
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mb-1">
                  ⚠️ Exonérations détectées
                </p>
                {result.appliedExemptions.map((ex, i) => (
                  <p key={i} className="text-xs text-amber-600 dark:text-amber-400">• {ex}</p>
                ))}
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  À confirmer par l'administration fiscale.
                </p>
              </div>
            </>
          )}

          {/* Penalties */}
          {result.totalPenalties > 0 && (
            <>
              <Separator />
              <div className="space-y-1.5 text-sm">
                <h4 className="text-sm font-semibold text-destructive">Pénalités de retard</h4>
                <div className="pl-5 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Intérêts moratoires ({result.penaltyRate}%)</span>
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
                Cette fiche sera transmise à la DGI. Une fois soumise, elle ne peut plus être modifiée.
              </p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              ℹ️ Estimation indicative basée sur les barèmes en vigueur. Le montant définitif peut varier.
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
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white gap-2"
        >
          <Send className="h-4 w-4" />
          Soumettre
        </Button>
      </div>
    </div>
  );
};

export default PropertyTaxSummaryStep;
