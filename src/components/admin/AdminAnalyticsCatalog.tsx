import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ANALYTICS_TABS_REGISTRY } from '@/config/analyticsTabsRegistry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useCurrencyConfig } from '@/hooks/useCurrencyConfig';
import { formatCurrency } from '@/utils/formatters';

interface Row { tab_key: string; item_key: string; price_usd: number | string; access_days: number | null; is_active: boolean; description: string | null }
const k = (t: string, i: string) => `${t}::${i}`;
const db = supabase as any;

const REG_TABS = Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => key !== '_global' && key !== 'rdc-map');
interface CfgRow { tab_key: string; item_key: string; is_visible: boolean; custom_title: string | null; display_order: number }
interface Item { item_key: string; title: string; type: string }
/** Prix saisi -> nombre valide ≥ 0, ou null si invalide. */
const parsePrice = (v: number | string): number | null => {
  if (v === '' || v === null || v === undefined) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

export default function AdminAnalyticsCatalog() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const [defaultDays, setDefaultDays] = useState(30);
  const [bulk, setBulk] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { convertFromUsd, getRate } = useCurrencyConfig();
  const cdfRate = getRate('CDF');
  const fc = (v: number | string) => { const n = parsePrice(v); return cdfRate && n ? `≈ ${formatCurrency(convertFromUsd(n, 'CDF'), 'CDF')}` : ''; };

  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics-catalog'],
    queryFn: async () => {
      const [{ data: rows, error }, { data: s }, { data: inv }, { data: cfg, error: cfgErr }] = await Promise.all([
        db.from('analytics_visual_catalog').select('tab_key,item_key,price_usd,access_days,is_active,description'),
        db.from('analytics_catalog_settings').select('default_access_days').maybeSingle(),
        db.from('analytics_visual_invoices').select('id,user_id,items,total_amount_usd,status,paid_at,created_at').eq('status', 'paid').order('paid_at', { ascending: false }).limit(50),
        db.from('analytics_charts_config').select('tab_key,item_key,is_visible,custom_title,display_order'),
      ]);
      if (error) throw error;
      if (cfgErr) throw cfgErr;
      return { cfg: (cfg ?? []) as CfgRow[], rows: (rows ?? []) as Row[], defaultDays: (s?.default_access_days as number) ?? 30, invoices: inv ?? [] };
    },
  });

  /** Onglets et visuels alignés sur le menu Données foncières : visibles seulement, titre et ordre de la config. */
  const TABS = useMemo(() => {
    const cfg = new Map((data?.cfg ?? []).map(c => [k(c.tab_key, c.item_key), c]));
    return REG_TABS.map(([tab, reg]) => {
      const items = [...reg.kpis, ...reg.charts]
        .map((it, idx) => ({ it, idx, c: cfg.get(k(tab, it.item_key)) }))
        .filter(x => x.c ? x.c.is_visible : true)
        .sort((a, b) => (a.c?.display_order ?? a.idx) - (b.c?.display_order ?? b.idx))
        .map(({ it, c }): Item => ({ item_key: it.item_key, title: c?.custom_title || it.custom_title || it.item_key, type: it.item_type }));
      return { tab, label: reg.label, items };
    }).filter(t => t.items.length > 0);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const map: Record<string, Row> = {};
    TABS.forEach(({ tab, items }) => items.forEach(it => {
      map[k(tab, it.item_key)] = { tab_key: tab, item_key: it.item_key, price_usd: 0, access_days: null, is_active: false, description: null };
    }));
    data.rows.forEach(r => { if (map[k(r.tab_key, r.item_key)]) map[k(r.tab_key, r.item_key)] = { ...r, price_usd: Number(r.price_usd) }; });
    setDraft(map);
    setDefaultDays(data.defaultDays);
  }, [data, TABS]);

  const patch = (key: string, p: Partial<Row>) => setDraft(d => ({ ...d, [key]: { ...d[key], ...p } }));

  const applyBulk = (tab: string) => {
    const price = bulk[tab] === '' || bulk[tab] === undefined ? null : parsePrice(bulk[tab]);
    if (price === null) { toast.error('Prix invalide : saisissez un montant en USD supérieur ou égal à 0'); return; }
    setDraft(d => Object.fromEntries(Object.entries(d).map(([key, r]) => [key, r.tab_key === tab ? { ...r, price_usd: price } : r])));
  };

  const stats = useMemo(() => {
    const vals = Object.values(draft);
    return { onSale: vals.filter(r => r.is_active && (parsePrice(r.price_usd) ?? 0) > 0).length, total: vals.length };
  }, [draft]);

  const save = async () => {
    const titleOf = (r: Row) => TABS.find(t => t.tab === r.tab_key)?.items.find(i => i.item_key === r.item_key)?.title ?? r.item_key;
    const rows = Object.values(draft).map(r => ({ ...r, parsed: parsePrice(r.price_usd) }));
    const invalid = rows.find(r => r.parsed === null);
    if (invalid) { toast.error(`Prix invalide pour « ${titleOf(invalid)} »`); return; }
    const badDays = rows.find(r => r.access_days !== null && !(Number.isInteger(r.access_days) && r.access_days >= 1 && r.access_days <= 3650));
    if (badDays) { toast.error(`Durée invalide pour « ${titleOf(badDays)} » (1 à 3650 jours)`); return; }
    const bad = rows.find(r => r.is_active && !((r.parsed ?? 0) > 0));
    if (bad) { toast.error(`« ${titleOf(bad)} » est en vente sans prix : saisissez un montant supérieur à 0 USD`); return; }
    if (!(Number.isInteger(defaultDays) && defaultDays >= 1 && defaultDays <= 3650)) { toast.error('Durée par défaut invalide (1 à 3650 jours)'); return; }
    setSaving(true);
    const toSave = rows.map(({ parsed, ...r }) => ({ ...r, price_usd: parsed ?? 0 })).filter(r => r.is_active || r.price_usd > 0 || r.description || r.access_days || data?.rows.some(x => x.tab_key === r.tab_key && x.item_key === r.item_key));
    const { error } = await db.from('analytics_visual_catalog').upsert(
      toSave.map(r => ({ ...r, description: r.description?.trim() || null, updated_at: new Date().toISOString() })),
      { onConflict: 'tab_key,item_key' },
    );
    const { error: e2 } = await db.from('analytics_catalog_settings').update({ default_access_days: defaultDays, updated_at: new Date().toISOString() }).eq('id', true);
    setSaving(false);
    if (error) toast.error('Prix et disponibilités non enregistrés', { description: error.message });
    if (e2) toast.error('Durée par défaut non enregistrée', { description: e2.message });
    if (error || e2) { qc.invalidateQueries({ queryKey: ['admin-analytics-catalog'] }); return; }
    toast.success('Catalogue enregistré');
    qc.invalidateQueries({ queryKey: ['admin-analytics-catalog'] });
    qc.invalidateQueries({ queryKey: ['analytics-visual-catalog'] });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Catalogue Données foncières</CardTitle>
          <CardDescription>
            Prix et durée d'accès de chaque visuel vendu aux profils non habilités. {stats.onSale} visuel(s) en vente sur {stats.total}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="default-days">Durée d'accès par défaut (jours)</Label>
            <Input id="default-days" type="number" min={1} max={3650} className="w-40" value={Number.isFinite(defaultDays) && defaultDays > 0 ? defaultDays : ''} onChange={e => setDefaultDays(e.target.value === '' ? 0 : Number(e.target.value))} />
          </div>
          <Button onClick={save} disabled={saving} className="min-h-10">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Sauvegarder
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue={TABS[0]?.tab}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto flex-nowrap">
          {TABS.map(({ tab, label }) => <TabsTrigger key={tab} value={tab} className="shrink-0">{label}</TabsTrigger>)}
        </TabsList>
        {TABS.map(({ tab, items }) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <Label htmlFor={`bulk-${tab}`} className="text-xs">Prix pour tout l'onglet (USD)</Label>
                    <div className="relative w-40">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input id={`bulk-${tab}`} type="number" min={0} step="0.01" inputMode="decimal" placeholder="0.00" className="pl-7 pr-12" value={bulk[tab] ?? ''} onChange={e => setBulk(b => ({ ...b, [tab]: e.target.value }))} />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">USD</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => applyBulk(tab)}>Appliquer</Button>
                </div>
                <div className="divide-y divide-border rounded-md border border-border">
                  {items.map(it => {
                    const key = k(tab, it.item_key);
                    const r = draft[key];
                    if (!r) return null;
                    return (
                      <div key={key} className="grid gap-2 p-2 md:grid-cols-[1fr_10rem_7rem_1fr_auto] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{it.title}</p>
                          <p className="text-xs text-muted-foreground">{it.type === 'kpi' ? 'Indicateur' : 'Graphique'}</p>
                        </div>
                        <div>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                            <Input aria-label="Prix en USD" type="number" min={0} step="0.01" inputMode="decimal" placeholder="0.00"
                              aria-invalid={parsePrice(r.price_usd) === null || (r.is_active && !((parsePrice(r.price_usd) ?? 0) > 0))}
                              className="pl-7 pr-12 aria-[invalid=true]:border-destructive" value={r.price_usd === 0 ? '' : r.price_usd} onChange={e => patch(key, { price_usd: e.target.value })} />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">USD</span>
                          </div>
                          {r.is_active && !((parsePrice(r.price_usd) ?? 0) > 0)
                            ? <p className="mt-0.5 text-[11px] text-destructive">Prix requis pour la vente</p>
                            : fc(r.price_usd) && <p className="mt-0.5 text-[11px] text-muted-foreground">{fc(r.price_usd)}</p>}
                        </div>
                        <Input aria-label="Durée (jours)" type="number" min={1} placeholder={`${defaultDays} j`} value={r.access_days ?? ''} onChange={e => patch(key, { access_days: e.target.value ? Number(e.target.value) : null })} />
                        <Input aria-label="Description" maxLength={300} placeholder="Description courte" value={r.description ?? ''} onChange={e => patch(key, { description: e.target.value })} />
                        <div className="flex items-center gap-2">
                          <Switch checked={r.is_active} onCheckedChange={v => patch(key, { is_active: v })} aria-label="En vente" />
                          <span className="text-xs text-muted-foreground">En vente</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader><CardTitle className="text-base">Derniers achats</CardTitle></CardHeader>
        <CardContent>
          {data?.invoices.length ? (
            <ul className="divide-y divide-border text-sm">
              {data.invoices.map((i: any) => (
                <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="font-mono text-xs text-muted-foreground">{i.user_id.slice(0, 8)}…</span>
                  <span>{(i.items as unknown[]).length} visuel(s)</span>
                  <span className="font-medium">{formatCurrency(Number(i.total_amount_usd), 'USD')}</span>
                  <span className="text-muted-foreground">{i.paid_at ? new Date(i.paid_at).toLocaleDateString('fr-FR') : ''}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Aucun achat pour le moment.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
