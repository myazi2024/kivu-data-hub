import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { LandDataAnalytics, Distribution } from '@/hooks/useLandDataAnalytics';
import { AlertTriangle, Landmark, Info } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(142, 71%, 45%)', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

const DistributionBar = ({ data, title }: { data: Distribution[]; title: string }) => {
  if (data.length === 0) return null;
  const chartData = data.map((d, i) => ({ name: d.label, count: d.count, color: COLORS[i % COLORS.length] }));
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-2">{title}</h4>
      <div className="space-y-1.5">
        {chartData.map((d, i) => {
          const max = Math.max(...chartData.map(c => c.count));
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-24 truncate text-muted-foreground">{d.name}</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div className="h-2 rounded-full" style={{ width: `${max > 0 ? (d.count / max) * 100 : 0}%`, backgroundColor: d.color }} />
              </div>
              <span className="font-bold w-8 text-right">{d.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DisputesMortgagesViz: React.FC<{ data: LandDataAnalytics }> = ({ data }) => {
  const { disputeStats, mortgageStats } = data;

  return (
    <div className="space-y-3">
      {/* Disputes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Litiges fonciers ({disputeStats.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {disputeStats.total === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun litige enregistré</p>
          ) : (
            <>
              <DistributionBar data={disputeStats.byType} title="Par type de litige" />
              <DistributionBar data={disputeStats.byNature} title="Par nature" />
              <DistributionBar data={disputeStats.byStatus} title="Par statut" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Mortgages */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Landmark className="h-4 w-4 text-primary" />
            Hypothèques ({mortgageStats.totalCount}) — ${mortgageStats.totalAmount.toFixed(0)}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {mortgageStats.totalCount === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune hypothèque</p>
          ) : (
            <>
              <DistributionBar data={mortgageStats.byStatus} title="Par statut" />
              <DistributionBar data={mortgageStats.byCreditorType} title="Par type de créancier" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
