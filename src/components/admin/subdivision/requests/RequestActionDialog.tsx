import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, RotateCcw, Loader2 } from 'lucide-react';
import type { ActionType, SubdivisionRequest } from './types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actionType: ActionType | null;
  request: SubdivisionRequest | null;
  processing: boolean;
  processingFee: string;
  setProcessingFee: (v: string) => void;
  rejectionReason: string;
  setRejectionReason: (v: string) => void;
  returnReason: string;
  setReturnReason: (v: string) => void;
  processingNotes: string;
  setProcessingNotes: (v: string) => void;
  onSubmit: () => void;
}

export function RequestActionDialog({
  open, onOpenChange, actionType, request, processing,
  processingFee, setProcessingFee,
  rejectionReason, setRejectionReason,
  returnReason, setReturnReason,
  processingNotes, setProcessingNotes,
  onSubmit,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {actionType === 'approve' ? 'Approuver' : actionType === 'return' ? 'Renvoyer pour correction' : 'Rejeter'} la demande
          </DialogTitle>
          <DialogDescription>{request?.reference_number}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {actionType === 'approve' && (
            <div className="space-y-2">
              <Label>Frais de traitement ($)</Label>
              <Input type="number" value={processingFee} onChange={e => setProcessingFee(e.target.value)} placeholder="0" />
              <p className="text-xs text-muted-foreground">Entrez 0 si aucun frais supplémentaire.</p>
            </div>
          )}
          {actionType === 'reject' && (
            <div className="space-y-2">
              <Label>Motif du rejet *</Label>
              <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Raison du rejet..." rows={3} />
            </div>
          )}
          {actionType === 'return' && (
            <div className="space-y-2">
              <Label>Motif du renvoi *</Label>
              <Textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} placeholder="Éléments à corriger..." rows={3} />
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes internes (optionnel)</Label>
            <Textarea value={processingNotes} onChange={e => setProcessingNotes(e.target.value)} placeholder="Notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            variant={actionType === 'approve' ? 'default' : actionType === 'return' ? 'outline' : 'destructive'}
            onClick={onSubmit}
            disabled={processing}
            className={actionType === 'return' ? 'text-amber-600 border-amber-300 hover:bg-amber-50' : ''}
          >
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
              actionType === 'approve' ? <Check className="h-4 w-4 mr-2" /> :
              actionType === 'return' ? <RotateCcw className="h-4 w-4 mr-2" /> :
              <X className="h-4 w-4 mr-2" />
            }
            {actionType === 'approve' ? 'Approuver' : actionType === 'return' ? 'Renvoyer' : 'Rejeter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
