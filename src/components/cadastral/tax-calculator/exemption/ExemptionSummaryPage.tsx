import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Shield, ArrowLeft, MapPin, FileText, DollarSign, AlertTriangle, Scale, CreditCard, CheckCircle2
} from 'lucide-react';
import { ExemptionFormData } from '../ExemptionRequestDialog';
import { EXEMPTION_DEFINITIONS } from '@/hooks/usePropertyTaxCalculator';
import { toast } from 'sonner';

interface ExemptionSummaryPageProps {
  formData: ExemptionFormData;
  taxType: 'property' | 'irl';
  taxTypeLabel: string;
  onBack: () => void;
  onClose: () => void;
}

const EXEMPTION_FEES = [
  { name: 'Frais de traitement de dossier', amount: 15, description: 'Frais administratifs pour l\'instruction de la demande' },
  { name: 'Frais de service BIC', amount: 10, description: 'Frais de service de la plateforme' },
  { name: 'Frais bancaires', amount: 2, description: 'Frais de transaction bancaire' },
];

const ExemptionSummaryPage: React.FC<ExemptionSummaryPageProps> = ({
  formData, taxType, taxTypeLabel, onBack, onClose
}) => {
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptDisclaimer, setAcceptDisclaimer] = useState(false);

  const totalFees = EXEMPTION_FEES.reduce((sum, f) => sum + f.amount, 0);

  const exemptionLabels = taxType === 'property'
    ? formData.selectedExemptions.map(e => EXEMPTION_DEFINITIONS.find(d => d.type === e)?.label || e)
    : [formData.irlExemptionType];

  const justification = taxType === 'property' ? formData.justification : formData.irlJustification;
  const documents = taxType === 'property' ? formData.supportingDocuments : formData.irlSupportingDocuments;

  const handleProceedToPayment = () => {
    if (!acceptDisclaimer) {
      toast.error('Veuillez accepter les conditions relatives à la demande d\'exonération');
      return;
    }
    if (!acceptTerms) {
      toast.error('Veuillez accepter les termes et conditions d\'utilisation de BIC');
      return;
    }
    toast.info('Le paiement pour les demandes d\'exonération sera disponible prochainement');
  };

  return (
    <div className="space-y-3 px-4 py-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 mx-auto">
          <Shield className="h-6 w-6 text-purple-600" />
        </div>
        <h3 className="text-base font-bold">Demande d'exonération fiscale</h3>
        <p className="text-sm text-muted-foreground">{taxTypeLabel}</p>
      </div>

      {/* Parcelle & localisation */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <Label className="text-sm font-semibold">Parcelle & Localisation</Label>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-muted-foreground">Parcelle</span>
            <span className="font-medium">{formData.parcelNumber}</span>
            <span className="text-muted-foreground">Province</span>
            <span className="font-medium">{formData.province || '—'}</span>
            <span className="text-muted-foreground">Ville</span>
            <span className="font-medium">{formData.ville || '—'}</span>
            <span className="text-muted-foreground">Exercice visé</span>
            <span className="font-medium">{formData.fiscalYear}</span>
          </div>
        </CardContent>
      </Card>

      {/* Motifs d'exonération */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-purple-600" />
            <Label className="text-sm font-semibold">Motif(s) d'exonération</Label>
          </div>
          <div className="space-y-1">
            {exemptionLabels.map((label, i) => (
              <div key={i} className="flex gap-2 items-start text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Justification */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <Label className="text-sm font-semibold">Justification</Label>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{justification || '—'}</p>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-amber-600" />
            <Label className="text-sm font-semibold">Documents joints ({documents.length})</Label>
          </div>
          {documents.map((file, i) => (
            <div key={i} className="flex gap-2 items-center text-sm">
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{file.name}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Frais */}
      <Card className="rounded-2xl shadow-md border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <Label className="text-sm font-semibold">Frais de la demande</Label>
          </div>
          <div className="space-y-1.5">
            {EXEMPTION_FEES.map((fee, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div>
                  <span>{fee.name}</span>
                  <p className="text-[11px] text-muted-foreground">{fee.description}</p>
                </div>
                <span className="font-medium whitespace-nowrap">{fee.amount.toFixed(2)} USD</span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between items-center text-sm font-bold">
            <span>Total</span>
            <span className="text-primary">{totalFees.toFixed(2)} USD</span>
          </div>
        </CardContent>
      </Card>

      {/* Avertissements et cases à cocher */}
      <Card className="rounded-2xl shadow-md border-amber-200 dark:border-amber-800 overflow-hidden bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <Label className="text-sm font-semibold text-amber-800 dark:text-amber-300">Informations importantes</Label>
          </div>

          <div className="space-y-2 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <p>• L'aboutissement de cette demande dépend en grande partie de la <strong>véracité des informations</strong> fournies dans ce formulaire.</p>
            <p>• Les services fiscaux compétents peuvent <strong>demander des informations complémentaires</strong> ou effectuer une <strong>descente sur terrain sans préavis</strong> pour recueillir d'autres informations qu'ils jugent pertinentes.</p>
            <p>• Les <strong>frais payés ne sont pas remboursables</strong> en cas de refus d'accorder l'exonération par les services fiscaux.</p>
          </div>

          <Separator className="bg-amber-200 dark:bg-amber-800" />

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="accept-disclaimer"
              checked={acceptDisclaimer}
              onCheckedChange={(checked) => setAcceptDisclaimer(!!checked)}
              className="mt-0.5"
            />
            <label htmlFor="accept-disclaimer" className="text-xs text-amber-800 dark:text-amber-300 cursor-pointer leading-relaxed">
              J'ai lu et j'accepte les conditions ci-dessus. Je certifie que les informations fournies sont exactes et complètes. 
              Je comprends que les frais ne sont pas remboursables en cas de refus.
            </label>
          </div>

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="accept-terms"
              checked={acceptTerms}
              onCheckedChange={(checked) => setAcceptTerms(!!checked)}
              className="mt-0.5"
            />
            <label htmlFor="accept-terms" className="text-xs text-amber-800 dark:text-amber-300 cursor-pointer leading-relaxed flex items-start gap-1">
              <Scale className="h-3 w-3 shrink-0 mt-0.5" />
              <span>J'accepte les <strong>termes et conditions d'utilisation</strong> de la plateforme BIC.</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 h-11 rounded-xl gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Modifier
        </Button>
        <Button
          onClick={handleProceedToPayment}
          disabled={!acceptDisclaimer || !acceptTerms}
          className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white gap-2 disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          Payer {totalFees.toFixed(2)} USD
        </Button>
      </div>
    </div>
  );
};

export default ExemptionSummaryPage;
