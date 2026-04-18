import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Award, Check, Loader2, X } from 'lucide-react';
import type { ExpertiseRequest } from '@/types/expertise';

export type ExpertiseProcessAction = 'complete' | 'reject';

interface ExpertiseProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ExpertiseRequest | null;
  processAction: ExpertiseProcessAction;
  onActionChange: (a: ExpertiseProcessAction) => void;
  marketValue: string;
  onMarketValueChange: (v: string) => void;
  expertName: string;
  onExpertNameChange: (v: string) => void;
  expertTitle: string;
  onExpertTitleChange: (v: string) => void;
  stampImageUrl: string;
  uploadingStamp: boolean;
  onUploadStamp: (file: File) => void;
  processingNotes: string;
  onNotesChange: (v: string) => void;
  rejectionReason: string;
  onRejectionReasonChange: (v: string) => void;
  processing: boolean;
  onConfirm: () => void;
}

const ExpertiseProcessDialog: React.FC<ExpertiseProcessDialogProps> = ({
  open,
  onOpenChange,
  request,
  processAction,
  onActionChange,
  marketValue,
  onMarketValueChange,
  expertName,
  onExpertNameChange,
  expertTitle,
  onExpertTitleChange,
  stampImageUrl,
  uploadingStamp,
  onUploadStamp,
  processingNotes,
  onNotesChange,
  rejectionReason,
  onRejectionReasonChange,
  processing,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Traiter la demande</DialogTitle>
          <DialogDescription>
            {request?.reference_number} - {request?.parcel_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={processAction === 'complete' ? 'default' : 'outline'}
              onClick={() => onActionChange('complete')}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Compléter
            </Button>
            <Button
              variant={processAction === 'reject' ? 'destructive' : 'outline'}
              onClick={() => onActionChange('reject')}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Rejeter
            </Button>
          </div>

          {processAction === 'complete' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Valeur vénale (USD) *</Label>
                <Input
                  type="number"
                  value={marketValue}
                  onChange={(e) => onMarketValueChange(e.target.value)}
                  placeholder="Ex: 50000"
                />
              </div>

              <Separator />
              <p className="text-xs font-semibold text-muted-foreground">Informations de l'expert</p>

              <div className="space-y-2">
                <Label>Nom de l'expert immobilier</Label>
                <Input
                  value={expertName}
                  onChange={(e) => onExpertNameChange(e.target.value)}
                  placeholder="Ex: Jean-Paul MUKENDI"
                />
              </div>
              <div className="space-y-2">
                <Label>Titre / Fonction</Label>
                <Input
                  value={expertTitle}
                  onChange={(e) => onExpertTitleChange(e.target.value)}
                  placeholder="Ex: L'Expert Évaluateur Agréé"
                />
              </div>
              <div className="space-y-2">
                <Label>Sceau / Cachet (image)</Label>
                <div className="flex gap-2 items-center">
                  {stampImageUrl && (
                    <img src={stampImageUrl} alt="Sceau" className="h-10 w-10 object-contain border rounded" />
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    disabled={uploadingStamp}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadStamp(file);
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Format PNG recommandé avec fond transparent. Apparaîtra à côté de la signature sur le certificat.
                </p>
              </div>

              <Alert className="bg-primary/5 border-primary/20">
                <Award className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  Le certificat PDF sera <strong>généré automatiquement</strong> avec le nom de l'expert, le sceau et toutes les informations du bien.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Notes de traitement</Label>
                <Textarea
                  value={processingNotes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Observations..."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Raison du rejet *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => onRejectionReasonChange(e.target.value)}
                  placeholder="Indiquez la raison du rejet..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={onConfirm}
              disabled={processing}
              className="flex-1"
              variant={processAction === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : processAction === 'complete' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {processAction === 'complete' ? 'Valider' : 'Rejeter'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpertiseProcessDialog;
