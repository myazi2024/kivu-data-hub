import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Receipt, ExternalLink, AlertTriangle, Landmark } from 'lucide-react';
import { useUserAssets } from '@/hooks/useUserAssets';
import { formatUsd, formatDateFr } from '@/utils/userRentalMarket';

const isPaid = (s: string) => s === 'Payé' || s === 'paid';

/** Vue « Fiscalité déclarée » : IRL et impôt foncier issus des déclarations. */
export const TaxObligationsPanel: React.FC = () => {
  const { taxes, rentals, totals, loading } = useUserAssets();

  const grouped = useMemo(() => {
    const map = new Map<string, typeof taxes>();
    for (const t of taxes) {
      const list = map.get(t.parcelNumber) ?? [];
      list.push(t);
      map.set(t.parcelNumber, list);
    }
    return Array.from(map.entries());
  }, [taxes]);

  /** Biens en location sans déclaration IRL correspondante. */
  const missingIrl = useMemo(() => {
    const declared = new Set(
      taxes
        .filter((t) => t.taxType.toLowerCase().includes('revenus locatifs'))
        .map((t) => `${t.contributionId}-${t.constructionRef ?? 'main'}`),
    );
    return rentals.filter((r) => !declared.has(`${r.contributionId}-${r.constructionRef}`));
  }, [taxes, rentals]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin motion-reduce:animate-none rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-background rounded-2xl p-3 border shadow-sm">
          <p className="text-[10px] text-muted-foreground">Revenus locatifs annuels</p>
          <p className="text-sm font-bold">{formatUsd(totals.annualRentUsd)}</p>
        </div>
        <div className="bg-background rounded-2xl p-3 border shadow-sm">
          <p className="text-[10px] text-muted-foreground">Déclarations</p>
          <p className="text-sm font-bold">{taxes.length}</p>
        </div>
        <div className="bg-background rounded-2xl p-3 border shadow-sm">
          <p className="text-[10px] text-muted-foreground">Reste à payer</p>
          <p className="text-sm font-bold text-destructive">{formatUsd(totals.taxDue)}</p>
        </div>
      </div>

      {missingIrl.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {missingIrl.length} bien(s) en location sans déclaration d'impôt sur les revenus
            locatifs. Complétez l'onglet « Obligations » de la contribution concernée.
          </AlertDescription>
        </Alert>
      )}

      {grouped.length === 0 ? (
        <div className="text-center py-10 bg-background rounded-2xl border">
          <Receipt className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Aucune obligation fiscale déclarée</p>
        </div>
      ) : (
        grouped.map(([parcel, items]) => (
          <div key={parcel} className="bg-background rounded-2xl border overflow-hidden">
            <div className="px-3 py-2 border-b flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">{parcel}</p>
            </div>
            <div className="divide-y">
              {items.map((t, i) => (
                <div key={i} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{t.taxType}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Exercice {t.taxYear || '—'}
                      {t.paymentDate ? ` • Payé le ${formatDateFr(t.paymentDate)}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold">{formatUsd(t.taxAmountUsd)}</p>
                    <Badge
                      variant={isPaid(t.paymentStatus) ? 'default' : 'destructive'}
                      className="text-[9px] mt-0.5"
                    >
                      {isPaid(t.paymentStatus) ? 'Payé' : t.paymentStatus || 'Non payé'}
                    </Badge>
                  </div>
                  {t.receiptUrl && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                      <a href={t.receiptUrl} target="_blank" rel="noopener noreferrer" aria-label="Reçu">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <p className="text-[10px] text-muted-foreground">
        Montants issus de vos déclarations cadastrales. Ils ne remplacent pas un avis d'imposition
        officiel.
      </p>
    </div>
  );
};

export default TaxObligationsPanel;
