import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CreditCard, Loader2, ShoppingCart, Trash2, BarChart3 } from 'lucide-react';
import Navigation from '@/components/ui/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { useAnalyticsTabsConfig } from '@/hooks/useAnalyticsChartsConfig';
import { accessKey, useMyAnalyticsAccess } from '@/hooks/useAnalyticsAccess';
import { useAnalyticsCart, AnalyticsCartItem } from '@/hooks/useAnalyticsCart';
import { useCurrencyConfig } from '@/hooks/useCurrencyConfig';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { useTestMode } from '@/hooks/useTestMode';
import MobileMoneyPayment from '@/components/payment/MobileMoneyPayment';
import { toast } from 'sonner';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

interface CatalogRow { tab_key: string; item_key: string; price_usd: number; access_days: number | null; description: string | null }

const usd = (n: number) => `${n.toFixed(2)} $`;

export default function LandDataCatalog() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { tabs } = useAnalyticsTabsConfig();
  const { allowed, data: purchases } = useMyAnalyticsAccess();
  const cart = useAnalyticsCart();
  const { getRate } = useCurrencyConfig();
  const cdfRate = getRate('CDF');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState<{ invoiceId: string; total: number } | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: catalog, isLoading } = useQuery({
    queryKey: ['analytics-visual-catalog'],
    queryFn: async () => {
      const [{ data: rows, error }, { data: settings }] = await Promise.all([
        (supabase as any).from('analytics_visual_catalog').select('tab_key,item_key,price_usd,access_days,description').eq('is_active', true).gt('price_usd', 0),
        (supabase as any).from('analytics_catalog_settings').select('default_access_days').maybeSingle(),
      ]);
      if (error) throw error;
      return { rows: (rows ?? []) as CatalogRow[], defaultDays: (settings?.default_access_days as number) ?? 30 };
    },
  });

  useEffect(() => {
    const p = params.get('payment');
    if (p === 'success') { toast.success('Paiement reçu', { description: 'Vos visuels seront disponibles dès la confirmation.' }); cart.clear(); qc.invalidateQueries({ queryKey: ['my-analytics-access'] }); }
    if (p === 'cancelled') toast.info('Paiement annulé');
    if (p) { params.delete('payment'); setParams(params, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(() => {
    const priced = new Map((catalog?.rows ?? []).map(r => [accessKey(r.tab_key, r.item_key), r]));
    return tabs.filter(t => t.is_visible).map(t => {
      const reg = ANALYTICS_TABS_REGISTRY[t.key];
      const items = [...(reg?.kpis ?? []), ...(reg?.charts ?? [])]
        .map(it => ({ it, row: priced.get(accessKey(t.key, it.item_key)) }))
        .filter((x): x is { it: typeof x.it; row: CatalogRow } => !!x.row)
        .map(({ it, row }) => ({
          tab_key: t.key, item_key: it.item_key, title: it.custom_title || it.item_key,
          kind: it.item_type === 'kpi' ? 'Indicateur' : 'Graphique',
          price_usd: Number(row.price_usd), days: row.access_days ?? catalog!.defaultDays, description: row.description,
        }));
      return { key: t.key, label: t.label, items };
    }).filter(s => s.items.length > 0);
  }, [tabs, catalog]);

  const expiryOf = (tab: string, item: string) => purchases?.find(p => p.tab_key === tab && p.item_key === item)?.expires_at;

  // Retire du panier ce qui a été acheté depuis
  useEffect(() => {
    const owned = cart.items.filter(i => allowed.has(accessKey(i.tab_key, i.item_key)));
    if (owned.length) cart.removeMany(owned);
  }, [allowed, cart]);

  const startCheckout = async () => {
    setCreating(true);
    try {
      const { data, error } = await (supabase as any).rpc('create_analytics_visual_invoice', {
        p_items: cart.items.map(i => ({ tab_key: i.tab_key, item_key: i.item_key })),
      });
      if (error) throw error;
      const total = Number(data.total_amount_usd);
      if (Math.round(total * 100) !== Math.round(cart.total * 100)) {
        toast.warning('Montant mis à jour', { description: `Le montant retenu est ${usd(total)}.` });
      }
      setCartOpen(false);
      setCheckout({ invoiceId: data.invoice_id, total });
    } catch (e: any) {
      toast.error('Impossible de préparer le paiement', { description: e?.message });
    } finally {
      setCreating(false);
    }
  };

  const onPaid = () => {
    cart.clear();
    setCheckout(null);
    qc.invalidateQueries({ queryKey: ['my-analytics-access'] });
    toast.success('Accès ouvert', { description: 'Vos visuels sont disponibles dans Données foncières.' });
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <Helmet>
        <title>Catalogue des Données foncières | BIC</title>
        <meta name="description" content="Choisissez les visuels Données foncières auxquels vous souhaitez accéder et payez uniquement ce dont vous avez besoin." />
      </Helmet>
      <Navigation />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-10">
        <Button asChild variant="ghost" size="sm" className="mb-3 min-h-11 text-muted-foreground">
          <Link to="/map"><ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />Données foncières</Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Catalogue des données</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Sélectionnez les visuels qui vous intéressent, onglet par onglet, puis réglez votre panier. Chaque accès est valable pour la durée indiquée.
        </p>

        {isLoading ? (
          <div className="py-16 flex justify-center"><LoadingIndicator /></div>
        ) : sections.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Aucun visuel n'est en vente pour le moment. Revenez bientôt.
          </p>
        ) : (
          <Tabs defaultValue={sections[0].key} className="mt-6">
            <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto flex-nowrap">
              {sections.map(s => <TabsTrigger key={s.key} value={s.key} className="min-h-10 shrink-0">{s.label}</TabsTrigger>)}
            </TabsList>
            {sections.map(s => {
              const buyable = s.items.filter(i => !allowed.has(accessKey(i.tab_key, i.item_key)) && !cart.has(i.tab_key, i.item_key));
              return (
                <TabsContent key={s.key} value={s.key} className="mt-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">{s.items.length} visuel(s)</p>
                    <Button size="sm" variant="outline" className="min-h-10" disabled={buyable.length === 0}
                      onClick={() => cart.add(buyable.map(i => ({ tab_key: i.tab_key, item_key: i.item_key, title: i.title, tab_label: s.label, price_usd: i.price_usd })))}>
                      Tout l'onglet
                    </Button>
                  </div>
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {s.items.map(i => {
                      const owned = allowed.has(accessKey(i.tab_key, i.item_key));
                      const inCart = cart.has(i.tab_key, i.item_key);
                      const exp = expiryOf(i.tab_key, i.item_key);
                      const item: AnalyticsCartItem = { tab_key: i.tab_key, item_key: i.item_key, title: i.title, tab_label: s.label, price_usd: i.price_usd };
                      return (
                        <li key={i.item_key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4">
                          <BarChart3 aria-hidden="true" className="hidden h-5 w-5 shrink-0 text-primary sm:block" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{i.title} <Badge variant="secondary" className="ml-1 align-middle text-[10px]">{i.kind}</Badge></p>
                            {i.description && <p className="mt-0.5 text-xs text-muted-foreground">{i.description}</p>}
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Accès {i.days} jours
                              {owned && exp && <> · acquis jusqu'au {new Date(exp).toLocaleDateString('fr-FR')}</>}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-3 sm:justify-end">
                            <div className="text-right">
                              <p className="text-sm font-semibold text-foreground">{usd(i.price_usd)}</p>
                              {cdfRate && <p className="text-[11px] text-muted-foreground">≈ {Math.round(i.price_usd * cdfRate).toLocaleString('fr-FR')} FC</p>}
                            </div>
                            {owned ? (
                              <Button size="sm" variant="secondary" disabled className="min-h-10"><Check className="mr-1 h-4 w-4" />Déjà acheté</Button>
                            ) : inCart ? (
                              <Button size="sm" variant="outline" className="min-h-10" onClick={() => cart.remove(i.tab_key, i.item_key)}>Retirer</Button>
                            ) : (
                              <Button size="sm" className="min-h-10" onClick={() => cart.add(item)}>Ajouter au panier</Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        {cart.items.length > 0 && (
          <SheetTrigger asChild>
            <Button size="lg" className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] right-4 z-50 min-h-12 rounded-full shadow-lg" aria-label={`Ouvrir le panier (${cart.items.length})`}>
              <ShoppingCart className="mr-2 h-5 w-5" />{cart.items.length} · {usd(cart.total)}
            </Button>
          </SheetTrigger>
        )}
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Panier Données foncières ({cart.items.length})</SheetTitle>
            <SheetDescription>Vérifiez vos visuels avant le paiement.</SheetDescription>
          </SheetHeader>
          <ul className="mt-4 flex-1 divide-y divide-border overflow-y-auto">
            {cart.items.map(i => (
              <li key={accessKey(i.tab_key, i.item_key)} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{i.title}</p>
                  <p className="text-xs text-muted-foreground">{i.tab_label}</p>
                </div>
                <span className="text-sm text-foreground">{usd(i.price_usd)}</span>
                <Button size="icon" variant="ghost" className="h-11 w-11" aria-label={`Retirer ${i.title}`} onClick={() => cart.remove(i.tab_key, i.item_key)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border pt-3">
            <div className="mb-3 flex justify-between text-sm font-semibold text-foreground"><span>Total</span><span>{usd(cart.total)}</span></div>
            <Button className="min-h-11 w-full" disabled={creating || cart.items.length === 0} onClick={startCheckout}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Passer au paiement
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <CheckoutDialog checkout={checkout} onClose={() => setCheckout(null)} onPaid={onPaid} />
    </div>
  );
}

function CheckoutDialog({ checkout, onClose, onPaid }: { checkout: { invoiceId: string; total: number } | null; onClose: () => void; onPaid: () => void }) {
  const { availableMethods } = usePaymentConfig();
  const { isTestModeActive } = useTestMode();
  const [busy, setBusy] = useState(false);

  const payTest = async () => {
    if (!checkout) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('record-test-payment', { body: { kind: 'analytics_invoice', invoice_id: checkout.invoiceId } });
    setBusy(false);
    if (error || !data?.transaction_id) { toast.error('Paiement test refusé'); return; }
    onPaid();
  };

  const payCard = async () => {
    if (!checkout) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('create-payment', { body: { payment_type: 'analytics_access', invoice_id: checkout.invoiceId } });
    setBusy(false);
    if (error || !data?.url) { toast.error('Paiement par carte indisponible'); return; }
    window.location.href = data.url;
  };

  return (
    <Dialog open={!!checkout} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Paiement</DialogTitle>
          <DialogDescription>Montant à régler : {checkout ? usd(checkout.total) : ''}</DialogDescription>
        </DialogHeader>
        {checkout && (
          <div className="space-y-4">
            {isTestModeActive && (
              <Button className="min-h-11 w-full" variant="secondary" disabled={busy} onClick={payTest}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Simuler le paiement (mode test)
              </Button>
            )}
            {availableMethods.hasMobileMoney && (
              <MobileMoneyPayment
                item={{ id: checkout.invoiceId, title: 'Accès Données foncières', price: checkout.total }}
                currency="USD"
                paymentType="analytics_access"
                invoiceId={checkout.invoiceId}
                successMessage="Vos visuels sont maintenant disponibles"
                onPaymentSuccess={onPaid}
              />
            )}
            {availableMethods.hasBankCard && (
              <Button className="min-h-11 w-full" variant="outline" disabled={busy} onClick={payCard}>
                <CreditCard className="mr-2 h-4 w-4" />Payer par carte bancaire
              </Button>
            )}
            {!isTestModeActive && !availableMethods.hasAnyMethod && (
              <p className="text-sm text-muted-foreground">Aucun moyen de paiement n'est disponible pour le moment.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
