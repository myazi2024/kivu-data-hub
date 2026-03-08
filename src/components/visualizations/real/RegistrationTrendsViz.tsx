import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { TrendingUp, Info } from 'lucide-react';

export const RegistrationTrendsViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const chartData = data.registrationTrends;

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-xs">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution des enregistrements de parcelles
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée temporelle</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(value: number) => [value, 'Parcelles enregistrées']}
                  />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {chartData.map((t, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded border text-xs">
                    <span className="text-muted-foreground">{t.month}</span>
                    <span className="font-bold text-primary">{t.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-3 p-2 bg-muted/20 rounded text-xs text-muted-foreground">
            <Info className="h-3 w-3 inline mr-1" />
            Données basées sur la date de création des parcelles dans le système cadastral.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
