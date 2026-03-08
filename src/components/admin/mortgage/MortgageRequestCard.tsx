import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, CheckCircle2, XCircle, DollarSign, FileX2, Landmark, RotateCcw } from 'lucide-react';
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

interface MortgageRequestCardProps {
  request: MortgageRequest;
  processingAction: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onReturn?: () => void;
}

const getRequestTypeIcon = (type: string) => {
  return type === 'mortgage_cancellation'
    ? <FileX2 className="h-3.5 w-3.5 text-destructive" />
    : <Landmark className="h-3.5 w-3.5 text-amber-600" />;
};

const MortgageRequestCard: React.FC<MortgageRequestCardProps> = ({
  request, processingAction, onView, onApprove, onReject, onReturn
}) => {
  const mortgage = request.mortgage_history[0];

  return (
    <div className="p-2.5 md:p-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {getRequestTypeIcon(request.contribution_type)}
            <span className="text-xs font-semibold">{getRequestTypeLabel(request.contribution_type)}</span>
            <StatusBadge status={getMortgageStatusType(request.status)} compact />
          </div>
          <div className="text-[10px] text-muted-foreground">
            Parcelle: {request.parcel_number} • {mortgage?.creditor_name || mortgage?.creditorName || 'N/A'}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[10px]">
            <DollarSign className="h-2.5 w-2.5 text-green-500" />
            <span className="font-semibold">{formatCurrency(mortgage?.mortgage_amount_usd || mortgage?.mortgageAmountUsd || mortgage?.total_amount_paid || 0)}</span>
            <span className="text-muted-foreground">{format(new Date(request.created_at), 'dd/MM/yy', { locale: fr })}</span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onView}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="default" size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700" onClick={onApprove} disabled={processingAction}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </Button>
          {onReturn && (
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onReturn} disabled={processingAction} title="Renvoyer pour correction">
              <RotateCcw className="h-3.5 w-3.5 text-amber-600" />
            </Button>
          )}
          <Button variant="destructive" size="icon" className="h-7 w-7" onClick={onReject} disabled={processingAction}>
            <XCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MortgageRequestCard;
