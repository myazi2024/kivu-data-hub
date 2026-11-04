import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserOwnershipClaims } from './UserOwnershipClaims';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { getParcelAlerts, sortParcels, type ParcelSort } from '@/lib/parcelSecurity';
import type { ParcelSecurityReport } from '@/hooks/useOwnership';
import { useOwnedParcels } from '@/hooks/useOwnership';
import { SecurityScoreRing, ParcelSecurityReportDialog } from './ParcelSecurity';

export const UserOwnedParcels: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get('sub') === 'claim' ? 'claim' : 'list';
  const setSub = (v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v === 'claim') next.set('sub', 'claim'); else next.delete('sub');
    setSearchParams(next, { replace: true });
  };
  return (
    <Tabs value={sub} onValueChange={setSub} className="space-y-3">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="list">Mes parcelles</TabsTrigger>
        <TabsTrigger value="claim">Revendiquer une parcelle</TabsTrigger>
      </TabsList>
      <TabsContent value="list"><OwnedParcelsList onClaim={() => setSub('claim')} /></TabsContent>
      <TabsContent value="claim"><UserOwnershipClaims /></TabsContent>
    </Tabs>
  );
};

const OwnedParcelsList: React.FC<{ onClaim: () => void }> = ({ onClaim }) => {
  const { data = [], isLoading, error } = useOwnedParcels();
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState<{ id: string; number: string } | null>(null);
  const scores = data.map((p) => p.security_score ?? 0);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const atRisk = scores.filter((s) => s < 40).length;
  const reports = useQueries({
    queries: data.map((p) => ({
      queryKey: ['parcel-security-report', p.id],
      queryFn: async (): Promise<ParcelSecurityReport> => {
        const { data: r, error: e } = await (supabase.rpc as any)('get_my_parcel_security_report', { _parcel_id: p.id });
        if (e) throw e;
        return r as ParcelSecurityReport;
      },
    })),
  });
  const alertsById = Object.fromEntries(data.map((p, i) => [p.id, getParcelAlerts(reports[i]?.data?.criteria ?? [])]));
  const [sort, setSort] = React.useState<ParcelSort>('score_asc');
  const [onlyAlerts, setOnlyAlerts] = React.useState(false);
  const list = sortParcels(data.map((p) => ({ ...p, alerts: alertsById[p.id]?.length ?? 0 })), sort, onlyAlerts);
  const totalAlerts = Object.values(alertsById).reduce((a, l) => a + l.length, 0);
  const goMap = (num: string) => navigate(`/cadastral-map?search=${encodeURIComponent(num)}`);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Mes parcelles</CardTitle>
        <p className="text-xs text-muted-foreground">
          Parcelles dont vous êtes le propriétaire validé. Vous pouvez demander la modification de leurs informations depuis « Contributions CCC ».
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
            <SecurityScoreRing score={avg} size={52} />
            <div className="text-xs text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">Sécurisation moyenne</p>
              <p>{data.length} parcelle(s) · {atRisk} à risque (moins de 40 %)</p>
              <p>{totalAlerts} alerte(s) · touchez un cercle pour voir le détail.</p>
            </div>
          </div>
        )}
        {data.length > 1 && (
          <div className="flex flex-wrap items-center gap-3">
            <Select value={sort} onValueChange={(v) => setSort(v as ParcelSort)}>
              <SelectTrigger className="h-8 w-auto min-w-[180px] text-xs" aria-label="Trier les parcelles"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="score_asc">Score le plus faible d’abord</SelectItem>
                <SelectItem value="score_desc">Score le plus élevé d’abord</SelectItem>
                <SelectItem value="alerts">Plus d’alertes d’abord</SelectItem>
                <SelectItem value="recent">Ajoutées récemment</SelectItem>
                <SelectItem value="number">Numéro de parcelle</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={onlyAlerts} onCheckedChange={setOnlyAlerts} /> Avec alertes seulement
            </label>
          </div>
        )}
        {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        {error && <p className="text-sm text-destructive">Impossible de charger vos parcelles.</p>}
        {!isLoading && !error && data.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">Aucune parcelle validée à votre nom pour le moment.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button size="sm" onClick={() => navigate('/cadastral-map')}>Enregistrer ma parcelle</Button>
              <Button size="sm" variant="outline" onClick={onClaim}>Revendiquer une parcelle</Button>
            </div>
          </div>
        )}
        {list.map((p) => (
          <div key={p.id} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
            <SecurityScoreRing score={p.security_score ?? 0} onClick={() => setSelected({ id: p.id, number: p.parcel_number })} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{p.parcel_number}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {[p.quartier, p.commune, p.ville, p.province].filter(Boolean).join(', ') || 'Localisation non précisée'}
              </p>
              {p.owner_linked_at && (
                <p className="text-[11px] text-muted-foreground">Gérée par votre compte depuis le {new Date(p.owner_linked_at).toLocaleDateString('fr-FR')}</p>
              )}
              {(alertsById[p.id] ?? []).length > 0 && (
                <ul className="mt-1 flex flex-wrap gap-1">
                  {alertsById[p.id].map((a) => (
                    <li key={a.key} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${a.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'}`}>
                      <AlertTriangle className="h-3 w-3" />{a.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => goMap(p.parcel_number)}>Voir sur la carte</Button>
              {p.contribution_id && (
                <Button size="sm" onClick={() => navigate('/mon-compte?tab=contributions')}>Demander une modification</Button>
              )}
            </div>
          </div>
        ))}
        <ParcelSecurityReportDialog
          parcelId={selected?.id ?? null}
          parcelNumber={selected?.number}
          onOpenChange={(o) => !o && setSelected(null)}
          onComplete={() => navigate('/mon-compte?tab=contributions')}
          onAction={(kind) => (kind === 'map' && selected ? goMap(selected.number) : navigate('/mon-compte?tab=contributions'))}
        />
      </CardContent>
    </Card>
  );
};

export default UserOwnedParcels;
