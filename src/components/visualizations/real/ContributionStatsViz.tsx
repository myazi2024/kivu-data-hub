import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Users, Info } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  'approved': 'hsl(142, 71%, 45%)',
  'pending': 'hsl(var(--warning))',
  'rejected': 'hsl(var(--destructive))',
};

const STATUS_LABELS: Record<string, string> = {
  'approved': 'Approuvées',
  'pending': 'En attente',
  'rejected': 'Rejetées',
};

export const ContributionStatsViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  // Aggregate by status
  const statusMap = new Map<string, number>();
  data.contributionStats.forEach(c => {
    statusMap.set(c.status, (statusMap.get(c.status) || 0) + c.count);
  });
  const statusData = Array.from(statusMap.entries()).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || 'hsl(var(--muted-foreground))'
  }));

  // Aggregate by province
  const provinceMap = new Map<string, { total: number; approved: number; pending: number; rejected: number }>();
  data.contributionStats.forEach(c => {
    if (!provinceMap.has(c.province)) {
      provinceMap.set(c.province, { total: 0, approved: 0, pending: 0, rejected: 0 });
    }
    const entry = provinceMap.get(c.province)!;
    entry.total += c.count;
    if (c.status === 'approved') entry.approved += c.count;
    if (c.status === 'pending') entry.pending += c.count;
    if (c.status === 'rejected') entry.rejected += c.count;
  });
  const provinceData = Array.from(provinceMap.entries())
    .map(([province, stats]) => ({ province, ...stats }))
    .sort((a, b) => b.total - a.total);

  const total = data.totals.totalContributions;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <Users className="h-4 w-4 text-primary" />
            Contributions citoyennes ({total} total)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {total === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune contribution</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value, 'Contributions']} />
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

      {provinceData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs">Contributions par province</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={provinceData} margin={{ top: 10, right: 0, left: 0, bottom: 40 }} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="province" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }} />
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
