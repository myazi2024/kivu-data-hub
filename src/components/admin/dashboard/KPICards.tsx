import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign, FileCheck, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardKPIs } from '@/hooks/useDashboardKPIs';

interface Props {
  kpis?: DashboardKPIs;
  loading: boolean;
}

const calcChange = (current: number, previous: number): { label: string; positive: boolean } => {
  if (previous === 0 && current === 0) return { label: '0%', positive: true };
  if (previous === 0) return { label: '+100%', positive: true };
  const change = ((current - previous) / previous) * 100;
  return {
    label: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
    positive: change >= 0,
  };
};

export function KPICards({ kpis, loading }: Props) {
  const navigate = useNavigate();

  if (loading || !kpis) {
    return (
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
            <CardContent><Skeleton className="h-8 w-32" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const usersChange = calcChange(kpis.new_users_period, kpis.new_users_prev);
  const revenueChange = calcChange(kpis.total_revenue, kpis.total_revenue_prev);
  const invoicesChange = calcChange(kpis.total_invoices, kpis.total_invoices_prev);
  const pendingChange = calcChange(kpis.pending_payments_count, kpis.pending_payments_count_prev);

  const items = [
    {
      title: 'Nouveaux utilisateurs',
      value: kpis.new_users_period.toLocaleString('fr-FR'),
      icon: Users,
      change: usersChange,
      description: `${kpis.total_users.toLocaleString('fr-FR')} au total`,
      route: '/admin?tab=users',
    },
    {
      title: 'Revenus (période)',
      value: `$${kpis.total_revenue.toFixed(2)}`,
      icon: DollarSign,
      change: revenueChange,
      description: `${kpis.paid_invoices} factures payées`,
      route: '/admin?tab=payments',
    },
    {
      title: 'Contributions approuvées',
      value: kpis.approved_contributions.toLocaleString('fr-FR'),
      icon: FileCheck,
      change: invoicesChange,
      description: `/${kpis.total_contributions} total`,
      route: '/admin?tab=ccc',
    },
    {
      title: 'Paiements en attente',
      value: `${kpis.pending_payments_count} · $${kpis.pending_payments_sum.toFixed(0)}`,
      icon: AlertTriangle,
      change: { label: pendingChange.label, positive: !pendingChange.positive }, // Lower is better
      description: 'à traiter',
      route: '/admin?tab=payments',
    },
  ];

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
      {items.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card
            key={i}
            className="overflow-hidden cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all"
            onClick={() => navigate(stat.route)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(stat.route); }}
          >
            <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground truncate pr-1">
                {stat.title}
              </CardTitle>
              <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <div className="text-base md:text-2xl font-bold truncate">{stat.value}</div>
              <div className="flex items-center gap-1 text-[10px] md:text-xs text-muted-foreground mt-1">
                {stat.change.positive ? (
                  <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3 text-success shrink-0" />
                ) : (
                  <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3 text-destructive shrink-0" />
                )}
                <span className={stat.change.positive ? 'text-success' : 'text-destructive'}>
                  {stat.change.label}
                </span>
                <span className="truncate">{stat.description}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
