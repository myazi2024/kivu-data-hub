import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CheckCircle, RefreshCw, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LAND_DATA_ROLES } from '@/constants/roles';
import { useAnalyticsCart } from '@/hooks/useAnalyticsCart';
import AnalyticsCatalogDialog from '@/components/analytics/catalog/AnalyticsCatalogDialog';
import { accessState, daysLeft, useVisualLabels } from './useVisualLabels';

interface AccessRow { id: string; tab_key: string; item_key: string; expires_at: string }

const STATE_UI = {
  active: { label: 'Actif', cls: 'bg-success/10 text-success border-success/30' },
  expiring: { label: 'Expire bientôt', cls: 'bg-warning/10 text-warning border-warning/30' },
  expired: { label: 'Expiré', cls: 'bg-muted text-muted-foreground' },
} as const;

export function MyAnalyticsAccess() {
  const { user, profile } = useAuth();
  const { tabLabel, visualTitle } = useVisualLabels();
  const { add } = useAnalyticsCart();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const fullAccess = !!profile && LAND_DATA_ROLES.includes(profile.role);

  const q = useQuery({
    queryKey: ['my-analytics-access-history', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AccessRow[]> => {
      const { data, error } = await (supabase as any).from('analytics_visual_access')
        .select('id, tab_key, item_key, expires_at').eq('user_id', user!.id).order('expires_at', { ascending: false });
      if (error) throw error;
      // Garder l'accès le plus long par visuel
      const best = new Map<string, AccessRow>();
      (data ?? []).forEach((r: AccessRow) => { const k = `${r.tab_key}::${r.item_key}`; if (!best.has(k)) best.set(k, r); });
      return [...best.values()];
    },
  });

  const groups = useMemo(() => {
    const m = new Map<string, AccessRow[]>();
    (q.data ?? []).forEach(r => m.set(r.tab_key, [...(m.get(r.tab_key) ?? []), r]));
    return [...m.entries()];
  }, [q.data]);

  const renew = async (rows: AccessRow[]) => {
    const keys = rows.map(r => ({ tab_key: r.tab_key, item_key: r.item_key }));
    const { data } = await (supabase as any).from('analytics_visual_catalog')
      .select('tab_key, item_key, price_usd').eq('is_active', true);
    const prices = new Map((data ?? []).map((c: any) => [`${c.tab_key}::${c.item_key}`, Number(c.price_usd)]));
    const items = keys.filter(k => prices.has(`${k.tab_key}::${k.item_key}`)).map(k => ({
      ...k, title: visualTitle(k.tab_key, k.item_key), tab_label: tabLabel(k.tab_key), price_usd: prices.get(`${k.tab_key}::${k.item_key}`) as number,
    }));
    if (items.length) add(items);
    setCatalogOpen(true);
  };

  const active = (q.data ?? []).filter(r => accessState(r.expires_at) !== 'expired').length;
  const expiring = (q.data ?? []).filter(r => accessState(r.expires_at) === 'expiring').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold">Mes accès Données foncières</h1>
          <p className="text-sm text-muted-foreground">Visuels achetés, durée restante et renouvellement.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/map"><BarChart3 className="mr-2 h-4 w-4" />Ouvrir</Link></Button>
          {!fullAccess && <Button size="sm" onClick={() => setCatalogOpen(true)}><ShoppingBag className="mr-2 h-4 w-4" />Catalogue</Button>}
        </div>
      </div>

      {fullAccess && (
        <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/5 p-3 text-sm">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <span>Accès complet inclus avec votre profil : tous les onglets sont disponibles sans achat.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border bg-card p-3"><p className="text-2xl font-bold">{active}</p><p className="text-xs text-muted-foreground">Accès actifs</p></div>
        <div className="rounded-md border bg-card p-3"><p className="text-2xl font-bold">{expiring}</p><p className="text-xs text-muted-foreground">Expirent sous 7 jours</p></div>
      </div>

      {q.isLoading ? <div className="py-10"><LoadingIndicator /></div>
        : q.isError ? <p className="text-sm text-destructive">Impossible de charger vos accès. <Button variant="link" size="sm" onClick={() => q.refetch()}>Réessayer</Button></p>
        : !groups.length ? (
          <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">Aucun visuel acheté pour le moment.</div>
        ) : groups.map(([tab, rows]) => (
          <section key={tab} className="rounded-md border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
              <h2 className="truncate text-sm font-semibold">{tabLabel(tab)}</h2>
              {!fullAccess && <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => renew(rows)}><RefreshCw className="mr-1 h-3.5 w-3.5" />Renouveler l'onglet</Button>}
            </div>
            <ul className="divide-y">
              {rows.map(r => {
                const s = accessState(r.expires_at); const d = daysLeft(r.expires_at);
                return (
                  <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{visualTitle(r.tab_key, r.item_key)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s === 'expired' ? 'Expiré le ' : `${d} j restants · jusqu'au `}{new Date(r.expires_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Badge variant="outline" className={STATE_UI[s].cls}>{STATE_UI[s].label}</Badge>
                    {!fullAccess && s !== 'active' && <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => renew([r])}>Renouveler</Button>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

      <AnalyticsCatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
    </div>
  );
}
