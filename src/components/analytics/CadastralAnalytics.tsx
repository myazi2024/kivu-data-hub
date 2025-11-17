import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Code, Percent, MapPin } from 'lucide-react';
import { CadastralAnalytics as CadastralAnalyticsType } from '@/hooks/useAdvancedAnalytics';
import { Skeleton } from '@/components/ui/skeleton';

interface Props {
  data: CadastralAnalyticsType | null;
  loading: boolean;
}

export const CadastralAnalytics: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Taux de Conversion</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.searchToPaymentRate.toFixed(1)}%</p>
              </div>
              <Percent className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <Progress value={data.searchToPaymentRate} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Codes CCC</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.cccCodesUsage.generated}</p>
              </div>
              <Code className="w-6 h-6 sm:w-8 sm:h-8 text-secondary" />
            </div>
            <div className="mt-3 text-xs space-y-1">
              <p className="text-muted-foreground">Utilisés: {data.cccCodesUsage.used}</p>
              <p className="text-muted-foreground">Expirés: {data.cccCodesUsage.expired}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">ROI Réductions</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.discountCodesROI.roi.toFixed(0)}%</p>
              </div>
              <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-accent" />
            </div>
            <div className="mt-3 text-xs">
              <p className="text-muted-foreground">Revenus: ${data.discountCodesROI.totalRevenue.toFixed(0)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Zones Actives</p>
                <p className="text-xl sm:text-2xl font-bold mt-1">{data.topZones.length}</p>
              </div>
              <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage des Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Usage des Services Cadastraux</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.serviceUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="service" type="category" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Utilisations" />
                <Bar dataKey="revenue" fill="hsl(var(--secondary))" name="Revenus ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Zones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Top 10 Zones Géographiques</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topZones.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="zone" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" name="Revenus ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Détails Zones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Performance par Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.topZones.slice(0, 10).map((zone, index) => (
              <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                <div>
                  <p className="font-medium text-sm sm:text-base">{zone.zone}</p>
                  <p className="text-xs text-muted-foreground">{zone.parcels} parcelles</p>
                </div>
                <div className="flex gap-3">
                  <Badge variant="outline" className="text-xs">
                    ${zone.revenue.toFixed(0)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    #{index + 1}
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
