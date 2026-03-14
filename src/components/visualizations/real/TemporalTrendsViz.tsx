import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { TrendingUp, Activity, Info } from 'lucide-react';

export const TemporalTrendsViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const regTrends = data.registrationTrends;
  const contribTrends = data.contributionTrends;
  const revTrends = data.monthlyRevenue;

  return (
    <div className="space-y-3">
      {/* Registration Trends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-primary" />
            Enregistrements de parcelles dans le temps
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {regTrends.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée temporelle</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={regTrends} margin={{ top: 10, right: 5, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.15)" strokeWidth={2} name="Parcelles" dot={{ fill: 'hsl(var(--primary))', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Contribution Trends */}
      {contribTrends.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4 text-accent-foreground" />
              Contributions citoyennes dans le temps
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={contribTrends} margin={{ top: 10, right: 5, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="count" stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.15)" strokeWidth={2} name="Contributions" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Revenue Trends */}
      {revTrends.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" style={{ color: 'hsl(142, 71%, 45%)' }} />
              Évolution des revenus
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revTrends} margin={{ top: 10, right: 5, left: 0, bottom: 10 }}>
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

      {/* Summary grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {regTrends.slice(-6).map((t, i) => (
          <Card key={i} className="p-2 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{t.month}</span>
            <span className="text-sm font-bold text-primary">{t.count}</span>
          </Card>
        ))}
      </div>

      <div className="p-2 bg-muted/20 rounded text-xs text-muted-foreground">
        <Info className="h-3 w-3 inline mr-1" />
        Données basées sur les dates de création des parcelles, contributions et factures dans le système.
      </div>
    </div>
  );
};
