import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { FileText, Users, Key } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(142, 71%, 45%)', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

const MiniPie = ({ data, title, icon: Icon }: { data: { label: string; count: number }[]; title: string; icon: any }) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  const chartData = data.map((d, i) => ({ name: d.label, value: d.count, pct: total > 0 ? ((d.count / total) * 100).toFixed(1) : '0', color: COLORS[i % COLORS.length] }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {chartData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {chartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [v, 'Parcelles']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5">
              {chartData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded border">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: d.color }} />
                    <span>{d.name}</span>
                  </div>
                  <span className="font-bold">{d.value} <span className="text-muted-foreground font-normal">({d.pct}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const PropertyOwnershipViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  return (
    <div className="space-y-3">
      <MiniPie data={data.titleTypes} title="Types de titres fonciers" icon={FileText} />
      <MiniPie data={data.ownershipStats.byLegalStatus} title="Statut juridique des propriétaires" icon={Users} />
      {data.ownershipStats.byGender.length > 0 && (
        <MiniPie data={data.ownershipStats.byGender} title="Genre des propriétaires (personnes physiques)" icon={Users} />
      )}
      {data.ownershipStats.byLeaseType.length > 0 && (
        <MiniPie data={data.ownershipStats.byLeaseType} title="Types de bail" icon={Key} />
      )}
    </div>
  );
};
