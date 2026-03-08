import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, ArrowLeft, Clock, MapPin, CreditCard, FileText } from 'lucide-react';
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
}

const PermitPreviewStep: React.FC<PermitPreviewStepProps> = ({
  parcelNumber, requestTypeLabel, formData, attachments,
  feeBreakdown, totalFeeUSD, onBack, onPay,
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
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Parcelle</span>
              <span className="font-mono font-bold text-sm">{parcelNumber}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-semibold">{requestTypeLabel}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Construction</span>
              <span className="text-sm">{formData.constructionType} — {formData.constructionNature}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Usage</span>
              <span className="text-sm">{formData.declaredUsage}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Surface</span>
              <span className="text-sm">{parseFloat(formData.plannedArea).toLocaleString('fr-FR')} m²</span>
            </div>
            {formData.numberOfRooms && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pièces</span>
                <span className="text-sm">{formData.numberOfRooms}</span>
              </div>
            )}
            {formData.roofingType && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Toiture</span>
                <span className="text-sm">{formData.roofingType}</span>
              </div>
            )}
            {/* Fix #14: Show estimated cost in preview */}
            {formData.estimatedCost && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Coût estimé</span>
                <span className="text-sm">${parseFloat(formData.estimatedCost).toLocaleString('fr-FR')} USD</span>
              </div>
            )}

            <Separator />

            {/* Fix #15: Show architect info in preview */}
            {(formData.architectName || formData.architectLicense) && (
              <>
                <div className="space-y-2 bg-muted/30 p-3 rounded-xl -mx-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Architecte</span>
                  {formData.architectName && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Nom</span>
                      <span className="text-sm">{formData.architectName}</span>
                    </div>
                  )}
                  {formData.architectLicense && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">N° agrément</span>
                      <span className="text-sm font-mono">{formData.architectLicense}</span>
                    </div>
                  )}
                </div>
                <Separator />
              </>
            )}

            {/* Demandeur */}
            <div className="space-y-2 bg-primary/5 p-3 rounded-xl -mx-1">
              <span className="text-xs font-semibold text-primary uppercase tracking-wide">Demandeur</span>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nom</span>
                <span className="text-sm font-medium">{formData.applicantName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Téléphone</span>
                <span className="text-sm">{formData.applicantPhone}</span>
              </div>
              {formData.applicantEmail && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <span className="text-sm">{formData.applicantEmail}</span>
                </div>
              )}
            </div>

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
            Délai de traitement estimé: <strong>15 à 30 jours ouvrables</strong> après paiement.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1 h-11 text-sm font-semibold rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />Modifier
          </Button>
          <Button onClick={onPay} className="flex-1 h-11 text-sm font-semibold rounded-xl shadow-lg">
            <CreditCard className="h-4 w-4 mr-2" />Payer ${totalFeeUSD.toFixed(2)}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
};

export default PermitPreviewStep;
