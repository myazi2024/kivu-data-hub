import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ResellerData {
  id: string;
  name: string;
  totalSales: number;
  salesCount: number;
  commissionEarned: number;
  conversionRate: number;
  activeCodesCount: number;
}

interface ResellerAnalysisProps {
  loading?: boolean;
  resellers?: ResellerData[];
}

export function ResellerAnalysis({ loading = false, resellers = [] }: ResellerAnalysisProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="p-4 md:p-6">
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const topResellers = [...resellers]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  const totalStats = {
    totalSales: resellers.reduce((sum, r) => sum + r.totalSales, 0),
    totalCommissions: resellers.reduce((sum, r) => sum + r.commissionEarned, 0),
    avgConversionRate: resellers.reduce((sum, r) => sum + r.conversionRate, 0) / resellers.length || 0,
    activeResellers: resellers.filter(r => r.salesCount > 0).length
  };

  return (
    <div className="space-y-4">
      {/* Global Stats */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Ventes totales
            </CardTitle>
            <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-base md:text-lg font-bold">
              ${totalStats.totalSales.toFixed(2)}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Via revendeurs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Commissions
            </CardTitle>
            <DollarSign className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-base md:text-lg font-bold">
              ${totalStats.totalCommissions.toFixed(2)}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Total versées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Taux conversion
            </CardTitle>
            <Percent className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-base md:text-lg font-bold">
              {totalStats.avgConversionRate.toFixed(1)}%
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Moyenne
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Actifs
            </CardTitle>
            <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-base md:text-lg font-bold">
              {totalStats.activeResellers}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              Ce mois
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Chart */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Top 5 revendeurs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topResellers}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="totalSales" fill="hsl(var(--primary))" name="Ventes" />
              <Bar dataKey="commissionEarned" fill="hsl(var(--secondary))" name="Commissions" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Reseller Cards */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
        {topResellers.map((reseller, idx) => (
          <Card key={reseller.id}>
            <CardHeader className="p-3 md:p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs md:text-sm truncate pr-2">
                  {reseller.name}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  #{idx + 1}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Ventes totales</span>
                <span className="font-bold">${reseller.totalSales.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Nombre de ventes</span>
                <span className="font-semibold">{reseller.salesCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Commission</span>
                <span className="font-semibold text-green-600">
                  ${reseller.commissionEarned.toFixed(2)}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Taux conversion</span>
                  <span className="font-semibold">{reseller.conversionRate.toFixed(1)}%</span>
                </div>
                <Progress value={reseller.conversionRate} className="h-1.5" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Codes actifs</span>
                <Badge variant="secondary" className="text-[10px]">
                  {reseller.activeCodesCount}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
