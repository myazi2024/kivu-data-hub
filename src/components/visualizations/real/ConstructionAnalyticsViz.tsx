import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { LandDataAnalytics } from '@/hooks/useLandDataAnalytics';
import { Building, Landmark, Home, Info } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(142, 71%, 45%)', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))', 'hsl(var(--muted-foreground))', 'hsl(280, 60%, 50%)', 'hsl(200, 70%, 50%)'];

const NATURE_COLORS: Record<string, string> = {
  'Durable': 'hsl(142, 71%, 45%)',
  'Semi-durable': 'hsl(var(--warning))',
  'Précaire': 'hsl(var(--destructive))',
};

export const ConstructionAnalyticsViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const natTotal = data.constructionNatures.reduce((s, n) => s + n.count, 0);
  const natData = data.constructionNatures.map(n => ({
    name: n.label,
    value: n.count,
    pct: natTotal > 0 ? ((n.count / natTotal) * 100).toFixed(1) : '0',
    color: NATURE_COLORS[n.label] || 'hsl(var(--muted-foreground))',
  }));

  const typeData = data.constructionTypes.map((t, i) => ({
    name: t.label.length > 15 ? t.label.substring(0, 14) + '…' : t.label,
    fullName: t.label,
    count: t.count,
    color: COLORS[i % COLORS.length],
  }));

  const usageData = data.usageDistribution.map((u, i) => ({
    name: u.label,
    count: u.count,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <div className="space-y-3">
      {/* Construction Quality */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building className="h-4 w-4 text-primary" />
            Qualité des constructions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {natData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune donnée</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={natData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {natData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Parcelles']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {natData.map((n, i) => (
                  <div key={i} className="p-2 rounded border text-sm" style={{ borderLeftColor: n.color, borderLeftWidth: 3 }}>
                    <div className="flex justify-between">
                      <span className="font-medium">{n.name}</span>
                      <span className="font-bold">{n.value} ({n.pct}%)</span>
                    </div>
                    <div className="mt-1 w-full bg-muted rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${n.pct}%`, backgroundColor: n.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 p-2 bg-muted/20 rounded text-xs text-muted-foreground">
            <Info className="h-3 w-3 inline mr-1" />
            <strong>Durable</strong> = béton/brique • <strong>Semi-durable</strong> = tôle/bois traité • <strong>Précaire</strong> = matériaux temporaires
          </div>
        </CardContent>
      </Card>

      {/* Building Types */}
      {typeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Landmark className="h-4 w-4 text-primary" />
              Types de bâtiments ({data.constructionTypes.reduce((s, t) => s + t.count, 0)})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={Math.max(160, typeData.length * 28)}>
              <BarChart data={typeData} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(v: number) => [v, 'Parcelles']}
                  labelFormatter={(_, p: any[]) => p?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Usage */}
      {usageData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Home className="h-4 w-4 text-primary" />
              Usage déclaré des parcelles
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={usageData} margin={{ top: 10, right: 0, left: 0, bottom: 10 }} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} formatter={(v: number) => [v, 'Parcelles']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {usageData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
