import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, CreditCard, Loader2, ShoppingCart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CatalogTotal from '@/components/shared/CatalogTotal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { useAnalyticsChartsConfig, useAnalyticsTabsConfig } from '@/hooks/useAnalyticsChartsConfig';
import { accessKey, useMyAnalyticsAccess } from '@/hooks/useAnalyticsAccess';
import { useAnalyticsCart } from '@/hooks/useAnalyticsCart';
import { useCurrencyConfig } from '@/hooks/useCurrencyConfig';
import CurrencySelector from '@/components/payment/CurrencySelector';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { toast } from 'sonner';
import AnalyticsCatalogItem, { CatalogVisual } from './AnalyticsCatalogItem';
import AnalyticsCheckoutDialog from './AnalyticsCheckoutDialog';

interface CatalogRow { tab_key: string; item_key: string; price_usd: number; access_days: number | null; description: string | null }

export default function AnalyticsCatalog() {
  const qc = useQueryClient();
  const { tabs, isLoading: tabsLoading } = useAnalyticsTabsConfig();
  const { configs } = useAnalyticsChartsConfig();
  const { allowed, data: purchases, isLoading: accessLoading, isError: accessError } = useMyAnalyticsAccess();
  const { items: cartItems, add, remove, removeMany, has, total } = useAnalyticsCart();
  const { currencies, selectedCurrency, setSelectedCurrency, convertFromUsd } = useCurrencyConfig();
  const price = (n: number) => `${convertFromUsd(n).toLocaleString('fr-FR', { minimumFractionDigits: selectedCurrency === 'USD' ? 2 : 0, maximumFractionDigits: selectedCurrency === 'USD' ? 2 : 0 })} ${selectedCurrency}`;
  const [activeTab, setActiveTab] = useState('');
  const [checkout, setCheckout] = useState<{ invoiceId: string; total: number; items: { tab_key: string; item_key: string }[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const catalogQuery = useQuery({
    queryKey: ['analytics-visual-catalog'],
    queryFn: async () => {
      const [rows, settings] = await Promise.all([
        supabase.from('analytics_visual_catalog').select('tab_key,item_key,price_usd,access_days,description').eq('is_active', true).gt('price_usd', 0),
        supabase.from('analytics_catalog_settings').select('default_access_days').maybeSingle(),
      ]);
      if (rows.error) throw rows.error;
      if (settings.error) throw settings.error;
      return { rows: (rows.data ?? []) as CatalogRow[], defaultDays: settings.data?.default_access_days ?? 30 };
    },
  });
  const sections = useMemo(() => {
    const priced = new Map((catalogQuery.data?.rows ?? []).map(r => [accessKey(r.tab_key, r.item_key), r]));
    const overrides = new Map(configs.map(c => [accessKey(c.tab_key, c.item_key), c]));
    return tabs.filter(t => t.is_visible).map(t => {
      const reg = ANALYTICS_TABS_REGISTRY[t.key];
      const items: CatalogVisual[] = [...(reg?.kpis ?? []), ...(reg?.charts ?? [])]
        .map(it => ({ ...it, ...overrides.get(accessKey(t.key, it.item_key)) }))
        .filter(it => it.is_visible && priced.has(accessKey(t.key, it.item_key)))
        .sort((a, b) => (a.item_type === b.item_type ? (a.display_order ?? 0) - (b.display_order ?? 0) : a.item_type === 'kpi' ? -1 : 1))
        .flatMap(it => {
          const row = priced.get(accessKey(t.key, it.item_key));
          return row ? [{ tab_key: t.key, item_key: it.item_key, title: it.custom_title || it.item_key, kind: it.item_type === 'kpi' ? 'Indicateur' : 'Graphique', price_usd: Number(row.price_usd), days: row.access_days ?? catalogQuery.data?.defaultDays ?? 30, description: row.description }] : [];
        });
      return { key: t.key, label: t.label, items };
    }).filter(s => s.items.length);
  }, [tabs, configs, catalogQuery.data]);
  useEffect(() => {
    if (!sections.some(s => s.key === activeTab)) setActiveTab(sections[0]?.key ?? '');
  }, [sections, activeTab]);
  useEffect(() => {
    const owned = cartItems.filter(i => allowed.has(accessKey(i.tab_key, i.item_key)));
    if (owned.length) removeMany(owned);
  }, [allowed, cartItems, removeMany]);

  const startCheckout = async () => {
    if (creating || !cartItems.length) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_analytics_visual_invoice', { p_items: cartItems.map(i => ({ tab_key: i.tab_key, item_key: i.item_key })) });
      if (error) throw error;
      const invoice = data as { invoice_id: string; total_amount_usd: number; items?: { tab_key: string; item_key: string }[] };
      const amount = Number(invoice.total_amount_usd);
      if (Math.round(amount * 100) !== Math.round(total * 100)) toast.warning('Montant mis à jour', { description: `Montant retenu : ${amount.toFixed(2)} USD.` });
      setCheckout({ invoiceId: invoice.invoice_id, total: amount, items: invoice.items ?? cartItems.map(i => ({ tab_key: i.tab_key, item_key: i.item_key })) });
    } catch (e) { toast.error('Impossible de préparer le paiement', { description: e instanceof Error ? e.message : 'Veuillez réessayer.' }); }
    finally { setCreating(false); }
  };

  const onPaid = () => {
    if (!checkout) return;
    removeMany(checkout.items);
    setCheckout(null);
    void qc.invalidateQueries({ queryKey: ['my-analytics-access'] });
    toast.success('Accès ouvert', { description: 'Vos visuels sont disponibles dans Données foncières.' });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        {catalogQuery.isLoading || tabsLoading || accessLoading ? <div className="flex justify-center py-12"><LoadingIndicator /></div> : catalogQuery.isError || accessError ? (
          <div role="alert" className="space-y-3 py-8 text-center"><p>Impossible de charger le catalogue.</p><Button variant="outline" onClick={() => { void catalogQuery.refetch(); void qc.invalidateQueries({ queryKey: ['my-analytics-access'] }); }}>Réessayer</Button></div>
        ) : !sections.length ? <p className="py-8 text-center text-sm text-muted-foreground">Aucun visuel n’est en vente pour le moment.</p> : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto pb-2"><TabsList className="h-auto w-max min-w-full justify-start gap-1 bg-muted/40">
              {sections.map(s => <TabsTrigger key={s.key} value={s.key} className="min-h-11 shrink-0">{s.label}</TabsTrigger>)}
            </TabsList></div>
            {sections.map(s => {
              const selectable = s.items.filter(i => !allowed.has(accessKey(i.tab_key, i.item_key)));
              const remaining = selectable.filter(i => !has(i.tab_key, i.item_key));
              const asCart = (i: CatalogVisual) => ({ ...i, tab_label: s.label });
              return <TabsContent key={s.key} value={s.key} className="space-y-3">
                {selectable.length > 1 && <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="text-xs font-semibold text-primary flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 shrink-0" />Dossier complet · {s.label}</div><p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{selectable.length} visuels pour {price(selectable.reduce((sum, i) => sum + i.price_usd, 0))}</p></div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">{selectable.length} dispo.</Badge>
                  </div>
                  <Button size="sm" variant={remaining.length ? 'default' : 'outline'} className="w-full h-8 text-xs" onClick={() => remaining.length ? add(remaining.map(asCart)) : removeMany(selectable)}>{!remaining.length ? 'Tout retirer' : remaining.length === selectable.length ? `Tout ajouter — ${price(remaining.reduce((sum, i) => sum + i.price_usd, 0))}` : `Compléter le dossier (+${price(remaining.reduce((sum, i) => sum + i.price_usd, 0))})`}</Button>
                </div>}
                <div className="space-y-2">{s.items.map(i => <AnalyticsCatalogItem key={i.item_key} item={i} selected={has(i.tab_key, i.item_key)} owned={allowed.has(accessKey(i.tab_key, i.item_key))} expiry={purchases?.find(p => p.tab_key === i.tab_key && p.item_key === i.item_key)?.expires_at} priceLabel={price(i.price_usd)} onToggle={() => has(i.tab_key, i.item_key) ? remove(i.tab_key, i.item_key) : add(asCart(i))} />)}</div>
              </TabsContent>;
            })}
          </Tabs>
        )}
      <footer className="mt-2.5 space-y-2.5">
        {showCart && <ul className="max-h-32 overflow-y-auto divide-y divide-border">{cartItems.map(i => <li key={accessKey(i.tab_key, i.item_key)} className="flex items-center gap-2 text-xs"><span className="min-w-0 flex-1 break-words">{i.title}<span className="block text-muted-foreground">{i.tab_label}</span></span><span className="shrink-0">{price(i.price_usd)}</span><Button size="icon" variant="ghost" className="h-11 w-11 shrink-0" aria-label={`Retirer ${i.title}`} onClick={() => remove(i.tab_key, i.item_key)}><Trash2 className="h-4 w-4" /></Button></li>)}</ul>}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowCart(!showCart)} aria-expanded={showCart}><ShoppingCart className="mr-2 h-4 w-4" />{cartItems.length} sélectionné(s)</Button>
          <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">Devise d’affichage</span><CurrencySelector currencies={currencies} selectedCurrency={selectedCurrency} onCurrencyChange={setSelectedCurrency} className="min-h-11" /></div>
        </div>
        {cartItems.length > 0 && <>
          <div className="space-y-1 px-2.5 py-2 bg-muted/20 rounded-xl text-xs flex justify-between gap-2"><span className="text-muted-foreground">Sous-total ({cartItems.length} visuel{cartItems.length > 1 ? 's' : ''})</span><span className="font-medium">{price(total)}</span></div>
          <CatalogTotal label="Total" amount={price(total)} detail={selectedCurrency !== 'USD' ? <div className="text-[10px] text-muted-foreground">≈ {total.toFixed(2)} USD</div> : undefined} />
        </>}
        <Button className="w-full h-10 text-sm font-semibold rounded-xl" disabled={creating || !cartItems.length || catalogQuery.isError || accessError} onClick={startCheckout}>{creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}{cartItems.length ? 'Payer' : 'Sélectionner des visuels'}</Button>
      </footer>
      </div>
      <AnalyticsCheckoutDialog checkout={checkout} onClose={() => setCheckout(null)} onPaid={onPaid} />
    </div>
  );
}