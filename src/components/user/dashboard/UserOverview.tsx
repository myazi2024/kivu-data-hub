import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Building, CreditCard, FileText, MapPin, Scale, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserDashboardStats } from '@/hooks/useUserDashboardStats';
import { CADASTRAL_MAP_ROUTE } from '@/utils/userDashboardLinks';

export function UserOverview() {
  const { data: stats, isLoading } = useUserDashboardStats();
  const items = [
    { label: 'Contributions', value: stats?.contributions_total ?? 0, detail: `${stats?.contributions_pending ?? 0} en attente`, icon: FileText, tab: 'contributions' },
    { label: 'Titres fonciers', value: stats?.titles_total ?? 0, detail: `${stats?.titles_pending ?? 0} en attente`, icon: ScrollText, tab: 'titles' },
    { label: 'Autorisations', value: stats?.permits_total ?? 0, detail: `${stats?.permits_pending ?? 0} en attente`, icon: Building, tab: 'permits' },
    { label: 'Factures', value: stats?.invoices_total ?? 0, detail: `${stats?.invoices_pending ?? 0} à traiter`, icon: CreditCard, tab: 'invoices' },
  ];
  const attentionCount = (stats?.contributions_pending ?? 0) + (stats?.titles_pending ?? 0) + (stats?.permits_pending ?? 0) + (stats?.invoices_pending ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Suivez l’essentiel de votre activité cadastrale.</p>
        </div>
        <Button asChild size="sm">
          <Link to={CADASTRAL_MAP_ROUTE}><MapPin className="mr-2 h-4 w-4" />Nouvelle contribution</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <Link key={item.tab} to={`/mon-compte?tab=${item.tab}`} className="rounded-md border bg-card p-3 transition-colors hover:bg-accent/40 md:p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{isLoading ? '—' : item.value}</p>
              <p className="text-xs font-medium">{item.label}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-md border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Actions rapides</h2>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-auto justify-between py-3">
              <Link to="/mon-compte?tab=contributions"><span className="flex items-center"><FileText className="mr-2 h-4 w-4" />Mes contributions</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-between py-3">
              <Link to="/mon-compte?tab=titles"><span className="flex items-center"><ScrollText className="mr-2 h-4 w-4" />Mes titres</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-between py-3">
              <Link to="/mon-compte?tab=invoices"><span className="flex items-center"><CreditCard className="mr-2 h-4 w-4" />Mes factures</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="h-auto justify-between py-3">
              <Link to="/mon-compte?tab=disputes"><span className="flex items-center"><Scale className="mr-2 h-4 w-4" />Mes litiges</span><ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        <section className="rounded-md border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-warning/10">
              <AlertCircle className="h-4 w-4 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold">Éléments à suivre</p>
              <p className="mt-1 text-2xl font-bold">{isLoading ? '—' : attentionCount}</p>
              <p className="text-xs text-muted-foreground">demandes ou paiements en attente de traitement</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
