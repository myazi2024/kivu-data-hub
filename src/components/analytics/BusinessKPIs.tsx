import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DollarSign, Users, TrendingDown, Percent } from 'lucide-react';
import { BusinessKPIs as BusinessKPIsType } from '@/hooks/useAdvancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: BusinessKPIsType | null;
  loading: boolean;
}

export const BusinessKPIs: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-3 sm:p-4">
              <Skeleton className="h-24 sm:h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const ltvCacRatio = data.ltv / data.cac;
  const healthScore = Math.min(100, (ltvCacRatio / 3) * 100);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* KPIs Principaux */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">LTV</p>
                <p className="text-base sm:text-xl font-bold mt-0.5 sm:mt-1">${data.ltv.toFixed(0)}</p>
              </div>
              <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
            </div>
            <Badge variant="secondary" className="mt-1.5 sm:mt-2 text-[9px] sm:text-xs px-1.5 py-0">
              Lifetime Value
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">CAC</p>
                <p className="text-base sm:text-xl font-bold mt-0.5 sm:mt-1">${data.cac.toFixed(0)}</p>
              </div>
              <Users className="w-4 h-4 sm:w-6 sm:h-6 text-secondary" />
            </div>
            <Badge variant="outline" className="mt-1.5 sm:mt-2 text-[9px] sm:text-xs px-1.5 py-0">
              Coût d'Acquisition
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Ratio</p>
                <p className="text-base sm:text-xl font-bold mt-0.5 sm:mt-1">{ltvCacRatio.toFixed(1)}:1</p>
              </div>
              <Percent className="w-4 h-4 sm:w-6 sm:h-6 text-accent" />
            </div>
            <Progress value={healthScore} className="mt-1.5 sm:mt-2 h-1 sm:h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Churn</p>
                <p className="text-base sm:text-xl font-bold mt-0.5 sm:mt-1">{data.churnRate.toFixed(1)}%</p>
              </div>
              <TrendingDown className="w-4 h-4 sm:w-6 sm:h-6 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">ARPU</p>
                <p className="text-base sm:text-xl font-bold mt-0.5 sm:mt-1">${data.arpu.toFixed(0)}</p>
              </div>
              <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-primary" />
            </div>
            <p className="text-[9px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">Par utilisateur</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Score */}
      <Card>
        <CardHeader className="p-2 sm:p-4">
          <CardTitle className="text-sm sm:text-base">Santé Financière</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 pt-0">
          <div className="space-y-2 sm:space-y-3">
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs sm:text-sm font-medium">Score de Santé</span>
                <span className="text-xs sm:text-sm font-bold">{healthScore.toFixed(0)}/100</span>
              </div>
              <Progress value={healthScore} className="h-2 sm:h-3" />
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-2">
                {ltvCacRatio >= 3 ? '✅ Excellent' : ltvCacRatio >= 2 ? '⚠️ Bon' : '❌ À améliorer'}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-3 sm:mt-4">
              <div className="p-2 sm:p-3 border rounded">
                <p className="text-[9px] sm:text-xs text-muted-foreground">Conversion</p>
                <p className="text-sm sm:text-base font-bold mt-0.5">{data.conversionRate.toFixed(2)}%</p>
              </div>
              <div className="p-2 sm:p-3 border rounded">
                <p className="text-[9px] sm:text-xs text-muted-foreground">Payback</p>
                <p className="text-sm sm:text-base font-bold mt-0.5">
                  {(data.cac / data.arpu).toFixed(1)}m
                </p>
              </div>
              <div className="p-2 sm:p-3 border rounded">
                <p className="text-[9px] sm:text-xs text-muted-foreground">Retention</p>
                <p className="text-sm sm:text-base font-bold mt-0.5">{(100 - data.churnRate).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROI par Canal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        <Card>
          <CardHeader className="p-2 sm:p-3">
            <CardTitle className="text-xs sm:text-sm">ROI par Canal</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.roiByChannel}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="channel" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ fontSize: 10 }} formatter={(value) => [`${value}%`, 'ROI']} />
                <Bar dataKey="roi" fill="hsl(var(--primary))" name="ROI %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-2 sm:p-3">
            <CardTitle className="text-xs sm:text-sm">Vue Radar des KPIs</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={[
                { metric: 'LTV', value: Math.min(100, (data.ltv / 10)) },
                { metric: 'Conversion', value: data.conversionRate * 10 },
                { metric: 'Rétention', value: 100 - data.churnRate },
                { metric: 'ARPU', value: Math.min(100, (data.arpu / 5)) },
                { metric: 'ROI', value: Math.min(100, data.roiByChannel[0]?.roi || 0) }
              ]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Performance" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Détails ROI */}
      <Card>
        <CardHeader className="p-2 sm:p-3">
          <CardTitle className="text-xs sm:text-sm">Performance par Canal</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 pt-0">
          <div className="space-y-2">
            {data.roiByChannel.map((channel, index) => (
              <div key={index} className="flex items-center justify-between p-2 sm:p-3 border rounded gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{channel.channel}</p>
                  <p className="text-[9px] sm:text-xs text-muted-foreground">ROI</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Progress value={Math.min(100, channel.roi / 2)} className="w-16 sm:w-24 h-1.5 sm:h-2" />
                  <Badge variant={channel.roi > 100 ? 'default' : 'secondary'} className="text-[9px] sm:text-xs px-1.5 py-0">
                    {channel.roi.toFixed(0)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
