import React from 'react';
import { Receipt, CreditCard, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SectionCard, DocTable, StatusAlert } from '../primitives';
import { TaxHistory, MortgageHistory } from '@/hooks/useCadastralSearch';
import DocumentAttachment from '../../DocumentAttachment';

interface ObligationsSectionProps {
  number: number;
  taxHistory: TaxHistory[];
  mortgageHistory: MortgageHistory[];
}

const formatDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const getPaymentStatusLabel = (status: string) => {
  switch (status) {
    case 'paid': return 'Payé';
    case 'overdue': return 'En retard';
    case 'pending': return 'En attente';
    default: return status;
  }
};

const getPaymentStatusVariant = (status: string): 'default' | 'destructive' | 'secondary' => {
  switch (status) {
    case 'paid': return 'default';
    case 'overdue': return 'destructive';
    default: return 'secondary';
  }
};

const ObligationsSection: React.FC<ObligationsSectionProps> = ({ number, taxHistory, mortgageHistory }) => {
  const hasActiveMortgage = mortgageHistory.some(m => ['active', 'Active', 'En cours'].includes(m.mortgage_status));

  return (
    <SectionCard number={number} icon={<Receipt className="h-4 w-4" />} title="Obligations financières">
      {/* Taxes */}
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Receipt className="h-3.5 w-3.5" /> Taxes foncières
      </h4>
      {taxHistory.length > 0 ? (
        <>
          <DocTable headers={['Année', 'Montant (USD)', 'Statut', 'Date de paiement']}>
            {taxHistory.map((tax) => (
              <tr key={tax.id}>
                <td className="font-semibold text-sm">{tax.tax_year}</td>
                <td className="text-sm">${tax.amount_usd.toLocaleString()}</td>
                <td>
                  <Badge variant={getPaymentStatusVariant(tax.payment_status)} className="text-xs">
                    {getPaymentStatusLabel(tax.payment_status)}
                  </Badge>
                </td>
                <td className="text-xs">{tax.payment_date ? formatDate(tax.payment_date) : '—'}</td>
              </tr>
            ))}
          </DocTable>
          {/* Tax receipts */}
          {taxHistory.filter(t => t.receipt_document_url).map(tax => (
            <div key={`receipt-${tax.id}`} className="mt-2">
              <DocumentAttachment
                documentUrl={tax.receipt_document_url}
                label={`Reçu fiscal ${tax.tax_year}`}
                description={`Montant: $${tax.amount_usd.toLocaleString()}`}
              />
            </div>
          ))}
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">Aucune taxe foncière enregistrée</p>
      )}

      {/* Mortgages */}
      <div className="mt-6">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CreditCard className="h-3.5 w-3.5" /> Statut hypothécaire
        </h4>

        {hasActiveMortgage && (
          <div className="mb-3">
            <StatusAlert
              variant="warning"
              icon={<div className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse print:animate-none" />}
              title="Parcelle avec hypothèque active"
            />
          </div>
        )}

        {mortgageHistory.length > 0 ? (
          <DocTable headers={['Référence', 'Créancier', 'Montant (USD)', 'Durée', 'Statut', 'Contrat']}>
            {mortgageHistory.map((m) => {
              const totalPaid = m.payments.reduce((sum, p) => sum + p.payment_amount_usd, 0);
              const isActive = ['active', 'Active', 'En cours'].includes(m.mortgage_status);
              return (
                <tr key={m.id} className={isActive ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                  <td className="font-mono text-xs">{m.reference_number || '—'}</td>
                  <td className="text-sm">
                    {m.creditor_name}
                    <br /><span className="text-xs text-muted-foreground">{m.creditor_type}</span>
                  </td>
                  <td className="text-sm">
                    ${m.mortgage_amount_usd.toLocaleString()}
                    {totalPaid > 0 && <><br /><span className="text-xs text-green-600">Remboursé: ${totalPaid.toLocaleString()}</span></>}
                  </td>
                  <td className="text-xs">{m.duration_months} mois</td>
                  <td>
                    <Badge variant={['paid_off', 'Éteinte'].includes(m.mortgage_status) ? 'default' : isActive ? 'secondary' : 'destructive'} className="text-xs">
                      {['paid_off', 'Éteinte'].includes(m.mortgage_status) ? 'Éteinte' : isActive ? 'Active' : 'Défaillante'}
                    </Badge>
                  </td>
                  <td className="text-xs">{formatDate(m.contract_date)}</td>
                </tr>
              );
            })}
          </DocTable>
        ) : (
          <StatusAlert
            variant="success"
            icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
            title="Aucune hypothèque enregistrée"
            description="Parcelle libre de charges hypothécaires"
          />
        )}
      </div>
    </SectionCard>
  );
};

export default ObligationsSection;
