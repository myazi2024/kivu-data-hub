import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BusinessMetricsProps {
  loading?: boolean;
  metrics?: {
    ltv: number;
    retentionRate: number;
    churnRate: number;
    arpu: number;
  };
}

export function BusinessMetrics({ loading = false, metrics }: BusinessMetricsProps) {
  if (loading) {
    return (
      <div className="grid gap-3 md:gap-4 grid-cols-2">
        {[...Array(4)].map((_, i) => (
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
      color: 'text-green-600'
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
  ];

  return (
    <div className="grid gap-3 md:gap-4 grid-cols-2">
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
