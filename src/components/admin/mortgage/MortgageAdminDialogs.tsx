import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, RefreshCw } from 'lucide-react';
import type { MortgageRequest } from './mortgageTypes';

// --- Approval Confirmation Dialog ---
interface ApproveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MortgageRequest | null;
  processingAction: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ApproveConfirmDialog: React.FC<ApproveConfirmDialogProps> = ({
  open, onOpenChange, request, processingAction, onConfirm, onCancel
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[340px] rounded-2xl">
      <DialogHeader><DialogTitle className="text-sm">Confirmer l'approbation</DialogTitle></DialogHeader>
      {request && (
        <div className="space-y-3 py-2">
          <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 rounded-xl">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs text-green-700 dark:text-green-300">
              <p className="font-medium mb-1">
                {request.contribution_type === 'mortgage_cancellation'
                  ? "L'hypothèque sera marquée comme soldée et radiée du registre."
                  : "Une nouvelle hypothèque sera créée dans le registre avec un numéro de référence."
                }
              </p>
              <p>Parcelle: <strong>{request.parcel_number}</strong></p>
            </AlertDescription>
          </Alert>
        </div>
      )}
      <DialogFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={onConfirm} disabled={processingAction}>
          {processingAction ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
          Confirmer l'approbation
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// --- Reject Dialog ---
interface RejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectionReason: string;
  setRejectionReason: (v: string) => void;
  processingAction: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RejectDialog: React.FC<RejectDialogProps> = ({
  open, onOpenChange, rejectionReason, setRejectionReason, processingAction, onConfirm, onCancel
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[340px] rounded-2xl">
      <DialogHeader><DialogTitle className="text-sm">Motif du rejet</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <Label className="text-xs">Veuillez indiquer le motif du rejet *</Label>
        <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Motif du rejet..." className="text-sm rounded-xl" rows={3} />
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
        <Button variant="destructive" size="sm" onClick={onConfirm} disabled={processingAction || !rejectionReason.trim()}>Confirmer le rejet</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

// --- Return Dialog ---
interface ReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnReason: string;
  setReturnReason: (v: string) => void;
  processingAction: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ReturnDialog: React.FC<ReturnDialogProps> = ({
  open, onOpenChange, returnReason, setReturnReason, processingAction, onConfirm, onCancel
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[340px] rounded-2xl">
      <DialogHeader><DialogTitle className="text-sm">Renvoyer pour correction</DialogTitle></DialogHeader>
      <div className="space-y-3 py-2">
        <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 rounded-xl">
          <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
            La demande sera renvoyée au demandeur avec vos observations. Il pourra la corriger et la resoumettre.
          </AlertDescription>
        </Alert>
        <Label className="text-xs">Observations / éléments à corriger *</Label>
        <Textarea value={returnReason} onChange={(e) => setReturnReason(e.target.value)} placeholder="Précisez les corrections attendues..." className="text-sm rounded-xl" rows={3} />
      </div>
      <DialogFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Annuler</Button>
        <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={onConfirm} disabled={processingAction || !returnReason.trim()}>Renvoyer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
