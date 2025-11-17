import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Users, TrendingUp, UserCheck, UserX, Percent } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BusinessMetricsProps {
  loading?: boolean;
  metrics?: {
    ltv: number; // Customer Lifetime Value
    cac: number; // Customer Acquisition Cost
    retentionRate: number;
    churnRate: number;
    arpu: number; // Average Revenue Per User
    paybackPeriod: number; // in months
  };
}

export function BusinessMetrics({ loading = false, metrics }: BusinessMetricsProps) {
  if (loading) {
    return (
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-3 md:p-4">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent className="p-3 md:p-4 pt-0">
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const businessStats = [
    {
      title: 'LTV (Lifetime Value)',
      value: `$${(metrics?.ltv || 0).toFixed(2)}`,
      icon: DollarSign,
      description: 'Valeur client vie',
      trend: metrics?.ltv && metrics?.cac ? ((metrics.ltv / metrics.cac) * 100).toFixed(0) : '0',
      color: 'text-green-600'
    },
    {
      title: 'CAC (Coût acquisition)',
      value: `$${(metrics?.cac || 0).toFixed(2)}`,
      icon: Users,
      description: 'Par nouveau client',
      trend: metrics?.ltv && metrics?.cac ? `Ratio: ${(metrics.ltv / metrics.cac).toFixed(1)}:1` : 'N/A',
      color: 'text-blue-600'
    },
    {
      title: 'Taux de rétention',
      value: `${(metrics?.retentionRate || 0).toFixed(1)}%`,
      icon: UserCheck,
      description: 'Clients fidèles',
      progress: metrics?.retentionRate || 0,
      color: 'text-green-600'
    },
    {
      title: 'Taux de churn',
      value: `${(metrics?.churnRate || 0).toFixed(1)}%`,
      icon: UserX,
      description: 'Clients perdus',
      progress: metrics?.churnRate || 0,
      color: 'text-red-600'
    },
    {
      title: 'ARPU',
      value: `$${(metrics?.arpu || 0).toFixed(2)}`,
      icon: TrendingUp,
      description: 'Revenu moyen/user',
      color: 'text-primary'
    },
    {
      title: 'Période de remboursement',
      value: `${(metrics?.paybackPeriod || 0).toFixed(1)} mois`,
      icon: Percent,
      description: 'Retour sur CAC',
      color: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
        {businessStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between p-3 md:p-4 pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground truncate pr-1">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 shrink-0 ${stat.color}`} />
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-base md:text-lg font-bold truncate">{stat.value}</div>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate mt-0.5">
                  {stat.description}
                </p>
                {stat.progress !== undefined && (
                  <Progress value={stat.progress} className="h-1.5 mt-2" />
                )}
                {stat.trend && (
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                    {stat.trend}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* LTV/CAC Ratio Indicator */}
      <Card>
        <CardHeader className="p-3 md:p-4 pb-2">
          <CardTitle className="text-xs md:text-sm">Ratio LTV/CAC</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-4 pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <span>Ratio actuel</span>
              <span className="font-bold">
                {metrics?.ltv && metrics?.cac ? (metrics.ltv / metrics.cac).toFixed(2) : '0.00'}:1
              </span>
            </div>
            <Progress 
              value={metrics?.ltv && metrics?.cac ? Math.min(100, (metrics.ltv / metrics.cac / 3) * 100) : 0} 
              className="h-2"
            />
            <div className="flex justify-between text-[10px] md:text-xs text-muted-foreground">
              <span>0:1 (Mauvais)</span>
              <span>3:1 (Excellent)</span>
            </div>
            <div className="mt-2 p-2 rounded-lg bg-muted/30 text-[10px] md:text-xs">
              {metrics?.ltv && metrics?.cac && (metrics.ltv / metrics.cac) >= 3 ? (
                <span className="text-green-600">✓ Excellent ratio - Modèle économique sain</span>
              ) : metrics?.ltv && metrics?.cac && (metrics.ltv / metrics.cac) >= 1.5 ? (
                <span className="text-orange-600">⚠ Ratio acceptable - Marge d'amélioration</span>
              ) : (
                <span className="text-red-600">✗ Ratio faible - Action requise</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
