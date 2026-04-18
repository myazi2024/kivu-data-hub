import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getCreditorTypeLabel, getMortgageStatusType } from './mortgageHelpers';
import { MortgagePaymentsPanel } from './MortgagePaymentsPanel';
import type { Mortgage } from './mortgageTypes';

interface MortgageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mortgage: Mortgage | null;
}

const MortgageDetailsDialog: React.FC<MortgageDetailsDialogProps> = ({ open, onOpenChange, mortgage }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle className="text-sm">Détails de l'hypothèque</DialogTitle></DialogHeader>
      {mortgage && (
        <div className="space-y-3 py-2">
          {mortgage.reference_number && (
            <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-[10px] text-muted-foreground mb-1">Numéro de référence</p>
              <p className="text-sm font-mono font-bold text-primary">{mortgage.reference_number}</p>
            </div>
          )}
          <div className="p-2.5 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground">Statut</p>
              <StatusBadge status={getMortgageStatusType(mortgage.mortgage_status)} compact />
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground mb-1">Créancier</p>
            <p className="text-xs font-medium">{mortgage.creditor_name}</p>
            <p className="text-[10px] text-muted-foreground">{getCreditorTypeLabel(mortgage.creditor_type)}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground mb-1">Montant</p>
              <p className="text-xs font-semibold">{formatCurrency(mortgage.mortgage_amount_usd)}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground mb-1">Durée</p>
              <p className="text-xs font-semibold">{mortgage.duration_months} mois</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground mb-1">Parcelle</p>
              <p className="text-xs font-mono">{mortgage.parcel_number}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground mb-1">Date contrat</p>
              <p className="text-xs">{format(new Date(mortgage.contract_date), 'dd MMM yyyy', { locale: fr })}</p>
            </div>
          </div>
          <div className="border-t pt-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Paiements</p>
            <MortgagePaymentsPanel mortgageId={mortgage.id} totalAmount={mortgage.mortgage_amount_usd} />
          </div>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default MortgageDetailsDialog;
