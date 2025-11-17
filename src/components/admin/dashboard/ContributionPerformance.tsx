import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Progress } from '@/components/ui/progress';

interface ContributionPerformanceProps {
  loading?: boolean;
  data?: {
    avgValidationTime: number; // in hours
    approvalRate: number;
    rejectionRate: number;
    fraudRate: number;
    validationTrend: Array<{ date: string; avgTime: number }>;
    statusDistribution: Array<{ status: string; count: number }>;
  };
}

const COLORS = {
  approved: 'hsl(var(--primary))',
  rejected: 'hsl(var(--destructive))',
  pending: 'hsl(var(--secondary))',
  suspicious: 'hsl(var(--accent))'
};

export function ContributionPerformance({ loading = false, data }: ContributionPerformanceProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="p-4 md:p-6">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Temps validation moyen',
      value: `${(data?.avgValidationTime || 0).toFixed(1)}h`,
      icon: Clock,
      color: 'text-blue-600',
      description: 'Délai de traitement'
    },
    {
      title: 'Taux d\'approbation',
      value: `${(data?.approvalRate || 0).toFixed(1)}%`,
      icon: CheckCircle,
      color: 'text-green-600',
      progress: data?.approvalRate || 0
    },
    {
      title: 'Taux de rejet',
      value: `${(data?.rejectionRate || 0).toFixed(1)}%`,
      icon: XCircle,
      color: 'text-red-600',
      progress: data?.rejectionRate || 0
    },
    {
      title: 'Taux de fraude',
      value: `${(data?.fraudRate || 0).toFixed(2)}%`,
      icon: AlertTriangle,
      color: 'text-orange-600',
      progress: data?.fraudRate || 0
    }
  ];

  return (
    <div className="space-y-4">
      {/* KPIs Grid */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate pr-1">
                  {kpi.title}
                </CardTitle>
                <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 ${kpi.color}`} />
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-base md:text-lg font-bold">{kpi.value}</div>
                {kpi.description && (
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                    {kpi.description}
                  </p>
                )}
                {kpi.progress !== undefined && (
                  <Progress value={kpi.progress} className="h-1.5 mt-2" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Validation Time Trend */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Évolution temps validation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {data?.validationTrend && data.validationTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.validationTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  />
                  <YAxis tick={{ fontSize: 10 }} label={{ value: 'Heures', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                  <Tooltip 
                    contentStyle={{ fontSize: 12 }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                    formatter={(value: any) => [`${value.toFixed(1)}h`, 'Temps moyen']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgTime" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-8">
                Aucune donnée de tendance
              </p>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-sm md:text-base">Répartition des statuts</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {data?.statusDistribution && data.statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {data.statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.status.toLowerCase() as keyof typeof COLORS] || 'hsl(var(--muted))'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs md:text-sm text-muted-foreground text-center py-8">
                Aucune donnée de distribution
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
