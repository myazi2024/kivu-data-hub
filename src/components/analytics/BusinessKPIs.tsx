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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Aucune donnée KPI disponible pour la période sélectionnée.</p>
        </CardContent>
      </Card>
    );
  }

  const ltvCacRatio = data.ltv / data.cac;
  const healthScore = Math.min(100, (ltvCacRatio / 3) * 100);

  return (
    <div className="space-y-6">
      {/* KPIs Principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">LTV</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">${data.ltv.toFixed(0)}</p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <Badge variant="secondary" className="mt-3 text-xs">
              Lifetime Value
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">CAC</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">${data.cac.toFixed(0)}</p>
              </div>
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
            </div>
            <Badge variant="outline" className="mt-3 text-xs">
              Coût d'Acquisition
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ratio LTV:CAC</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{ltvCacRatio.toFixed(1)}:1</p>
              </div>
              <Percent className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
            </div>
            <Progress value={healthScore} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Churn Rate</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.churnRate.toFixed(1)}%</p>
              </div>
              <TrendingDown className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">ARPU</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">${data.arpu.toFixed(0)}</p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-3">Par utilisateur</p>
          </CardContent>
        </Card>
      </div>

      {/* Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Santé Financière</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Score de Santé</span>
                <span className="text-sm font-bold">{healthScore.toFixed(0)}/100</span>
              </div>
              <Progress value={healthScore} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {ltvCacRatio >= 3 ? '✅ Excellent' : ltvCacRatio >= 2 ? '⚠️ Bon' : '❌ À améliorer'}
                {' - Un ratio LTV:CAC de 3:1 ou plus est idéal'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground">Taux de Conversion</p>
                <p className="text-lg sm:text-xl font-bold mt-1">{data.conversionRate.toFixed(2)}%</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground">Payback Period</p>
                <p className="text-lg sm:text-xl font-bold mt-1">
                  {(data.cac / data.arpu).toFixed(1)} mois
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-xs text-muted-foreground">Retention Rate</p>
                <p className="text-lg sm:text-xl font-bold mt-1">{(100 - data.churnRate).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROI par Canal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">ROI par Canal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.roiByChannel}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="channel" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => [`${value}%`, 'ROI']} />
                <Bar dataKey="roi" fill="hsl(var(--primary))" name="ROI %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Vue Radar des KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Performance par Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.roiByChannel.map((channel, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3">
                <div>
                  <p className="font-medium text-sm sm:text-base">{channel.channel}</p>
                  <p className="text-xs text-muted-foreground">Retour sur investissement</p>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={Math.min(100, channel.roi / 2)} className="w-24 sm:w-32" />
                  <Badge variant={channel.roi > 100 ? 'default' : 'secondary'} className="text-xs">
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
