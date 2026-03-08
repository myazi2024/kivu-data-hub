import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowLeft, Clock, CreditCard, FileText, Loader2, Send } from 'lucide-react';
import { PermitFormData, AttachmentFile } from './types';

interface PermitPreviewStepProps {
  parcelNumber: string;
  requestType: 'new' | 'regularization';
  requestTypeLabel: string;
  formData: PermitFormData;
  attachments: Record<string, AttachmentFile | null>;
  feeBreakdown: { label: string; amount: number; detail?: string }[];
  totalFeeUSD: number;
  onBack: () => void;
  onPay: () => void;
  /** Fix #9: When false, show "Soumettre" instead of "Payer" */
  isPaymentRequired?: boolean;
  processingPayment?: boolean;
}

const PreviewRow: React.FC<{ label: string; value: string | number | null | undefined }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-right max-w-[55%] break-words">{value}</span>
    </div>
  );
};

const PermitPreviewStep: React.FC<PermitPreviewStepProps> = ({
  parcelNumber, requestType, requestTypeLabel, formData, attachments,
  feeBreakdown, totalFeeUSD, onBack, onPay,
  isPaymentRequired = true, processingPayment = false,
}) => {
  return (
    <ScrollArea className="h-[65vh] sm:h-[70vh]">
      <div className="space-y-4 pr-2">
        <Alert className="border-destructive bg-destructive/10 rounded-xl">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm text-destructive font-medium leading-relaxed">
            Vérifiez attentivement les informations. Une fois soumise, cette demande ne pourra plus être modifiée.
          </AlertDescription>
        </Alert>

        <Card className="border-2 rounded-xl shadow-sm">
          <CardContent className="p-4 space-y-3">
            <PreviewRow label="Parcelle" value={parcelNumber} />
            <Separator />
            <PreviewRow label="Type" value={requestTypeLabel} />
            <PreviewRow label="Construction" value={`${formData.constructionType} — ${formData.constructionNature}`} />
            <PreviewRow label="Usage" value={formData.declaredUsage} />
            <PreviewRow label="Surface" value={formData.plannedArea ? `${parseFloat(formData.plannedArea).toLocaleString('fr-FR')} m²` : null} />
            <PreviewRow label="Étages" value={formData.numberOfFloors !== '1' ? formData.numberOfFloors : null} />
            {/* Fix #11-14: Show ALL collected fields */}
            <PreviewRow label="Pièces" value={formData.numberOfRooms} />
            <PreviewRow label="Toiture" value={formData.roofingType} />
            <PreviewRow label="Coût estimé" value={formData.estimatedCost ? `$${parseFloat(formData.estimatedCost).toLocaleString('fr-FR')} USD` : null} />
            <PreviewRow label="Eau" value={formData.waterSupply} />
            <PreviewRow label="Électricité" value={formData.electricitySupply} />

            {/* Fix #13: Planning fields for new construction */}
            {requestType === 'new' && (formData.startDate || formData.estimatedDuration) && (
              <>
                <Separator />
                <div className="space-y-2 bg-muted/30 p-3 rounded-xl -mx-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Planification</span>
                  <PreviewRow label="Date de début" value={formData.startDate} />
                  <PreviewRow label="Durée estimée" value={formData.estimatedDuration ? `${formData.estimatedDuration} mois` : null} />
                </div>
              </>
            )}

            {/* Fix #12: Regularization-specific fields */}
            {requestType === 'regularization' && (
              <>
                <Separator />
                <div className="space-y-2 bg-orange-50/50 dark:bg-orange-950/20 p-3 rounded-xl -mx-1 border border-orange-200/50 dark:border-orange-800/50">
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wide">Régularisation</span>
                  <PreviewRow label="Raison" value={formData.regularizationReason} />
                  <PreviewRow label="Date de construction" value={formData.constructionDate} />
                  <PreviewRow label="État actuel" value={formData.currentState} />
                  <PreviewRow label="Permis initial" value={formData.originalPermitNumber} />
                  <PreviewRow label="Problèmes de conformité" value={formData.complianceIssues} />
                </div>
              </>
            )}

            <Separator />

            {/* Architect info */}
            {(formData.architectName || formData.architectLicense) && (
              <>
                <div className="space-y-2 bg-muted/30 p-3 rounded-xl -mx-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Architecte</span>
                  <PreviewRow label="Nom" value={formData.architectName} />
                  <PreviewRow label="N° agrément" value={formData.architectLicense} />
                </div>
                <Separator />
              </>
            )}

            {/* Demandeur */}
            <div className="space-y-2 bg-primary/5 p-3 rounded-xl -mx-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Demandeur</span>
              <PreviewRow label="Nom" value={formData.applicantName} />
              <PreviewRow label="Téléphone" value={formData.applicantPhone} />
              <PreviewRow label="Email" value={formData.applicantEmail} />
              {/* Fix #11: Show address in preview */}
              <PreviewRow label="Adresse" value={formData.applicantAddress} />
            </div>

            {/* Description du projet */}
            {formData.projectDescription && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description du projet</span>
                  <p className="text-sm text-foreground leading-relaxed">{formData.projectDescription}</p>
                </div>
              </>
            )}

            {/* Pièces jointes */}
            {Object.values(attachments).some(a => a !== null) && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">Documents joints</span>
                  {Object.entries(attachments).filter(([, a]) => a !== null).map(([key, a]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <FileText className="h-3 w-3 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{a!.label}</span>
                      <span className="truncate font-medium">{a!.file.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <Separator />

            {/* Frais détaillés */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Détail des frais</span>
              {feeBreakdown.map((fee, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">{fee.label}</span>
                  <span className="font-medium">${fee.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t-2">
              <span className="text-sm font-bold">Total à payer</span>
              <span className="text-lg font-bold text-primary">${totalFeeUSD.toFixed(2)} USD</span>
            </div>
          </CardContent>
        </Card>

        <Alert className="rounded-xl bg-muted/50">
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Délai de traitement estimé: <strong>15 à 30 jours ouvrables</strong> après soumission.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} disabled={processingPayment} className="flex-1 h-11 text-sm font-semibold rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />Modifier
          </Button>
          {/* Fix #9: Show appropriate button based on payment requirement */}
          <Button onClick={onPay} disabled={processingPayment} className="flex-1 h-11 text-sm font-semibold rounded-xl shadow-lg">
            {processingPayment ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Traitement...</>
            ) : isPaymentRequired ? (
              <><CreditCard className="h-4 w-4 mr-2" />Payer ${totalFeeUSD.toFixed(2)}</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Soumettre</>
            )}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};

export default PermitPreviewStep;
