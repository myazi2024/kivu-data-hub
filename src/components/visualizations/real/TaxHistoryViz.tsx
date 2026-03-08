import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { BarChart3, Info } from 'lucide-react';

export const TaxHistoryViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  // Group by year
  const yearMap = new Map<number, { paid: number; pending: number; paidCount: number; pendingCount: number }>();
  data.taxHistory.forEach(t => {
    if (!yearMap.has(t.year)) {
      yearMap.set(t.year, { paid: 0, pending: 0, paidCount: 0, pendingCount: 0 });
    }
    const entry = yearMap.get(t.year)!;
    if (t.status === 'paid') {
      entry.paid += t.total;
      entry.paidCount += t.count;
    } else {
      entry.pending += t.total;
      entry.pendingCount += t.count;
    }
  });

  const chartData = Array.from(yearMap.entries())
    .map(([year, stats]) => ({ year: year.toString(), ...stats }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const totalCollected = data.totals.totalTaxCollected;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-primary">${totalCollected.toFixed(0)}</div>
          <div className="text-[10px] text-muted-foreground">Taxes collectées (USD)</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-lg font-bold text-foreground">{data.taxHistory.reduce((s, t) => s + t.count, 0)}</div>
          <div className="text-[10px] text-muted-foreground">Enregistrements fiscaux</div>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <BarChart3 className="h-4 w-4 text-primary" />
            Historique des taxes par année
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucun historique fiscal</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 10 }} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name === 'paid' ? 'Payées' : 'En attente']}
                  />
                  <Bar dataKey="paid" stackId="tax" fill="hsl(142, 71%, 45%)" name="paid" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="pending" stackId="tax" fill="hsl(var(--warning))" name="pending" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-3 flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(142, 71%, 45%)' }} />
                  <span>Payées</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--warning))' }} />
                  <span>En attente</span>
                </div>
              </div>
            </>
          )}

          <div className="mt-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground">
            <Info className="h-3 w-3 inline mr-1" />
            Données issues de l'historique fiscal des parcelles enregistrées dans le système.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
