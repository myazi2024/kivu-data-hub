import React from 'react';
import { CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { MutationRequest } from '@/types/mutation';

interface Props { request: MutationRequest | null }

/**
 * Lightweight payment summary for the Mutation details dialog.
 * Reads the data already loaded with the request (no extra fetch).
 */
export const MutationPaymentSection: React.FC<Props> = ({ request }) => {
  if (!request) return null;

  const status = request.payment_status || 'pending';
  const variant: any = status === 'paid' ? 'default' : status === 'failed' ? 'destructive' : 'secondary';
  const Icon = status === 'paid' ? CheckCircle2 : status === 'failed' ? XCircle : Clock;
  const label = status === 'paid' ? 'Payé' : status === 'failed' ? 'Échoué' : 'En attente';

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        Paiement
      </h4>
      <div className="text-xs space-y-1 p-2 rounded border bg-muted/30">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Statut</span>
          <Badge variant={variant} className="text-[10px] gap-1">
            <Icon className="h-3 w-3" />
            {label}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Montant</span>
          <span className="font-bold">${Number(request.total_amount_usd).toFixed(2)}</span>
        </div>
        {request.paid_at && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Payé le</span>
            <span>{format(new Date(request.paid_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</span>
          </div>
        )}
        {request.payment_id && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">ID transaction</span>
            <span className="font-mono">{request.payment_id.slice(0, 12)}…</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MutationPaymentSection;
