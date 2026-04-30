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
import type { ProcessDraft } from '@/hooks/useExpertiseProcessing';

export type ExpertiseProcessAction = 'complete' | 'reject';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ExpertiseRequest | null;
  draft: ProcessDraft;
  onDraftChange: (patch: Partial<ProcessDraft>) => void;
  uploadingStamp: boolean;
  onUploadStamp: (file: File) => void;
  processing: boolean;
  onConfirm: () => void;
}

const ExpertiseProcessDialog: React.FC<Props> = ({
  open, onOpenChange, request, draft, onDraftChange,
  uploadingStamp, onUploadStamp, processing, onConfirm,
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
              variant={draft.action === 'complete' ? 'default' : 'outline'}
              onClick={() => onDraftChange({ action: 'complete' })}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Compléter
            </Button>
            <Button
              variant={draft.action === 'reject' ? 'destructive' : 'outline'}
              onClick={() => onDraftChange({ action: 'reject' })}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Rejeter
            </Button>
          </div>

          {draft.action === 'complete' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Valeur vénale (USD) *</Label>
                <Input
                  type="number"
                  value={draft.marketValue}
                  onChange={(e) => onDraftChange({ marketValue: e.target.value })}
                  placeholder="Ex: 50000"
                />
              </div>

              <Separator />
              <p className="text-xs font-semibold text-muted-foreground">Informations de l'expert</p>

              <div className="space-y-2">
                <Label>Nom de l'expert immobilier</Label>
                <Input
                  value={draft.expertName}
                  onChange={(e) => onDraftChange({ expertName: e.target.value })}
                  placeholder="Ex: Jean-Paul MUKENDI"
                />
              </div>
              <div className="space-y-2">
                <Label>Titre / Fonction</Label>
                <Input
                  value={draft.expertTitle}
                  onChange={(e) => onDraftChange({ expertTitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sceau / Cachet (image)</Label>
                <div className="flex gap-2 items-center">
                  {draft.stampImageUrl && (
                    <img src={draft.stampImageUrl} alt="Sceau" className="h-10 w-10 object-contain border rounded" />
                  )}
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingStamp}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadStamp(file);
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  PNG transparent recommandé (max 5 Mo).
                </p>
              </div>

              <Alert className="bg-primary/5 border-primary/20">
                <Award className="h-4 w-4 text-primary" />
                <AlertDescription className="text-xs">
                  Le PDF est généré, stocké dans un bucket privé puis finalisé par RPC atomique.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Notes de traitement</Label>
                <Textarea
                  value={draft.processingNotes}
                  onChange={(e) => onDraftChange({ processingNotes: e.target.value })}
                  placeholder="Observations…"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Raison du rejet *</Label>
                <Textarea
                  value={draft.rejectionReason}
                  onChange={(e) => onDraftChange({ rejectionReason: e.target.value })}
                  placeholder="Indiquez la raison du rejet…"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={onConfirm}
              disabled={processing}
              className="flex-1"
              variant={draft.action === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : draft.action === 'complete' ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              {draft.action === 'complete' ? 'Valider' : 'Rejeter'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExpertiseProcessDialog;
