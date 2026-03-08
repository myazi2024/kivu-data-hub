import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RotateCcw, FileX2, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatCurrency } from '@/utils/formatters';
import { getMortgageStatusType, getRequestTypeLabel } from './mortgageHelpers';

interface MortgageRequest {
  id: string;
  parcel_number: string;
  contribution_type: string;
  mortgage_history: any[];
  status: string;
  created_at: string;
  user_id: string;
  original_parcel_id?: string;
  rejection_reason?: string | null;
  change_justification?: string | null;
}

interface MortgageRequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: MortgageRequest | null;
  processingAction: boolean;
  onApprove: (request: MortgageRequest) => void;
  onReject: () => void;
  onReturn: (request: MortgageRequest) => void;
}

const getRequestTypeIcon = (type: string) => {
  return type === 'mortgage_cancellation'
    ? <FileX2 className="h-3.5 w-3.5 text-destructive" />
    : <Landmark className="h-3.5 w-3.5 text-amber-600" />;
};

const MortgageRequestDetailsDialog: React.FC<MortgageRequestDetailsDialogProps> = ({
  open, onOpenChange, request, processingAction, onApprove, onReject, onReturn
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[380px] rounded-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="text-sm">Détails de la demande</DialogTitle></DialogHeader>
      {request && (
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            {getRequestTypeIcon(request.contribution_type)}
            <span className="text-sm font-semibold">{getRequestTypeLabel(request.contribution_type)}</span>
            <StatusBadge status={getMortgageStatusType(request.status)} compact />
          </div>

          <div className="p-2.5 rounded-lg bg-muted/50 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-muted-foreground">Parcelle:</span><p className="font-mono font-medium">{request.parcel_number}</p></div>
              <div><span className="text-muted-foreground">Date:</span><p>{format(new Date(request.created_at), 'dd MMM yyyy', { locale: fr })}</p></div>
            </div>
          </div>

          {request.mortgage_history.map((mortgage: any, idx: number) => (
            <div key={idx} className="p-3 rounded-lg border space-y-2">
              {mortgage.request_reference_number && <div className="text-xs"><span className="text-muted-foreground">Réf demande:</span> <span className="font-mono">{mortgage.request_reference_number}</span></div>}
              {mortgage.creditor_name && <div className="text-xs"><span className="text-muted-foreground">Créancier:</span> <span className="font-medium">{mortgage.creditor_name}</span></div>}
              {(mortgage.mortgage_amount_usd || mortgage.mortgageAmountUsd) && <div className="text-xs"><span className="text-muted-foreground">Montant:</span> <span className="font-semibold">{formatCurrency(mortgage.mortgage_amount_usd || mortgage.mortgageAmountUsd)}</span></div>}
              {mortgage.mortgage_reference_number && <div className="text-xs"><span className="text-muted-foreground">Réf hypothèque:</span> <span className="font-mono">{mortgage.mortgage_reference_number}</span></div>}
              {mortgage.mortgage_status && <div className="text-xs"><span className="text-muted-foreground">Statut déclaré:</span> <span>{mortgage.mortgage_status}</span></div>}
              {mortgage.cancellation_reason_label && <div className="text-xs"><span className="text-muted-foreground">Motif:</span> <span>{mortgage.cancellation_reason_label}</span></div>}
              {mortgage.requester_name && <div className="text-xs"><span className="text-muted-foreground">Demandeur:</span> <span>{mortgage.requester_name}</span></div>}
              {mortgage.total_amount_paid > 0 && <div className="text-xs"><span className="text-muted-foreground">Frais payés:</span> <span className="font-semibold text-green-600">{formatCurrency(mortgage.total_amount_paid)}</span></div>}
              {mortgage.payment_transaction_id && <div className="text-xs"><span className="text-muted-foreground">ID Transaction:</span> <span className="font-mono text-[10px]">{mortgage.payment_transaction_id}</span></div>}
              {mortgage.document_url && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Justificatif:</span>
                  <a href={mortgage.document_url} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary hover:underline text-[10px]">Voir le document</a>
                </div>
              )}
              {mortgage.supporting_documents?.length > 0 && (
                <div className="text-xs">
                  <span className="text-muted-foreground">Documents ({mortgage.supporting_documents.length}):</span>
                  <div className="mt-1 space-y-1">
                    {mortgage.supporting_documents.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block text-primary hover:underline text-[10px] truncate">{url.split('/').pop()}</a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {request.change_justification && (
            <div className="p-2.5 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground mb-1">Commentaire</p>
              <p className="text-xs">{request.change_justification}</p>
            </div>
          )}

          {request.status === 'pending' && (
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700" onClick={() => onApprove(request)} disabled={processingAction}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approuver
              </Button>
              <Button variant="outline" className="h-9 text-xs" onClick={() => onReturn(request)} disabled={processingAction} title="Renvoyer pour correction">
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> Renvoyer
              </Button>
              <Button variant="destructive" className="flex-1 h-9 text-xs" onClick={onReject} disabled={processingAction}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeter
              </Button>
            </div>
          )}
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default MortgageRequestDetailsDialog;
