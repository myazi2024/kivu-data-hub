import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CreditCard, AlertCircle, FileText, Image, ArrowLeft, Clock } from 'lucide-react';
import type { MutationFee, MutationRequest } from '@/types/mutation';
import { LEGAL_STATUS_OPTIONS, REQUESTER_TYPES } from '../mutation/MutationConstants';
import type { Step } from './types';

interface MutationTypeDetails {
  value: string;
  label: string;
  description: string;
}

interface MutationFeesCalculation {
  mutationFee: number;
  bankFee: number;
  total: number;
  applicable: boolean;
  percentage: number;
}

interface LateFeesCalculation {
  days: number;
  fee: number;
  applicable: boolean;
  capped: boolean;
}

export interface PreviewStepProps {
  parcelNumber: string;
  parcelData?: {
    province?: string;
    ville?: string;
    commune?: string;
  };
  mutationTypeDetails?: MutationTypeDetails;
  requesterType: string;
  isTransferMutation: boolean;
  beneficiaryFullName: string;
  beneficiaryLegalStatus: string;
  beneficiaryPhone: string;
  justification: string;
  attachedFiles: File[];
  selectedFeesDetails: MutationFee[];
  mutationFeesCalculation: MutationFeesCalculation;
  showLateFees: boolean;
  lateFeesCalculation: LateFeesCalculation;
  totalAmount: number;
  createdRequest: MutationRequest | null;
  setStep: (step: Step) => void;
  handleSubmitForm: () => void | Promise<void>;
  loading: boolean;
  uploadingFiles: boolean;
  isSubmitting: boolean;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  parcelNumber,
  parcelData,
  mutationTypeDetails,
  requesterType,
  isTransferMutation,
  beneficiaryFullName,
  beneficiaryLegalStatus,
  beneficiaryPhone,
  justification,
  attachedFiles,
  selectedFeesDetails,
  mutationFeesCalculation,
  showLateFees,
  lateFeesCalculation,
  totalAmount,
  createdRequest,
  setStep,
  handleSubmitForm,
  loading,
  uploadingFiles,
  isSubmitting,
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
            {parcelData?.province && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Localisation</span>
                <span className="text-sm text-right max-w-[60%]">{[parcelData.province, parcelData.ville, parcelData.commune].filter(Boolean).join(', ')}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type de mutation</span>
              <span className="text-sm font-semibold">{mutationTypeDetails?.label}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Demandeur</span>
              <span className="text-sm">{REQUESTER_TYPES.find(t => t.value === requesterType)?.label}</span>
            </div>

            {isTransferMutation && (
              <>
                <Separator />
                <div className="space-y-2 bg-primary/5 p-3 rounded-xl -mx-1">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">Nouveau propriétaire</span>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nom complet</span>
                    <span className="text-sm font-medium max-w-[60%] text-right">{beneficiaryFullName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Statut</span>
                    <span className="text-sm">{LEGAL_STATUS_OPTIONS.find(s => s.value === beneficiaryLegalStatus)?.label}</span>
                  </div>
                  {beneficiaryPhone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Téléphone</span>
                      <span className="text-sm">{beneficiaryPhone}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Justification in preview */}
            {justification.trim() && (
              <>
                <Separator />
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Justification</span>
                  <p className="text-sm text-foreground">{justification}</p>
                </div>
              </>
            )}

            {attachedFiles.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Documents joints</span>
                  <div className="space-y-1.5">
                    {attachedFiles.map((file, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-xl">
                        {file.type.startsWith('image/') ? <Image className="h-4 w-4 text-primary" /> : <FileText className="h-4 w-4 text-primary" />}
                        <span className="text-xs truncate">{file.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Frais détaillés */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Détail des frais</span>
              {selectedFeesDetails.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{fee.fee_name}</span>
                  <span className="text-sm font-mono font-semibold">${fee.amount_usd.toFixed(2)}</span>
                </div>
              ))}
              {isTransferMutation && mutationFeesCalculation.applicable && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Frais de mutation ({mutationFeesCalculation.percentage}%)</span>
                    <span className="text-sm font-mono font-semibold">${mutationFeesCalculation.mutationFee.toFixed(2)}</span>
                  </div>
                  {mutationFeesCalculation.bankFee > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Frais bancaires (0.5%)</span>
                      <span className="text-sm font-mono font-semibold">${mutationFeesCalculation.bankFee.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              {showLateFees && lateFeesCalculation.applicable && (
                <div className="flex items-center justify-between text-orange-600">
                  <span className="text-sm">Frais de retard ({lateFeesCalculation.days}j)</span>
                  <span className="text-sm font-mono font-semibold">${lateFeesCalculation.fee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t-2">
                <span className="text-sm font-bold">Total</span>
                <span className="text-lg font-bold text-primary">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert className="rounded-xl bg-muted/50">
          <Clock className="h-4 w-4" />
          <AlertDescription className="text-sm">Délai de traitement estimé: <strong>14 jours ouvrables</strong> après paiement.</AlertDescription>
        </Alert>

        <div className="flex gap-2">
          {createdRequest ? (
            /* Request already created — only allow going to payment */
            <Button onClick={() => setStep('payment')} className="flex-1 h-12 text-sm font-semibold rounded-xl shadow-lg">
              <CreditCard className="h-4 w-4 mr-2" /> Procéder au paiement ${totalAmount.toFixed(2)}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('form')}
                className="flex-1 h-12 text-sm font-semibold rounded-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Modifier
              </Button>
              <Button onClick={handleSubmitForm} className="flex-1 h-12 text-sm font-semibold rounded-xl shadow-lg" disabled={loading || uploadingFiles || isSubmitting}>
                {loading || uploadingFiles || isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />{uploadingFiles ? 'Envoi...' : 'Création...'}</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" /> Payer ${totalAmount.toFixed(2)}</>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </ScrollArea>
  );
};

export default PreviewStep;
