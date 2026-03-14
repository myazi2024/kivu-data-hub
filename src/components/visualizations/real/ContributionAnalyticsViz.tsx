import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Users, TrendingUp } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  approved: 'hsl(142, 71%, 45%)',
  pending: 'hsl(var(--warning))',
  rejected: 'hsl(var(--destructive))',
};
const STATUS_LABELS: Record<string, string> = {
  approved: 'Approuvées',
  pending: 'En attente',
  rejected: 'Rejetées',
};

export const ContributionAnalyticsViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const total = data.totals.totalContributions;
  const statusData = data.contributionsByStatus.map(s => ({
    name: STATUS_LABELS[s.status] || s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] || 'hsl(var(--muted-foreground))',
  }));

  const provData = data.contributionsByProvince.slice(0, 8);

  return (
    <div className="space-y-3">
      {/* Status Pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            Contributions citoyennes ({total})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {total === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune contribution</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Contributions']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {statusData.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded border text-sm" style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}>
                    <span className="font-medium">{s.name}</span>
                    <span className="font-bold">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CCC Codes stats */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-primary">{data.cccCodeStats.total}</div>
          <div className="text-[10px] text-muted-foreground">Codes CCC</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold" style={{ color: 'hsl(142, 71%, 45%)' }}>{data.cccCodeStats.used}</div>
          <div className="text-[10px] text-muted-foreground">Utilisés</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-foreground">${data.cccCodeStats.totalValue.toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground">Valeur totale</div>
        </Card>
      </div>

      {/* Contribution Trends */}
      {data.contributionTrends.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              Tendance des contributions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.contributionTrends} margin={{ top: 10, right: 5, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Contributions" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* By Province */}
      {provData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Par province</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={provData} margin={{ top: 10, right: 0, left: 0, bottom: 40 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="province" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="approved" stackId="s" fill="hsl(142, 71%, 45%)" name="Approuvées" />
                <Bar dataKey="pending" stackId="s" fill="hsl(var(--warning))" name="En attente" />
                <Bar dataKey="rejected" stackId="s" fill="hsl(var(--destructive))" name="Rejetées" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
