import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrency } from '@/utils/formatters';
import { getCreditorTypeLabel } from './mortgageHelpers';

interface Mortgage {
  id: string;
  parcel_id: string;
  creditor_name: string;
  creditor_type: string;
  mortgage_amount_usd: number;
  mortgage_status: string;
  contract_date: string;
  duration_months: number;
  created_at: string;
  parcel_number?: string;
  reference_number?: string;
}

interface MortgageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mortgage: Mortgage | null;
}

const MortgageDetailsDialog: React.FC<MortgageDetailsDialogProps> = ({ open, onOpenChange, mortgage }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[340px] rounded-2xl">
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
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export default MortgageDetailsDialog;
