import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { DollarSign, BarChart3, TrendingUp } from 'lucide-react';

const INV_COLORS: Record<string, string> = {
  paid: 'hsl(142, 71%, 45%)',
  pending: 'hsl(var(--warning))',
  cancelled: 'hsl(var(--destructive))',
};
const INV_LABELS: Record<string, string> = {
  paid: 'Payées',
  pending: 'En attente',
  cancelled: 'Annulées',
};

export const FinancialAnalyticsViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const paidRev = data.invoiceStats.find(i => i.status === 'paid')?.revenue || 0;
  const pendingRev = data.invoiceStats.find(i => i.status === 'pending')?.revenue || 0;

  const pieData = data.invoiceStats.map(i => ({
    name: INV_LABELS[i.status] || i.status,
    value: i.count,
    revenue: i.revenue,
    color: INV_COLORS[i.status] || 'hsl(var(--muted-foreground))',
  }));

  // Tax history
  const taxData = data.taxHistory.map(t => ({
    year: t.year.toString(),
    paid: t.paid,
    pending: t.pending,
  }));

  return (
    <div className="space-y-3">
      {/* Revenue KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-primary">{data.totals.totalInvoices}</div>
          <div className="text-[10px] text-muted-foreground">Factures</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold" style={{ color: 'hsl(142, 71%, 45%)' }}>${paidRev.toFixed(0)}</div>
          <div className="text-[10px] text-muted-foreground">Encaissés</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold" style={{ color: 'hsl(var(--warning))' }}>${pendingRev.toFixed(0)}</div>
          <div className="text-[10px] text-muted-foreground">En attente</div>
        </Card>
      </div>

      {/* Invoice Status Pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-primary" />
            Répartition des factures
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {pieData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune facture</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number, _: any, p: any) => [`${v} factures ($${p.payload.revenue.toFixed(2)})`, p.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {pieData.map((s, i) => (
                  <div key={i} className="p-2.5 rounded border text-sm" style={{ borderLeftColor: s.color, borderLeftWidth: 3 }}>
                    <div className="flex justify-between">
                      <span className="font-medium">{s.name}</span>
                      <span className="font-bold">{s.value}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">${s.revenue.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Revenue */}
      {data.monthlyRevenue.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              Revenus mensuels
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data.monthlyRevenue} margin={{ top: 10, right: 5, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenus']} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%, 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tax History */}
      {taxData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-primary" />
              Fiscalité foncière par année (${data.totals.totalTaxCollected.toFixed(0)} collectés)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={taxData} margin={{ top: 10, right: 0, left: 0, bottom: 10 }} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number, name: string) => [`$${v.toFixed(2)}`, name === 'paid' ? 'Payées' : 'En attente']} />
                <Bar dataKey="paid" stackId="t" fill="hsl(142, 71%, 45%)" name="paid" />
                <Bar dataKey="pending" stackId="t" fill="hsl(var(--warning))" name="pending" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 flex gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} /><span>Payées</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--warning))' }} /><span>En attente</span></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
