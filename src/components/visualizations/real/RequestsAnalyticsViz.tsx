import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { LandDataAnalytics, Distribution } from '@/hooks/useLandDataAnalytics';
import { ScrollText, Shield } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(142, 71%, 45%)', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  approved: 'Approuvées',
  rejected: 'Rejetées',
  paid: 'Payées',
  unpaid: 'Non payées',
  in_progress: 'En cours',
  completed: 'Terminées',
};

export const RequestsAnalyticsViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const { titleRequestStats, permitStats } = data;

  const trStatusData = titleRequestStats.byStatus.map((d, i) => ({
    name: STATUS_LABELS[d.label] || d.label,
    value: d.count,
    color: COLORS[i % COLORS.length],
  }));

  const trProvData = titleRequestStats.byProvince.slice(0, 8).map((d, i) => ({
    name: d.label.length > 12 ? d.label.substring(0, 11) + '…' : d.label,
    count: d.count,
    color: COLORS[i % COLORS.length],
  }));

  const permitData = permitStats.byStatus.map((d, i) => ({
    name: STATUS_LABELS[d.label] || d.label,
    value: d.count,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-3">
      {/* Title Requests KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-primary">{titleRequestStats.total}</div>
          <div className="text-[10px] text-muted-foreground">Demandes de titres</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-foreground">${titleRequestStats.totalAmount.toFixed(0)}</div>
          <div className="text-[10px] text-muted-foreground">Montant total</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-primary">{permitStats.total}</div>
          <div className="text-[10px] text-muted-foreground">Permis de construire</div>
        </Card>
      </div>

      {/* Title Request Status */}
      {trStatusData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ScrollText className="h-4 w-4 text-primary" />
              Demandes de titres fonciers par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={trStatusData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {trStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Demandes']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {trStatusData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs p-2 rounded border" style={{ borderLeftColor: d.color, borderLeftWidth: 3 }}>
                    <span>{d.name}</span>
                    <span className="font-bold">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Title Requests by Province */}
      {trProvData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Demandes par province</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={trProvData} margin={{ top: 10, right: 0, left: 0, bottom: 40 }} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="count" name="Demandes" radius={[4, 4, 0, 0]}>
                  {trProvData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Section Type & Payment Status */}
      {titleRequestStats.bySectionType.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {titleRequestStats.bySectionType.map((d, i) => (
            <Card key={i} className="p-3 flex justify-between items-center">
              <span className="text-sm">{d.label}</span>
              <span className="font-bold text-primary">{d.count}</span>
            </Card>
          ))}
        </div>
      )}

      {/* Permits */}
      {permitData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              Permis de construire par statut
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1.5">
              {permitData.map((d, i) => {
                const max = Math.max(...permitData.map(p => p.value));
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-24 truncate text-muted-foreground">{d.name}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${max > 0 ? (d.value / max) * 100 : 0}%`, backgroundColor: d.color }} />
                    </div>
                    <span className="font-bold w-8 text-right">{d.value}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
