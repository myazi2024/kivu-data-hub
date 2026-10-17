import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, CreditCard, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCurrencyConfig } from '@/hooks/useCurrencyConfig';
import { useAnalyticsCart } from '@/hooks/useAnalyticsCart';
import AnalyticsCatalogDialog from '@/components/analytics/catalog/AnalyticsCatalogDialog';
import { useVisualLabels } from './useVisualLabels';

interface InvoiceItem { tab_key: string; item_key: string; price_usd: number; access_days: number }
interface Invoice { id: string; items: InvoiceItem[]; total_amount_usd: number; status: string; paid_at: string | null; created_at: string }

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Payée', cls: 'bg-success/10 text-success border-success/30' },
  completed: { label: 'Payée', cls: 'bg-success/10 text-success border-success/30' },
  pending: { label: 'En attente', cls: 'bg-warning/10 text-warning border-warning/30' },
  cancelled: { label: 'Annulée', cls: 'bg-muted text-muted-foreground' },
  failed: { label: 'Échouée', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};
const usd = (n: number) => `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $ USD`;

export function MyAnalyticsPurchases() {
  const { user } = useAuth();
  const { tabLabel, visualTitle } = useVisualLabels();
  const { convertFromUsd } = useCurrencyConfig() as any;
  const { add } = useAnalyticsCart();
  const [open, setOpen] = useState<string | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const q = useQuery({
    queryKey: ['my-analytics-invoices', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await (supabase as any).from('analytics_visual_invoices')
        .select('id, items, total_amount_usd, status, paid_at, created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const resume = (inv: Invoice) => {
    add(inv.items.map(i => ({ tab_key: i.tab_key, item_key: i.item_key, price_usd: Number(i.price_usd), title: visualTitle(i.tab_key, i.item_key), tab_label: tabLabel(i.tab_key) })));
    setCatalogOpen(true);
  };

  const receipt = (inv: Invoice) => {
    const lines = [
      'BIC - Reçu Données foncières', `Référence : ${inv.id}`, `Date : ${new Date(inv.paid_at ?? inv.created_at).toLocaleString('fr-FR')}`, '',
      ...inv.items.map(i => `- ${tabLabel(i.tab_key)} · ${visualTitle(i.tab_key, i.item_key)} · ${i.access_days} j · ${usd(i.price_usd)}`),
      '', `Total : ${usd(inv.total_amount_usd)}`,
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `recu-donnees-foncieres-${inv.id.slice(0, 8)}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Mes achats Données foncières</h1>
        <p className="text-sm text-muted-foreground">Historique de vos commandes de visuels.</p>
      </div>
      {q.isLoading ? <div className="py-10"><LoadingIndicator /></div>
        : q.isError ? <p className="text-sm text-destructive">Impossible de charger vos achats.</p>
        : !q.data?.length ? <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">Aucun achat pour le moment.</div>
        : (
          <ul className="space-y-2">
            {q.data.map(inv => {
              const st = STATUS[inv.status] ?? { label: inv.status, cls: '' };
              const isOpen = open === inv.id;
              const fc = convertFromUsd ? convertFromUsd(Number(inv.total_amount_usd), 'CDF') : null;
              return (
                <li key={inv.id} className="rounded-md border bg-card">
                  <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left" onClick={() => setOpen(isOpen ? null : inv.id)} aria-expanded={isOpen}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{new Date(inv.created_at).toLocaleDateString('fr-FR')} · {inv.items.length} visuel(s)</p>
                      <p className="text-xs text-muted-foreground">{usd(inv.total_amount_usd)}{typeof fc === 'number' ? ` · ≈ ${Math.round(fc).toLocaleString('fr-FR')} FC` : ''}</p>
                    </div>
                    <Badge variant="outline" className={st.cls}>{st.label}</Badge>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t px-3 py-2">
                      <ul className="space-y-1 text-xs">
                        {inv.items.map(i => (
                          <li key={`${i.tab_key}-${i.item_key}`} className="flex justify-between gap-2">
                            <span className="min-w-0 truncate">{tabLabel(i.tab_key)} · {visualTitle(i.tab_key, i.item_key)} ({i.access_days} j)</span>
                            <span className="shrink-0">{usd(i.price_usd)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-2">
                        {(inv.status === 'paid' || inv.status === 'completed') && <Button size="sm" variant="outline" onClick={() => receipt(inv)}><Download className="mr-2 h-4 w-4" />Reçu</Button>}
                        {inv.status === 'pending' && <Button size="sm" onClick={() => resume(inv)}><CreditCard className="mr-2 h-4 w-4" />Reprendre le paiement</Button>}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      <AnalyticsCatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
    </div>
  );
}
