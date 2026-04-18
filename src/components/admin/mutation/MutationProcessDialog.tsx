import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { getMutationTypeLabel } from '@/components/cadastral/mutation/MutationConstants';
import type { MutationRequest } from '@/types/mutation';

export type MutationProcessAction = 'approve' | 'reject' | 'hold' | 'return';

interface MutationProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MutationRequest | null;
  processAction: MutationProcessAction;
  onActionChange: (action: MutationProcessAction) => void;
  processingNotes: string;
  onNotesChange: (v: string) => void;
  rejectionReason: string;
  onRejectionReasonChange: (v: string) => void;
  processing: boolean;
  onConfirm: () => void;
}

const MutationProcessDialog: React.FC<MutationProcessDialogProps> = ({
  open,
  onOpenChange,
  request,
  processAction,
  onActionChange,
  processingNotes,
  onNotesChange,
  rejectionReason,
  onRejectionReasonChange,
  processing,
  onConfirm,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-sm">Traiter la demande</DialogTitle>
          <DialogDescription className="text-xs">
            {request?.reference_number || '-'} — {request ? getMutationTypeLabel(request.mutation_type) : ''} — Parcelle {request?.parcel_number}
          </DialogDescription>
        </DialogHeader>
        {request && (
          <div className="space-y-4">
            <Card className="bg-muted/50 border-0">
              <CardContent className="p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Demandeur</span>
                  <span className="font-medium">{request.requester_name}</span>
                </div>
                {request.beneficiary_name && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Bénéficiaire</span>
                    <span className="font-medium">{request.beneficiary_name}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Montant payé</span>
                  <span className="font-bold text-primary">${Number(request.total_amount_usd).toFixed(2)}</span>
                </div>
                {request.proposed_changes && (() => {
                  const mv = (request as any).market_value_usd ?? (request.proposed_changes as any)?.market_value_usd;
                  if (!mv) return null;
                  return (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Valeur vénale</span>
                      <span>${Number(mv).toLocaleString()}</span>
                    </div>
                  );
                })()}
                {request.justification && (
                  <div className="pt-1 border-t">
                    <span className="text-[10px] text-muted-foreground">Justification :</span>
                    <p className="text-xs mt-0.5">{request.justification}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label className="text-xs">Action</Label>
              <Select value={processAction} onValueChange={(v: any) => onActionChange(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Approuver</SelectItem>
                  <SelectItem value="reject">Rejeter</SelectItem>
                  <SelectItem value="hold">Mettre en attente</SelectItem>
                  <SelectItem value="return">Renvoyer pour correction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {processAction === 'reject' && (
              <div className="space-y-2">
                <Label className="text-xs">Motif du rejet *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => onRejectionReasonChange(e.target.value)}
                  placeholder="Indiquez le motif du rejet..."
                  className="min-h-[80px]"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Notes de traitement</Label>
              <Textarea
                value={processingNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Notes internes..."
                className="min-h-[60px]"
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={onConfirm}
            disabled={processing || (processAction === 'reject' && !rejectionReason.trim())}
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MutationProcessDialog;
