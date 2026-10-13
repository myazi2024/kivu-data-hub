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

interface Row { tab_key: string; item_key: string; price_usd: number; access_days: number | null; is_active: boolean; description: string | null }
const k = (t: string, i: string) => `${t}::${i}`;
const db = supabase as any;

const TABS = Object.entries(ANALYTICS_TABS_REGISTRY).filter(([key]) => key !== '_global' && key !== 'rdc-map');

export default function AdminAnalyticsCatalog() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const [defaultDays, setDefaultDays] = useState(30);
  const [bulk, setBulk] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics-catalog'],
    queryFn: async () => {
      const [{ data: rows, error }, { data: s }, { data: inv }] = await Promise.all([
        db.from('analytics_visual_catalog').select('tab_key,item_key,price_usd,access_days,is_active,description'),
        db.from('analytics_catalog_settings').select('default_access_days').maybeSingle(),
        db.from('analytics_visual_invoices').select('id,user_id,items,total_amount_usd,status,paid_at,created_at').eq('status', 'paid').order('paid_at', { ascending: false }).limit(50),
      ]);
      if (error) throw error;
      return { rows: (rows ?? []) as Row[], defaultDays: (s?.default_access_days as number) ?? 30, invoices: inv ?? [] };
    },
  });

  useEffect(() => {
    if (!data) return;
    const map: Record<string, Row> = {};
    TABS.forEach(([tab, reg]) => [...reg.kpis, ...reg.charts].forEach(it => {
      map[k(tab, it.item_key)] = { tab_key: tab, item_key: it.item_key, price_usd: 0, access_days: null, is_active: false, description: null };
    }));
    data.rows.forEach(r => { if (map[k(r.tab_key, r.item_key)]) map[k(r.tab_key, r.item_key)] = { ...r, price_usd: Number(r.price_usd) }; });
    setDraft(map);
    setDefaultDays(data.defaultDays);
  }, [data]);

  const patch = (key: string, p: Partial<Row>) => setDraft(d => ({ ...d, [key]: { ...d[key], ...p } }));

  const applyBulk = (tab: string) => {
    const price = Number(bulk[tab]);
    if (!Number.isFinite(price) || price < 0) { toast.error('Prix invalide'); return; }
    setDraft(d => Object.fromEntries(Object.entries(d).map(([key, r]) => [key, r.tab_key === tab ? { ...r, price_usd: price } : r])));
  };

  const stats = useMemo(() => {
    const vals = Object.values(draft);
    return { onSale: vals.filter(r => r.is_active && r.price_usd > 0).length, total: vals.length };
  }, [draft]);

  const save = async () => {
    const rows = Object.values(draft);
    const bad = rows.find(r => r.is_active && !(r.price_usd > 0));
    if (bad) { toast.error('Un visuel en vente doit avoir un prix supérieur à 0'); return; }
    if (!(defaultDays >= 1 && defaultDays <= 3650)) { toast.error('Durée par défaut invalide (1 à 3650 jours)'); return; }
    setSaving(true);
    const toSave = rows.filter(r => r.is_active || r.price_usd > 0 || r.description || r.access_days || data?.rows.some(x => x.tab_key === r.tab_key && x.item_key === r.item_key));
    const { error } = await db.from('analytics_visual_catalog').upsert(
      toSave.map(r => ({ ...r, description: r.description?.trim() || null, updated_at: new Date().toISOString() })),
      { onConflict: 'tab_key,item_key' },
    );
    const { error: e2 } = await db.from('analytics_catalog_settings').update({ default_access_days: defaultDays, updated_at: new Date().toISOString() }).eq('id', true);
    setSaving(false);
    if (error || e2) { toast.error('Enregistrement impossible', { description: (error || e2).message }); return; }
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
            <Input id="default-days" type="number" min={1} max={3650} className="w-40" value={defaultDays} onChange={e => setDefaultDays(Number(e.target.value))} />
          </div>
          <Button onClick={save} disabled={saving} className="min-h-10">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Sauvegarder
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue={TABS[0]?.[0]}>
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto flex-nowrap">
          {TABS.map(([tab, reg]) => <TabsTrigger key={tab} value={tab} className="shrink-0">{reg.label}</TabsTrigger>)}
        </TabsList>
        {TABS.map(([tab, reg]) => (
          <TabsContent key={tab} value={tab}>
            <Card>
              <CardContent className="space-y-3 pt-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <Label htmlFor={`bulk-${tab}`} className="text-xs">Prix pour tout l'onglet (USD)</Label>
                    <Input id={`bulk-${tab}`} type="number" min={0} step="0.01" className="w-36" value={bulk[tab] ?? ''} onChange={e => setBulk(b => ({ ...b, [tab]: e.target.value }))} />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => applyBulk(tab)}>Appliquer</Button>
                </div>
                <div className="divide-y divide-border rounded-md border border-border">
                  {[...reg.kpis, ...reg.charts].map(it => {
                    const key = k(tab, it.item_key);
                    const r = draft[key];
                    if (!r) return null;
                    return (
                      <div key={key} className="grid gap-2 p-2 md:grid-cols-[1fr_7rem_7rem_1fr_auto] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{it.custom_title || it.item_key}</p>
                          <p className="text-xs text-muted-foreground">{it.item_type === 'kpi' ? 'Indicateur' : 'Graphique'}</p>
                        </div>
                        <Input aria-label="Prix USD" type="number" min={0} step="0.01" value={r.price_usd} onChange={e => patch(key, { price_usd: Number(e.target.value) })} />
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
                  <span className="font-medium">{Number(i.total_amount_usd).toFixed(2)} $</span>
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
