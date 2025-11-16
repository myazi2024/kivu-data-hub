import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminStatistics } from '@/hooks/useAdminStatistics';
import { Users, DollarSign, FileCheck, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export function AdminDashboardOverview() {
  const { loading, statistics } = useAdminStatistics(undefined, undefined, 'overview');
  const { statistics: revenueData, loading: revenueLoading } = useAdminStatistics(undefined, undefined, 'revenue_by_day');

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Utilisateurs',
      value: statistics.total_users || 0,
      icon: Users,
      change: '+12%',
      positive: true,
      description: 'vs mois dernier'
    },
    {
      title: 'Revenus Totaux',
      value: `$${(statistics.total_revenue || 0).toFixed(2)}`,
      icon: DollarSign,
      change: '+23%',
      positive: true,
      description: 'vs mois dernier'
    },
    {
      title: 'Contributions Approuvées',
      value: statistics.approved_contributions || 0,
      icon: FileCheck,
      change: '+8%',
      positive: true,
      description: `/${statistics.total_contributions || 0} total`
    },
    {
      title: 'Paiements en attente',
      value: statistics.pending_payments || 0,
      icon: AlertTriangle,
      change: '-5%',
      positive: true,
      description: 'à traiter'
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  {stat.positive ? (
                    <TrendingUp className="h-3 w-3 text-success" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span className={stat.positive ? 'text-success' : 'text-destructive'}>
                    {stat.change}
                  </span>
                  <span>{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Évolution des revenus (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueData.revenue_by_day || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contributions à valider</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>En attente</span>
                <span className="font-bold">{statistics.contributions_status?.pending || 0}</span>
              </div>
              <Progress value={((statistics.contributions_status?.approved || 0) / (statistics.total_contributions || 1)) * 100} />
              <p className="text-xs text-muted-foreground">
                {statistics.contributions_status?.approved || 0} approuvées sur {statistics.total_contributions || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Codes CCC générés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.total_ccc_codes || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Codes contributeurs actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revendeurs actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statistics.total_resellers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Partenaires commerciaux
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
