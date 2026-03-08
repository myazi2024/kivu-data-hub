import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { DollarSign } from 'lucide-react';

export const RevenueTrackingViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const statusColors: Record<string, string> = {
    'paid': 'hsl(142, 71%, 45%)',
    'pending': 'hsl(var(--warning))',
  };

  const chartData = data.invoiceStats.map(i => ({
    name: i.status === 'paid' ? 'Payées' : i.status === 'pending' ? 'En attente' : i.status,
    value: i.count,
    revenue: i.revenue,
    color: statusColors[i.status] || 'hsl(var(--muted-foreground))'
  }));

  const totalRevenue = data.totals.totalRevenue;
  const paidRevenue = data.invoiceStats.find(i => i.status === 'paid')?.revenue || 0;
  const pendingRevenue = data.invoiceStats.find(i => i.status === 'pending')?.revenue || 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-primary">{data.totals.totalInvoices}</div>
          <div className="text-[10px] text-muted-foreground">Factures totales</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold" style={{ color: 'hsl(142, 71%, 45%)' }}>${paidRevenue.toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground">Revenus encaissés</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold" style={{ color: 'hsl(var(--warning))' }}>${pendingRevenue.toFixed(2)}</div>
          <div className="text-[10px] text-muted-foreground">En attente</div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <DollarSign className="h-4 w-4 text-primary" />
            Répartition des factures
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune facture</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string, props: any) => [`${value} factures ($${props.payload.revenue.toFixed(2)})`, props.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {chartData.map((s, i) => (
                  <div key={i} className="p-3 rounded border text-sm" style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}>
                    <div className="flex justify-between">
                      <span className="font-medium">{s.name}</span>
                      <span className="font-bold">{s.value}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">${s.revenue.toFixed(2)} USD</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
