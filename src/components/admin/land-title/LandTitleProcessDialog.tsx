import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { LandTitleRequestRow } from '@/types/landTitleRequest';

export type ProcessAction = 'approve' | 'reject' | 'in_review';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRequest: LandTitleRequestRow | null;
  processAction: ProcessAction;
  setProcessAction: (a: ProcessAction) => void;
  processingNotes: string;
  setProcessingNotes: (s: string) => void;
  rejectionReason: string;
  setRejectionReason: (s: string) => void;
  processing: boolean;
  onConfirm: () => void;
}

const LandTitleProcessDialog: React.FC<Props> = ({
  open,
  onOpenChange,
  selectedRequest,
  processAction,
  setProcessAction,
  processingNotes,
  setProcessingNotes,
  rejectionReason,
  setRejectionReason,
  processing,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Traiter la demande</DialogTitle>
          <DialogDescription>{selectedRequest?.reference_number}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Action</label>
            <Select value={processAction} onValueChange={(v: ProcessAction) => setProcessAction(v)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="in_review" className="rounded-lg">Mettre en examen</SelectItem>
                <SelectItem value="approve" className="rounded-lg">Approuver</SelectItem>
                <SelectItem value="reject" className="rounded-lg">Rejeter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {processAction === 'approve' && selectedRequest?.payment_status !== 'paid' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Cette demande n'est pas encore payée. L'approbation sera bloquée.</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes de traitement</label>
            <Textarea
              value={processingNotes}
              onChange={(e) => setProcessingNotes(e.target.value)}
              placeholder="Ajoutez des notes..."
              className="rounded-xl"
            />
          </div>

          {processAction === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-destructive">Motif de rejet *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Expliquez le motif du rejet..."
                className="rounded-xl border-destructive"
                required
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={processing || (processAction === 'reject' && !rejectionReason) || (processAction === 'approve' && selectedRequest?.payment_status !== 'paid')}
            className="rounded-xl"
          >
            {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LandTitleProcessDialog;
